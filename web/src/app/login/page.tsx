export const dynamic = "force-dynamic";

import { auth, signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PasswordField from "@/components/PasswordField";

function errorMessage(code: string | undefined, cafeMissing: boolean): string | null {
  if (cafeMissing || code === "cafe") {
    return "Your account is not linked to an active cafe. Contact your cafe admin or sign in with a different account.";
  }
  if (!code) return null;
  if (code === "CredentialsSignin" || code === "credentials") {
    return "Invalid cafe username or password. Platform admins should use Platform sign-in.";
  }
  if (code === "platform") {
    return "Platform accounts sign in at the Platform login page.";
  }
  return "Sign-in failed. Please try again.";
}

export default async function CafeLoginPage({
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

  if (!hasError) {
    if (role === "platform_admin") redirect("/platform");
    if (cafeId) redirect("/dashboard");
  }

  const message = errorMessage(sp.error, cafeMissing);

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-hero">
          <p className="page-eyebrow">Casora for cafes</p>
          <h1>Your cafe desk</h1>
          <p>
            Floor, kitchen, inventory, and payment verification — branded for your cafe, powered by
            Casora.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <span className="mark">C</span>
            <div>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>Casora for cafes</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Cafe staff sign-in
              </span>
            </div>
          </div>
          <h2>Sign in</h2>
          <p className="sub">Demo: manager / admin123 · waiter1 / admin123</p>
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
              if (
                sessionBefore?.user &&
                sessionBefore.user.role !== "platform_admin" &&
                sessionBefore.user.cafeId == null
              ) {
                await signOut({ redirect: false });
              }
              if (sessionBefore?.user?.role === "platform_admin") {
                await signOut({ redirect: false });
              }
              await signIn("credentials", {
                username,
                password,
                audience: "cafe",
                redirectTo: "/dashboard",
              });
            }}
          >
            <div className="form-row">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Username</label>
              <input name="username" required className="cas-input" autoFocus autoComplete="username" />
            </div>
            <div className="form-row">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Password</label>
              <PasswordField name="password" required autoComplete="current-password" />
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
