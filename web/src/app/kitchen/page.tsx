export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function KitchenPage() {
  const user = await requireRoles(["admin", "manager", "kitchen"]);
  const orders = await prisma.order.findMany({
    where: { cafeId: user.cafeId, status: { in: ["committed", "preparing", "pending"] } },
    orderBy: { createdAt: "asc" },
    include: { table: true, items: { include: { product: true } } },
  });

  async function bump(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "kitchen"]);
    const id = Number(formData.get("id"));
    const status = String(formData.get("status")) as "preparing" | "served" | "committed";
    await prisma.order.updateMany({ where: { id, cafeId: u.cafeId }, data: { status } });
    if (status === "served" || status === "preparing") {
      await prisma.orderItem.updateMany({
        where: { orderId: id },
        data: { itemStatus: status === "served" ? "served" : "preparing" },
      });
    }
    revalidatePath("/kitchen");
    revalidatePath("/orders");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Kitchen Display" eyebrow="Prep" lead="Tickets waiting for the line.">
      <div className="grid-2" style={{ gridTemplateColumns: undefined }}>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {orders.map((o) => (
            <div key={o.id} className="glass-panel">
              <div className="panel-head">
                <h3>{o.table.tableNumber}</h3>
                <span className={`badge ${o.status === "preparing" ? "badge-warning" : ""}`}>
                  {o.status}
                </span>
              </div>
              <div className="panel-body">
                <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.qty}× {i.product.name}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <form action={bump}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value="preparing" />
                    <button className="cas-btn cas-btn-ghost cas-btn-sm">Preparing</button>
                  </form>
                  <form action={bump}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value="served" />
                    <button className="cas-btn cas-btn-primary cas-btn-sm">Served</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {orders.length === 0 && (
        <div className="cas-alert cas-alert-info">Kitchen queue is empty.</div>
      )}
    </AppShell>
  );
}
