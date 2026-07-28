export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default async function OrdersPage() {
  const user = await requireRoles(["admin", "manager", "server"]);
  const tables = await prisma.restaurantTable.findMany({
    where: { cafeId: user.cafeId },
    orderBy: { tableNumber: "asc" },
    include: {
      orders: {
        where: { status: { notIn: ["paid", "cancelled"] } },
        include: { items: true },
      },
      payments: {
        where: { status: "pending" },
        take: 1,
      },
    },
  });

  const tiles = tables.map((t) => {
    const openTotal = t.orders.reduce((s, o) => s + Number(o.subtotal), 0);
    return {
      id: t.id,
      tableNumber: t.tableNumber,
      status: t.status,
      capacity: t.capacity,
      activeOrders: t.orders.length,
      openTotal,
      pendingPayment: t.payments.length > 0,
    };
  });

  const active = tiles.filter((t) => t.activeOrders > 0 || t.pendingPayment || t.status !== "available");
  const rest = tiles.filter((t) => !active.includes(t));

  return (
    <AppShell
      title="Active Tables"
      eyebrow="Orders"
      lead="Open a table to pay individual orders (cash), pay all, or review guest payment proofs."
    >
      {active.length === 0 && (
        <div className="cas-alert cas-alert-info" style={{ marginBottom: "1rem" }}>
          No busy tables right now. Guests order via QR menu or waiter tablet.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {[...active, ...rest].map((t) => (
          <Link
            key={t.id}
            href={`/orders/${t.id}`}
            className="glass-panel"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
              borderColor: t.pendingPayment
                ? "rgba(232, 149, 74, 0.55)"
                : t.activeOrders > 0
                  ? "rgba(212, 175, 116, 0.35)"
                  : undefined,
            }}
          >
            <div className="panel-head" style={{ padding: "0.85rem 1rem 0.35rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{t.tableNumber}</h3>
              <span
                className={`badge ${
                  t.pendingPayment
                    ? "badge-warning"
                    : t.status === "available"
                      ? ""
                      : "badge-success"
                }`}
              >
                {t.pendingPayment ? "payment pending" : statusLabel(t.status)}
              </span>
            </div>
            <div className="panel-body" style={{ paddingTop: "0.35rem" }}>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Capacity {t.capacity}
              </p>
              {t.activeOrders > 0 ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
                  <strong>{t.activeOrders}</strong> open order{t.activeOrders === 1 ? "" : "s"}
                  <br />
                  <span style={{ color: "var(--accent)" }}>{money(t.openTotal)}</span>
                </p>
              ) : (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  No active orders
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
