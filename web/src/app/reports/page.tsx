export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function ReportsPage() {
  const user = await requireRoles(["admin", "manager", "auditor"]);
  const cafeId = user.cafeId;

  const since = new Date(Date.now() - 30 * 86400000);
  const [sales, wasteLogs, inventory, audits] = await Promise.all([
    prisma.sale.findMany({
      where: { cafeId, soldAt: { gte: since } },
      select: { soldAt: true, total: true, qtySold: true },
    }),
    prisma.wasteLog.findMany({
      where: { cafeId, loggedAt: { gte: since } },
      include: { item: true },
    }),
    prisma.inventory.findMany({ where: { cafeId, status: "active" } }),
    prisma.auditLog.findMany({
      where: { cafeId, auditedAt: { gte: since } },
      orderBy: { auditedAt: "desc" },
      take: 30,
      include: { item: true, user: true },
    }),
  ]);

  const byDay = new Map<string, { revenue: number; units: number }>();
  for (const s of sales) {
    const key = startOfDay(s.soldAt).toISOString().slice(0, 10);
    const cur = byDay.get(key) || { revenue: 0, units: 0 };
    cur.revenue += Number(s.total);
    cur.units += s.qtySold;
    byDay.set(key, cur);
  }
  const salesSummary = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, v]) => ({ day, ...v }));

  const wasteByReason = new Map<string, number>();
  for (const w of wasteLogs) {
    wasteByReason.set(w.reason, (wasteByReason.get(w.reason) || 0) + Number(w.wasteQty));
  }

  const lowStock = inventory.filter(
    (i) => Number(i.currentQty) <= Number(i.minThreshold)
  );
  const totalRevenue = sales.reduce((s, r) => s + Number(r.total), 0);
  const totalUnits = sales.reduce((s, r) => s + r.qtySold, 0);

  return (
    <AppShell title="Analytics" eyebrow="Reports" lead="Last 30 days overview.">
      <div className="kpi-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue (30d)</div>
          <div className="stat-value text-success">{money(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Units sold</div>
          <div className="stat-value">{totalUnits}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Waste events</div>
          <div className="stat-value">{wasteLogs.length}</div>
        </div>
        <div className={`stat-card ${lowStock.length ? "stat-alert" : ""}`}>
          <div className="stat-label">Low stock items</div>
          <div className={`stat-value ${lowStock.length ? "text-danger" : ""}`}>
            {lowStock.length}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Daily revenue</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                    No sales in this period.
                  </td>
                </tr>
              )}
              {salesSummary.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td className="font-mono">{money(row.revenue)}</td>
                  <td>{row.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Waste by reason</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {[...wasteByReason.entries()].length === 0 && (
                <tr>
                  <td colSpan={2} style={{ color: "var(--text-muted)" }}>
                    No waste logged.
                  </td>
                </tr>
              )}
              {[...wasteByReason.entries()].map(([reason, qty]) => (
                <tr key={reason}>
                  <td>{reason}</td>
                  <td className="font-mono">{qty.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Low stock</h3>
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
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                    All stock levels OK.
                  </td>
                </tr>
              )}
              {lowStock.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="font-mono text-danger">{Number(i.currentQty).toFixed(2)}</td>
                  <td className="font-mono">{Number(i.minThreshold).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Recent audits</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Disc.</th>
                <th>Var %</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    No audits yet.
                  </td>
                </tr>
              )}
              {audits.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                    {a.auditedAt.toLocaleDateString()}
                  </td>
                  <td>{a.item.name}</td>
                  <td className="font-mono">{Number(a.discrepancy).toFixed(2)}</td>
                  <td>{Number(a.variancePct || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
