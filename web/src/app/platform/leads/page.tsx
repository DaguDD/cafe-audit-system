export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";

export default async function PlatformLeadsPage() {
  await requirePlatformAdmin();
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  async function updateLead(formData: FormData) {
    "use server";
    await requirePlatformAdmin();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status")) as LeadStatus;
    const notes = String(formData.get("notes") || "") || null;
    await prisma.lead.update({ where: { id }, data: { status, notes } });
    revalidatePath("/platform/leads");
  }

  return (
    <PlatformShell title="Leads" lead="Contact requests from the marketing landing page.">
      <div className="glass-panel">
        <div className="panel-head">
          <h3>Inbox</h3>
          <span className="badge">{leads.length}</span>
        </div>
        <div style={{ display: "grid", gap: "0.75rem", padding: "0.85rem" }}>
          {leads.length === 0 && (
            <div className="cas-alert cas-alert-info">No leads yet.</div>
          )}
          {leads.map((l) => (
            <div
              key={l.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.85rem",
                background: "var(--bg)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <div>
                  <strong>{l.name}</strong>
                  {l.cafeName ? ` · ${l.cafeName}` : ""}
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {l.email}
                    {l.phone ? ` · ${l.phone}` : ""} · {l.createdAt.toLocaleString()}
                  </div>
                </div>
                <span className="badge">{l.status}</span>
              </div>
              <p style={{ margin: "0.65rem 0", fontSize: "0.9rem" }}>{l.message}</p>
              <form action={updateLead} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                <input type="hidden" name="id" value={l.id} />
                <select name="status" defaultValue={l.status} className="cas-select" style={{ maxWidth: 160 }}>
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="converted">converted</option>
                  <option value="closed">closed</option>
                </select>
                <input
                  name="notes"
                  className="cas-input"
                  placeholder="Internal notes"
                  defaultValue={l.notes || ""}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <button className="cas-btn cas-btn-primary cas-btn-sm">Save</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </PlatformShell>
  );
}
