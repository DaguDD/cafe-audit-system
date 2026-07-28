import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadPayroll, payrollCsv, type PayrollPeriod } from "@/lib/payroll";

export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  const cafeId = session?.user?.cafeId;
  if (!session?.user || !cafeId || !role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!["admin", "manager", "auditor"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const url = new URL(req.url);
  const period = (["week", "month", "custom"].includes(url.searchParams.get("period") || "")
    ? url.searchParams.get("period")
    : "week") as PayrollPeriod;

  const data = await loadPayroll({
    cafeId,
    period,
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  const csv = payrollCsv(data.rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="casora-payroll-${period}.csv"`,
    },
  });
}
