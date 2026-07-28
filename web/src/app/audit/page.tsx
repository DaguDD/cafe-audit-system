export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { variancePct } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export default async function AuditPage() {
  const user = await requireRoles(["admin", "manager", "auditor"]);
  const cafeSettings = await prisma.cafeSettings.findUnique({ where: { cafeId: user.cafeId } });
  const threshold = Number(cafeSettings?.varianceThresholdPct ?? process.env.VARIANCE_THRESHOLD_PCT ?? 10);
  const items = await prisma.inventory.findMany({
    where: { cafeId: user.cafeId, status: "active" },
    orderBy: { name: "asc" },
  });
  const recent = await prisma.auditLog.findMany({
    where: { cafeId: user.cafeId },
    take: 15,
    orderBy: { auditedAt: "desc" },
    include: { item: true, user: true },
  });

  async function submitAudit(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "auditor"]);
    const itemId = Number(formData.get("itemId"));
    const physical = Number(formData.get("physical"));
    const comments = String(formData.get("comments") || "");
    const item = await prisma.inventory.findFirstOrThrow({ where: { id: itemId, cafeId: user.cafeId } });
    const system = Number(item.currentQty);
    const discrepancy = physical - system;
    const vp = variancePct(system, physical);

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          cafeId: user.cafeId,
          itemId,
          systemQty: system,
          physicalQty: physical,
          discrepancy,
          variancePct: vp,
          userId: Number(user.id),
          comments: comments || null,
        },
      }),
      prisma.inventory.update({
        where: { id: itemId },
        data: { currentQty: new Decimal(physical) },
      }),
    ]);
    revalidatePath("/audit");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell
      title="Reconciliation"
      eyebrow="Audit"
      lead={`Compare physical count to system quantity. Variance above ${threshold}% is flagged.`}
    >
      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Submit audit</h3>
        </div>
        <div className="panel-body">
          <form action={submitAudit} className="form-row cols-4">
            <select name="itemId" required className="cas-select">
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (sys {Number(i.currentQty).toFixed(2)} {i.unit})
                </option>
              ))}
            </select>
            <input
              name="physical"
              type="number"
              step="0.01"
              required
              placeholder="Physical qty"
              className="cas-input"
            />
            <input name="comments" placeholder="Comments" className="cas-input" />
            <button className="cas-btn cas-btn-primary">Submit audit</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Recent audits</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>System</th>
              <th>Physical</th>
              <th>Variance %</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => {
              const high = Number(a.variancePct || 0) > threshold;
              return (
                <tr key={a.id}>
                  <td>{a.item.name}</td>
                  <td className="font-mono">{Number(a.systemQty).toFixed(2)}</td>
                  <td className="font-mono">{Number(a.physicalQty).toFixed(2)}</td>
                  <td className={`font-mono ${high ? "text-danger" : ""}`}>
                    {Number(a.variancePct || 0).toFixed(1)}%{high ? " ⚠" : ""}
                  </td>
                  <td>{a.user.fullName}</td>
                </tr>
              );
            })}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No audits yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
