export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getOrCreatePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export default async function PlatformSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const settings = await getOrCreatePlatformSettings();

  async function saveDefaults(formData: FormData) {
    "use server";
    await requirePlatformAdmin();
    const pct = Number(formData.get("defaultVarianceThresholdPct") || 10);
    const defaultLunchEnabled = formData.get("defaultLunchEnabled") === "1";
    const defaultLunchPaid = formData.get("defaultLunchPaid") === "1";
    const defaultLunchStart = String(formData.get("defaultLunchStart") || "12:00").slice(0, 5);
    const defaultLunchEnd = String(formData.get("defaultLunchEnd") || "14:00").slice(0, 5);
    await prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {
        defaultVarianceThresholdPct: Number.isFinite(pct) ? pct : 10,
        defaultLunchEnabled,
        defaultLunchPaid,
        defaultLunchStart,
        defaultLunchEnd,
      },
      create: {
        id: 1,
        defaultVarianceThresholdPct: Number.isFinite(pct) ? pct : 10,
        defaultLunchEnabled,
        defaultLunchPaid,
        defaultLunchStart,
        defaultLunchEnd,
      },
    });
    revalidatePath("/platform/settings");
    const { redirect } = await import("next/navigation");
    redirect("/platform/settings?ok=1");
  }

  return (
    <PlatformShell
      title="Platform settings"
      lead="Global defaults applied when provisioning new cafes. Individual cafes can override variance and lunch."
    >
      {sp.ok && <div className="cas-alert cas-alert-success">Defaults saved.</div>}

      <div className="glass-panel" style={{ maxWidth: 560 }}>
        <div className="panel-head">
          <h3>Defaults for new cafes</h3>
        </div>
        <div className="panel-body">
          <form action={saveDefaults}>
            <div className="form-row">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Default audit variance threshold (%)
              </label>
              <input
                name="defaultVarianceThresholdPct"
                type="number"
                step="0.01"
                min={0}
                max={100}
                className="cas-input"
                defaultValue={Number(settings.defaultVarianceThresholdPct)}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                Used as the starting variance % on new cafes. Edit a cafe&apos;s threshold from cafe
                detail.
              </p>
            </div>
            <div className="form-row cols-2">
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Default lunch start
                </label>
                <input
                  name="defaultLunchStart"
                  type="time"
                  className="cas-input"
                  defaultValue={settings.defaultLunchStart}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Default lunch end
                </label>
                <input
                  name="defaultLunchEnd"
                  type="time"
                  className="cas-input"
                  defaultValue={settings.defaultLunchEnd}
                />
              </div>
            </div>
            <div className="form-row cols-2">
              <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="defaultLunchEnabled"
                  value="1"
                  defaultChecked={settings.defaultLunchEnabled}
                />
                Lunch enabled by default
              </label>
              <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="defaultLunchPaid"
                  value="1"
                  defaultChecked={settings.defaultLunchPaid}
                />
                Lunch paid by default
              </label>
            </div>
            <button className="cas-btn cas-btn-primary">Save platform defaults</button>
          </form>
        </div>
      </div>
    </PlatformShell>
  );
}
