export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";

export default async function PaymentsPage() {
  await requireRoles(["admin", "manager", "server", "staff"]);
  const payments = await prisma.paymentSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { table: true, reviewer: true },
  });

  async function decide(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "server", "staff"]);
    const id = Number(formData.get("id"));
    const decision = String(formData.get("decision")) as "approved" | "rejected";
    const payment = await prisma.paymentSubmission.findUniqueOrThrow({ where: { id } });
    if (payment.status !== "pending") return;

    await prisma.paymentSubmission.update({
      where: { id },
      data: {
        status: decision,
        reviewedById: Number(user.id),
        reviewedAt: new Date(),
      },
    });

    if (decision === "approved") {
      const openOrders = await prisma.order.findMany({
        where: { tableId: payment.tableId, status: { notIn: ["paid", "cancelled"] } },
        include: { items: true },
      });
      const shift =
        (await prisma.shift.findFirst({ where: { userId: Number(user.id), status: "open" } })) ||
        (await prisma.shift.create({
          data: { userId: Number(user.id), openedBy: Number(user.id), autoManaged: true },
        }));

      for (const order of openOrders) {
        await deductRecipes(order.items.map((i) => ({ productId: i.productId, qty: i.qty })));
        for (const item of order.items) {
          await prisma.sale.create({
            data: {
              productId: item.productId,
              qtySold: item.qty,
              unitPrice: item.unitPrice,
              total: item.lineTotal,
              shiftId: shift.id,
              userId: Number(user.id),
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
    }
    revalidatePath("/payments");
    revalidatePath("/orders");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Payments">
      <div className="space-y-4">
        {payments.map((p) => (
          <div key={p.id} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {p.table.tableNumber} · {p.paymentMethod} · {p.status}
                </p>
                <p className="text-sm text-[#a89f94]">
                  Ref {p.referenceNumber} · claimed {money(p.amountClaimed)}
                </p>
                {p.screenshotUrl.startsWith("http") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.screenshotUrl} alt="Payment proof" className="mt-3 max-h-48 rounded border border-[#3d352c]" />
                )}
                {!p.screenshotUrl.startsWith("http") && (
                  <p className="mt-2 text-xs text-[#a89f94]">Proof stored: {p.screenshotUrl}</p>
                )}
              </div>
              {p.status === "pending" && (
                <div className="flex gap-2">
                  <form action={decide}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="rounded bg-emerald-600 px-3 py-1.5 text-sm">Approve</button>
                  </form>
                  <form action={decide}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="rounded bg-red-700 px-3 py-1.5 text-sm">Reject</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && <p className="text-[#a89f94]">No payment submissions yet.</p>}
      </div>
    </AppShell>
  );
}
