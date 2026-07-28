export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireUser, requireRoles, ROLE_LABEL } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role, UserStatus } from "@prisma/client";

const MANAGEABLE: Role[] = ["admin", "manager", "auditor", "server", "kitchen", "staff"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "platform_admin") {
    const { redirect } = await import("next/navigation");
    redirect("/platform");
  }
  const cafeId = user.cafeId!;
  const sp = await searchParams;
  const tab = sp.tab || "profile";
  const isManager = ["admin", "manager"].includes(user.role);

  const [dbUser, cafe, settings, users] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: Number(user.id) } }),
    prisma.cafe.findUniqueOrThrow({ where: { id: cafeId } }),
    prisma.cafeSettings.findUnique({ where: { cafeId } }),
    isManager
      ? prisma.user.findMany({
          where: { cafeId, role: { not: "platform_admin" } },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  async function changePassword(formData: FormData) {
    "use server";
    const u = await requireUser();
    const current = String(formData.get("current") || "");
    const next = String(formData.get("next") || "");
    const confirm = String(formData.get("confirm") || "");
    if (next.length < 6 || next !== confirm) {
      const { redirect } = await import("next/navigation");
      redirect("/settings?err=mismatch&tab=profile");
    }
    const row = await prisma.user.findUniqueOrThrow({ where: { id: Number(u.id) } });
    const ok = await bcrypt.compare(current, row.passwordHash);
    if (!ok) {
      const { redirect } = await import("next/navigation");
      redirect("/settings?err=current&tab=profile");
    }
    await prisma.user.update({
      where: { id: Number(u.id) },
      data: { passwordHash: await bcrypt.hash(next, 10) },
    });
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=password&tab=profile");
  }

  async function addUser(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const username = String(formData.get("username") || "").trim();
    const fullName = String(formData.get("fullName") || "").trim();
    const role = String(formData.get("role") || "staff") as Role;
    const password = String(formData.get("password") || "");
    if (!username || !fullName || password.length < 6 || !MANAGEABLE.includes(role)) {
      const { redirect } = await import("next/navigation");
      redirect("/settings?err=user&tab=users");
    }
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      const { redirect } = await import("next/navigation");
      redirect("/settings?err=exists&tab=users");
    }
    await prisma.user.create({
      data: {
        cafeId: u.cafeId,
        username,
        fullName,
        role,
        passwordHash: await bcrypt.hash(password, 10),
        status: "active",
      },
    });
    revalidatePath("/settings");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=user&tab=users");
  }

  async function updateUser(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const id = Number(formData.get("userId"));
    const fullName = String(formData.get("fullName") || "").trim();
    const role = String(formData.get("role") || "staff") as Role;
    const status = String(formData.get("status") || "active") as UserStatus;
    const newPassword = String(formData.get("newPassword") || "");
    if (!id || !fullName || !MANAGEABLE.includes(role)) return;
    const data: {
      fullName: string;
      role: Role;
      status: UserStatus;
      passwordHash?: string;
    } = { fullName, role, status };
    if (newPassword.length >= 6) {
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    await prisma.user.updateMany({
      where: { id, cafeId: u.cafeId },
      data,
    });
    revalidatePath("/settings");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=saved&tab=users");
  }

  async function savePayment(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    await prisma.cafeSettings.upsert({
      where: { cafeId: u.cafeId },
      update: {
        telebirrNumber: String(formData.get("telebirrNumber") || ""),
        telebirrName: String(formData.get("telebirrName") || ""),
        bankName: String(formData.get("bankName") || ""),
        bankAccount: String(formData.get("bankAccount") || ""),
        bankAccountName: String(formData.get("bankAccountName") || ""),
        instructions: String(formData.get("instructions") || ""),
      },
      create: {
        cafeId: u.cafeId,
        telebirrNumber: String(formData.get("telebirrNumber") || ""),
        telebirrName: String(formData.get("telebirrName") || ""),
        bankName: String(formData.get("bankName") || ""),
        bankAccount: String(formData.get("bankAccount") || ""),
        bankAccountName: String(formData.get("bankAccountName") || ""),
        instructions: String(formData.get("instructions") || ""),
      },
    });
    revalidatePath("/settings");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=payment&tab=payment");
  }

  const tabs = [
    { id: "profile", label: "My account" },
    ...(isManager
      ? [
          { id: "users", label: "Users & roles" },
          { id: "system", label: "System" },
          { id: "payment", label: "Payment details" },
        ]
      : []),
  ];

  return (
    <AppShell title="Settings" eyebrow="Account" lead="Profile, staff, and payment configuration.">
      {sp.ok && (
        <div className="cas-alert cas-alert-success">
          {sp.ok === "password" && "Password updated."}
          {sp.ok === "user" && "User created."}
          {sp.ok === "saved" && "User saved."}
          {sp.ok === "payment" && "Payment details saved."}
        </div>
      )}
      {sp.err === "current" && (
        <div className="cas-alert cas-alert-warning">Current password is incorrect.</div>
      )}
      {sp.err === "mismatch" && (
        <div className="cas-alert cas-alert-warning">
          New passwords must match and be at least 6 characters.
        </div>
      )}
      {sp.err === "exists" && (
        <div className="cas-alert cas-alert-warning">Username already taken.</div>
      )}
      {sp.err === "user" && (
        <div className="cas-alert cas-alert-warning">Check user fields and try again.</div>
      )}

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={`cas-btn cas-btn-sm ${tab === t.id ? "cas-btn-primary" : "cas-btn-ghost"}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid-2">
          <div className="glass-panel">
            <div className="panel-head">
              <h3>Your profile</h3>
            </div>
            <div className="panel-body">
              <table className="cas-table">
                <tbody>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Name</td>
                    <td>{dbUser.fullName}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Username</td>
                    <td className="font-mono">{dbUser.username}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Role</td>
                    <td>
                      <span className="role-pill">{ROLE_LABEL[dbUser.role]}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Cafe</td>
                    <td>{cafe.name}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-head">
              <h3>Change password</h3>
            </div>
            <div className="panel-body">
              <form action={changePassword}>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Current password
                  </label>
                  <input type="password" name="current" required className="cas-input" />
                </div>
                <div className="form-row cols-2">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      New password
                    </label>
                    <input
                      type="password"
                      name="next"
                      minLength={6}
                      required
                      className="cas-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Confirm
                    </label>
                    <input
                      type="password"
                      name="confirm"
                      minLength={6}
                      required
                      className="cas-input"
                    />
                  </div>
                </div>
                <button className="cas-btn cas-btn-primary">Update password</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && isManager && (
        <>
          <div className="glass-panel" style={{ marginBottom: "0.85rem" }}>
            <div className="panel-head">
              <h3>Add user</h3>
            </div>
            <div className="panel-body">
              <form action={addUser} className="form-row cols-4">
                <input name="username" className="cas-input" placeholder="Username" required />
                <input name="fullName" className="cas-input" placeholder="Full name" required />
                <select name="role" className="cas-select" defaultValue="server">
                  {MANAGEABLE.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <input
                  name="password"
                  type="password"
                  className="cas-input"
                  placeholder="Password"
                  minLength={6}
                  required
                />
                <button className="cas-btn cas-btn-primary">Add user</button>
              </form>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-head">
              <h3>All users</h3>
            </div>
            <table className="cas-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
                          gap: "0.5rem",
                          padding: "0.65rem 0.75rem",
                          alignItems: "center",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <form
                          action={updateUser}
                          style={{ display: "contents" }}
                        >
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            name="fullName"
                            defaultValue={u.fullName}
                            className="cas-input"
                          />
                          <span className="font-mono" style={{ fontSize: "0.8rem" }}>
                            {u.username}
                          </span>
                          <select name="role" defaultValue={u.role} className="cas-select">
                            {MANAGEABLE.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <select name="status" defaultValue={u.status} className="cas-select">
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                          <input
                            name="newPassword"
                            type="password"
                            className="cas-input"
                            placeholder="New password (optional)"
                          />
                          <button className="cas-btn cas-btn-success cas-btn-sm">Save</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "system" && isManager && (
        <div className="glass-panel">
          <div className="panel-head">
            <h3>System configuration</h3>
          </div>
          <div className="panel-body">
            <table className="cas-table" style={{ maxWidth: 480 }}>
              <tbody>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Cafe name</td>
                  <td>{cafe.name}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Slug</td>
                  <td className="font-mono">{cafe.slug}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Status</td>
                  <td>
                    <span className="badge">{cafe.status}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Timezone</td>
                  <td>{settings?.timezone || "Africa/Addis_Ababa"}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>Audit variance threshold</td>
                  <td>{Number(settings?.varianceThresholdPct ?? 10)}%</td>
                </tr>
              </tbody>
            </table>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "1rem" }}>
              Ingredients → Inventory · Menu items → Products · Vendors → Suppliers · Staff → Users
              &amp; roles
            </p>
          </div>
        </div>
      )}

      {tab === "payment" && isManager && (
        <div className="glass-panel">
          <div className="panel-head">
            <h3>Customer payment details</h3>
          </div>
          <div className="panel-body">
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
              Shown on the customer menu when guests pay via Telebirr or bank transfer.
            </p>
            <form action={savePayment} style={{ maxWidth: 560 }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Telebirr</p>
              <div className="form-row cols-2">
                <input
                  name="telebirrNumber"
                  className="cas-input"
                  placeholder="Telebirr number"
                  defaultValue={settings?.telebirrNumber || ""}
                  required
                />
                <input
                  name="telebirrName"
                  className="cas-input"
                  placeholder="Account name"
                  defaultValue={settings?.telebirrName || ""}
                  required
                />
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Bank transfer</p>
              <div className="form-row cols-2">
                <input
                  name="bankName"
                  className="cas-input"
                  placeholder="Bank name"
                  defaultValue={settings?.bankName || ""}
                  required
                />
                <input
                  name="bankAccount"
                  className="cas-input"
                  placeholder="Account number"
                  defaultValue={settings?.bankAccount || ""}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  name="bankAccountName"
                  className="cas-input"
                  placeholder="Account holder name"
                  defaultValue={settings?.bankAccountName || ""}
                  required
                />
              </div>
              <div className="form-row">
                <textarea
                  name="instructions"
                  className="cas-input"
                  rows={3}
                  placeholder="Instructions for customers"
                  defaultValue={settings?.instructions || ""}
                />
              </div>
              <button className="cas-btn cas-btn-primary">Save payment details</button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
