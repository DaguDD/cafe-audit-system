export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { variancePct } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export default async function AuditPage() {
  await requireRoles(["admin", "manager", "auditor"]);
  const threshold = Number(process.env.VARIANCE_THRESHOLD_PCT || 10);
  const items = await prisma.inventory.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });
  const recent = await prisma.auditLog.findMany({
    take: 15,
    orderBy: { auditedAt: "desc" },
    include: { item: true, user: true },
  });

  async function submitAudit(formData: FormData) {
    "use server";
    const user = await requireRoles(["admin", "manager", "auditor"]);
    const itemId = Number(formData.get("itemId"));
    const physical = Number(formData.get("physical"));
    const comments = String(formData.get("comments") || "");
    const item = await prisma.inventory.findUniqueOrThrow({ where: { id: itemId } });
    const system = Number(item.currentQty);
    const discrepancy = physical - system;
    const vp = variancePct(system, physical);

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          itemId,
          systemQty: system,
          physicalQty: physical,
          discrepancy,
          variancePct: vp,
          userId: Number(user.id),
          comments: comments || null,
        },
      }),
      prisma.inventory.update({
        where: { id: itemId },
        data: { currentQty: new Decimal(physical) },
      }),
    ]);
    revalidatePath("/audit");
    revalidatePath("/inventory");
  }

  return (
    <AppShell title="Stock Audit">
      <p className="mb-4 text-sm text-[#a89f94]">
        Compare physical count to system quantity. Items with variance above {threshold}% are flagged.
      </p>
      <form action={submitAudit} className="mb-8 grid gap-2 rounded-xl border border-[#3d352c] bg-[#1a1714] p-4 sm:grid-cols-4">
        <select name="itemId" required className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm">
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} (sys {Number(i.currentQty).toFixed(2)} {i.unit})
            </option>
          ))}
        </select>
        <input name="physical" type="number" step="0.01" required placeholder="Physical qty" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <input name="comments" placeholder="Comments" className="rounded border border-[#3d352c] bg-[#12100e] px-2 py-2 text-sm" />
        <button className="rounded bg-[#e8954a] px-3 py-2 text-sm font-medium text-[#12100e]">Submit audit</button>
      </form>

      <h2 className="mb-2 text-lg font-medium">Recent audits</h2>
      <div className="overflow-x-auto rounded-xl border border-[#3d352c]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1a1714] text-[#a89f94]">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">System</th>
              <th className="px-3 py-2">Physical</th>
              <th className="px-3 py-2">Variance %</th>
              <th className="px-3 py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => {
              const high = Number(a.variancePct || 0) > threshold;
              return (
                <tr key={a.id} className="border-t border-[#3d352c]">
                  <td className="px-3 py-2">{a.item.name}</td>
                  <td className="px-3 py-2">{Number(a.systemQty).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(a.physicalQty).toFixed(2)}</td>
                  <td className={`px-3 py-2 ${high ? "text-red-300 font-medium" : ""}`}>
                    {Number(a.variancePct || 0).toFixed(1)}%{high ? " ⚠" : ""}
                  </td>
                  <td className="px-3 py-2">{a.user.fullName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
