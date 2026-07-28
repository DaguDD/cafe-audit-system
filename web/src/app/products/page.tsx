export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function ProductsPage() {
  const user = await requireRoles(["admin", "manager", "kitchen"]);
  const cafeId = user.cafeId;
  const [products, categories, inventory] = await Promise.all([
    prisma.product.findMany({
      where: { cafeId, status: "active" },
      include: { category: true, recipes: { include: { item: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { cafeId }, orderBy: { name: "asc" } }),
    prisma.inventory.findMany({ where: { cafeId, status: "active" }, orderBy: { name: "asc" } }),
  ]);

  async function createProduct(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const name = String(formData.get("name") || "").trim();
    const price = Number(formData.get("price") || 0);
    const categoryId = Number(formData.get("categoryId") || 0) || null;
    const description = String(formData.get("description") || "") || null;
    if (!name || price < 0) return;
    const product = await prisma.product.create({
      data: { cafeId: u.cafeId, name, price, categoryId, description },
    });
    const itemId = Number(formData.get("recipeItemId") || 0);
    const qtyNeeded = Number(formData.get("recipeQty") || 0);
    if (itemId && qtyNeeded > 0) {
      await prisma.recipe.create({
        data: { productId: product.id, itemId, qtyNeeded },
      });
    }
    revalidatePath("/products");
  }

  return (
    <AppShell title="Products & Recipes" eyebrow="Menu" lead="Sellable items and recipe links.">
      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Create product</h3>
        </div>
        <div className="panel-body">
          <form action={createProduct}>
            <div className="form-row cols-3">
              <input name="name" className="cas-input" placeholder="Product name" required />
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="cas-input"
                placeholder="Price ETB"
                required
              />
              <select name="categoryId" className="cas-select" defaultValue="">
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <input name="description" className="cas-input" placeholder="Description (optional)" />
            </div>
            <div className="form-row cols-2">
              <select name="recipeItemId" className="cas-select" defaultValue="">
                <option value="">Recipe ingredient (optional)</option>
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
              <input
                name="recipeQty"
                type="number"
                step="0.01"
                min="0"
                className="cas-input"
                placeholder="Qty needed per serving"
              />
            </div>
            <button className="cas-btn cas-btn-primary">Add product</button>
          </form>
        </div>
      </div>

      <div className="grid-2">
        {products.map((p) => (
          <div key={p.id} className="glass-panel">
            <div className="panel-head">
              <h3>{p.name}</h3>
              <span className="text-accent font-mono">{money(p.price)}</span>
            </div>
            <div className="panel-body">
              <p style={{ margin: "0 0 0.65rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {p.category?.name || "Uncategorized"}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {p.recipes.map((r) => (
                  <li key={r.id}>
                    {r.item.name}: {Number(r.qtyNeeded)} {r.item.unit}
                  </li>
                ))}
                {p.recipes.length === 0 && <li>No recipe linked</li>}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
