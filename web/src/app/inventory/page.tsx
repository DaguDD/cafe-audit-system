export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export default async function InventoryPage() {
  const user = await requireRoles(["admin", "manager", "auditor", "kitchen"]);
  const cafeId = user.cafeId;
  const items = await prisma.inventory.findMany({
    where: { cafeId },
    orderBy: { name: "asc" },
    include: { supplier: true },
  });

  async function addItem(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    await prisma.inventory.create({
      data: {
        cafeId: u.cafeId,
        name: String(formData.get("name") || "").trim(),
        unit: String(formData.get("unit") || "unit"),
        currentQty: Number(formData.get("qty") || 0),
        minThreshold: Number(formData.get("min") || 0),
        unitCost: Number(formData.get("cost") || 0),
      },
    });
    revalidatePath("/inventory");
  }

  async function updateItem(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager", "auditor"]);
    const id = Number(formData.get("id"));
    await prisma.inventory.updateMany({
      where: { id, cafeId: u.cafeId },
      data: {
        name: String(formData.get("name") || "").trim(),
        unit: String(formData.get("unit") || "unit"),
        currentQty: new Decimal(Number(formData.get("qty") || 0)),
        minThreshold: new Decimal(Number(formData.get("min") || 0)),
        unitCost: new Decimal(Number(formData.get("cost") || 0)),
      },
    });
    revalidatePath("/inventory");
  }

  return (
    <AppShell title="Inventory" eyebrow="Stock" lead="Track on-hand quantities and reorder thresholds.">
      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Add item</h3>
        </div>
        <div className="panel-body">
          <form action={addItem} className="form-row cols-4">
            <input name="name" placeholder="Item name" required className="cas-input" />
            <input name="unit" placeholder="Unit" defaultValue="kg" className="cas-input" />
            <input name="qty" type="number" step="0.01" placeholder="Qty" className="cas-input" />
            <input name="min" type="number" step="0.01" placeholder="Min" className="cas-input" />
            <input name="cost" type="number" step="0.01" placeholder="Unit cost" className="cas-input" />
            <button className="cas-btn cas-btn-primary">Add item</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Stock list</h3>
          <span className="badge">{items.length} items</span>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Min</th>
              <th>Unit cost</th>
              <th>Status</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = Number(i.currentQty) <= Number(i.minThreshold);
              return (
                <tr key={i.id}>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <form
                      action={updateItem}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 0.7fr 0.7fr 0.9fr 0.7fr auto",
                        gap: "0.4rem",
                        padding: "0.55rem 0.75rem",
                        alignItems: "center",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <input type="hidden" name="id" value={i.id} />
                      <div>
                        <input name="name" defaultValue={i.name} className="cas-input" />
                        <input
                          name="unit"
                          defaultValue={i.unit}
                          className="cas-input"
                          style={{ marginTop: 4, maxWidth: 90 }}
                        />
                      </div>
                      <input
                        name="qty"
                        type="number"
                        step="0.01"
                        defaultValue={Number(i.currentQty)}
                        className={`cas-input ${low ? "text-danger" : ""}`}
                      />
                      <input
                        name="min"
                        type="number"
                        step="0.01"
                        defaultValue={Number(i.minThreshold)}
                        className="cas-input"
                      />
                      <input
                        name="cost"
                        type="number"
                        step="0.01"
                        defaultValue={Number(i.unitCost)}
                        className="cas-input"
                      />
                      <span className={`badge ${low ? "badge-danger" : "badge-success"}`}>
                        {low ? "Low" : "OK"}
                      </span>
                      <button className="cas-btn cas-btn-ghost cas-btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="panel-body" style={{ color: "var(--text-muted)" }}>
            No inventory items yet. {money(0)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
