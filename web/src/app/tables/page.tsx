export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import Image from "next/image";

export default async function TablesPage() {
  await requireRoles(["admin", "manager"]);
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  const tables = await prisma.restaurantTable.findMany({ orderBy: { tableNumber: "asc" } });

  const withQr = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      menuUrl: `${base}/customer/menu?table=${t.qrToken}`,
      qrDataUrl: await QRCode.toDataURL(`${base}/customer/menu?table=${t.qrToken}`, { width: 180, margin: 1 }),
    }))
  );

  async function addTable(formData: FormData) {
    "use server";
    await requireRoles(["admin", "manager"]);
    const num = String(formData.get("tableNumber") || "").trim();
    if (!num) return;
    await prisma.restaurantTable.create({
      data: {
        tableNumber: num,
        qrToken: randomBytes(16).toString("hex"),
        capacity: Number(formData.get("capacity") || 4),
      },
    });
    revalidatePath("/tables");
  }

  async function regenerate(formData: FormData) {
    "use server";
    await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("id"));
    await prisma.restaurantTable.update({
      where: { id },
      data: { qrToken: randomBytes(16).toString("hex") },
    });
    revalidatePath("/tables");
  }

  return (
    <AppShell title="Tables & QR">
      <form action={addTable} className="mb-6 flex flex-wrap gap-2">
        <input name="tableNumber" placeholder="T09" required className="rounded border border-[#3d352c] bg-[#1a1714] px-3 py-2 text-sm" />
        <input name="capacity" type="number" defaultValue={4} className="w-24 rounded border border-[#3d352c] bg-[#1a1714] px-3 py-2 text-sm" />
        <button className="rounded bg-[#e8954a] px-4 py-2 text-sm font-medium text-[#12100e]">Add table</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withQr.map((t) => (
          <div key={t.id} className="rounded-xl border border-[#3d352c] bg-[#1a1714] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{t.tableNumber}</h2>
              <span className="text-xs text-[#a89f94]">{t.status}</span>
            </div>
            <Image src={t.qrDataUrl} alt={`QR ${t.tableNumber}`} width={180} height={180} className="mx-auto mt-3 rounded bg-white p-2" unoptimized />
            <p className="mt-2 break-all text-xs text-[#a89f94]">{t.menuUrl}</p>
            <form action={regenerate} className="mt-3">
              <input type="hidden" name="id" value={t.id} />
              <button className="text-sm text-[#e8954a]">Regenerate QR</button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
