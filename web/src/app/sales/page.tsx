export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deductRecipes } from "@/lib/inventory";

export default async function SalesPage() {
  const user = await requireRoles(["admin", "manager", "server", "staff"]);
  const products = await prisma.product.findMany({
    where: { cafeId: user.cafeId, status: "active" },
    orderBy: { name: "asc" },
  });
  const sales = await prisma.sale.findMany({
    where: { cafeId: user.cafeId },
    take: 30,
    orderBy: { soldAt: "desc" },
    include: { product: true, user: true },
  });

  async function recordSale(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "server", "staff"]);
    const productId = Number(formData.get("productId"));
    const qty = Number(formData.get("qty") || 1);
    const product = await prisma.product.findFirstOrThrow({ where: { id: productId, cafeId: user.cafeId } });
    const shift =
      (await prisma.shift.findFirst({ where: { cafeId: user.cafeId, userId: Number(user.id), status: "open" } })) ||
      (await prisma.shift.create({
        data: { cafeId: user.cafeId, userId: Number(user.id), openedBy: Number(user.id), autoManaged: true },
      }));

    await deductRecipes([{ productId, qty }]);
    await prisma.sale.create({
      data: {
        cafeId: user.cafeId,
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
    <AppShell title="Counter Sales" eyebrow="POS" lead="Quick walk-up sales with recipe deduction.">
      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Record sale</h3>
        </div>
        <div className="panel-body">
          <form action={recordSale} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <select name="productId" className="cas-select" style={{ maxWidth: 280 }}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({money(p.price)})
                </option>
              ))}
            </select>
            <input
              name="qty"
              type="number"
              min={1}
              defaultValue={1}
              className="cas-input"
              style={{ maxWidth: 100 }}
            />
            <button className="cas-btn cas-btn-primary">Record sale</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>Recent sales</h3>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="font-mono" style={{ fontSize: "0.75rem" }}>
                  {s.soldAt.toLocaleString()}
                </td>
                <td>{s.product.name}</td>
                <td>{s.qtySold}</td>
                <td className="font-mono">{money(s.total)}</td>
                <td>{s.user.fullName}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No sales yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
