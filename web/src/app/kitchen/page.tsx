export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function KitchenPage() {
  await requireRoles(["admin", "manager", "kitchen"]);
  const orders = await prisma.order.findMany({
    where: { status: { in: ["committed", "preparing", "pending"] } },
    orderBy: { createdAt: "asc" },
    include: { table: true, items: { include: { product: true } } },
  });

  async function bump(formData: FormData) {
    "use server";
    await requireRoles(["admin", "manager", "kitchen"]);
    const id = Number(formData.get("id"));
    const status = String(formData.get("status")) as "preparing" | "served" | "committed";
    await prisma.order.update({ where: { id }, data: { status } });
    if (status === "served" || status === "preparing") {
      await prisma.orderItem.updateMany({
        where: { orderId: id },
        data: { itemStatus: status === "served" ? "served" : "preparing" },
      });
    }
    revalidatePath("/kitchen");
    revalidatePath("/orders");
  }

  return (
    <AppShell title="Kitchen Display">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <p className="text-lg font-medium">{o.table.tableNumber}</p>
            <p className="text-sm text-[#e8954a]">{o.status}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.qty}× {i.product.name}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <form action={bump}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="status" value="preparing" />
                <button className="rounded border border-[#3d352c] px-3 py-1 text-sm">Preparing</button>
              </form>
              <form action={bump}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="status" value="served" />
                <button className="rounded bg-[#e8954a] px-3 py-1 text-sm text-[#12100e]">Served</button>
              </form>
            </div>
          </div>
        ))}
      </div>
      {orders.length === 0 && <p className="text-[#a89f94]">Kitchen queue is empty.</p>}
    </AppShell>
  );
}
