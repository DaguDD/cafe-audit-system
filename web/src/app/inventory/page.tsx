export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function InventoryPage() {
  await requireRoles(["admin", "manager", "auditor", "kitchen"]);
  const items = await prisma.inventory.findMany({
    orderBy: { name: "asc" },
    include: { supplier: true },
  });

  async function addItem(formData: FormData) {
    "use server";
    await requireRoles(["admin", "manager"]);
    await prisma.inventory.create({
      data: {
        name: String(formData.get("name") || "").trim(),
        unit: String(formData.get("unit") || "unit"),
        currentQty: Number(formData.get("qty") || 0),
        minThreshold: Number(formData.get("min") || 0),
        unitCost: Number(formData.get("cost") || 0),
      },
    });
    revalidatePath("/inventory");
  }

  return (
    <AppShell title="Inventory">
      <form action={addItem} className="mb-6 grid gap-2 rounded-xl border border-[#3d352c] bg-[#1a1714] p-4 sm:grid-cols-5">
        <input name="name" placeholder="Item name" required className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <input name="unit" placeholder="Unit" defaultValue="kg" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <input name="qty" type="number" step="0.01" placeholder="Qty" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <input name="min" type="number" step="0.01" placeholder="Min" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <button className="rounded bg-[#e8954a] px-3 py-2 text-sm font-medium text-[#12100e]">Add item</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-[#3d352c]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1a1714] text-[#a89f94]">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Min</th>
              <th className="px-3 py-2">Unit cost</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = Number(i.currentQty) <= Number(i.minThreshold);
              return (
                <tr key={i.id} className="border-t border-[#3d352c]">
                  <td className="px-3 py-2">{i.name} <span className="text-[#a89f94]">({i.unit})</span></td>
                  <td className={`px-3 py-2 ${low ? "text-red-300" : ""}`}>{Number(i.currentQty).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(i.minThreshold).toFixed(2)}</td>
                  <td className="px-3 py-2">{money(i.unitCost)}</td>
                  <td className="px-3 py-2">{low ? "Low stock" : "OK"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
