export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { put } from "@vercel/blob";
import {
  buildBillReceipt,
  dimAccent,
  normalizeHex,
  orderStatusClass,
  orderStatusLabel,
} from "@/lib/bill-receipt";
import CustomerMenuClient from "./CustomerMenuClient";

export default async function CustomerMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp.table || "").trim();
  const table = token
    ? await prisma.restaurantTable.findUnique({
        where: { qrToken: token },
        include: { cafe: { include: { settings: true } } },
      })
    : null;
  if (!table) notFound();

  const cafeId = table.cafeId;
  const settings = table.cafe.settings;
  const displayName =
    settings?.displayName?.trim() || table.cafe.name || "Cafe";
  const accent = normalizeHex(settings?.accentColor, "#d4af74") || "#d4af74";

  const [categoriesDb, openOrders, pendingPayment, latestPayment, pendingWaiter] =
    await Promise.all([
      prisma.category.findMany({
        where: { cafeId },
        include: {
          products: {
            where: { status: "active" },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.order.findMany({
        where: { cafeId, tableId: table.id, status: { notIn: ["paid", "cancelled"] } },
        include: {
          items: { include: { product: true } },
          server: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.paymentSubmission.findFirst({
        where: { cafeId, tableId: table.id, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentSubmission.findFirst({
        where: { cafeId, tableId: table.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.waiterRequest.findFirst({
        where: {
          cafeId,
          tableId: table.id,
          status: { in: ["pending", "accepted"] },
        },
        include: { assignee: { select: { fullName: true } } },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

  // Include uncategorized products
  const categorizedIds = new Set(
    categoriesDb.flatMap((c) => c.products.map((p) => p.id))
  );
  const uncategorized = await prisma.product.findMany({
    where: {
      cafeId,
      status: "active",
      OR: [{ categoryId: null }, { id: { notIn: [...categorizedIds] } }],
    },
    orderBy: { name: "asc" },
  });

  const categories = [
    ...categoriesDb
      .filter((c) => c.products.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          categoryId: c.id,
          categoryName: c.name,
        })),
      })),
    ...(uncategorized.length
      ? [
          {
            id: 0,
            name: "More",
            products: uncategorized.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: Number(p.price),
              categoryId: p.categoryId,
              categoryName: "More",
            })),
          },
        ]
      : []),
  ];

  const receipt = buildBillReceipt({
    orders: openOrders,
    vatRate: Number(settings?.vatRate ?? 15),
    serviceRate: Number(settings?.serviceChargeRate ?? 10),
  });

  let waiterMessage: string | null = null;
  if (pendingWaiter) {
    if (pendingWaiter.status === "accepted" && pendingWaiter.assignee?.fullName) {
      waiterMessage = `${pendingWaiter.assignee.fullName} is on the way to your table.`;
    } else {
      waiterMessage = "A waiter has been notified and will be with you shortly.";
    }
  }

  async function placeOrder(input: {
    tableToken: string;
    items: { productId: number; qty: number }[];
    notes: string;
  }): Promise<{ ok: boolean; message: string }> {
    "use server";
    const t = await prisma.restaurantTable.findUnique({
      where: { qrToken: input.tableToken },
    });
    if (!t) return { ok: false, message: "Invalid table." };
    if (!input.items?.length) return { ok: false, message: "Cart is empty." };

    const productIds = input.items.map((i) => i.productId);
    const productsDb = await prisma.product.findMany({
      where: { id: { in: productIds }, cafeId: t.cafeId, status: "active" },
    });
    const byId = new Map(productsDb.map((p) => [p.id, p]));

    let subtotal = 0;
    const lines: {
      productId: number;
      qty: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];
    for (const item of input.items) {
      const p = byId.get(item.productId);
      if (!p || item.qty < 1) continue;
      const lineTotal = Number(p.price) * item.qty;
      subtotal += lineTotal;
      lines.push({
        productId: p.id,
        qty: item.qty,
        unitPrice: Number(p.price),
        lineTotal,
      });
    }
    if (!lines.length) return { ok: false, message: "No valid items." };

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          cafeId: t.cafeId,
          tableId: t.id,
          orderSource: "qr",
          status: "committed",
          subtotal,
          notes: input.notes?.trim() || null,
        },
      });
      for (const line of lines) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            itemStatus: "committed",
          },
        });
      }
      await tx.restaurantTable.update({
        where: { id: t.id },
        data: { status: "ordering" },
      });
    });

    revalidatePath("/customer/menu");
    revalidatePath("/kitchen");
    revalidatePath("/orders");
    return { ok: true, message: "Order sent to the kitchen!" };
  }

  async function callWaiter(tableToken: string): Promise<{ ok: boolean; message: string }> {
    "use server";
    const t = await prisma.restaurantTable.findUnique({
      where: { qrToken: tableToken },
    });
    if (!t) return { ok: false, message: "Invalid table." };

    const onDuty = await prisma.user.findMany({
      where: {
        cafeId: t.cafeId,
        role: { in: ["server", "staff", "manager", "admin"] },
        status: "active",
      },
      select: { fullName: true },
      take: 10,
    });

    const existing = await prisma.waiterRequest.findFirst({
      where: { cafeId: t.cafeId, tableId: t.id, status: "pending" },
    });
    if (!existing) {
      await prisma.waiterRequest.create({
        data: { cafeId: t.cafeId, tableId: t.id, status: "pending" },
      });
      await prisma.restaurantTable.update({
        where: { id: t.id },
        data: { status: "waiter_requested" },
      });
    }

    revalidatePath("/customer/menu");
    revalidatePath("/server");
    const count = onDuty.length;
    if (count === 0) {
      return {
        ok: true,
        message: "Request sent. Please also ask staff at the counter if no one arrives.",
      };
    }
    if (count === 1) {
      return {
        ok: true,
        message: `Waiter notified (${onDuty[0].fullName}). They will come to Table ${t.tableNumber} shortly.`,
      };
    }
    return {
      ok: true,
      message: `${count} staff on duty have been notified. Someone will come to Table ${t.tableNumber} shortly.`,
    };
  }

  async function requestBill(tableToken: string): Promise<{ ok: boolean; message: string }> {
    "use server";
    const t = await prisma.restaurantTable.findUnique({
      where: { qrToken: tableToken },
    });
    if (!t) return { ok: false, message: "Invalid table." };
    await prisma.restaurantTable.update({
      where: { id: t.id },
      data: { status: "bill_requested" },
    });
    revalidatePath("/customer/menu");
    revalidatePath("/orders");
    revalidatePath("/server");
    return {
      ok: true,
      message: "Bill requested — your waiter will bring the total shortly.",
    };
  }

  async function submitPayment(
    formData: FormData
  ): Promise<{ ok: boolean; message: string }> {
    "use server";
    const tableToken = String(formData.get("tableToken") || "");
    const t = await prisma.restaurantTable.findUnique({
      where: { qrToken: tableToken },
      include: { cafe: { include: { settings: true } } },
    });
    if (!t) return { ok: false, message: "Invalid table." };

    const pending = await prisma.paymentSubmission.findFirst({
      where: { cafeId: t.cafeId, tableId: t.id, status: "pending" },
    });
    if (pending) {
      return { ok: false, message: "A payment is already under review." };
    }

    const open = await prisma.order.findMany({
      where: { cafeId: t.cafeId, tableId: t.id, status: { notIn: ["paid", "cancelled"] } },
      include: {
        items: { include: { product: true } },
        server: { select: { fullName: true } },
      },
    });
    const tip = Math.max(0, Number(formData.get("tip_amount") || 0));
    const bill = buildBillReceipt({
      orders: open,
      vatRate: Number(t.cafe.settings?.vatRate ?? 15),
      serviceRate: Number(t.cafe.settings?.serviceChargeRate ?? 10),
      tipAmount: tip,
    });
    if (!bill.hasOrders) return { ok: false, message: "No open bill for this table." };

    const method = String(formData.get("method") || "telebirr") as "telebirr" | "bank";
    const reference = String(formData.get("reference") || "").trim();
    if (!reference || reference.length < 4) {
      return { ok: false, message: "Enter a valid transaction reference." };
    }
    const senderPhone = String(formData.get("sender_phone") || "").trim() || null;
    const file = formData.get("screenshot") as File | null;
    if (!file || file.size <= 0) {
      return { ok: false, message: "Payment screenshot is required." };
    }
    if (file.size > 5_242_880) {
      return { ok: false, message: "Screenshot must be under 5 MB." };
    }

    const dup = await prisma.paymentSubmission.findUnique({
      where: { referenceNumber: reference },
    });
    if (dup) return { ok: false, message: "This reference number was already used." };

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");
    const hashDup = await prisma.paymentSubmission.findFirst({
      where: { cafeId: t.cafeId, screenshotHash: hash },
    });
    if (hashDup) {
      return { ok: false, message: "This screenshot was already submitted." };
    }

    let screenshotUrl = `uploaded:${file.name}:${file.size}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(
        `payments/${t.cafeId}/${t.tableNumber}-${Date.now()}-${file.name}`,
        buf,
        { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }
      );
      screenshotUrl = blob.url;
    }

    await prisma.paymentSubmission.create({
      data: {
        cafeId: t.cafeId,
        tableId: t.id,
        amountExpected: bill.baseTotal,
        amountClaimed: bill.grandTotal,
        tipAmount: tip,
        paymentMethod: method,
        referenceNumber: reference || `REF-${randomBytes(4).toString("hex")}`,
        senderPhone,
        screenshotUrl,
        screenshotHash: hash,
        tableToken,
      },
    });
    await prisma.restaurantTable.update({
      where: { id: t.id },
      data: { status: "bill_requested" },
    });

    revalidatePath("/customer/menu");
    revalidatePath("/payments");
    return {
      ok: true,
      message: "Payment submitted! Staff will verify your receipt shortly.",
    };
  }

  return (
    <CustomerMenuClient
      tableToken={token}
      tableNumber={table.tableNumber}
      branding={{
        displayName,
        tagline:
          settings?.tagline?.trim() ||
          "Tap a category, add to cart, and we'll bring it right over.",
        welcomeMessage: settings?.welcomeMessage?.trim() || null,
        footerText: settings?.footerText?.trim() || null,
        showPrices: settings?.showPrices !== false,
        fontVibe: settings?.fontVibe || "classic",
        logoUrl: settings?.logoUrl || null,
        backgroundUrl: settings?.backgroundUrl || null,
        backgroundColor: settings?.backgroundColor || null,
        accentColor: accent,
        accentDim: dimAccent(accent),
        secondaryColor: normalizeHex(settings?.secondaryColor) || null,
        menuTheme: settings?.menuTheme || "dark_gold",
      }}
      categories={categories}
      openOrders={openOrders.map((o) => ({
        id: o.id,
        status: o.status,
        statusLabel: orderStatusLabel(o.status),
        statusClass: orderStatusClass(o.status),
        items: o.items.map((i) => ({ qty: i.qty, name: i.product.name })),
      }))}
      receipt={receipt}
      pendingPayment={
        pendingPayment
          ? {
              id: pendingPayment.id,
              status: pendingPayment.status,
              paymentMethod: pendingPayment.paymentMethod,
              referenceNumber: pendingPayment.referenceNumber,
              reviewNotes: pendingPayment.reviewNotes,
            }
          : null
      }
      latestPayment={
        latestPayment
          ? {
              id: latestPayment.id,
              status: latestPayment.status,
              paymentMethod: latestPayment.paymentMethod,
              referenceNumber: latestPayment.referenceNumber,
              reviewNotes: latestPayment.reviewNotes,
            }
          : null
      }
      pendingWaiter={!!pendingWaiter}
      waiterMessage={waiterMessage}
      paymentConfig={{
        telebirrNumber: settings?.telebirrNumber || "",
        telebirrName: settings?.telebirrName || "",
        bankName: settings?.bankName || "",
        bankAccount: settings?.bankAccount || "",
        bankAccountName: settings?.bankAccountName || "",
        instructions: settings?.instructions || "",
      }}
      placeOrder={placeOrder}
      callWaiter={callWaiter}
      requestBill={requestBill}
      submitPayment={submitPayment}
    />
  );
}
