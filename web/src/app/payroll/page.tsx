export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { money, requireRoles, ROLE_LABEL } from "@/lib/auth-helpers";
import { loadPayroll, type PayrollPeriod } from "@/lib/payroll";
import { closeReasonLabel, durationLabel, shiftLunchMinutes, shiftPaidMinutes } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; csv?: string }>;
}) {
  const user = await requireRoles(["admin", "manager", "auditor"]);
  const canEdit = user.role === "admin" || user.role === "manager";
  const sp = await searchParams;
  const period = (["week", "month", "custom"].includes(sp.period || "")
    ? sp.period
    : "week") as PayrollPeriod;

  const data = await loadPayroll({
    cafeId: user.cafeId,
    period,
    from: sp.from,
    to: sp.to,
  });

  async function saveRate(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const userId = Number(formData.get("userId"));
    const raw = String(formData.get("hourlyRate") || "").trim();
    const hourlyRate = raw === "" ? null : Number(raw);
    if (!userId || (hourlyRate != null && (Number.isNaN(hourlyRate) || hourlyRate < 0))) return;
    await prisma.user.updateMany({
      where: { id: userId, cafeId: u.cafeId },
      data: { hourlyRate },
    });
    revalidatePath("/payroll");
    revalidatePath("/settings");
  }

  const qs = new URLSearchParams();
  qs.set("period", period);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);

  return (
    <AppShell
      title="Payroll"
      eyebrow="Labor cost"
      lead="Lightweight labor estimate from shifts — hours minus unpaid lunch × hourly rate. Not full tax payroll."
    >
      <div className="cas-alert cas-alert-info">
        Inspired by Toast/Sling labor views: clocked hours + breaks drive estimated pay. Lunch is{" "}
        <strong>{data.lunchPaid ? "paid" : "unpaid (deducted)"}</strong> — change in Shifts → Lunch
        window.
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.85rem",
          alignItems: "center",
        }}
      >
        <Link
          href="/payroll?period=week"
          className={`cas-btn cas-btn-sm ${period === "week" ? "cas-btn-primary" : "cas-btn-ghost"}`}
        >
          This week
        </Link>
        <Link
          href="/payroll?period=month"
          className={`cas-btn cas-btn-sm ${period === "month" ? "cas-btn-primary" : "cas-btn-ghost"}`}
        >
          This month
        </Link>
        <form method="get" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "end" }}>
          <input type="hidden" name="period" value="custom" />
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>From</label>
            <input
              type="date"
              name="from"
              className="cas-input"
              defaultValue={sp.from || ""}
              required
              style={{ minWidth: 140 }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>To</label>
            <input
              type="date"
              name="to"
              className="cas-input"
              defaultValue={sp.to || ""}
              required
              style={{ minWidth: 140 }}
            />
          </div>
          <button className="cas-btn cas-btn-sm cas-btn-ghost" type="submit">
            Custom
          </button>
        </form>
        <a
          className="cas-btn cas-btn-sm cas-btn-ghost"
          href={`/api/payroll/csv?${qs.toString()}`}
          style={{ marginLeft: "auto" }}
        >
          Download CSV
        </a>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
        Period: <strong>{data.range.label}</strong> · {data.range.from.toLocaleDateString()} –{" "}
        {data.range.to.toLocaleDateString()}
      </p>

      <div className="kpi-grid" style={{ marginBottom: "0.85rem" }}>
        <div className="stat-card">
          <div className="stat-label">Est. labor cost</div>
          <div className="stat-value text-accent">{money(data.totals.totalPay)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid hours</div>
          <div className="stat-value">{data.totals.totalHours.toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Shifts</div>
          <div className="stat-value">{data.totals.totalShifts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Lunch minutes</div>
          <div className="stat-value">{data.totals.totalLunch}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Staff breakdown</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Shifts</th>
              <th>Gross h</th>
              <th>Lunch</th>
              <th>Paid h</th>
              <th>Rate</th>
              <th>Est. pay</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.userId}>
                <td>
                  <strong>{r.fullName}</strong>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {ROLE_LABEL[r.role]}
                  </div>
                </td>
                <td>{r.shiftCount}</td>
                <td>{r.grossHours.toFixed(2)}</td>
                <td>{r.lunchMinutes}m</td>
                <td>{r.paidHours.toFixed(2)}</td>
                <td>
                  {canEdit ? (
                    <form action={saveRate} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="hidden" name="userId" value={r.userId} />
                      <input
                        name="hourlyRate"
                        type="number"
                        step="0.01"
                        min={0}
                        className="cas-input"
                        defaultValue={r.hourlyRate ?? ""}
                        placeholder="—"
                        style={{ width: 88 }}
                      />
                      <button className="cas-btn cas-btn-sm cas-btn-ghost" type="submit">
                        Set
                      </button>
                    </form>
                  ) : r.hourlyRate != null ? (
                    money(r.hourlyRate)
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-accent">
                  {r.estimatedPay != null ? money(r.estimatedPay) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Shifts in period</h3>
          <span className="badge">{data.shifts.length}</span>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Opened</th>
              <th>Closed</th>
              <th>Status</th>
              <th>Lunch</th>
              <th>Paid</th>
              <th>Close</th>
            </tr>
          </thead>
          <tbody>
            {data.shifts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No shifts in this period.
                </td>
              </tr>
            )}
            {data.shifts.slice(0, 40).map((sh) => (
              <tr key={sh.id}>
                <td>{sh.user.fullName}</td>
                <td className="font-mono" style={{ fontSize: "0.72rem" }}>
                  {sh.openedAt.toLocaleString()}
                </td>
                <td className="font-mono" style={{ fontSize: "0.72rem" }}>
                  {sh.closedAt?.toLocaleString() || "—"}
                </td>
                <td>
                  <span className="badge">{sh.status}</span>
                </td>
                <td>{shiftLunchMinutes(sh)}m</td>
                <td>
                  {(shiftPaidMinutes(sh, data.lunchPaid) / 60).toFixed(2)}h
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                    {" "}
                    ({durationLabel(sh.openedAt, sh.closedAt)})
                  </span>
                </td>
                <td style={{ fontSize: "0.75rem" }}>{closeReasonLabel(sh.closeReason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Keep csv helper unused on page — download via API */}
    </AppShell>
  );
}
