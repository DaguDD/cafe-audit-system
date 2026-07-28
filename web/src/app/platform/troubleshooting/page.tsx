export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TroubleshootingPage() {
  await requirePlatformAdmin();

  const [suspended, pendingPayments, inventory] = await Promise.all([
    prisma.cafe.findMany({ where: { status: "suspended" }, orderBy: { name: "asc" } }),
    prisma.paymentSubmission.findMany({
      where: { status: "pending" },
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { cafe: true, table: true },
    }),
    prisma.inventory.findMany({
      where: { status: "active" },
      include: { cafe: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const lowStock = inventory.filter((i) => Number(i.currentQty) <= Number(i.minThreshold));

  return (
    <PlatformShell
      title="Troubleshooting"
      lead="Failed / pending payments, low stock, and suspended cafes."
    >
      <div className="kpi-grid">
        <div className={`stat-card ${suspended.length ? "stat-alert" : ""}`}>
          <div className="stat-label">Suspended cafes</div>
          <div className="stat-value">{suspended.length}</div>
        </div>
        <div className={`stat-card ${pendingPayments.length ? "stat-alert" : ""}`}>
          <div className="stat-label">Pending payments</div>
          <div className="stat-value">{pendingPayments.length}</div>
        </div>
        <div className={`stat-card ${lowStock.length ? "stat-alert" : ""}`}>
          <div className="stat-label">Low-stock items</div>
          <div className="stat-value text-danger">{lowStock.length}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Suspended cafes</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Cafe</th>
                <th>Slug</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suspended.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                    None suspended.
                  </td>
                </tr>
              )}
              {suspended.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="font-mono">{c.slug}</td>
                  <td>
                    <Link href={`/platform/cafes/${c.id}`} className="cas-btn cas-btn-ghost cas-btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Pending payment proofs</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Cafe</th>
                <th>Table</th>
                <th>Amount</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                    No pending payments.
                  </td>
                </tr>
              )}
              {pendingPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.cafe.name}</td>
                  <td>{p.table.tableNumber}</td>
                  <td className="font-mono">{money(p.amountClaimed)}</td>
                  <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                    {p.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Low stock across cafes</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Cafe</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  All stock levels OK.
                </td>
              </tr>
            )}
            {lowStock.slice(0, 50).map((i) => (
              <tr key={i.id}>
                <td>{i.cafe.name}</td>
                <td>{i.name}</td>
                <td className="font-mono text-danger">{Number(i.currentQty).toFixed(2)}</td>
                <td className="font-mono">{Number(i.minThreshold).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlatformShell>
  );
}
