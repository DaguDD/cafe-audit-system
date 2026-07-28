export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireCafeUser, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Role } from "@prisma/client";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const user = await requireCafeUser();
  const role = user.role as Role;
  const cafeId = user.cafeId;
  const todayStart = startOfDay();

  const [
    inventory,
    openOrders,
    pendingPayments,
    todaySalesAgg,
    openShifts,
    pendingPOs,
    kitchenQueue,
    tables,
    recentSales,
    recentAudits,
    allSales7d,
    myShift,
  ] = await Promise.all([
    prisma.inventory.findMany({ where: { cafeId, status: "active" }, orderBy: { name: "asc" } }),
    prisma.order.count({ where: { cafeId, status: { notIn: ["paid", "cancelled"] } } }),
    prisma.paymentSubmission.count({ where: { cafeId, status: "pending" } }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { cafeId, soldAt: { gte: todayStart } },
    }),
    prisma.shift.count({ where: { cafeId, status: "open" } }),
    ["admin", "manager", "auditor"].includes(role)
      ? prisma.purchaseOrder.count({ where: { cafeId, status: "pending" } })
      : Promise.resolve(0),
    ["admin", "manager", "kitchen"].includes(role)
      ? prisma.order.count({
          where: { cafeId, status: { in: ["pending", "committed", "preparing"] } },
        })
      : Promise.resolve(0),
    prisma.restaurantTable.findMany({ where: { cafeId } }),
    prisma.sale.findMany({
      where: { cafeId },
      take: 8,
      orderBy: { soldAt: "desc" },
      include: { product: true },
    }),
    ["admin", "manager", "auditor"].includes(role)
      ? prisma.auditLog.findMany({
          where: { cafeId },
          take: 5,
          orderBy: { auditedAt: "desc" },
          include: { item: true, user: true },
        })
      : Promise.resolve([]),
    prisma.sale.findMany({
      where: { cafeId, soldAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { soldAt: true, total: true },
    }),
    prisma.shift.findFirst({
      where: { cafeId, userId: Number(user.id), status: "open" },
      orderBy: { openedAt: "desc" },
    }),
  ]);

  const lowStock = inventory.filter((r) => Number(r.currentQty) <= Number(r.minThreshold));
  const tablesBusy = tables.filter((t) =>
    ["ordering", "bill_requested", "occupied", "waiter_requested"].includes(t.status)
  ).length;

  const revenueByDay: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(startOfDay(d));
    const total = allSales7d
      .filter((s) => dayKey(startOfDay(s.soldAt)) === key)
      .reduce((sum, s) => sum + Number(s.total), 0);
    revenueByDay.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      total,
    });
  }
  const weekTotal = revenueByDay.reduce((s, r) => s + r.total, 0);
  const maxRev = Math.max(1, ...revenueByDay.map((r) => r.total));

  return (
    <AppShell
      title="Dashboard"
      eyebrow="Cafe Audit System"
      lead={`Welcome, ${user.name} · ${role}`}
    >
      {myShift ? (
        <div className="cas-alert cas-alert-info">
          Shift active since <strong className="font-mono">{myShift.openedAt.toLocaleString()}</strong>
          {myShift.autoManaged ? " · auto" : ""}
        </div>
      ) : ["staff", "server", "kitchen"].includes(role) ? (
        <div className="cas-alert cas-alert-warning">
          Not clocked in — open a shift from Shifts, or a sale/payment will auto-start one.
        </div>
      ) : null}

      <div className="kpi-grid">
        <div className="stat-card">
          <div className="stat-label">Today&apos;s Revenue</div>
          <div className="stat-value text-success">{money(todaySalesAgg._sum.total || 0)}</div>
          <div className="stat-delta">7d: {money(weekTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Shifts</div>
          <div className="stat-value">{openShifts}</div>
        </div>
        {["admin", "manager", "server"].includes(role) && (
          <div className="stat-card">
            <div className="stat-label">Tables Ordering</div>
            <div className="stat-value">{tablesBusy}</div>
            <div className="stat-delta">{openOrders} open orders</div>
          </div>
        )}
        {["admin", "manager", "server", "staff"].includes(role) && (
          <div className={`stat-card ${pendingPayments ? "stat-alert" : ""}`}>
            <div className="stat-label">Pending Payments</div>
            <div className="stat-value">{pendingPayments}</div>
          </div>
        )}
        {["admin", "manager", "kitchen"].includes(role) && (
          <div className={`stat-card ${kitchenQueue ? "stat-alert" : ""}`}>
            <div className="stat-label">Kitchen Queue</div>
            <div className="stat-value">{kitchenQueue}</div>
          </div>
        )}
        <div className={`stat-card ${lowStock.length ? "stat-alert" : ""}`}>
          <div className="stat-label">Low Stock</div>
          <div className={`stat-value ${lowStock.length ? "text-danger" : ""}`}>{lowStock.length}</div>
        </div>
        {["admin", "manager", "auditor"].includes(role) && (
          <div className="stat-card">
            <div className="stat-label">Pending POs</div>
            <div className="stat-value">{pendingPOs}</div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Revenue (7 days)</h3>
          </div>
          <div className="panel-body">
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.45rem", height: 120 }}>
              {revenueByDay.map((d) => (
                <div key={d.label} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: `${Math.max(4, (d.total / maxRev) * 100)}%`,
                      minHeight: 4,
                      background: "var(--accent)",
                      borderRadius: "4px 4px 0 0",
                      opacity: 0.85,
                    }}
                    title={money(d.total)}
                  />
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {d.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Recent Sales</h3>
            <Link href="/sales" className="cas-btn cas-btn-ghost cas-btn-sm">
              All
            </Link>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    No sales yet.
                  </td>
                </tr>
              )}
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.product.name}</td>
                  <td>{s.qtySold}</td>
                  <td className="font-mono">{money(s.total)}</td>
                  <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {s.soldAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentAudits.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>Recent Audits</h3>
            <Link href="/audit" className="cas-btn cas-btn-ghost cas-btn-sm">
              New audit
            </Link>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Variance</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.map((a) => (
                <tr key={a.id}>
                  <td>{a.item.name}</td>
                  <td>
                    <span className={Number(a.discrepancy) < 0 ? "text-danger" : "text-success"}>
                      {Number(a.discrepancy).toFixed(2)}
                    </span>
                  </td>
                  <td>{a.user.fullName}</td>
                  <td className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {a.auditedAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>Low Stock Alerts</h3>
            <span className="badge badge-danger">{lowStock.length}</span>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Min</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="font-mono text-danger">
                    {Number(item.currentQty).toFixed(2)} {item.unit}
                  </td>
                  <td className="font-mono" style={{ color: "var(--text-muted)" }}>
                    {Number(item.minThreshold).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link href="/audit" className="cas-btn cas-btn-primary">
          Run stock audit
        </Link>
        <Link href="/tables" className="cas-btn cas-btn-ghost">
          Tables & QR
        </Link>
        <Link href="/kitchen" className="cas-btn cas-btn-ghost">
          Kitchen board
        </Link>
        <Link href="/server" className="cas-btn cas-btn-ghost">
          Waiter tablet
        </Link>
      </div>
    </AppShell>
  );
}
