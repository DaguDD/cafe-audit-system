export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import type { WasteReason } from "@prisma/client";

export default async function WastePage() {
  const user = await requireRoles(["admin", "manager", "server", "staff", "kitchen"]);
  const items = await prisma.inventory.findMany({
    where: { cafeId: user.cafeId, status: "active" },
    orderBy: { name: "asc" },
  });
  const recent = await prisma.wasteLog.findMany({
    where: { cafeId: user.cafeId },
    take: 40,
    orderBy: { loggedAt: "desc" },
    include: { item: true, user: true },
  });

  async function logWaste(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server", "staff", "kitchen"]);
    const itemId = Number(formData.get("itemId"));
    const wasteQty = Number(formData.get("wasteQty"));
    const reason = String(formData.get("reason") || "other") as WasteReason;
    if (!itemId || wasteQty <= 0) return;

    const item = await prisma.inventory.findFirstOrThrow({ where: { id: itemId, cafeId: u.cafeId } });
    const shift = await prisma.shift.findFirst({
      where: { cafeId: u.cafeId, userId: Number(u.id), status: "open" },
    });

    await prisma.$transaction([
      prisma.wasteLog.create({
        data: {
          cafeId: u.cafeId,
          itemId,
          wasteQty,
          reason,
          userId: Number(u.id),
          shiftId: shift?.id ?? null,
        },
      }),
      prisma.inventory.update({
        where: { id: itemId },
        data: {
          currentQty: new Decimal(Math.max(0, Number(item.currentQty) - wasteQty)),
        },
      }),
    ]);
    revalidatePath("/waste");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Waste Log" eyebrow="Loss" lead="Record spoilage and deduct inventory.">
      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Log Event</h3>
        </div>
        <div className="panel-body">
          <form action={logWaste} className="form-row cols-4">
            <select name="itemId" required className="cas-select">
              <option value="">Select item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({Number(i.currentQty).toFixed(2)} {i.unit})
                </option>
              ))}
            </select>
            <input
              name="wasteQty"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Qty"
              className="cas-input"
            />
            <select name="reason" required className="cas-select" defaultValue="expired">
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
              <option value="spilled">Spilled</option>
              <option value="other">Other</option>
            </select>
            <button className="cas-btn cas-btn-primary">Log</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Event Log</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No waste events yet.
                </td>
              </tr>
            )}
            {recent.map((w) => (
              <tr key={w.id}>
                <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                  {w.loggedAt.toLocaleString()}
                </td>
                <td>{w.item.name}</td>
                <td className="font-mono">
                  {Number(w.wasteQty).toFixed(2)} {w.item.unit}
                </td>
                <td>{w.reason}</td>
                <td>{w.user.fullName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
