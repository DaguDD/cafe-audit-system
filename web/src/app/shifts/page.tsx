export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  ACTIVE_SHIFT_STATUSES,
  closeAllOpenShifts,
  closeReasonLabel,
  closeShiftById,
  durationLabel,
  getCafeLunchSettings,
  shiftLunchMinutes,
} from "@/lib/shifts";

export default async function ShiftsPage() {
  const user = await requireRoles(["admin", "manager"]);
  const cafeId = user.cafeId;
  const lunch = await getCafeLunchSettings(cafeId);
  const staff = await prisma.user.findMany({
    where: { cafeId, status: "active", role: { in: ["server", "kitchen", "staff", "manager", "admin"] } },
    orderBy: { fullName: "asc" },
  });
  const openShifts = await prisma.shift.findMany({
    where: { cafeId, status: { in: ACTIVE_SHIFT_STATUSES } },
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
      where: {
        cafeId: opener.cafeId,
        userId,
        status: { in: ACTIVE_SHIFT_STATUSES },
      },
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
    revalidatePath("/payroll");
  }

  async function closeShift(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("shiftId"));
    await closeShiftById(id, u.cafeId, "manual");
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    revalidatePath("/payroll");
  }

  async function closeAllToday() {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    await closeAllOpenShifts(u.cafeId, "end_of_day");
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    revalidatePath("/payroll");
  }

  async function saveLunchSettings(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const lunchEnabled = formData.get("lunchEnabled") === "1";
    const lunchPaid = formData.get("lunchPaid") === "1";
    const lunchStart = String(formData.get("lunchStart") || "12:00").slice(0, 5);
    const lunchEnd = String(formData.get("lunchEnd") || "14:00").slice(0, 5);
    await prisma.cafeSettings.upsert({
      where: { cafeId: u.cafeId },
      update: { lunchEnabled, lunchPaid, lunchStart, lunchEnd },
      create: {
        cafeId: u.cafeId,
        lunchEnabled,
        lunchPaid,
        lunchStart,
        lunchEnd,
      },
    });
    revalidatePath("/shifts");
    revalidatePath("/settings");
    revalidatePath("/payroll");
  }

  return (
    <AppShell
      title="Staff Shifts"
      eyebrow="Workforce"
      lead="Shifts auto-open when cafe staff sign in. Use this page to monitor the floor and close the day."
    >
      <div className="cas-alert cas-alert-info">
        <strong>Auto clock-in:</strong> cafe roles get an open shift on login (and on first desk
        action). Manual open is only a fallback.
        <br />
        <strong>Lunch rule:</strong> during {lunch.lunchStart}–{lunch.lunchEnd} (
        {lunch.timezone}), press <em>Out for lunch</em>. If the lunch window ends and you never
        pressed it while still working, your shift is <strong>auto clocked out</strong> (missed
        lunch). Returning from lunch: press <em>Back from lunch</em> (re-auth if session expired).
      </div>

      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Lunch window</h3>
            <span className="badge">{lunch.lunchEnabled ? "Enabled" : "Off"}</span>
          </div>
          <div className="panel-body">
            <form action={saveLunchSettings}>
              <div className="form-row cols-2">
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Start</label>
                  <input
                    name="lunchStart"
                    type="time"
                    className="cas-input"
                    defaultValue={lunch.lunchStart}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>End</label>
                  <input
                    name="lunchEnd"
                    type="time"
                    className="cas-input"
                    defaultValue={lunch.lunchEnd}
                    required
                  />
                </div>
              </div>
              <div className="form-row cols-2">
                <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="lunchEnabled"
                    value="1"
                    defaultChecked={lunch.lunchEnabled}
                  />
                  Enable lunch window
                </label>
                <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" name="lunchPaid" value="1" defaultChecked={lunch.lunchPaid} />
                  Lunch is paid (else deducted in Payroll)
                </label>
              </div>
              <button className="cas-btn cas-btn-primary cas-btn-sm">Save lunch settings</button>
            </form>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>End of day</h3>
          </div>
          <div className="panel-body">
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
              Close every open / on-lunch shift for this cafe. Managers do not need to clock
              themselves out session-by-session for normal work.
            </p>
            <form action={closeAllToday}>
              <button className="cas-btn cas-btn-danger" type="submit">
                Close all open shifts
              </button>
            </form>
          </div>
        </div>
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
                  <th>Status</th>
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
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {sh.user.role}
                        {sh.autoManaged ? " · auto" : ""}
                      </div>
                    </td>
                    <td>
                      {sh.status === "on_lunch" ? (
                        <span className="badge" style={{ color: "var(--accent)" }}>
                          On lunch
                          {sh.lunchStartedAt
                            ? ` · ${shiftLunchMinutes(sh)}m`
                            : ""}
                        </span>
                      ) : (
                        <span className="badge">Working</span>
                      )}
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
                  <th>Clock in / out</th>
                  <th>Lunch</th>
                  <th>Reason</th>
                  <th>Worked</th>
                </tr>
              </thead>
              <tbody>
                {todayClosed.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--text-muted)" }}>
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
                    <td className="font-mono" style={{ fontSize: "0.72rem" }}>
                      {sh.openedAt.toLocaleTimeString()} → {sh.closedAt?.toLocaleTimeString() || "—"}
                    </td>
                    <td>{shiftLunchMinutes(sh)}m</td>
                    <td style={{ fontSize: "0.75rem" }}>{closeReasonLabel(sh.closeReason)}</td>
                    <td>{durationLabel(sh.openedAt, sh.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Manual shift (fallback)</h3>
          </div>
          <div className="panel-body">
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
              Use only if someone needs a shift without logging in (edge cases).
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
