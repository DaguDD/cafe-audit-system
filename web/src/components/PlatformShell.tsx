import { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/cafes", label: "Cafes" },
  { href: "/platform/leads", label: "Leads" },
  { href: "/platform/analytics", label: "Analytics" },
  { href: "/platform/troubleshooting", label: "Troubleshooting" },
];

export default async function PlatformShell({
  children,
  title,
  lead,
}: {
  children: ReactNode;
  title: string;
  lead?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "platform_admin") {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar desktop-only">
        <div className="sidebar-brand">
          <Link href="/platform" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span className="mark">C</span>
            <span className="brand-text">
              <span className="name">Casora Platform</span>
              <br />
              <span className="tag">All cafes</span>
            </span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Control</div>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">P</div>
            <div>
              <strong style={{ display: "block", fontSize: "0.8rem" }}>
                {session.user.name}
              </strong>
              <span className="role-pill">Platform</span>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="cas-btn cas-btn-ghost cas-btn-sm cas-btn-block">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="app-main-wrap">
        <header className="app-topbar">
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Casora Platform · cross-cafe
          </span>
          <nav className="mobile-nav" style={{ border: 0, padding: 0, background: "transparent" }}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="app-content">
          <div className="page-hero">
            <p className="page-eyebrow">Casora Platform</p>
            <h1>{title}</h1>
            {lead ? <p className="lead">{lead}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
