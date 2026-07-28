import type { Role, Shift } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shiftGrossMinutes, shiftLunchMinutes, shiftPaidMinutes } from "@/lib/shifts";

export type PayrollPeriod = "week" | "month" | "custom";

export function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function periodRange(
  period: PayrollPeriod,
  fromStr?: string | null,
  toStr?: string | null
): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (period === "custom" && fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
    return {
      from: Number.isNaN(from.getTime()) ? startOfLocalDay() : from,
      to: Number.isNaN(to.getTime()) ? now : to,
      label: "Custom range",
    };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now, label: "This month" };
  }
  // week: Monday start
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const from = startOfLocalDay(now);
  from.setDate(from.getDate() - diff);
  return { from, to: now, label: "This week" };
}

export type StaffPayrollRow = {
  userId: number;
  fullName: string;
  role: Role;
  username: string;
  hourlyRate: number | null;
  shiftCount: number;
  grossHours: number;
  lunchMinutes: number;
  paidHours: number;
  estimatedPay: number | null;
};

export function summarizeStaffPayroll(
  staff: {
    id: number;
    fullName: string;
    role: Role;
    username: string;
    hourlyRate: { toString(): string } | number | null;
  }[],
  shifts: Shift[],
  lunchPaid: boolean
): StaffPayrollRow[] {
  return staff.map((u) => {
    const mine = shifts.filter((s) => s.userId === u.id);
    let grossMins = 0;
    let lunchMins = 0;
    let paidMins = 0;
    for (const sh of mine) {
      grossMins += shiftGrossMinutes(sh);
      lunchMins += shiftLunchMinutes(sh);
      paidMins += shiftPaidMinutes(sh, lunchPaid);
    }
    const rate = u.hourlyRate != null ? Number(u.hourlyRate) : null;
    const paidHours = Math.round((paidMins / 60) * 100) / 100;
    const estimatedPay =
      rate != null ? Math.round(paidHours * rate * 100) / 100 : null;
    return {
      userId: u.id,
      fullName: u.fullName,
      role: u.role,
      username: u.username,
      hourlyRate: rate,
      shiftCount: mine.length,
      grossHours: Math.round((grossMins / 60) * 100) / 100,
      lunchMinutes: lunchMins,
      paidHours,
      estimatedPay,
    };
  });
}

export async function loadPayroll(opts: {
  cafeId: number;
  period: PayrollPeriod;
  from?: string | null;
  to?: string | null;
}) {
  const range = periodRange(opts.period, opts.from, opts.to);
  const settings = await prisma.cafeSettings.findUnique({ where: { cafeId: opts.cafeId } });
  const lunchPaid = settings?.lunchPaid ?? false;

  const staff = await prisma.user.findMany({
    where: {
      cafeId: opts.cafeId,
      status: "active",
      role: { in: ["admin", "manager", "server", "kitchen", "staff", "auditor"] },
    },
    orderBy: { fullName: "asc" },
  });

  const shifts = await prisma.shift.findMany({
    where: {
      cafeId: opts.cafeId,
      openedAt: { gte: range.from, lte: range.to },
    },
    include: { user: true },
    orderBy: { openedAt: "desc" },
  });

  const rows = summarizeStaffPayroll(staff, shifts, lunchPaid);
  const totalPay = rows.reduce((s, r) => s + (r.estimatedPay || 0), 0);
  const totalHours = rows.reduce((s, r) => s + r.paidHours, 0);
  const totalShifts = rows.reduce((s, r) => s + r.shiftCount, 0);
  const totalLunch = rows.reduce((s, r) => s + r.lunchMinutes, 0);

  return {
    range,
    lunchPaid,
    rows,
    shifts,
    totals: { totalPay, totalHours, totalShifts, totalLunch },
  };
}

export function payrollCsv(rows: StaffPayrollRow[]) {
  const header = [
    "Name",
    "Username",
    "Role",
    "Shifts",
    "Gross hours",
    "Lunch minutes",
    "Paid hours",
    "Hourly rate",
    "Estimated pay",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.fullName),
        csvEscape(r.username),
        r.role,
        r.shiftCount,
        r.grossHours.toFixed(2),
        r.lunchMinutes,
        r.paidHours.toFixed(2),
        r.hourlyRate != null ? r.hourlyRate.toFixed(2) : "",
        r.estimatedPay != null ? r.estimatedPay.toFixed(2) : "",
      ].join(",")
    );
  }
  return lines.join("\n");
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
