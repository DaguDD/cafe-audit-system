export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";

export default async function OrdersPage() {
  const user = await requireRoles(["admin", "manager", "server"]);
  const orders = await prisma.order.findMany({
    where: { cafeId: user.cafeId, status: { notIn: ["cancelled"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { table: true, items: { include: { product: true } } },
  });

  async function updateStatus(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "server"]);
    const id = Number(formData.get("id"));
    const status = String(formData.get("status"));
    const order = await prisma.order.findFirstOrThrow({
      where: { id, cafeId: user.cafeId },
      include: { items: true },
    });

    if (status === "paid" && order.status !== "paid") {
      const shift =
        (await prisma.shift.findFirst({
          where: { cafeId: user.cafeId, userId: Number(user.id), status: "open" },
        })) ||
        (await prisma.shift.create({
          data: {
            cafeId: user.cafeId,
            userId: Number(user.id),
            openedBy: Number(user.id),
            autoManaged: true,
          },
        }));

      await deductRecipes(order.items.map((i) => ({ productId: i.productId, qty: i.qty })));
      for (const item of order.items) {
        await prisma.sale.create({
          data: {
            cafeId: user.cafeId,
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
        data: {
          status: status as "pending" | "committed" | "preparing" | "served" | "cancelled",
        },
      });
    }
    revalidatePath("/orders");
    revalidatePath("/kitchen");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Active Tables" eyebrow="Orders" lead="Open table orders and status updates.">
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {orders.map((o) => (
          <div key={o.id} className="glass-panel">
            <div className="panel-head">
              <h3>
                #{o.id} · {o.table.tableNumber} · {o.orderSource}
              </h3>
              <span className="badge">{o.status}</span>
            </div>
            <div className="panel-body">
              <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {money(o.subtotal)} · {o.createdAt.toLocaleString()}
              </p>
              <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.qty}× {i.product.name} — {money(i.lineTotal)}
                  </li>
                ))}
              </ul>
              <form action={updateStatus} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="cas-select" style={{ maxWidth: 180 }}>
                  {["pending", "committed", "preparing", "served", "paid", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="cas-btn cas-btn-primary cas-btn-sm">Update</button>
              </form>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="cas-alert cas-alert-info">No orders yet. Use customer QR menu or waiter tablet.</div>
        )}
      </div>
    </AppShell>
  );
}
