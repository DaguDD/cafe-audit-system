export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";

export default async function OrdersPage() {
  await requireRoles(["admin", "manager", "server"]);
  const orders = await prisma.order.findMany({
    where: { status: { notIn: ["cancelled"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { table: true, items: { include: { product: true } } },
  });

  async function updateStatus(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "server"]);
    const id = Number(formData.get("id"));
    const status = String(formData.get("status"));
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    if (status === "paid" && order.status !== "paid") {
      const shift =
        (await prisma.shift.findFirst({
          where: { userId: Number(user.id), status: "open" },
        })) ||
        (await prisma.shift.create({
          data: {
            userId: Number(user.id),
            openedBy: Number(user.id),
            autoManaged: true,
          },
        }));

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
        where: { id },
        data: { status: "paid", paidAt: new Date(), shiftId: shift.id },
      });
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "available" },
      });
    } else {
      await prisma.order.update({
        where: { id },
        data: { status: status as "pending" | "committed" | "preparing" | "served" | "cancelled" },
      });
    }
    revalidatePath("/orders");
    revalidatePath("/kitchen");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Orders">
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  #{o.id} · {o.table.tableNumber} · {o.orderSource}
                </p>
                <p className="text-sm text-[#a89f94]">
                  {o.status} · {money(o.subtotal)}
                </p>
              </div>
              <form action={updateStatus} className="flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-1 text-sm">
                  {["pending", "committed", "preparing", "served", "paid", "cancelled"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button className="rounded bg-[#e8954a] px-3 py-1 text-sm text-[#12100e]">Update</button>
              </form>
            </div>
            <ul className="mt-2 text-sm text-[#a89f94]">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.qty}× {i.product.name} — {money(i.lineTotal)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {orders.length === 0 && <p className="text-[#a89f94]">No orders yet. Use customer QR menu or waiter flow.</p>}
      </div>
    </AppShell>
  );
}
