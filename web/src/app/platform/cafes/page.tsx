export const dynamic = "force-dynamic";

import PlatformShell from "@/components/PlatformShell";
import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { provisionCafe } from "@/lib/provision-cafe";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import type { CafeStatus } from "@prisma/client";

export default async function PlatformCafesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; creds?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const cafes = await prisma.cafe.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, tables: true, orders: true } },
      users: {
        where: { role: "admin" },
        take: 1,
        select: { username: true },
      },
    },
  });

  async function createCafe(formData: FormData) {
    "use server";
    await requirePlatformAdmin();
    try {
      const result = await provisionCafe({
        name: String(formData.get("name") || ""),
        slug: String(formData.get("slug") || ""),
        contactEmail: String(formData.get("email") || "") || undefined,
        contactPhone: String(formData.get("phone") || "") || undefined,
        notes: String(formData.get("notes") || "") || undefined,
        adminUsername: String(formData.get("adminUsername") || "") || undefined,
        adminPassword: String(formData.get("adminPassword") || "admin123"),
        seedMinimal: true,
      });
      revalidatePath("/platform/cafes");
      const { redirect } = await import("next/navigation");
      redirect(
        `/platform/cafes?ok=1&creds=${encodeURIComponent(
          `${result.adminUsername} / ${result.tempPassword}`
        )}`
      );
    } catch (e) {
      const { redirect } = await import("next/navigation");
      redirect(`/platform/cafes?err=${encodeURIComponent((e as Error).message)}`);
    }
  }

  async function setStatus(formData: FormData) {
    "use server";
    await requirePlatformAdmin();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status")) as CafeStatus;
    await prisma.cafe.update({ where: { id }, data: { status } });
    revalidatePath("/platform/cafes");
  }

  return (
    <PlatformShell title="Cafes" lead="Provision and manage tenant cafes.">
      {sp.ok && (
        <div className="cas-alert cas-alert-success">
          Cafe created. Admin login: {sp.creds || "(see seed)"}
        </div>
      )}
      {sp.err && <div className="cas-alert cas-alert-warning">{sp.err}</div>}

      <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-head">
          <h3>Provision new cafe</h3>
        </div>
        <div className="panel-body">
          <form action={createCafe}>
            <div className="form-row cols-2">
              <input name="name" className="cas-input" placeholder="Cafe name" required />
              <input name="slug" className="cas-input" placeholder="slug-url" required />
            </div>
            <div className="form-row cols-2">
              <input name="email" type="email" className="cas-input" placeholder="Contact email" />
              <input name="phone" className="cas-input" placeholder="Contact phone" />
            </div>
            <div className="form-row cols-2">
              <input
                name="adminUsername"
                className="cas-input"
                placeholder="Admin username (optional)"
              />
              <input
                name="adminPassword"
                className="cas-input"
                placeholder="Temp password (default admin123)"
              />
            </div>
            <div className="form-row">
              <input name="notes" className="cas-input" placeholder="Internal notes" />
            </div>
            <button className="cas-btn cas-btn-primary">Create cafe + admin</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-head">
          <h3>All cafes</h3>
          <span className="badge">{cafes.length}</span>
        </div>
        <table className="cas-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Users</th>
              <th>Tables</th>
              <th>Orders</th>
              <th>Admin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cafes.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/platform/cafes/${c.id}`} className="text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="font-mono">{c.slug}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>{c._count.users}</td>
                <td>{c._count.tables}</td>
                <td>{c._count.orders}</td>
                <td className="font-mono">{c.users[0]?.username || "—"}</td>
                <td>
                  <form action={setStatus} style={{ display: "inline-flex", gap: 4 }}>
                    <input type="hidden" name="id" value={c.id} />
                    {c.status !== "suspended" ? (
                      <>
                        <input type="hidden" name="status" value="suspended" />
                        <button className="cas-btn cas-btn-danger cas-btn-sm">Suspend</button>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="status" value="active" />
                        <button className="cas-btn cas-btn-success cas-btn-sm">Activate</button>
                      </>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlatformShell>
  );
}
