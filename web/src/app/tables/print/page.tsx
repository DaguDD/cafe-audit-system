export const dynamic = "force-dynamic";

import { requireRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import Link from "next/link";

export default async function PrintAllQrPage() {
  const user = await requireRoles(["admin", "manager"]);
  const cafe = await prisma.cafe.findUniqueOrThrow({ where: { id: user.cafeId } });
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  const tables = await prisma.restaurantTable.findMany({
    where: { cafeId: user.cafeId },
    orderBy: { tableNumber: "asc" },
  });

  const cards = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      qrDataUrl: await QRCode.toDataURL(`${base}/customer/menu?table=${t.qrToken}`, {
        width: 300,
        margin: 1,
      }),
    }))
  );

  return (
    <div className="qr-print-root">
      <style>{`
        .qr-print-root {
          font-family: system-ui, sans-serif;
          margin: 0;
          padding: 20px;
          background: #fff !important;
          color: #111;
          min-height: 100vh;
        }
        .qr-toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
        .qr-toolbar button, .qr-toolbar a {
          border: 1px solid #ccc; background: #111; color: #fff; padding: 10px 16px;
          border-radius: 8px; cursor: pointer; text-decoration: none; font-size: 14px;
        }
        .qr-toolbar a.secondary { background: #fff; color: #111; }
        .qr-print-root h1 { font-size: 1.25rem; margin: 0 0 16px; color: #111; }
        .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .qr-card {
          border: 2px dashed #ccc; border-radius: 12px; padding: 20px;
          text-align: center; page-break-inside: avoid; background: #fff;
        }
        .qr-card img { width: 180px; height: 180px; }
        .qr-table-num { font-size: 2rem; font-weight: 700; margin: 12px 0 4px; color: #111; }
        .qr-hint { color: #666; font-size: .85rem; }
        @media print {
          .no-print { display: none !important; }
          .qr-print-root { padding: 0; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="qr-toolbar no-print">
        <button type="button" id="cas-print-btn">
          Print all QR codes
        </button>
        <Link className="secondary" href="/tables">
          Back to tables
        </Link>
      </div>
      <h1 className="no-print">
        {cafe.name} — Table QR Codes ({cards.length})
      </h1>
      <div className="qr-grid">
        {cards.map((t) => (
          <div key={t.id} className="qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.qrDataUrl} alt={`QR Table ${t.tableNumber}`} />
            <div className="qr-table-num">Table {t.tableNumber}</div>
            <div className="qr-hint">Scan to order · Seats {t.capacity}</div>
          </div>
        ))}
      </div>
      {cards.length === 0 && <p>No tables yet. Add tables first.</p>}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('cas-print-btn')?.addEventListener('click',function(){window.print();});`,
        }}
      />
    </div>
  );
}
