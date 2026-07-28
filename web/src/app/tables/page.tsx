export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";

export default async function TablesPage() {
  const user = await requireRoles(["admin", "manager"]);
  const cafeId = user.cafeId;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  const tables = await prisma.restaurantTable.findMany({
    where: { cafeId },
    orderBy: { tableNumber: "asc" },
  });

  const withQr = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      menuUrl: `${base}/customer/menu?table=${t.qrToken}`,
      qrDataUrl: await QRCode.toDataURL(`${base}/customer/menu?table=${t.qrToken}`, {
        width: 180,
        margin: 1,
      }),
    }))
  );

  async function addTable(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const num = String(formData.get("tableNumber") || "").trim();
    if (!num) return;
    await prisma.restaurantTable.create({
      data: {
        cafeId: u.cafeId,
        tableNumber: num,
        qrToken: randomBytes(16).toString("hex"),
        capacity: Number(formData.get("capacity") || 4),
      },
    });
    revalidatePath("/tables");
  }

  async function regenerate(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("id"));
    await prisma.restaurantTable.updateMany({
      where: { id, cafeId: u.cafeId },
      data: { qrToken: randomBytes(16).toString("hex") },
    });
    revalidatePath("/tables");
  }

  return (
    <AppShell title="Tables & QR" eyebrow="Floor" lead="Generate QR codes for guest self-ordering.">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.85rem",
          alignItems: "center",
        }}
      >
        <Link href="/tables/print" className="cas-btn cas-btn-primary" target="_blank">
          Print / download all QR codes
        </Link>
        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Opens a print-ready sheet for every table.
        </span>
      </div>

      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Add table</h3>
        </div>
        <div className="panel-body">
          <form action={addTable} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <input
              name="tableNumber"
              placeholder="T09"
              required
              className="cas-input"
              style={{ maxWidth: 140 }}
            />
            <input
              name="capacity"
              type="number"
              defaultValue={4}
              className="cas-input"
              style={{ maxWidth: 100 }}
            />
            <button className="cas-btn cas-btn-primary">Add table</button>
          </form>
        </div>
      </div>

      <div className="grid-2">
        {withQr.map((t) => (
          <div key={t.id} className="glass-panel">
            <div className="panel-head">
              <h3>{t.tableNumber}</h3>
              <span className="badge">{t.status.replaceAll("_", " ")}</span>
            </div>
            <div className="panel-body" style={{ textAlign: "center" }}>
              <Image
                src={t.qrDataUrl}
                alt={`QR ${t.tableNumber}`}
                width={180}
                height={180}
                className="mx-auto rounded bg-white p-2"
                unoptimized
                style={{ margin: "0 auto", background: "#fff", borderRadius: 8, padding: 8 }}
              />
              <p
                style={{
                  marginTop: "0.65rem",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  wordBreak: "break-all",
                }}
              >
                {t.menuUrl}
              </p>
              <form action={regenerate} style={{ marginTop: "0.5rem" }}>
                <input type="hidden" name="id" value={t.id} />
                <button className="cas-btn cas-btn-ghost cas-btn-sm">Regenerate QR</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
