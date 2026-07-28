export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function durationLabel(openedAt: Date, closedAt?: Date | null) {
  const end = closedAt || new Date();
  const mins = Math.max(0, Math.floor((end.getTime() - openedAt.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function ShiftsPage() {
  const user = await requireRoles(["admin", "manager"]);
  const cafeId = user.cafeId;
  const staff = await prisma.user.findMany({
    where: { cafeId, status: "active", role: { in: ["server", "kitchen", "staff", "manager"] } },
    orderBy: { fullName: "asc" },
  });
  const openShifts = await prisma.shift.findMany({
    where: { cafeId, status: "open" },
    include: { user: true },
    orderBy: { openedAt: "asc" },
  });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayClosed = await prisma.shift.findMany({
    where: { cafeId, status: "closed", closedAt: { gte: todayStart } },
    include: { user: true },
    orderBy: { closedAt: "desc" },
  });

  async function openShift(formData: FormData) {
    "use server";
    const opener = await requireRoles(["admin", "manager"]);
    const userId = Number(formData.get("userId"));
    if (!userId) return;
    const existing = await prisma.shift.findFirst({
      where: { cafeId: opener.cafeId, userId, status: "open" },
    });
    if (existing) return;
    await prisma.shift.create({
      data: {
        cafeId: opener.cafeId,
        userId,
        openedBy: Number(opener.id),
        autoManaged: false,
        notes: String(formData.get("notes") || "") || null,
      },
    });
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
  }

  async function closeShift(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("shiftId"));
    await prisma.shift.updateMany({
      where: { id, cafeId: u.cafeId },
      data: { status: "closed", closedAt: new Date() },
    });
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell
      title="Staff Shifts"
      eyebrow="Workforce"
      lead="Open/close floor shifts. Sales and payments auto-open a shift when needed."
    >
      <div className="cas-alert cas-alert-info">
        Manual shift open is optional for managers. Operational staff can work without a pre-opened
        shift — login or the first sale/payment will start one automatically.
      </div>

      <div className="grid-2">
        <div>
          <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
            <div className="panel-head">
              <h3>Live on floor</h3>
              <span className="badge">{openShifts.length} active</span>
            </div>
            <table className="cas-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Clock in</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openShifts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                      Nobody clocked in right now.
                    </td>
                  </tr>
                )}
                {openShifts.map((sh) => (
                  <tr key={sh.id}>
                    <td>
                      <strong>{sh.user.fullName}</strong>
                    </td>
                    <td>
                      <span className="role-pill">{sh.user.role}</span>
                    </td>
                    <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                      {sh.openedAt.toLocaleString()}
                    </td>
                    <td className="text-accent">{durationLabel(sh.openedAt)}</td>
                    <td>
                      <form action={closeShift}>
                        <input type="hidden" name="shiftId" value={sh.id} />
                        <button className="cas-btn cas-btn-danger cas-btn-sm">Clock out</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-panel">
            <div className="panel-head">
              <h3>Today&apos;s completed shifts</h3>
            </div>
            <table className="cas-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Worked</th>
                </tr>
              </thead>
              <tbody>
                {todayClosed.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                      No completed shifts yet today.
                    </td>
                  </tr>
                )}
                {todayClosed.map((sh) => (
                  <tr key={sh.id}>
                    <td>
                      {sh.user.fullName}{" "}
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        ({sh.user.role})
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                      {sh.openedAt.toLocaleString()}
                    </td>
                    <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                      {sh.closedAt?.toLocaleString() || "—"}
                    </td>
                    <td>{durationLabel(sh.openedAt, sh.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Manual shift (override)</h3>
          </div>
          <div className="panel-body">
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
              Use only if you need to open a shift for someone who is not logged in.
            </p>
            <form action={openShift}>
              <div className="form-row">
                <select name="userId" required className="cas-select">
                  <option value="">Select staff…</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <input name="notes" className="cas-input" placeholder="Notes (optional)" />
              </div>
              <button className="cas-btn cas-btn-primary">Open shift</button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
