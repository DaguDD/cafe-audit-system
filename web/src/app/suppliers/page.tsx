export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export default async function SuppliersPage() {
  const user = await requireRoles(["admin", "manager"]);
  const cafeId = user.cafeId;
  const [suppliers, items, orders] = await Promise.all([
    prisma.supplier.findMany({ where: { cafeId }, orderBy: { name: "asc" } }),
    prisma.inventory.findMany({ where: { cafeId, status: "active" }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: { cafeId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { item: true, supplier: true },
    }),
  ]);

  async function addSupplier(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await prisma.supplier.create({
      data: {
        cafeId: u.cafeId,
        name,
        contactInfo: String(formData.get("contact") || "") || null,
        email: String(formData.get("email") || "") || null,
      },
    });
    revalidatePath("/suppliers");
  }

  async function createPo(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager"]);
    const itemId = Number(formData.get("itemId"));
    const supplierId = Number(formData.get("supplierId"));
    const orderedQty = Number(formData.get("orderedQty"));
    const unitCost = Number(formData.get("unitCost") || 0);
    const expected = String(formData.get("expected") || "");
    if (!itemId || !supplierId || orderedQty <= 0) return;
    await prisma.purchaseOrder.create({
      data: {
        cafeId: user.cafeId,
        itemId,
        supplierId,
        orderedQty,
        unitCost,
        totalCost: orderedQty * unitCost,
        expectedDelivery: expected ? new Date(expected) : null,
        createdBy: Number(user.id),
      },
    });
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");
  }

  async function receivePo(formData: FormData) {
    "use server";
    const id = Number(formData.get("poId"));
    const u = await requireRoles(["admin", "manager"]);
    const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { id, cafeId: u.cafeId } });
    if (po.status !== "pending") return;
    const item = await prisma.inventory.findFirstOrThrow({ where: { id: po.itemId, cafeId: u.cafeId } });
    await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id },
        data: { status: "received", receivedAt: new Date() },
      }),
      prisma.inventory.update({
        where: { id: po.itemId },
        data: {
          currentQty: new Decimal(Number(item.currentQty) + Number(po.orderedQty)),
        },
      }),
    ]);
    revalidatePath("/suppliers");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Suppliers & POs" eyebrow="Procurement">
      <div className="grid-2" style={{ marginBottom: "0.85rem" }}>
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Vendor Registry</h3>
          </div>
          <div className="panel-body">
            <form action={addSupplier}>
              <div className="form-row">
                <input name="name" className="cas-input" placeholder="Supplier name" required />
              </div>
              <div className="form-row cols-2">
                <input name="contact" className="cas-input" placeholder="Phone" />
                <input name="email" type="email" className="cas-input" placeholder="Email" />
              </div>
              <button className="cas-btn cas-btn-primary cas-btn-sm">Add Vendor</button>
            </form>
            <table className="cas-table" style={{ marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {s.contactInfo || s.email || "—"}
                    </td>
                    <td>
                      <span className="badge">{s.status}</span>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                      No suppliers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-head">
            <h3>Create Purchase Order</h3>
          </div>
          <div className="panel-body">
            <form action={createPo}>
              <div className="form-row cols-2">
                <select name="itemId" required className="cas-select">
                  <option value="">Inventory item…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <select name="supplierId" required className="cas-select">
                  <option value="">Supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row cols-3">
                <input
                  name="orderedQty"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="cas-input"
                  placeholder="Qty"
                />
                <input
                  name="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  className="cas-input"
                  placeholder="Unit cost"
                  defaultValue={0}
                />
                <input name="expected" type="date" className="cas-input" />
              </div>
              <button className="cas-btn cas-btn-primary">Submit PO</button>
            </form>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Order Pipeline</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Supplier</th>
              <th>Qty</th>
              <th>Unit cost</th>
              <th>Total</th>
              <th>Status</th>
              <th>Expected</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  No purchase orders yet.
                </td>
              </tr>
            )}
            {orders.map((po) => (
              <tr key={po.id}>
                <td>{po.item.name}</td>
                <td>{po.supplier.name}</td>
                <td className="font-mono">{Number(po.orderedQty).toFixed(2)}</td>
                <td className="font-mono">{money(po.unitCost)}</td>
                <td className="font-mono">{money(po.totalCost)}</td>
                <td>
                  <span
                    className={`badge ${
                      po.status === "pending"
                        ? "badge-warning"
                        : po.status === "received"
                          ? "badge-success"
                          : ""
                    }`}
                  >
                    {po.status}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {po.expectedDelivery ? po.expectedDelivery.toLocaleDateString() : "—"}
                </td>
                <td>
                  {po.status === "pending" && (
                    <form action={receivePo}>
                      <input type="hidden" name="poId" value={po.id} />
                      <button className="cas-btn cas-btn-success cas-btn-sm">Receive</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
