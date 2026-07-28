import type { Role, Shift, ShiftCloseReason, ShiftStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Roles that auto-open a shift on login / first authenticated action. */
export const SHIFT_CLOCK_ROLES: Role[] = [
  "admin",
  "manager",
  "server",
  "kitchen",
  "staff",
];

export const ACTIVE_SHIFT_STATUSES: ShiftStatus[] = ["open", "on_lunch"];

export type LunchSettings = {
  lunchEnabled: boolean;
  lunchStart: string;
  lunchEnd: string;
  lunchPaid: boolean;
  timezone: string;
};

const DEFAULT_LUNCH: LunchSettings = {
  lunchEnabled: true,
  lunchStart: "12:00",
  lunchEnd: "14:00",
  lunchPaid: false,
  timezone: "Africa/Addis_Ababa",
};

export function parseHm(hm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** Local wall-clock parts in a timezone (Intl). */
export function localParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function minutesSinceMidnight(h: number, m: number) {
  return h * 60 + m;
}

export function isWithinLunchWindow(now: Date, settings: LunchSettings): boolean {
  if (!settings.lunchEnabled) return false;
  const start = parseHm(settings.lunchStart);
  const end = parseHm(settings.lunchEnd);
  if (!start || !end) return false;
  const loc = localParts(now, settings.timezone || DEFAULT_LUNCH.timezone);
  const cur = minutesSinceMidnight(loc.hour, loc.minute);
  const a = minutesSinceMidnight(start.h, start.m);
  const b = minutesSinceMidnight(end.h, end.m);
  if (a === b) return false;
  if (a < b) return cur >= a && cur < b;
  // Overnight window (rare)
  return cur >= a || cur < b;
}

/** True once local time is at or past lunch end (same calendar day). */
export function isPastLunchWindowEnd(now: Date, settings: LunchSettings): boolean {
  if (!settings.lunchEnabled) return false;
  const end = parseHm(settings.lunchEnd);
  if (!end) return false;
  const loc = localParts(now, settings.timezone || DEFAULT_LUNCH.timezone);
  return minutesSinceMidnight(loc.hour, loc.minute) >= minutesSinceMidnight(end.h, end.m);
}

export async function getCafeLunchSettings(cafeId: number): Promise<LunchSettings> {
  const s = await prisma.cafeSettings.findUnique({ where: { cafeId } });
  if (!s) return { ...DEFAULT_LUNCH };
  return {
    lunchEnabled: s.lunchEnabled,
    lunchStart: s.lunchStart || DEFAULT_LUNCH.lunchStart,
    lunchEnd: s.lunchEnd || DEFAULT_LUNCH.lunchEnd,
    lunchPaid: s.lunchPaid,
    timezone: s.timezone || DEFAULT_LUNCH.timezone,
  };
}

export function durationLabel(openedAt: Date, closedAt?: Date | null) {
  const end = closedAt || new Date();
  const mins = Math.max(0, Math.floor((end.getTime() - openedAt.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Gross minutes on shift (clock-in → clock-out or now). */
export function shiftGrossMinutes(
  shift: { openedAt: Date; closedAt?: Date | null },
  now = new Date()
) {
  const end = shift.closedAt || now;
  return Math.max(0, Math.floor((end.getTime() - shift.openedAt.getTime()) / 60000));
}

/** Lunch minutes deducted for payroll (completed lunch, or in-progress lunch). */
export function shiftLunchMinutes(
  shift: {
    lunchMinutes?: number | null;
    lunchStartedAt?: Date | null;
    lunchEndedAt?: Date | null;
    status?: ShiftStatus;
  },
  now = new Date()
) {
  if (shift.lunchMinutes != null && shift.lunchMinutes >= 0) return shift.lunchMinutes;
  if (shift.lunchStartedAt && shift.lunchEndedAt) {
    return Math.max(
      0,
      Math.floor((shift.lunchEndedAt.getTime() - shift.lunchStartedAt.getTime()) / 60000)
    );
  }
  if (shift.status === "on_lunch" && shift.lunchStartedAt) {
    return Math.max(0, Math.floor((now.getTime() - shift.lunchStartedAt.getTime()) / 60000));
  }
  return 0;
}

/** Paid minutes = gross − unpaid lunch. */
export function shiftPaidMinutes(
  shift: {
    openedAt: Date;
    closedAt?: Date | null;
    lunchMinutes?: number | null;
    lunchStartedAt?: Date | null;
    lunchEndedAt?: Date | null;
    status?: ShiftStatus;
  },
  lunchPaid: boolean,
  now = new Date()
) {
  const gross = shiftGrossMinutes(shift, now);
  if (lunchPaid) return gross;
  return Math.max(0, gross - shiftLunchMinutes(shift, now));
}

export async function findActiveShift(cafeId: number, userId: number) {
  return prisma.shift.findFirst({
    where: { cafeId, userId, status: { in: ACTIVE_SHIFT_STATUSES } },
    orderBy: { openedAt: "desc" },
  });
}

/**
 * Auto clock-in for cafe floor roles — mirrors V2 Shift::autoClockIn,
 * extended to managers/admins so they are not forced into manual timesheets.
 */
export async function autoClockIn(opts: {
  cafeId: number;
  userId: number;
  role: Role;
}): Promise<Shift | null> {
  if (!SHIFT_CLOCK_ROLES.includes(opts.role)) return null;
  if (!opts.cafeId) return null;
  const existing = await findActiveShift(opts.cafeId, opts.userId);
  if (existing) return existing;
  return prisma.shift.create({
    data: {
      cafeId: opts.cafeId,
      userId: opts.userId,
      openedBy: opts.userId,
      autoManaged: true,
      status: "open",
    },
  });
}

/** Ensure an open (working) shift for sales/payments — creates if needed. */
export async function ensureOpenShift(cafeId: number, userId: number) {
  const existing = await findActiveShift(cafeId, userId);
  if (existing) {
    if (existing.status === "on_lunch") {
      // Transactions while on lunch: stay on same shift but keep status
      return existing;
    }
    return existing;
  }
  return prisma.shift.create({
    data: {
      cafeId,
      userId,
      openedBy: userId,
      autoManaged: true,
      status: "open",
    },
  });
}

/**
 * V2 resolveForTransaction: own active shift, else managers may use any open shift.
 */
export async function resolveForTransaction(cafeId: number, userId: number, role: Role) {
  const own = await findActiveShift(cafeId, userId);
  if (own) return own;
  if (role === "admin" || role === "manager") {
    return prisma.shift.findFirst({
      where: { cafeId, status: { in: ACTIVE_SHIFT_STATUSES } },
      orderBy: { openedAt: "desc" },
    });
  }
  return null;
}

export async function closeShiftById(
  shiftId: number,
  cafeId: number,
  reason: ShiftCloseReason = "manual"
) {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, cafeId, status: { in: ACTIVE_SHIFT_STATUSES } },
  });
  if (!shift) return null;
  let lunchMinutes = shift.lunchMinutes;
  if (shift.status === "on_lunch" && shift.lunchStartedAt && lunchMinutes == null) {
    lunchMinutes = Math.max(
      0,
      Math.floor((Date.now() - shift.lunchStartedAt.getTime()) / 60000)
    );
  }
  return prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: "closed",
      closedAt: new Date(),
      closeReason: reason,
      lunchEndedAt: shift.lunchEndedAt ?? (shift.status === "on_lunch" ? new Date() : undefined),
      lunchMinutes,
    },
  });
}

