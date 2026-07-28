export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { money } from "@/lib/auth-helpers";

export default async function CustomerMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.table || "";
  const table = token
    ? await prisma.restaurantTable.findUnique({
        where: { qrToken: token },
        include: { cafe: { include: { settings: true } } },
      })
    : null;
  if (!table) notFound();

  const cafeId = table.cafeId;
  const settings = table.cafe.settings;
  const cafeName = table.cafe.name;

  const products = await prisma.product.findMany({
    where: { cafeId, status: "active" },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const openOrders = await prisma.order.findMany({
    where: { cafeId, tableId: table.id, status: { notIn: ["paid", "cancelled"] } },
    include: { items: { include: { product: true } } },
  });
  const bill = openOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

  async function placeOrder(formData: FormData) {
    "use server";
    const tableToken = String(formData.get("tableToken") || "");
    const t = await prisma.restaurantTable.findUnique({ where: { qrToken: tableToken } });
    if (!t) return;
    const productId = Number(formData.get("productId"));
    const qty = Math.max(1, Number(formData.get("qty") || 1));
    const product = await prisma.product.findFirstOrThrow({
      where: { id: productId, cafeId: t.cafeId },
    });
    const line = Number(product.price) * qty;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          cafeId: t.cafeId,
          tableId: t.id,
          orderSource: "qr",
          status: "committed",
          subtotal: line,
        },
      });
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          qty,
          unitPrice: product.price,
          lineTotal: line,
          itemStatus: "committed",
        },
      });
      await tx.restaurantTable.update({
        where: { id: t.id },
        data: { status: "ordering" },
      });
    });
    revalidatePath(`/customer/menu`);
  }

  async function callWaiter(formData: FormData) {
    "use server";
    const tableToken = String(formData.get("tableToken") || "");
    const t = await prisma.restaurantTable.findUnique({ where: { qrToken: tableToken } });
    if (!t) return;
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
    revalidatePath(`/customer/menu`);
  }

  async function submitPayment(formData: FormData) {
    "use server";
    const tableToken = String(formData.get("tableToken") || "");
    const t = await prisma.restaurantTable.findUnique({ where: { qrToken: tableToken } });
    if (!t) return;
    const open = await prisma.order.findMany({
      where: { cafeId: t.cafeId, tableId: t.id, status: { notIn: ["paid", "cancelled"] } },
    });
    const due = open.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const amount = Number(formData.get("amount") || due);
    const method = String(formData.get("method") || "telebirr") as "telebirr" | "bank";
    const reference =
      String(formData.get("reference") || "").trim() || `REF-${randomBytes(4).toString("hex")}`;
    const file = formData.get("screenshot") as File | null;

    let screenshotUrl = "local-demo-no-blob";
    let hash = createHash("sha256").update(`${reference}-${Date.now()}`).digest("hex");

    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      hash = createHash("sha256").update(buf).digest("hex");
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`payments/${t.tableNumber}-${Date.now()}-${file.name}`, buf, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        screenshotUrl = blob.url;
      } else {
        screenshotUrl = `uploaded:${file.name}:${file.size}`;
      }
    }

    await prisma.paymentSubmission.create({
      data: {
        cafeId: t.cafeId,
        tableId: t.id,
        amountExpected: due || amount,
        amountClaimed: amount,
        tipAmount: 0,
        paymentMethod: method,
        referenceNumber: reference,
        screenshotUrl,
        screenshotHash: hash,
        tableToken,
      },
    });
    await prisma.restaurantTable.update({
      where: { id: t.id },
      data: { status: "bill_requested" },
    });
    revalidatePath(`/customer/menu`);
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#211d19]">
      <header className="border-b border-[#e5ddd3] bg-white px-4 py-5">
        <p className="text-xs uppercase tracking-widest text-[#e8954a]">Cafe Audit System</p>
        <h1 className="text-2xl font-semibold">{cafeName}</h1>
        <p className="text-sm text-[#6b635a]">Table {table.tableNumber}</p>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        <form action={callWaiter}>
          <input type="hidden" name="tableToken" value={token} />
          <button className="w-full rounded-lg border border-[#e5ddd3] bg-white px-3 py-2.5 text-sm font-medium">
            Call waiter
          </button>
        </form>

        <section>
          <h2 className="mb-3 text-lg font-medium">Menu</h2>
          <div className="space-y-3">
            {products.map((p) => (
              <form
                key={p.id}
                action={placeOrder}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#e5ddd3] bg-white p-3"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-[#6b635a]">{money(p.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="hidden" name="tableToken" value={token} />
                  <input type="hidden" name="productId" value={p.id} />
                  <input
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-14 rounded border px-2 py-1 text-sm"
                  />
                  <button className="rounded-lg bg-[#e8954a] px-3 py-1.5 text-sm font-medium text-white">
                    Add
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#e5ddd3] bg-white p-4">
          <h2 className="text-lg font-medium">Your bill</h2>
          {openOrders.length === 0 ? (
            <p className="mt-2 text-sm text-[#6b635a]">No open items yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {openOrders.flatMap((o) =>
                o.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      {i.qty}× {i.product.name} ({o.status})
                    </span>
                    <span>{money(i.lineTotal)}</span>
                  </li>
                ))
              )}
            </ul>
          )}
          <p className="mt-3 text-right text-lg font-semibold">{money(bill)}</p>
        </section>

        <section className="rounded-xl border border-[#e5ddd3] bg-white p-4">
          <h2 className="text-lg font-medium">Pay with Telebirr / bank</h2>
          {settings && (
            <div className="mt-2 space-y-1 rounded-lg bg-[#f7f3ee] p-3 text-sm text-[#6b635a]">
              <p>
                <strong>Telebirr:</strong> {settings.telebirrNumber} ({settings.telebirrName})
              </p>
              <p>
                <strong>Bank:</strong> {settings.bankName} · {settings.bankAccount} (
                {settings.bankAccountName})
              </p>
              {settings.instructions && <p>{settings.instructions}</p>}
            </div>
          )}
          <p className="mt-2 text-sm text-[#6b635a]">
            Upload a payment screenshot for staff to verify.
          </p>
          <form action={submitPayment} className="mt-3 space-y-3" encType="multipart/form-data">
            <input type="hidden" name="tableToken" value={token} />
            <select name="method" className="w-full rounded border px-3 py-2 text-sm">
              <option value="telebirr">Telebirr</option>
              <option value="bank">Bank transfer</option>
            </select>
            <input
              name="reference"
              placeholder="Reference number"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={bill || undefined}
              placeholder="Amount"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input name="screenshot" type="file" accept="image/*" className="w-full text-sm" />
            <button className="w-full rounded-lg bg-[#211d19] px-3 py-2.5 text-sm font-medium text-white">
              Submit payment proof
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
