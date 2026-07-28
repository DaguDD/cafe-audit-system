export const dynamic = "force-dynamic";

import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "platform_admin") redirect("/platform");
  if (session) redirect("/dashboard");
  const sp = await searchParams;

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
          {sp.error && (
            <div className="cas-alert cas-alert-warning">Invalid username or password.</div>
          )}
          <form
            action={async (formData) => {
              "use server";
              const username = String(formData.get("username") || "").trim();
              const password = String(formData.get("password") || "");
              // Route platform admins after auth via middleware / session check
              await signIn("credentials", {
                username,
                password,
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
