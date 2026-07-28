export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles, money } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  await requireRoles(["admin", "manager", "kitchen"]);
  const products = await prisma.product.findMany({
    where: { status: "active" },
    include: { category: true, recipes: { include: { item: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell title="Products & Recipes">
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium">{p.name}</h2>
                <p className="text-sm text-[#a89f94]">{p.category?.name || "Uncategorized"}</p>
              </div>
              <p className="text-[#e8954a]">{money(p.price)}</p>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-[#a89f94]">
              {p.recipes.map((r) => (
                <li key={r.id}>
                  {r.item.name}: {Number(r.qtyNeeded)} {r.item.unit}
                </li>
              ))}
              {p.recipes.length === 0 && <li>No recipe linked</li>}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
