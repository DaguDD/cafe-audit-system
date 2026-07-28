export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin, money, ROLE_LABEL } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function CafeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const cafeId = Number(id);
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      settings: true,
      users: { orderBy: { fullName: "asc" } },
      _count: { select: { tables: true, products: true, orders: true } },
    },
  });
  if (!cafe) notFound();

  const today = startOfDay();
  const [revenue, pendingPayments, lowStock, openOrders] = await Promise.all([
    prisma.sale.aggregate({
      where: { cafeId, soldAt: { gte: today } },
      _sum: { total: true },
    }),
    prisma.paymentSubmission.count({ where: { cafeId, status: "pending" } }),
    prisma.inventory.findMany({ where: { cafeId, status: "active" } }).then((rows) =>
      rows.filter((r) => Number(r.currentQty) <= Number(r.minThreshold)).length
    ),
    prisma.order.count({
      where: { cafeId, status: { notIn: ["paid", "cancelled"] } },
    }),
  ]);

  const admin = cafe.users.find((u) => u.role === "admin");

  return (
    <PlatformShell title={cafe.name} lead={`Slug ${cafe.slug} · ${cafe.status}`}>
      <div className="kpi-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue today</div>
          <div className="stat-value text-success">{money(Number(revenue._sum.total || 0))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open orders</div>
          <div className="stat-value">{openOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending payments</div>
          <div className="stat-value">{pendingPayments}</div>
        </div>
        <div className={`stat-card ${lowStock ? "stat-alert" : ""}`}>
          <div className="stat-label">Low stock</div>
          <div className={`stat-value ${lowStock ? "text-danger" : ""}`}>{lowStock}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Cafe info</h3>
          </div>
          <div className="panel-body">
            <table className="cas-table">
              <tbody>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Contact</td>
                  <td>
                    {cafe.contactEmail || "—"} / {cafe.contactPhone || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Tables</td>
                  <td>{cafe._count.tables}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Products</td>
                  <td>{cafe._count.products}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Orders (all time)</td>
                  <td>{cafe._count.orders}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Notes</td>
                  <td>{cafe.notes || "—"}</td>
                </tr>
              </tbody>
            </table>
            <form
              action={async (formData) => {
                "use server";
                await requirePlatformAdmin();
                const pct = Number(formData.get("varianceThresholdPct") || 10);
                await prisma.cafeSettings.upsert({
                  where: { cafeId },
                  update: { varianceThresholdPct: Number.isFinite(pct) ? pct : 10 },
                  create: {
                    cafeId,
                    varianceThresholdPct: Number.isFinite(pct) ? pct : 10,
                  },
                });
                const { revalidatePath } = await import("next/cache");
                revalidatePath(`/platform/cafes/${cafeId}`);
              }}
              style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "end" }}
            >
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Audit variance threshold %
                </label>
                <input
                  name="varianceThresholdPct"
                  type="number"
                  step="0.01"
                  min={0}
                  className="cas-input"
                  defaultValue={Number(cafe.settings?.varianceThresholdPct ?? 10)}
                />
              </div>
              <button className="cas-btn cas-btn-primary cas-btn-sm" type="submit">
                Save
              </button>
            </form>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
              Impersonation: sign out, then sign in as cafe admin{" "}
              <strong className="font-mono">{admin?.username || "(none)"}</strong> (temp password
              from provisioning, demo uses admin123).
            </p>
            <Link href="/login" className="cas-btn cas-btn-ghost cas-btn-sm">
              Open login
            </Link>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Users</h3>
          </div>
          <table className="cas-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cafe.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td className="font-mono">{u.username}</td>
                  <td>
                    <span className="role-pill">{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td>
                    <span className="badge">{u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/platform/cafes" className="cas-btn cas-btn-ghost cas-btn-sm">
        ← Back to cafes
      </Link>
    </PlatformShell>
  );
}