export async function startLunch(cafeId: number, userId: number) {
  const settings = await getCafeLunchSettings(cafeId);
  if (!settings.lunchEnabled) {
    return { ok: false as const, message: "Lunch break is disabled for this cafe." };
  }
  if (!isWithinLunchWindow(new Date(), settings)) {
    return {
      ok: false as const,
      message: `Lunch is only available ${settings.lunchStart}–${settings.lunchEnd} (${settings.timezone}).`,
    };
  }
  const shift = await findActiveShift(cafeId, userId);
  if (!shift) return { ok: false as const, message: "No open shift — clock in first." };
  if (shift.status === "on_lunch") {
    return { ok: false as const, message: "Already out for lunch." };
  }
  if (shift.lunchStartedAt && shift.lunchEndedAt) {
    return { ok: false as const, message: "Lunch already recorded for this shift." };
  }
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: { status: "on_lunch", lunchStartedAt: new Date() },
  });
  return { ok: true as const, shift: updated };
}

export async function endLunch(cafeId: number, userId: number) {
  const shift = await prisma.shift.findFirst({
    where: { cafeId, userId, status: "on_lunch" },
    orderBy: { openedAt: "desc" },
  });
  if (!shift || !shift.lunchStartedAt) {
    return { ok: false as const, message: "You are not currently on lunch." };
  }
  const ended = new Date();
  const lunchMinutes = Math.max(
    0,
    Math.floor((ended.getTime() - shift.lunchStartedAt.getTime()) / 60000)
  );
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: "open",
      lunchEndedAt: ended,
      lunchMinutes,
    },
  });
  return { ok: true as const, shift: updated, lunchMinutes };
}

/**
 * Lunch rule (shown in UI):
 * If lunch window ends and a worker is still status=open (never pressed Out for lunch),
 * auto clock-out with closeReason=missed_lunch.
 * Workers already on_lunch are left alone until they return or a manager closes.
 */
export async function enforceMissedLunchClockOut(cafeId: number) {
  const settings = await getCafeLunchSettings(cafeId);
  if (!settings.lunchEnabled || !isPastLunchWindowEnd(new Date(), settings)) {
    return { closed: 0 };
  }
  const openWorking = await prisma.shift.findMany({
    where: {
      cafeId,
      status: "open",
      lunchStartedAt: null,
    },
  });
  let closed = 0;
  for (const sh of openWorking) {
    await prisma.shift.update({
      where: { id: sh.id },
      data: {
        status: "closed",
        closedAt: new Date(),
        closeReason: "missed_lunch",
        notes: sh.notes
          ? `${sh.notes}\nAuto clock-out: lunch window ended without Out for lunch.`
          : "Auto clock-out: lunch window ended without Out for lunch.",
      },
    });
    closed += 1;
  }
  return { closed };
}

/** Optional end-of-day: close all active shifts for the cafe. */
export async function closeAllOpenShifts(cafeId: number, reason: ShiftCloseReason = "end_of_day") {
  const active = await prisma.shift.findMany({
    where: { cafeId, status: { in: ACTIVE_SHIFT_STATUSES } },
  });
  for (const sh of active) {
    await closeShiftById(sh.id, cafeId, reason);
  }
  return { closed: active.length };
}

export function closeReasonLabel(reason: ShiftCloseReason | null | undefined) {
  switch (reason) {
    case "missed_lunch":
      return "Missed lunch (auto)";
    case "end_of_day":
      return "End of day";
    case "logout":
      return "Logout";
    case "lunch_ended":
      return "Lunch ended";
    case "manual":
      return "Manual";
    default:
      return "—";
  }
}
