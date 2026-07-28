import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/auth-helpers";
import SidebarNav, { type NavSection } from "./SidebarNav";

function can(role: Role | undefined, roles: Role[]) {
  return !!role && roles.includes(role);
}

export default async function AppShell({
  children,
  title,
  eyebrow,
  lead,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  lead?: string;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const cafeId = session?.user?.cafeId ?? null;
  const name = session?.user?.name || "User";
  const cafeScope = cafeId ? { cafeId } : { cafeId: -1 };

  const [pendingPayments, pendingWaiter, cafe] = await Promise.all([
    can(role, ["admin", "manager", "server", "staff"])
      ? prisma.paymentSubmission.count({ where: { ...cafeScope, status: "pending" } })
      : Promise.resolve(0),
    can(role, ["admin", "manager", "server"])
      ? prisma.waiterRequest.count({ where: { ...cafeScope, status: "pending" } })
      : Promise.resolve(0),
    cafeId
      ? prisma.cafe.findUnique({
          where: { id: cafeId },
          include: { settings: { select: { displayName: true, logoUrl: true, accentColor: true } } },
        })
      : Promise.resolve(null),
  ]);

  const cafeLabel = cafe?.settings?.displayName?.trim() || cafe?.name || "Cafe";
  const accent = cafe?.settings?.accentColor?.trim() || undefined;

  const sections: NavSection[] = [];

  sections.push({
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  });

  const ops: NavSection["items"] = [];
  if (can(role, ["admin", "manager", "server"])) {
    ops.push({ href: "/server", label: "Waiter Tablet", badge: pendingWaiter || undefined });
    ops.push({ href: "/orders", label: "Active Tables" });
  }
  if (can(role, ["admin", "manager", "server", "staff"])) {
    ops.push({ href: "/payments", label: "Payments", badge: pendingPayments || undefined });
  }
  if (can(role, ["admin", "manager", "kitchen"])) {
    ops.push({ href: "/kitchen", label: "Kitchen" });
  }
  if (can(role, ["admin", "manager", "auditor", "kitchen"])) {
    ops.push({ href: "/inventory", label: "Inventory" });
  }
  if (can(role, ["admin", "manager", "kitchen"])) {
    ops.push({ href: "/products", label: "Products" });
  }
  if (can(role, ["admin", "manager", "auditor"])) {
    ops.push({ href: "/audit", label: "Reconciliation" });
  }
  if (can(role, ["admin", "manager", "server", "staff"])) {
    ops.push({ href: "/sales", label: "Sales" });
  }
  if (can(role, ["admin", "manager", "server", "staff", "kitchen"])) {
    ops.push({ href: "/waste", label: "Waste" });
  }
  if (ops.length) sections.push({ title: "Operations", items: ops });

  if (can(role, ["admin", "manager"])) {
    sections.push({
      title: "Management",
      items: [
        { href: "/tables", label: "Tables & QR" },
        { href: "/shifts", label: "Shifts" },
        { href: "/suppliers", label: "Suppliers" },
      ],
    });
  }

  if (can(role, ["admin", "manager", "auditor"])) {
    sections.push({
      title: "Intelligence",
      items: [{ href: "/reports", label: "Analytics" }],
    });
  }

  return (
    <div
      className="app-shell"
      style={accent ? ({ ["--accent"]: accent } as CSSProperties) : undefined}
    >
      <aside className="app-sidebar desktop-only">
        <div className="sidebar-brand">
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            {cafe?.settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cafe.settings.logoUrl}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain" }}
              />
            ) : (
              <span className="mark">C</span>
            )}
            <span className="brand-text">
              <span className="name">{cafeLabel}</span>
              <br />
              <span className="tag">Powered by Casora</span>
            </span>
          </Link>
        </div>
        <SidebarNav sections={sections} />
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: "0.8rem" }}>{name}</strong>
              <span className="role-pill">{role ? ROLE_LABEL[role] : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <Link href="/settings" className="cas-btn cas-btn-ghost cas-btn-sm" style={{ flex: 1 }}>
              Settings
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              style={{ flex: 1 }}
            >
              <button type="submit" className="cas-btn cas-btn-ghost cas-btn-sm cas-btn-block">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="mark" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
              C
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{cafeLabel}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="system-status" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span className="status-dot" />
              Online
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="cas-btn cas-btn-ghost cas-btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <SidebarNav sections={sections} mobile />

        <main className="app-content">
          <div className="page-hero">
            {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {lead ? <p className="lead">{lead}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
