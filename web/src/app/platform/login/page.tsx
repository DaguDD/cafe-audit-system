export const dynamic = "force-dynamic";

import { auth, signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "CredentialsSignin" || code === "credentials") {
    return "Invalid platform credentials. Cafe staff must use the cafe login.";
  }
  if (code === "cafe") {
    return "Cafe accounts cannot access the platform. Use cafe sign-in instead.";
  }
  return "Sign-in failed. Please try again.";
}

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const role = session?.user?.role;

  if (role === "platform_admin") redirect("/platform");
  // Any other active session belongs to cafe staff — send them to the cafe desk
  if (session?.user) redirect("/dashboard");

  const message = errorMessage(sp.error);

  return (
    <div className="auth-shell platform-auth">
      <style>{`
        .platform-auth .auth-visual {
          background:
            radial-gradient(ellipse 70% 55% at 20% 20%, rgba(90, 140, 200, 0.18), transparent 55%),
            linear-gradient(165deg, #0a0e14 0%, #121820 50%, #0c1016 100%);
        }
        .platform-auth .mark {
          background: rgba(120, 160, 210, 0.18);
          color: #9bb8d9;
        }
        .platform-auth .cas-btn-primary {
          background: #6b8fbd;
          color: #0a0e14;
        }
        .platform-auth .page-eyebrow { color: #9bb8d9; }
      `}</style>
      <div className="auth-visual">
        <div className="auth-hero">
          <p className="page-eyebrow">Casora Platform</p>
          <h1>Operate every cafe</h1>
          <p>
            Provision tenants, review leads, monitor health, and support cafe teams from one control
            plane.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <span className="mark">P</span>
            <div>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>Casora Platform</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Internal operators only
              </span>
            </div>
          </div>
          <h2>Platform sign-in</h2>
          <p className="sub">Cafe staff: use Try cafe demo on the home page.</p>
          {message && <div className="cas-alert cas-alert-warning">{message}</div>}
          <form
            action={async (formData) => {
              "use server";
              const username = String(formData.get("username") || "").trim();
              const password = String(formData.get("password") || "");
              const sessionBefore = await auth();
              if (sessionBefore?.user) {
                await signOut({ redirect: false });
              }
              await signIn("credentials", {
                username,
                password,
                audience: "platform",
                redirectTo: "/platform",
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
              Enter platform
            </button>
          </form>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <Link href="/">← Back to home</Link>
            {" · "}
            <Link href="/login">Cafe sign-in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
