export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildBillReceipt } from "@/lib/bill-receipt";
import {
  approvePaymentSubmission,
  rejectPaymentSubmission,
} from "@/lib/order-payments";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRoles(["admin", "manager", "server", "staff"]);
  const cafeId = user.cafeId;
  const sp = await searchParams;
  const filter = sp.status || "pending";
  const where =
    filter === "all"
      ? { cafeId }
      : { cafeId, status: filter as "pending" | "approved" | "rejected" };

  const [payments, settings] = await Promise.all([
    prisma.paymentSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { table: true, reviewer: true },
    }),
    prisma.cafeSettings.findUnique({ where: { cafeId } }),
  ]);

  const tableIds = [...new Set(payments.map((p) => p.tableId))];
  const openOrdersByTable =
    tableIds.length === 0
      ? []
      : await prisma.order.findMany({
          where: {
            cafeId,
            tableId: { in: tableIds },
            status: { notIn: ["paid", "cancelled"] },
          },
          include: {
            items: { include: { product: true } },
            server: { select: { fullName: true } },
          },
        });

  const linesByTable = new Map<number, { qty: number; name: string; orderId: number; lineTotal: number }[]>();
  for (const tid of tableIds) {
    const orders = openOrdersByTable.filter((o) => o.tableId === tid);
    const receipt = buildBillReceipt({
      orders,
      vatRate: Number(settings?.vatRate ?? 15),
      serviceRate: Number(settings?.serviceChargeRate ?? 10),
    });
    linesByTable.set(
      tid,
      receipt.lines.map((l) => ({
        qty: l.qty,
        name: l.name,
        orderId: l.orderId,
        lineTotal: l.lineTotal,
      }))
    );
  }

  // For approved payments, show recent sales on that table around review time as context
  const approvedIds = payments.filter((p) => p.status === "approved").map((p) => p.tableId);
  const recentSales =
    approvedIds.length === 0
      ? []
      : await prisma.sale.findMany({
          where: { cafeId, tableId: { in: approvedIds } },
          orderBy: { soldAt: "desc" },
          take: 200,
          include: { product: true },
        });

  const isManager = ["admin", "manager"].includes(user.role);

  async function decide(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server", "staff"]);
    const id = Number(formData.get("id"));
    const decision = String(formData.get("decision")) as "approved" | "rejected";
    const notes = String(formData.get("notes") || "");

    if (decision === "approved") {
      await approvePaymentSubmission({
        submissionId: id,
        cafeId: u.cafeId,
        userId: Number(u.id),
        notes: notes || undefined,
      });
    } else {
      await rejectPaymentSubmission({
        submissionId: id,
        cafeId: u.cafeId,
        userId: Number(u.id),
        notes: notes || "Rejected by staff",
      });
    }
    revalidatePath("/payments");
    revalidatePath("/orders");
    revalidatePath("/dashboard");
  }

  async function reopen(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("id"));
    await prisma.paymentSubmission.updateMany({
      where: {
        id,
        cafeId: u.cafeId,
        status: { in: ["approved", "rejected"] },
      },
      data: {
        status: "pending",
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: "Reopened for review",
      },
    });
    revalidatePath("/payments");
  }

  return (
    <AppShell
      title="Payments"
      eyebrow="Cashier"
      lead="Review guest payment proofs with the open bill lines they cover."
    >
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Link
            key={s}
            href={`/payments?status=${s}`}
            className={`cas-btn cas-btn-sm ${filter === s ? "cas-btn-primary" : "cas-btn-ghost"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {payments.map((p) => {
          const openLines = linesByTable.get(p.tableId) || [];
          const salesForTable =
            p.status === "approved"
              ? recentSales
                  .filter((s) => s.tableId === p.tableId)
                  .slice(0, 8)
              : [];

          return (
            <div key={p.id} className="glass-panel">
              <div className="panel-head">
                <h3>
                  {p.table.tableNumber} · {p.paymentMethod}
                </h3>
                <span
                  className={`badge ${
                    p.status === "pending"
                      ? "badge-warning"
                      : p.status === "approved"
                        ? "badge-success"
                        : "badge-danger"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="panel-body">
                <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Ref {p.referenceNumber} · claimed {money(p.amountClaimed)} · expected{" "}
                  {money(p.amountExpected)}
                  {Number(p.tipAmount) > 0 ? ` · tip ${money(p.tipAmount)}` : ""}
                  {" · "}
                  <Link href={`/orders/${p.tableId}`}>Open table</Link>
                </p>

                {p.status === "pending" && openLines.length > 0 && (
                  <div
                    style={{
                      marginBottom: "0.75rem",
                      padding: "0.65rem 0.75rem",
                      background: "rgba(0,0,0,0.18)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 4 }}>
                      Open bill lines (will be closed on approve)
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {openLines.map((line, i) => (
                        <li key={i}>
                          {line.qty}× {line.name}{" "}
                          <span style={{ color: "var(--text-muted)" }}>
                            · order #{line.orderId} · {money(line.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.status === "approved" && salesForTable.length > 0 && (
                  <div
                    style={{
                      marginBottom: "0.75rem",
                      padding: "0.65rem 0.75rem",
                      background: "rgba(0,0,0,0.18)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 4 }}>Recent sales on table</strong>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {salesForTable.map((s) => (
                        <li key={s.id}>
                          {Number(s.qtySold)}× {s.product.name} — {money(s.total)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.screenshotUrl.startsWith("http") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.screenshotUrl}
                    alt="Payment proof"
                    style={{
                      maxHeight: 180,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      marginBottom: "0.75rem",
                    }}
                  />
                )}
                {!p.screenshotUrl.startsWith("http") && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Proof stored: {p.screenshotUrl}
                  </p>
                )}
                {p.status === "pending" && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                    <form action={decide}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button className="cas-btn cas-btn-success cas-btn-sm">Approve</button>
                    </form>
                    <form action={decide} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input
                        name="notes"
                        className="cas-input"
                        placeholder="Reject reason"
                        required
                        style={{ maxWidth: 200 }}
                      />
                      <button className="cas-btn cas-btn-danger cas-btn-sm">Reject</button>
                    </form>
                  </div>
                )}
                {p.reviewNotes && p.status !== "pending" && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    Notes: {p.reviewNotes}
                  </p>
                )}
                {isManager && p.status !== "pending" && (
                  <form action={reopen} style={{ marginTop: "0.5rem" }}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="cas-btn cas-btn-ghost cas-btn-sm">Reopen for review</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {payments.length === 0 && (
          <div className="cas-alert cas-alert-info">No payment submissions in this view.</div>
        )}
      </div>
    </AppShell>
  );
}
