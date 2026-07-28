export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireUser, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  await requireUser();

  const [inventory, openOrders, pendingPayments, todaySales] = await Promise.all([
    prisma.inventory.findMany({ where: { status: "active" } }),
    prisma.order.count({ where: { status: { notIn: ["paid", "cancelled"] } } }),
    prisma.paymentSubmission.count({ where: { status: "pending" } }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { soldAt: { gte: new Date(new Date().toDateString()) } },
    }),
  ]);
  const lowStock = inventory.filter(
    (r) => Number(r.currentQty) <= Number(r.minThreshold)
  ).length;

  const cards = [
    { label: "Today revenue", value: money(todaySales._sum.total || 0) },
    { label: "Open orders", value: String(openOrders) },
    { label: "Pending payments", value: String(pendingPayments) },
    { label: "Low stock items", value: String(lowStock) },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <p className="text-sm text-[#a89f94]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#e8954a]">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/audit" className="rounded-lg bg-[#e8954a] px-4 py-2 text-sm font-medium text-[#12100e]">
          Run stock audit
        </Link>
        <Link href="/tables" className="rounded-lg border border-[#3d352c] px-4 py-2 text-sm">
          Tables & QR
        </Link>
        <Link href="/kitchen" className="rounded-lg border border-[#3d352c] px-4 py-2 text-sm">
          Kitchen board
        </Link>
      </div>
    </AppShell>
  );
}
