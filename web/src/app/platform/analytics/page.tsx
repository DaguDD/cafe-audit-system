export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function PlatformAnalyticsPage() {
  await requirePlatformAdmin();
  const since = new Date(Date.now() - 14 * 86400000);
  const cafes = await prisma.cafe.findMany({ orderBy: { name: "asc" } });
  const sales = await prisma.sale.findMany({
    where: { soldAt: { gte: since } },
    select: { cafeId: true, total: true, soldAt: true },
  });
  const orders = await prisma.order.groupBy({
    by: ["cafeId"],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
  });

  const revenueByCafe = new Map<number, number>();
  for (const s of sales) {
    revenueByCafe.set(s.cafeId, (revenueByCafe.get(s.cafeId) || 0) + Number(s.total));
  }
  const ordersByCafe = new Map(orders.map((o) => [o.cafeId, o._count._all]));

  const byDay = new Map<string, number>();
  for (const s of sales) {
    const key = startOfDay(s.soldAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + Number(s.total));
  }
  const daily = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <PlatformShell title="Analytics" lead="Cross-cafe revenue and order volume (14 days).">
      <div className="grid-2">
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Revenue by cafe</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Cafe</th>
                <th>Revenue</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {cafes.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="font-mono">{money(revenueByCafe.get(c.id) || 0)}</td>
                  <td>{ordersByCafe.get(c.id) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Daily platform revenue</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {daily.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ color: "var(--text-muted)" }}>
                    No sales in this window.
                  </td>
                </tr>
              )}
              {daily.map(([day, total]) => (
                <tr key={day}>
                  <td>{day}</td>
                  <td className="font-mono">{money(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformShell>
  );
}
