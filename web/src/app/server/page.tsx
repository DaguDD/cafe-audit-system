export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import ServerTablet from "@/components/ServerTablet";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function ServerPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const user = await requireRoles(["admin", "manager", "server"]);
  const cafeId = user.cafeId;
  const sp = await searchParams;
  const tables = await prisma.restaurantTable.findMany({
    where: { cafeId },
    orderBy: { tableNumber: "asc" },
  });
  const products = await prisma.product.findMany({
    where: { cafeId, status: "active" },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const selectedTableId = sp.table ? Number(sp.table) : tables[0]?.id ?? null;

  const pendingRequests = await prisma.waiterRequest.findMany({
    where: { cafeId, status: "pending" },
    include: { table: true },
    orderBy: { requestedAt: "asc" },
  });

  async function submitOrder(payload: {
    tableId: number;
    items: { productId: number; qty: number }[];
  }) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server"]);
    if (!payload.items.length) throw new Error("Cart is empty");
    const table = await prisma.restaurantTable.findFirst({
      where: { id: payload.tableId, cafeId: u.cafeId },
    });
    if (!table) throw new Error("Table not found");

    const productIds = payload.items.map((i) => i.productId);
    const productsDb = await prisma.product.findMany({
      where: { id: { in: productIds }, cafeId: u.cafeId, status: "active" },
    });
    const byId = new Map(productsDb.map((p) => [p.id, p]));

    let subtotal = 0;
    const lines: { productId: number; qty: number; unitPrice: number; lineTotal: number }[] = [];
    for (const item of payload.items) {
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
    if (!lines.length) throw new Error("No valid items");

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          cafeId: u.cafeId,
          tableId: table.id,
          orderSource: "server",
          serverUserId: Number(u.id),
          status: "committed",
          subtotal,
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
        where: { id: table.id },
        data: { status: "ordering" },
      });
    });

    revalidatePath("/server");
    revalidatePath("/orders");
    revalidatePath("/kitchen");
    revalidatePath("/dashboard");
  }

  async function acceptWaiter(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server"]);
    const id = Number(formData.get("id"));
    const req = await prisma.waiterRequest.findFirst({
      where: { id, cafeId: u.cafeId },
    });
    if (!req || req.status !== "pending") return;
    await prisma.$transaction([
      prisma.waiterRequest.update({
        where: { id },
        data: {
          status: "accepted",
          assignedUserId: Number(u.id),
          acceptedAt: new Date(),
        },
      }),
      prisma.restaurantTable.update({
        where: { id: req.tableId },
        data: { status: "occupied" },
      }),
    ]);
    revalidatePath("/server");
  }

  return (
    <AppShell
      title="Waiter Tablet"
      eyebrow="Operations"
      lead="Select a table, build an order, and send it to the kitchen."
    >
      {pendingRequests.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>Table calls</h3>
            <span className="nav-badge">{pendingRequests.length}</span>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: "0.5rem" }}>
            {pendingRequests.map((r) => (
              <div key={r.id} className="product-tile">
                <div>
                  <strong>{r.table.tableNumber}</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Requested {r.requestedAt.toLocaleTimeString()}
                  </div>
                </div>
                <form action={acceptWaiter}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="cas-btn cas-btn-primary cas-btn-sm">Accept</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <ServerTablet
        tables={tables.map((t) => ({
          id: t.id,
          tableNumber: t.tableNumber,
          status: t.status,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category?.name || "Uncategorized",
        }))}
        selectedTableId={selectedTableId}
        submitOrder={submitOrder}
      />
    </AppShell>
  );
}
