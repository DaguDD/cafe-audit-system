export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";
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

  const payments = await prisma.paymentSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { table: true, reviewer: true },
  });
  const isManager = ["admin", "manager"].includes(user.role);

  async function decide(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "server", "staff"]);
    const id = Number(formData.get("id"));
    const decision = String(formData.get("decision")) as "approved" | "rejected";
    const payment = await prisma.paymentSubmission.findFirst({
      where: { id, cafeId: u.cafeId },
    });
    if (!payment || payment.status !== "pending") return;

    await prisma.paymentSubmission.update({
      where: { id },
      data: {
        status: decision,
        reviewedById: Number(u.id),
        reviewedAt: new Date(),
      },
    });

    if (decision === "approved") {
      const openOrders = await prisma.order.findMany({
        where: {
          cafeId: u.cafeId,
          tableId: payment.tableId,
          status: { notIn: ["paid", "cancelled"] },
        },
        include: { items: true },
      });
      const shift =
        (await prisma.shift.findFirst({
          where: { cafeId: u.cafeId, userId: Number(u.id), status: "open" },
        })) ||
        (await prisma.shift.create({
          data: {
            cafeId: u.cafeId,
            userId: Number(u.id),
            openedBy: Number(u.id),
            autoManaged: true,
          },
        }));

      for (const order of openOrders) {
        await deductRecipes(order.items.map((i) => ({ productId: i.productId, qty: i.qty })));
        for (const item of order.items) {
          await prisma.sale.create({
            data: {
              cafeId: u.cafeId,
              productId: item.productId,
              qtySold: item.qty,
              unitPrice: item.unitPrice,
              total: item.lineTotal,
              shiftId: shift.id,
              userId: Number(u.id),
              orderId: order.id,
              tableId: order.tableId,
            },
          });
        }
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "paid", paidAt: new Date(), shiftId: shift.id },
        });
      }
      await prisma.restaurantTable.update({
        where: { id: payment.tableId },
        data: { status: "available" },
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
    <AppShell title="Payments" eyebrow="Cashier" lead="Review guest payment proofs.">
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
        {payments.map((p) => (
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
              </p>
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
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <form action={decide}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="cas-btn cas-btn-success cas-btn-sm">Approve</button>
                  </form>
                  <form action={decide}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="cas-btn cas-btn-danger cas-btn-sm">Reject</button>
                  </form>
                </div>
              )}
              {isManager && p.status !== "pending" && (
                <form action={reopen} style={{ marginTop: "0.5rem" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="cas-btn cas-btn-ghost cas-btn-sm">Reopen for review</button>
                </form>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <div className="cas-alert cas-alert-info">No payment submissions in this view.</div>
        )}
      </div>
    </AppShell>
  );
}
