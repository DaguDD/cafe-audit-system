import { prisma } from "@/lib/prisma";
import { deductRecipes } from "@/lib/inventory";

async function ensureOpenShift(cafeId: number, userId: number) {
  const existing = await prisma.shift.findFirst({
    where: { cafeId, userId, status: "open" },
  });
  if (existing) return existing;
  return prisma.shift.create({
    data: {
      cafeId,
      userId,
      openedBy: userId,
      autoManaged: true,
    },
  });
}

/** Mark a single open order paid (cash). Mirrors V2 Order::pay. */
export async function payOrder(opts: {
  orderId: number;
  cafeId: number;
  userId: number;
}): Promise<{ ok: boolean; message: string }> {
  const order = await prisma.order.findFirst({
    where: { id: opts.orderId, cafeId: opts.cafeId },
    include: { items: true },
  });
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status === "paid") return { ok: false, message: "Order already paid." };
  if (order.status === "cancelled") return { ok: false, message: "Order is cancelled." };

  const pending = await prisma.paymentSubmission.findFirst({
    where: { cafeId: opts.cafeId, tableId: order.tableId, status: "pending" },
  });
  if (pending) {
    return {
      ok: false,
      message: "Customer payment pending review — approve or reject it first.",
    };
  }

  const shift = await ensureOpenShift(opts.cafeId, opts.userId);
  const activeItems = order.items.filter((i) => i.itemStatus !== "cancelled");

  await deductRecipes(activeItems.map((i) => ({ productId: i.productId, qty: i.qty })));
  for (const item of activeItems) {
    await prisma.sale.create({
      data: {
        cafeId: opts.cafeId,
        productId: item.productId,
        qtySold: item.qty,
        unitPrice: item.unitPrice,
        total: item.lineTotal,
        shiftId: shift.id,
        userId: opts.userId,
        orderId: order.id,
        tableId: order.tableId,
      },
    });
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "paid", paidAt: new Date(), shiftId: shift.id },
  });

  const remaining = await prisma.order.count({
    where: {
      cafeId: opts.cafeId,
      tableId: order.tableId,
      status: { notIn: ["paid", "cancelled"] },
    },
  });
  if (remaining === 0) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "available" },
    });
  }

  return { ok: true, message: "Order marked paid." };
}

/** Pay every open order on a table (cash). Mirrors V2 payAll. */
export async function payAllForTable(opts: {
  tableId: number;
  cafeId: number;
  userId: number;
}): Promise<{ ok: boolean; message: string }> {
  const pending = await prisma.paymentSubmission.findFirst({
    where: { cafeId: opts.cafeId, tableId: opts.tableId, status: "pending" },
  });
  if (pending) {
    return {
      ok: false,
      message: "Customer payment pending review — approve or reject it first.",
    };
  }

  const openOrders = await prisma.order.findMany({
    where: {
      cafeId: opts.cafeId,
      tableId: opts.tableId,
      status: { notIn: ["paid", "cancelled"] },
    },
    include: { items: true },
  });
  if (!openOrders.length) return { ok: false, message: "Nothing to pay." };

  for (const order of openOrders) {
    const res = await payOrder({
      orderId: order.id,
      cafeId: opts.cafeId,
      userId: opts.userId,
    });
    if (!res.ok) return res;
  }

  await prisma.restaurantTable.update({
    where: { id: opts.tableId },
    data: { status: "available" },
  });

  return { ok: true, message: "All orders paid." };
}

export async function cancelOrder(opts: {
  orderId: number;
  cafeId: number;
}): Promise<{ ok: boolean; message: string }> {
  const order = await prisma.order.findFirst({
    where: { id: opts.orderId, cafeId: opts.cafeId },
  });
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status === "paid") return { ok: false, message: "Cannot cancel a paid order." };
  if (order.status === "cancelled") return { ok: true, message: "Already cancelled." };

  await prisma.orderItem.updateMany({
    where: { orderId: order.id },
    data: { itemStatus: "cancelled" },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });

  const remaining = await prisma.order.count({
    where: {
      cafeId: opts.cafeId,
      tableId: order.tableId,
      status: { notIn: ["paid", "cancelled"] },
    },
  });
  if (remaining === 0) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "available" },
    });
  }

  return { ok: true, message: "Order cancelled." };
}

/** Approve QR payment → pay all open orders on that table. */
export async function approvePaymentSubmission(opts: {
  submissionId: number;
  cafeId: number;
  userId: number;
  notes?: string;
}): Promise<{ ok: boolean; message: string }> {
  const payment = await prisma.paymentSubmission.findFirst({
    where: { id: opts.submissionId, cafeId: opts.cafeId },
  });
  if (!payment || payment.status !== "pending") {
    return { ok: false, message: "Payment not pending." };
  }

  const openOrders = await prisma.order.findMany({
    where: {
      cafeId: opts.cafeId,
      tableId: payment.tableId,
      status: { notIn: ["paid", "cancelled"] },
    },
    include: { items: true },
  });

  const shift = await ensureOpenShift(opts.cafeId, opts.userId);

  for (const order of openOrders) {
    const activeItems = order.items.filter((i) => i.itemStatus !== "cancelled");
    await deductRecipes(activeItems.map((i) => ({ productId: i.productId, qty: i.qty })));
    for (const item of activeItems) {
      await prisma.sale.create({
        data: {
          cafeId: opts.cafeId,
          productId: item.productId,
          qtySold: item.qty,
          unitPrice: item.unitPrice,
          total: item.lineTotal,
          shiftId: shift.id,
          userId: opts.userId,
          orderId: order.id,
          tableId: order.tableId,
        },
      });
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "paid", paidAt: new Date(), shiftId: shift.id },
    });
  }

  await prisma.restaurantTable.update({
    where: { id: payment.tableId },
    data: { status: "available" },
  });

  await prisma.paymentSubmission.update({
    where: { id: payment.id },
    data: {
      status: "approved",
      reviewedById: opts.userId,
      reviewedAt: new Date(),
      reviewNotes: opts.notes || null,
    },
  });

  return { ok: true, message: "Payment approved and table closed." };
}

export async function rejectPaymentSubmission(opts: {
  submissionId: number;
  cafeId: number;
  userId: number;
  notes: string;
}): Promise<{ ok: boolean; message: string }> {
  const notes = opts.notes.trim();
  if (!notes) return { ok: false, message: "Rejection reason is required." };

  const updated = await prisma.paymentSubmission.updateMany({
    where: { id: opts.submissionId, cafeId: opts.cafeId, status: "pending" },
    data: {
      status: "rejected",
      reviewedById: opts.userId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });
  if (!updated.count) return { ok: false, message: "Payment not pending." };
  return { ok: true, message: "Payment rejected." };
}
