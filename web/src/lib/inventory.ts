import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/** Deduct inventory for sold products via recipes (transactional). */
export async function deductRecipes(
  lines: { productId: number; qty: number }[]
) {
  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const recipes = await tx.recipe.findMany({
        where: { productId: line.productId },
        include: { item: true },
      });
      for (const r of recipes) {
        const need = Number(r.qtyNeeded) * line.qty;
        const item = await tx.inventory.findUnique({ where: { id: r.itemId } });
        if (!item) throw new Error("Inventory item missing");
        if (Number(item.currentQty) < need) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
        await tx.inventory.update({
          where: { id: r.itemId },
          data: { currentQty: new Decimal(Number(item.currentQty) - need) },
        });
      }
    }
  });
}

export function variancePct(systemQty: number, physicalQty: number) {
  const disc = physicalQty - systemQty;
  if (systemQty === 0) return physicalQty === 0 ? 0 : 100;
  return Math.abs((disc / systemQty) * 100);
}
