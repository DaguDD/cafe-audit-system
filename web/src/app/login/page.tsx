export const dynamic = "force-dynamic";

import { auth, signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function errorMessage(code: string | undefined, cafeMissing: boolean): string | null {
  if (cafeMissing || code === "cafe") {
    return "Your account is not linked to an active cafe. Contact your cafe admin or sign in with a different account.";
  }
  if (!code) return null;
  if (code === "CredentialsSignin" || code === "credentials") {
    return "Invalid username or password.";
  }
  return "Sign-in failed. Please try again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const role = session?.user?.role;
  const cafeId = session?.user?.cafeId ?? null;
  const cafeMissing =
    !!session?.user && role !== "platform_admin" && cafeId == null;
  const hasError = Boolean(sp.error) || cafeMissing;

  // Never auto-leave /login while an error is showing — breaks dashboard ↔ login loops
  // for cafe-less sessions (requireCafeUser → ?error=cafe → session still set).
  if (!hasError) {
    if (role === "platform_admin") redirect("/platform");
    if (cafeId) redirect("/dashboard");
  }

  const message = errorMessage(sp.error, cafeMissing);

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-hero">
          <p className="page-eyebrow">Cafe Audit System</p>
          <h1>Inventory audit & cafe operations</h1>
          <p>
            Link sales to recipes, reconcile physical stock, run QR table orders, and verify mobile
            payments — one desk for the floor, kitchen, and back office.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <span className="mark">CAS</span>
            <div>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>Cafe Audit System</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Staff sign-in</span>
            </div>
          </div>
          <h2>Sign in</h2>
          <p className="sub">
            Demo cafe: manager / admin123 · Platform: platform / admin123
          </p>
          {message && <div className="cas-alert cas-alert-warning">{message}</div>}
          {session?.user && (cafeMissing || sp.error === "cafe") && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              style={{ marginBottom: "1rem" }}
            >
              <button type="submit" className="cas-btn cas-btn-ghost cas-btn-block">
                Sign out and try another account
              </button>
            </form>
          )}
          <form
            action={async (formData) => {
              "use server";
              const username = String(formData.get("username") || "").trim();
              const password = String(formData.get("password") || "");
              const sessionBefore = await auth();
              // Clear a stuck cafe-less session so credentials can replace it cleanly
              if (
                sessionBefore?.user &&
                sessionBefore.user.role !== "platform_admin" &&
                sessionBefore.user.cafeId == null
              ) {
                await signOut({ redirect: false });
              }
              await signIn("credentials", {
                username,
                password,
                // Platform admins are routed by middleware; prefer /platform when obvious
                redirectTo: username === "platform" ? "/platform" : "/dashboard",
              });
            }}
          >
            <div className="form-row">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Username</label>
              <input name="username" required className="cas-input" autoFocus autoComplete="username" />
            </div>
            <div className="form-row">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Password</label>
              <input
                name="password"
                type="password"
                required
                className="cas-input"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="cas-btn cas-btn-primary cas-btn-block">
              Login
            </button>
          </form>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <Link href="/">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
