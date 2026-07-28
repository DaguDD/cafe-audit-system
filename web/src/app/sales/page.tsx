export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";

export default async function SalesPage() {
  await requireRoles(["admin", "manager", "server", "staff"]);
  const products = await prisma.product.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });
  const sales = await prisma.sale.findMany({
    take: 30,
    orderBy: { soldAt: "desc" },
    include: { product: true, user: true },
  });

  async function recordSale(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "server", "staff"]);
    const productId = Number(formData.get("productId"));
    const qty = Number(formData.get("qty") || 1);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const shift =
      (await prisma.shift.findFirst({ where: { userId: Number(user.id), status: "open" } })) ||
      (await prisma.shift.create({
        data: { userId: Number(user.id), openedBy: Number(user.id), autoManaged: true },
      }));

    await deductRecipes([{ productId, qty }]);
    await prisma.sale.create({
      data: {
        productId,
        qtySold: qty,
        unitPrice: product.price,
        total: Number(product.price) * qty,
        shiftId: shift.id,
        userId: Number(user.id),
      },
    });
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
  }

  return (
    <AppShell title="Counter Sales">
      <form action={recordSale} className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
        <select name="productId" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({money(p.price)})
            </option>
          ))}
        </select>
        <input name="qty" type="number" min={1} defaultValue={1} className="w-24 rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <button className="rounded bg-[#e8954a] px-4 py-2 text-sm font-medium text-[#12100e]">Record sale</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-[#3d352c]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1a1714] text-[#a89f94]">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-[#3d352c]">
                <td className="px-3 py-2">{s.soldAt.toLocaleString()}</td>
                <td className="px-3 py-2">{s.product.name}</td>
                <td className="px-3 py-2">{s.qtySold}</td>
                <td className="px-3 py-2">{money(s.total)}</td>
                <td className="px-3 py-2">{s.user.fullName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
