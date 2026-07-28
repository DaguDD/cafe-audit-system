export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildBillReceipt, orderStatusLabel } from "@/lib/bill-receipt";
import {
  approvePaymentSubmission,
  cancelOrder,
  payAllForTable,
  payOrder,
  rejectPaymentSubmission,
} from "@/lib/order-payments";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function OrderTableDetailPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const user = await requireRoles(["admin", "manager", "server"]);
  const { tableId: tableIdRaw } = await params;
  const tableId = Number(tableIdRaw);
  if (!Number.isFinite(tableId)) notFound();

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, cafeId: user.cafeId },
  });
  if (!table) notFound();

  const settings = await prisma.cafeSettings.findUnique({ where: { cafeId: user.cafeId } });

  const [openOrders, pendingPayment, latestPayment] = await Promise.all([
    prisma.order.findMany({
      where: {
        cafeId: user.cafeId,
        tableId,
        status: { notIn: ["paid", "cancelled"] },
      },
      include: {
        items: { include: { product: true } },
        server: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paymentSubmission.findFirst({
      where: { cafeId: user.cafeId, tableId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentSubmission.findFirst({
      where: { cafeId: user.cafeId, tableId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const receipt = buildBillReceipt({
    orders: openOrders,
    vatRate: Number(settings?.vatRate ?? 15),
    serviceRate: Number(settings?.serviceChargeRate ?? 10),
  });

  async function doPayOrder(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server"]);
    const orderId = Number(formData.get("orderId"));
    await payOrder({ orderId, cafeId: u.cafeId, userId: Number(u.id) });
    revalidatePath(`/orders/${tableId}`);
    revalidatePath("/orders");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/kitchen");
    redirect(`/orders/${tableId}`);
  }

  async function doPayAll() {
    "use server";
    const u = await requireRoles(["admin", "manager", "server"]);
    await payAllForTable({ tableId, cafeId: u.cafeId, userId: Number(u.id) });
    revalidatePath(`/orders/${tableId}`);
    revalidatePath("/orders");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    redirect(`/orders/${tableId}`);
  }

  async function doCancel(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server"]);
    const orderId = Number(formData.get("orderId"));
    await cancelOrder({ orderId, cafeId: u.cafeId });
    revalidatePath(`/orders/${tableId}`);
    revalidatePath("/orders");
    revalidatePath("/kitchen");
    redirect(`/orders/${tableId}`);
  }

  async function doApprove(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server", "staff"]);
    const submissionId = Number(formData.get("submissionId"));
    await approvePaymentSubmission({
      submissionId,
      cafeId: u.cafeId,
      userId: Number(u.id),
    });
    revalidatePath(`/orders/${tableId}`);
    revalidatePath("/orders");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    redirect(`/orders/${tableId}`);
  }

  async function doReject(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server", "staff"]);
    const submissionId = Number(formData.get("submissionId"));
    const notes = String(formData.get("notes") || "");
    await rejectPaymentSubmission({
      submissionId,
      cafeId: u.cafeId,
      userId: Number(u.id),
      notes,
    });
    revalidatePath(`/orders/${tableId}`);
    revalidatePath("/orders");
    revalidatePath("/payments");
    redirect(`/orders/${tableId}`);
  }

  return (
    <AppShell
      title={`Table ${table.tableNumber}`}
      eyebrow="Orders"
      lead={`Status: ${table.status.replace(/_/g, " ")} · pay each order ticket or the full bill.`}
    >
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link href={`/server?table=${table.id}`} className="cas-btn cas-btn-primary cas-btn-sm">
          Add order
        </Link>
        <Link href="/payments" className="cas-btn cas-btn-ghost cas-btn-sm">
          Payments
        </Link>
        <Link href="/orders" className="cas-btn cas-btn-ghost cas-btn-sm">
          Back to tables
        </Link>
      </div>

      {pendingPayment && (
        <div className="cas-alert cas-alert-warning" style={{ marginBottom: "1rem" }}>
          <strong>Payment pending review</strong> — {money(pendingPayment.amountClaimed)} via{" "}
          {pendingPayment.paymentMethod} · ref {pendingPayment.referenceNumber}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(240px, 0.7fr)",
        }}
        className="orders-detail-grid"
      >
        <style>{`
          @media (max-width: 800px) {
            .orders-detail-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div className="glass-panel">
            <div className="panel-head">
              <h3>Active orders</h3>
            </div>
            <div className="panel-body" style={{ display: "grid", gap: "0.75rem" }}>
              {openOrders.length === 0 && (
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No active orders for this table.
                </p>
              )}
              {openOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div>
                      <strong>Order #{order.id}</strong>{" "}
                      <span className="badge">{orderStatusLabel(order.status)}</span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                        via {order.orderSource}
                        {order.server?.fullName ? ` · ${order.server.fullName}` : ""} ·{" "}
                        {order.createdAt.toLocaleString()}
                      </div>
                    </div>
                    <strong style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>
                      {money(order.subtotal)}
                    </strong>
                  </div>
                  <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem", fontSize: "0.85rem" }}>
                    {order.items
                      .filter((i) => i.itemStatus !== "cancelled")
                      .map((i) => (
                        <li key={i.id}>
                          {i.qty}× {i.product.name} — {money(i.lineTotal)}
                        </li>
                      ))}
                  </ul>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {pendingPayment ? (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Awaiting mobile payment approval
                      </span>
                    ) : (
                      <form action={doPayOrder}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="cas-btn cas-btn-success cas-btn-sm">
                          Mark paid (cash)
                        </button>
                      </form>
                    )}
                    <form action={doCancel}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="cas-btn cas-btn-danger cas-btn-sm">
                        Cancel
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pendingPayment && (
            <div className="glass-panel">
              <div className="panel-head">
                <h3>Customer payment proof</h3>
              </div>
              <div className="panel-body">
                {pendingPayment.screenshotUrl.startsWith("http") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingPayment.screenshotUrl}
                    alt="Payment proof"
                    style={{
                      maxHeight: 220,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      marginBottom: "0.75rem",
                      maxWidth: "100%",
                    }}
                  />
                )}
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
                  <strong>Amount:</strong> {money(pendingPayment.amountClaimed)}
                  {Number(pendingPayment.tipAmount) > 0
                    ? ` (incl. tip ${money(pendingPayment.tipAmount)})`
                    : ""}
                </p>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
                  <strong>Method:</strong> {pendingPayment.paymentMethod}
                </p>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
                  <strong>Reference:</strong>{" "}
                  <span className="font-mono">{pendingPayment.referenceNumber}</span>
                </p>
                {receipt.lines.length > 0 && (
                  <div
                    style={{
                      marginBottom: "0.85rem",
                      padding: "0.65rem",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 6 }}>Covers these items</strong>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {receipt.lines.map((line, i) => (
                        <li key={i}>
                          {line.qty}× {line.name} (order #{line.orderId}) — {money(line.lineTotal)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <form action={doApprove} style={{ marginBottom: "0.65rem" }}>
                  <input type="hidden" name="submissionId" value={pendingPayment.id} />
                  <button type="submit" className="cas-btn cas-btn-success cas-btn-block">
                    Approve & close table
                  </button>
                </form>
                <form action={doReject}>
                  <input type="hidden" name="submissionId" value={pendingPayment.id} />
                  <textarea
                    name="notes"
                    required
                    rows={2}
                    className="cas-input"
                    placeholder="Rejection reason (required)"
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <button type="submit" className="cas-btn cas-btn-danger cas-btn-sm">
                    Reject payment
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "0.75rem", alignContent: "start" }}>
          <div className="glass-panel">
            <div className="panel-head">
              <h3>Bill summary</h3>
            </div>
            <div className="panel-body">
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: "0.75rem",
                }}
              >
                {money(receipt.baseTotal)}
              </div>
              {receipt.lines.length > 0 && (
                <ul
                  style={{
                    margin: "0 0 0.85rem",
                    paddingLeft: "1.1rem",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {receipt.lines.map((line, i) => (
                    <li key={i}>
                      {line.qty}× {line.name}
                    </li>
                  ))}
                </ul>
              )}
              {receipt.baseTotal > 0 && !pendingPayment && (
                <form action={doPayAll}>
                  <button type="submit" className="cas-btn cas-btn-primary cas-btn-block">
                    Pay all (cash)
                  </button>
                </form>
              )}
              {pendingPayment && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Customer payment submitted — verify screenshot before approving.
                </p>
              )}
              {receipt.baseTotal <= 0 && !pendingPayment && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Nothing to pay.
                </p>
              )}
              {!pendingPayment && receipt.baseTotal > 0 && (
                <p
                  style={{
                    margin: "0.65rem 0 0",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  For mobile pay, guests submit proof from their menu — approve on this page or
                  Payments.
                </p>
              )}
            </div>
          </div>

          {latestPayment?.status === "rejected" && (
            <div className="cas-alert cas-alert-warning" style={{ fontSize: "0.85rem" }}>
              Last payment rejected: {latestPayment.reviewNotes || "No reason given"}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
