export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import InventoryTable from "@/components/InventoryTable";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import type { UserStatus } from "@prisma/client";

export default async function InventoryPage() {
  const user = await requireRoles(["admin", "manager", "auditor", "kitchen"]);
  const cafeId = user.cafeId;
  const canManage = user.role === "admin" || user.role === "manager";

  const [items, suppliers] = await Promise.all([
    prisma.inventory.findMany({
      where: { cafeId },
      orderBy: { name: "asc" },
      include: { supplier: true },
    }),
    prisma.supplier.findMany({
      where: { cafeId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  async function addItem(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await prisma.inventory.create({
      data: {
        cafeId: u.cafeId,
        name,
        unit: String(formData.get("unit") || "unit").trim() || "unit",
        currentQty: new Decimal(Number(formData.get("qty") || 0)),
        minThreshold: new Decimal(Number(formData.get("min") || 1)),
        unitCost: new Decimal(Number(formData.get("cost") || 0)),
        supplierId: Number(formData.get("supplierId") || 0) || null,
      },
    });
    revalidatePath("/inventory");
  }

  async function updateItem(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("id"));
    if (!id) return;
    const status = String(formData.get("status") || "active") as UserStatus;
    await prisma.inventory.updateMany({
      where: { id, cafeId: u.cafeId },
      data: {
        name: String(formData.get("name") || "").trim(),
        unit: String(formData.get("unit") || "unit").trim() || "unit",
        currentQty: new Decimal(Number(formData.get("qty") || 0)),
        minThreshold: new Decimal(Number(formData.get("min") || 0)),
        unitCost: new Decimal(Number(formData.get("cost") || 0)),
        supplierId: Number(formData.get("supplierId") || 0) || null,
        status: status === "inactive" ? "inactive" : "active",
      },
    });
    revalidatePath("/inventory");
  }

  const rows = items.map((i) => {
    const qty = Number(i.currentQty);
    const min = Number(i.minThreshold);
    return {
      id: i.id,
      name: i.name,
      unit: i.unit,
      qty,
      min,
      cost: Number(i.unitCost),
      supplierId: i.supplierId,
      supplierName: i.supplier?.name ?? null,
      status: i.status,
      low: qty <= min,
    };
  });

  return (
    <AppShell
      title="Inventory"
      eyebrow="Stock"
      lead="Track on-hand quantities, unit cost, and reorder thresholds."
    >
      {canManage && (
        <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>Register New Item</h3>
          </div>
          <div className="panel-body">
            <form action={addItem} className="form-row cols-4">
              <input name="name" placeholder="Item name" required className="cas-input" />
              <input name="unit" placeholder="Unit" defaultValue="kg" required className="cas-input" />
              <input
                name="qty"
                type="number"
                step="0.01"
                min="0"
                placeholder="Qty"
                required
                className="cas-input"
              />
              <input
                name="min"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Min"
                required
                className="cas-input"
              />
              <input
                name="cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="Unit cost ETB"
                defaultValue={0}
                className="cas-input"
              />
              <select name="supplierId" className="cas-select" defaultValue="">
                <option value="">Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button className="cas-btn cas-btn-primary">Add</button>
            </form>
          </div>
        </div>
      )}

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Stock list</h3>
          <span className="badge">{items.length} items</span>
        </div>
        <InventoryTable
          items={rows}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          canManage={canManage}
          updateItem={updateItem}
        />
      </div>
    </AppShell>
  );
}
