export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function PlatformDashboard() {
  await requirePlatformAdmin();
  const today = startOfDay();

  const [cafeCount, userCount, ordersToday, revenueAgg, openLeads, suspended, pendingPayments, lowStock] =
    await Promise.all([
      prisma.cafe.count(),
      prisma.user.count({ where: { role: { not: "platform_admin" } } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.sale.aggregate({ _sum: { total: true }, where: { soldAt: { gte: today } } }),
      prisma.lead.count({ where: { status: "new" } }),
      prisma.cafe.count({ where: { status: "suspended" } }),
      prisma.paymentSubmission.count({ where: { status: "pending" } }),
      prisma.inventory.findMany({ where: { status: "active" } }).then((rows) =>
        rows.filter((r) => Number(r.currentQty) <= Number(r.minThreshold)).length
      ),
    ]);

  const recentCafes = await prisma.cafe.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { users: true, tables: true } } },
  });

  return (
    <PlatformShell title="Overview" lead="Cross-cafe health and activity.">
      <div className="kpi-grid">
        <div className="stat-card">
          <div className="stat-label">Cafes</div>
          <div className="stat-value">{cafeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cafe users</div>
          <div className="stat-value">{userCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Orders today</div>
          <div className="stat-value">{ordersToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue today</div>
          <div className="stat-value text-success">
            {money(Number(revenueAgg._sum.total || 0))}
          </div>
        </div>
        <div className={`stat-card ${openLeads ? "stat-alert" : ""}`}>
          <div className="stat-label">Open leads</div>
          <div className={`stat-value ${openLeads ? "text-accent" : ""}`}>{openLeads}</div>
        </div>
        <div className={`stat-card ${suspended || pendingPayments || lowStock ? "stat-alert" : ""}`}>
          <div className="stat-label">Alerts</div>
          <div className="stat-value text-danger">
            {suspended + (pendingPayments > 0 ? 1 : 0) + (lowStock > 0 ? 1 : 0)}
          </div>
          <div className="stat-delta">
            {suspended} suspended · {pendingPayments} pending payments · {lowStock} low-stock
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Recent cafes</h3>
            <Link href="/platform/cafes" className="cas-btn cas-btn-ghost cas-btn-sm">
              View all
            </Link>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Users</th>
                <th>Tables</th>
              </tr>
            </thead>
            <tbody>
              {recentCafes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/platform/cafes/${c.id}`} className="text-accent">
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    <span className="badge">{c.status}</span>
                  </td>
                  <td>{c._count.users}</td>
                  <td>{c._count.tables}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Quick links</h3>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: "0.5rem" }}>
            <Link href="/platform/cafes" className="cas-btn cas-btn-primary">
              Provision new cafe
            </Link>
            <Link href="/platform/leads" className="cas-btn cas-btn-ghost">
              Review contact leads
            </Link>
            <Link href="/platform/troubleshooting" className="cas-btn cas-btn-ghost">
              Open troubleshooting
            </Link>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
