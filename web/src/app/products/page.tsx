export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import type { UserStatus } from "@prisma/client";

export default async function ProductsPage() {
  const user = await requireRoles(["admin", "manager", "kitchen"]);
  const cafeId = user.cafeId;
  const canManage = user.role === "admin" || user.role === "manager";

  const [products, categories, inventory] = await Promise.all([
    prisma.product.findMany({
      where: { cafeId },
      include: { category: true, recipes: { include: { item: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { cafeId }, orderBy: { name: "asc" } }),
    prisma.inventory.findMany({
      where: { cafeId, status: "active" },
      orderBy: { name: "asc" },
    }),
  ]);

  async function createProduct(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const name = String(formData.get("name") || "").trim();
    const price = Number(formData.get("price") || 0);
    const categoryId = Number(formData.get("categoryId") || 0) || null;
    if (!name || price < 0) return;
    await prisma.product.create({
      data: { cafeId: u.cafeId, name, price, categoryId },
    });
    revalidatePath("/products");
  }

  async function updateProduct(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("productId"));
    if (!id) return;
    const status = String(formData.get("status") || "active") as UserStatus;
    await prisma.product.updateMany({
      where: { id, cafeId: u.cafeId },
      data: {
        name: String(formData.get("name") || "").trim(),
        price: new Decimal(Number(formData.get("price") || 0)),
        categoryId: Number(formData.get("categoryId") || 0) || null,
        status: status === "inactive" ? "inactive" : "active",
      },
    });
    revalidatePath("/products");
  }

  async function addRecipe(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const productId = Number(formData.get("productId"));
    const itemId = Number(formData.get("itemId"));
    const qtyNeeded = Number(formData.get("qtyNeeded") || 0);
    if (!productId || !itemId || qtyNeeded <= 0) return;
    const product = await prisma.product.findFirst({
      where: { id: productId, cafeId: u.cafeId },
    });
    const item = await prisma.inventory.findFirst({
      where: { id: itemId, cafeId: u.cafeId },
    });
    if (!product || !item) return;
    await prisma.recipe.upsert({
      where: { productId_itemId: { productId, itemId } },
      create: { productId, itemId, qtyNeeded },
      update: { qtyNeeded },
    });
    revalidatePath("/products");
  }

  async function removeRecipe(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const recipeId = Number(formData.get("recipeId"));
    if (!recipeId) return;
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, product: { cafeId: u.cafeId } },
    });
    if (!recipe) return;
    await prisma.recipe.delete({ where: { id: recipeId } });
    revalidatePath("/products");
  }

  return (
    <AppShell
      title="Products"
      eyebrow="Menu"
      lead={
        canManage
          ? "Items sold at the register — each links to inventory via recipes"
          : "View menu products and recipe ingredients (read-only)"
      }
    >
      {canManage && (
        <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>Add product</h3>
          </div>
          <div className="panel-body">
            <form action={createProduct} className="form-row cols-3">
              <input name="name" className="cas-input" placeholder="Product name" required />
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="cas-input"
                placeholder="Price (ETB)"
                required
              />
              <select name="categoryId" className="cas-select" defaultValue="">
                <option value="">Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="cas-btn cas-btn-primary">Add</button>
            </form>
          </div>
        </div>
      )}

      {products.map((p) => (
        <div key={p.id} className="glass-panel" style={{ marginBottom: "0.85rem" }}>
          <div className="panel-head">
            <h3>
              {p.name}{" "}
              <span className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {money(p.price)}
              </span>
            </h3>
            <span className={`badge ${p.status === "active" ? "badge-success" : ""}`}>
              {p.status}
            </span>
          </div>
          <div className="panel-body">
            {canManage ? (
              <form
                action={updateProduct}
                className="form-row cols-3"
                style={{ marginBottom: "1rem" }}
              >
                <input type="hidden" name="productId" value={p.id} />
                <input name="name" className="cas-input" defaultValue={p.name} required />
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="cas-input"
                  defaultValue={Number(p.price)}
                  required
                />
                <select
                  name="categoryId"
                  className="cas-select"
                  defaultValue={p.categoryId ?? ""}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select name="status" className="cas-select" defaultValue={p.status}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <button className="cas-btn cas-btn-success cas-btn-sm">Save</button>
              </form>
            ) : (
              <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                <strong style={{ color: "var(--text)" }}>{p.name}</strong>
                {" · "}
                {money(p.price)}
                {" · "}
                {p.category?.name || "Uncategorized"}
              </p>
            )}

            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
              }}
            >
              Recipe (ingredients used per 1 sale):
            </p>

            {p.recipes.length > 0 ? (
              <table className="cas-table" style={{ marginBottom: "0.75rem" }}>
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Qty per sale</th>
                    {canManage && <th />}
                  </tr>
                </thead>
                <tbody>
                  {p.recipes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.item.name}</td>
                      <td className="font-mono">
                        {Number(r.qtyNeeded)} {r.item.unit}
                      </td>
                      {canManage && (
                        <td>
                          <form action={removeRecipe}>
                            <input type="hidden" name="recipeId" value={r.id} />
                            <button className="cas-btn cas-btn-danger cas-btn-sm">Remove</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                No recipe yet — sales won&apos;t deduct stock.
              </p>
            )}

            {canManage && (
              <form action={addRecipe} className="form-row cols-3" style={{ marginBottom: 0 }}>
                <input type="hidden" name="productId" value={p.id} />
                <select name="itemId" className="cas-select" required defaultValue="">
                  <option value="">Select ingredient…</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
                <input
                  name="qtyNeeded"
                  type="number"
                  step="0.001"
                  min="0.001"
                  className="cas-input"
                  placeholder="Qty per sale"
                  required
                />
                <button className="cas-btn cas-btn-ghost cas-btn-sm">Add ingredient</button>
              </form>
            )}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="glass-panel">
          <div className="panel-body" style={{ color: "var(--text-muted)" }}>
            No products yet.
          </div>
        </div>
      )}
    </AppShell>
  );
}
