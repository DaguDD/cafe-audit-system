export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import { requireUser, requireRoles, ROLE_LABEL } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { FontVibe, MenuTheme, Role, UserStatus } from "@prisma/client";
import { normalizeHex } from "@/lib/bill-receipt";
import { uploadBrandingImage } from "@/lib/branding-upload";
import PasswordField from "@/components/PasswordField";

const MANAGEABLE: Role[] = ["admin", "manager", "auditor", "server", "kitchen", "staff"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string; detail?: string }>;
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

  const [dbUser, cafe, settings, users, sampleTable] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: Number(user.id) } }),
    prisma.cafe.findUniqueOrThrow({ where: { id: cafeId } }),
    prisma.cafeSettings.findUnique({ where: { cafeId } }),
    isManager
      ? prisma.user.findMany({
          where: { cafeId, role: { not: "platform_admin" } },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    prisma.restaurantTable.findFirst({
      where: { cafeId },
      orderBy: { tableNumber: "asc" },
      select: { qrToken: true },
    }),
  ]);

  const base =
    process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  const previewMenuUrl = sampleTable
    ? `${base}/customer/menu?table=${sampleTable.qrToken}`
    : null;

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
    const rateRaw = String(formData.get("hourlyRate") || "").trim();
    const hourlyRate = rateRaw === "" ? null : Number(rateRaw);
    if (!id || !fullName || !MANAGEABLE.includes(role)) return;
    if (hourlyRate != null && (Number.isNaN(hourlyRate) || hourlyRate < 0)) return;
    const data: {
      fullName: string;
      role: Role;
      status: UserStatus;
      hourlyRate: number | null;
      passwordHash?: string;
    } = { fullName, role, status, hourlyRate };
    if (newPassword.length >= 6) {
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    await prisma.user.updateMany({
      where: { id, cafeId: u.cafeId },
      data,
    });
    revalidatePath("/settings");
    revalidatePath("/payroll");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=saved&tab=users");
  }

  async function saveSystem(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const timezone = String(formData.get("timezone") || "Africa/Addis_Ababa").trim() || "Africa/Addis_Ababa";
    const lunchEnabled = formData.get("lunchEnabled") === "1";
    const lunchPaid = formData.get("lunchPaid") === "1";
    const lunchStart = String(formData.get("lunchStart") || "12:00").slice(0, 5);
    const lunchEnd = String(formData.get("lunchEnd") || "14:00").slice(0, 5);
    await prisma.cafeSettings.upsert({
      where: { cafeId: u.cafeId },
      update: { timezone, lunchEnabled, lunchPaid, lunchStart, lunchEnd },
      create: {
        cafeId: u.cafeId!,
        timezone,
        lunchEnabled,
        lunchPaid,
        lunchStart,
        lunchEnd,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/shifts");
    revalidatePath("/payroll");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=system&tab=system");
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
        vatRate: Number(formData.get("vatRate") || 15),
        serviceChargeRate: Number(formData.get("serviceChargeRate") || 10),
      },
      create: {
        cafeId: u.cafeId!,
        telebirrNumber: String(formData.get("telebirrNumber") || ""),
        telebirrName: String(formData.get("telebirrName") || ""),
        bankName: String(formData.get("bankName") || ""),
        bankAccount: String(formData.get("bankAccount") || ""),
        bankAccountName: String(formData.get("bankAccountName") || ""),
        instructions: String(formData.get("instructions") || ""),
        vatRate: Number(formData.get("vatRate") || 15),
        serviceChargeRate: Number(formData.get("serviceChargeRate") || 10),
      },
    });
    revalidatePath("/settings");
    const { redirect } = await import("next/navigation");
    redirect("/settings?ok=payment&tab=payment");
  }

  async function saveBranding(formData: FormData) {
    "use server";
    const u = await requireRoles(["admin", "manager"]);
    const displayName = String(formData.get("displayName") || "").trim() || null;
    const tagline = String(formData.get("tagline") || "").trim() || null;
    const welcomeMessage = String(formData.get("welcomeMessage") || "").trim() || null;
    const footerText = String(formData.get("footerText") || "").trim() || null;
    const showPrices = formData.get("showPrices") !== "0";
    const fontRaw = String(formData.get("fontVibe") || "classic");
    const fontVibe = (["classic", "modern", "warm"].includes(fontRaw)
      ? fontRaw
      : "classic") as FontVibe;
    const menuTheme = (String(formData.get("menuTheme") || "dark_gold") === "custom"
      ? "custom"
      : "dark_gold") as MenuTheme;
    const accentColor =
      normalizeHex(String(formData.get("accentColor") || ""), "#d4af74") || "#d4af74";
    const backgroundColor = normalizeHex(String(formData.get("backgroundColor") || "")) || null;
    const secondaryColor = normalizeHex(String(formData.get("secondaryColor") || "")) || null;
    const clearLogo = formData.get("clearLogo") === "1";
    const clearBg = formData.get("clearBg") === "1";

    const existing = await prisma.cafeSettings.findUnique({ where: { cafeId: u.cafeId! } });
    let logoUrl = clearLogo ? null : existing?.logoUrl ?? null;
    let backgroundUrl = clearBg ? null : existing?.backgroundUrl ?? null;
    let uploadNote = "";

    try {
      const logoFile = formData.get("logo") as File | null;
      if (logoFile && logoFile.size > 0) {
        const up = await uploadBrandingImage(u.cafeId!, "logo", logoFile);
        logoUrl = up.url;
        if (up.storage === "local") uploadNote = "local";
      }

      const bgFile = formData.get("background") as File | null;
      if (bgFile && bgFile.size > 0) {
        const up = await uploadBrandingImage(u.cafeId!, "bg", bgFile);
        backgroundUrl = up.url;
        if (up.storage === "local") uploadNote = "local";
      }
    } catch (e) {
      const { redirect } = await import("next/navigation");
      const msg = e instanceof Error ? e.message : "upload";
      redirect(`/settings?err=upload&tab=branding&detail=${encodeURIComponent(msg)}`);
    }

    await prisma.cafeSettings.upsert({
      where: { cafeId: u.cafeId! },
      update: {
        displayName,
        tagline,
        welcomeMessage,
        footerText,
        showPrices,
        fontVibe,
        accentColor,
        backgroundColor,
        secondaryColor,
        menuTheme,
        logoUrl,
        backgroundUrl,
      },
      create: {
        cafeId: u.cafeId!,
        displayName,
        tagline,
        welcomeMessage,
        footerText,
        showPrices,
        fontVibe,
        accentColor,
        backgroundColor,
        secondaryColor,
        menuTheme,
        logoUrl,
        backgroundUrl,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/customer/menu");
    revalidatePath("/dashboard");
    const { redirect } = await import("next/navigation");
    redirect(
      uploadNote === "local"
        ? "/settings?ok=branding_local&tab=branding"
        : "/settings?ok=branding&tab=branding"
    );
  }

  const tabs = [
    { id: "profile", label: "My account" },
    ...(isManager
      ? [
          { id: "users", label: "Users & roles" },
          { id: "branding", label: "Branding" },
          { id: "system", label: "System" },
          { id: "payment", label: "Payment details" },
        ]
      : []),
  ];

  return (
    <AppShell
      title="Settings"
      eyebrow="Account"
      lead="Profile, branding, staff, and payment configuration."
    >
      {sp.ok && (
        <div className="cas-alert cas-alert-success">
          {sp.ok === "password" && "Password updated."}
          {sp.ok === "user" && "User created."}
          {sp.ok === "saved" && "User saved."}
          {sp.ok === "payment" && "Payment details saved."}
          {sp.ok === "branding" && "Branding saved — guest menu and staff accent updated."}
          {sp.ok === "branding_local" &&
            "Branding saved (images stored locally under /uploads — add BLOB_READ_WRITE_TOKEN on Vercel for durable CDN uploads)."}
          {sp.ok === "system" && "System settings saved."}
        </div>
      )}
      {sp.err === "upload" && (
        <div className="cas-alert cas-alert-warning">
          Image upload failed{sp.detail ? `: ${decodeURIComponent(sp.detail)}` : "."} Text fields were
          not overwritten.
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
                  <PasswordField name="current" required autoComplete="current-password" />
                </div>
                <div className="form-row cols-2">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      New password
                    </label>
                    <PasswordField name="next" required minLength={6} autoComplete="new-password" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Confirm
                    </label>
                    <PasswordField
                      name="confirm"
                      required
                      minLength={6}
                      autoComplete="new-password"
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
                          gridTemplateColumns: "1.1fr 0.9fr 0.9fr 0.7fr 0.7fr 1fr auto",
                          gap: "0.5rem",
                          padding: "0.65rem 0.75rem",
                          alignItems: "center",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <form action={updateUser} style={{ display: "contents" }}>
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
                            name="hourlyRate"
                            type="number"
                            step="0.01"
                            min={0}
                            className="cas-input"
                            placeholder="Hourly ETB"
                            defaultValue={u.hourlyRate != null ? Number(u.hourlyRate) : ""}
                          />
                          <PasswordField
                            name="newPassword"
                            placeholder="New password (optional)"
                            minLength={6}
                            autoComplete="new-password"
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

      {tab === "branding" && isManager && (
        <div
          style={{
            display: "grid",
            gap: "0.85rem",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(260px, 0.75fr)",
          }}
          className="branding-layout"
        >
          <style>{`
            @media (max-width: 900px) {
              .branding-layout { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <div className="glass-panel">
            <div className="panel-head">
              <h3>Customer menu branding</h3>
              {previewMenuUrl && (
                <a
                  href={previewMenuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cas-btn cas-btn-ghost cas-btn-sm"
                >
                  Open live menu
                </a>
              )}
            </div>
            <div className="panel-body">
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
                Guest QR menu and staff sidebar (logo + accent). Uploads use Vercel Blob when
                configured; otherwise files save under <code>/uploads/branding</code>. Open the live
                menu link to verify preview matches guests.
              </p>
              <form action={saveBranding} encType="multipart/form-data">
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Display name (optional override)
                  </label>
                  <input
                    name="displayName"
                    className="cas-input"
                    placeholder={cafe.name}
                    defaultValue={settings?.displayName || ""}
                  />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Tagline</label>
                  <input
                    name="tagline"
                    className="cas-input"
                    placeholder="Tap a category, add to cart…"
                    defaultValue={settings?.tagline || ""}
                  />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Welcome message
                  </label>
                  <textarea
                    name="welcomeMessage"
                    className="cas-input"
                    rows={2}
                    placeholder="Welcome — ask staff if you need anything."
                    defaultValue={settings?.welcomeMessage || ""}
                  />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Footer text
                  </label>
                  <input
                    name="footerText"
                    className="cas-input"
                    placeholder="Thank you for dining with us."
                    defaultValue={settings?.footerText || ""}
                  />
                </div>
                <div className="form-row cols-2">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Accent color
                    </label>
                    <input
                      name="accentColor"
                      type="color"
                      className="cas-input"
                      defaultValue={settings?.accentColor || "#d4af74"}
                      style={{ height: 42, padding: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Secondary color
                    </label>
                    <input
                      name="secondaryColor"
                      type="color"
                      className="cas-input"
                      defaultValue={settings?.secondaryColor || "#8b7355"}
                      style={{ height: 42, padding: 4 }}
                    />
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Background color (custom theme)
                    </label>
                    <input
                      name="backgroundColor"
                      type="color"
                      className="cas-input"
                      defaultValue={settings?.backgroundColor || "#0c0b09"}
                      style={{ height: 42, padding: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Menu theme
                    </label>
                    <select
                      name="menuTheme"
                      className="cas-select"
                      defaultValue={settings?.menuTheme || "dark_gold"}
                    >
                      <option value="dark_gold">Dark gold (default)</option>
                      <option value="custom">Custom (use accent + background)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Font vibe
                    </label>
                    <select
                      name="fontVibe"
                      className="cas-select"
                      defaultValue={settings?.fontVibe || "classic"}
                    >
                      <option value="classic">Classic (serif titles)</option>
                      <option value="modern">Modern (clean sans)</option>
                      <option value="warm">Warm (rounded friendly)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Show prices on menu
                    </label>
                    <select
                      name="showPrices"
                      className="cas-select"
                      defaultValue={settings?.showPrices === false ? "0" : "1"}
                    >
                      <option value="1">Show prices</option>
                      <option value="0">Hide prices</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Logo</label>
                  {settings?.logoUrl && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        style={{ maxHeight: 48, borderRadius: 8 }}
                      />
                      <label
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          fontSize: "0.8rem",
                          marginTop: 6,
                        }}
                      >
                        <input type="checkbox" name="clearLogo" value="1" /> Clear logo
                      </label>
                    </div>
                  )}
                  <input name="logo" type="file" accept="image/*" className="cas-input" />
                </div>
                <div className="form-row">
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Cover / background image
                  </label>
                  {settings?.backgroundUrl && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.backgroundUrl}
                        alt="Background"
                        style={{
                          maxHeight: 64,
                          borderRadius: 8,
                          width: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <label
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          fontSize: "0.8rem",
                          marginTop: 6,
                        }}
                      >
                        <input type="checkbox" name="clearBg" value="1" /> Clear background image
                      </label>
                    </div>
                  )}
                  <input name="background" type="file" accept="image/*" className="cas-input" />
                </div>
                <button className="cas-btn cas-btn-primary">Save branding</button>
              </form>
            </div>
          </div>

          <div className="glass-panel" style={{ alignSelf: "start" }}>
            <div className="panel-head">
              <h3>Guest header preview</h3>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <div
                style={{
                  position: "relative",
                  minHeight: 220,
                  padding: "1.35rem 1.15rem 1.15rem",
                  background:
                    settings?.backgroundUrl
                      ? `linear-gradient(180deg, rgba(12,11,9,0.55), rgba(12,11,9,0.88)), url(${settings.backgroundUrl}) center/cover`
                      : `linear-gradient(160deg, ${(settings?.accentColor || "#d4af74")}33, transparent 50%), ${
                          settings?.backgroundColor || "#0c0b09"
                        }`,
                  borderRadius: "0 0 12px 12px",
                  overflow: "hidden",
                }}
              >
                {settings?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoUrl}
                    alt=""
                    style={{
                      height: 44,
                      width: "auto",
                      maxWidth: 120,
                      objectFit: "contain",
                      marginBottom: "0.75rem",
                      borderRadius: 8,
                    }}
                  />
                )}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.68rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: settings?.secondaryColor || settings?.accentColor || "#d4af74",
                  }}
                >
                  Table menu
                </p>
                <h4
                  style={{
                    margin: "0.35rem 0 0.4rem",
                    fontSize: "1.45rem",
                    fontFamily:
                      settings?.fontVibe === "modern"
                        ? "system-ui, sans-serif"
                        : settings?.fontVibe === "warm"
                          ? "ui-rounded, system-ui, sans-serif"
                          : "Georgia, serif",
                  }}
                >
                  {settings?.displayName?.trim() || cafe.name}
                </h4>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.55rem",
                    borderRadius: 999,
                    border: `1px solid ${settings?.accentColor || "#d4af74"}66`,
                    color: settings?.accentColor || "#d4af74",
                    marginBottom: "0.55rem",
                  }}
                >
                  Table T01
                </span>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {settings?.tagline?.trim() ||
                    "Tap a category, add to cart, and we'll bring it right over."}
                </p>
                {settings?.welcomeMessage?.trim() && (
                  <p
                    style={{
                      margin: "0.75rem 0 0",
                      fontSize: "0.8rem",
                      padding: "0.55rem 0.65rem",
                      borderLeft: `3px solid ${settings?.accentColor || "#d4af74"}`,
                      background: "rgba(0,0,0,0.25)",
                      lineHeight: 1.4,
                    }}
                  >
                    {settings.welcomeMessage}
                  </p>
                )}
                {settings?.footerText?.trim() && (
                  <p
                    style={{
                      margin: "1rem 0 0",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    {settings.footerText}
                  </p>
                )}
                {settings?.showPrices === false && (
                  <p style={{ margin: "0.65rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Prices hidden on guest menu
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "system" && isManager && (
        <div className="glass-panel">
          <div className="panel-head">
            <h3>System configuration</h3>
          </div>
          <div className="panel-body">
            <table className="cas-table" style={{ maxWidth: 520, marginBottom: "1rem" }}>
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
                  <td style={{ color: "var(--text-muted)" }}>Audit variance threshold</td>
                  <td>
                    {Number(settings?.varianceThresholdPct ?? 10)}%
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Platform sets the default for new cafes; override from Platform → cafe detail.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <form action={saveSystem} style={{ maxWidth: 520 }}>
              <div className="form-row">
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Timezone</label>
                <input
                  name="timezone"
                  className="cas-input"
                  defaultValue={settings?.timezone || "Africa/Addis_Ababa"}
                />
              </div>
              <div className="form-row cols-2">
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Lunch start
                  </label>
                  <input
                    name="lunchStart"
                    type="time"
                    className="cas-input"
                    defaultValue={settings?.lunchStart || "12:00"}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Lunch end</label>
                  <input
                    name="lunchEnd"
                    type="time"
                    className="cas-input"
                    defaultValue={settings?.lunchEnd || "14:00"}
                  />
                </div>
              </div>
              <div className="form-row cols-2">
                <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="lunchEnabled"
                    value="1"
                    defaultChecked={settings?.lunchEnabled !== false}
                  />
                  Lunch window enabled
                </label>
                <label style={{ fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="lunchPaid"
                    value="1"
                    defaultChecked={!!settings?.lunchPaid}
                  />
                  Lunch is paid
                </label>
              </div>
              <button className="cas-btn cas-btn-primary">Save system settings</button>
            </form>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "1rem" }}>
              Guest look → Branding · Rates → Payroll · Payment details → Payment tab
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
              <div className="form-row cols-2">
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>VAT %</label>
                  <input
                    name="vatRate"
                    type="number"
                    step="0.01"
                    min={0}
                    className="cas-input"
                    defaultValue={Number(settings?.vatRate ?? 15)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Service charge %
                  </label>
                  <input
                    name="serviceChargeRate"
                    type="number"
                    step="0.01"
                    min={0}
                    className="cas-input"
                    defaultValue={Number(settings?.serviceChargeRate ?? 10)}
                  />
                </div>
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
