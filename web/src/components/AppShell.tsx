import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/auth-helpers";
import SidebarNav, { type NavSection } from "./SidebarNav";
import LiveClock from "./LiveClock";
import LunchControls from "./LunchControls";
import { syncShiftPresence } from "@/lib/shift-sync";
import {
  endLunch,
  getCafeLunchSettings,
  isWithinLunchWindow,
  startLunch,
  findActiveShift,
} from "@/lib/shifts";

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
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const cafeScope = cafeId ? { cafeId } : { cafeId: -1 };

  if (cafeId && userId && role && role !== "platform_admin") {
    await syncShiftPresence({ cafeId, userId, role });
  }

  const [pendingPayments, pendingWaiter, cafe, myShift] = await Promise.all([
    can(role, ["admin", "manager", "server", "staff"])
      ? prisma.paymentSubmission.count({ where: { ...cafeScope, status: "pending" } })
      : Promise.resolve(0),
    can(role, ["admin", "manager", "server"])
      ? prisma.waiterRequest.count({ where: { ...cafeScope, status: "pending" } })
      : Promise.resolve(0),
    cafeId
      ? prisma.cafe.findUnique({
          where: { id: cafeId },
          include: {
            settings: {
              select: {
                displayName: true,
                logoUrl: true,
                accentColor: true,
                timezone: true,
                lunchEnabled: true,
                lunchStart: true,
                lunchEnd: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    cafeId && userId
      ? findActiveShift(cafeId, userId)
      : Promise.resolve(null),
  ]);

  const cafeLabel = cafe?.settings?.displayName?.trim() || cafe?.name || "Cafe";
  const accent = cafe?.settings?.accentColor?.trim() || undefined;
  const tz = cafe?.settings?.timezone || "Africa/Addis_Ababa";
  const lunchSettings = cafeId
    ? await getCafeLunchSettings(cafeId)
    : {
        lunchEnabled: true,
        lunchStart: "12:00",
        lunchEnd: "14:00",
        lunchPaid: false,
        timezone: tz,
      };
  const inLunchWindow = isWithinLunchWindow(new Date(), lunchSettings);
  const shiftStatus =
    myShift?.status === "on_lunch" || myShift?.status === "open" ? myShift.status : null;

  async function startLunchAction() {
    "use server";
    const s = await auth();
    if (!s?.user?.cafeId) return { ok: false, message: "Not signed in" };
    const r = await startLunch(s.user.cafeId, Number(s.user.id));
    return { ok: r.ok, message: r.ok ? undefined : r.message };
  }

  async function endLunchAction() {
    "use server";
    const s = await auth();
    if (!s?.user?.cafeId) return { ok: false, message: "Not signed in" };
    const r = await endLunch(s.user.cafeId, Number(s.user.id));
    return { ok: r.ok, message: r.ok ? undefined : r.message };
  }

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
        { href: "/payroll", label: "Payroll" },
        { href: "/suppliers", label: "Suppliers" },
      ],
    });
  } else if (can(role, ["auditor"])) {
    sections.push({
      title: "Management",
      items: [{ href: "/payroll", label: "Payroll" }],
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            {cafe?.settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cafe.settings.logoUrl}
                alt=""
                style={{ width: 28, height: 28, borderRadius: 8, objectFit: "contain" }}
              />
            ) : (
              <span className="mark" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
                C
              </span>
            )}
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{cafeLabel}</span>
            <LiveClock timeZone={tz} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <LunchControls
              shiftStatus={shiftStatus}
              inLunchWindow={inLunchWindow && !!lunchSettings.lunchEnabled}
              lunchLabel={`Lunch window ${lunchSettings.lunchStart}–${lunchSettings.lunchEnd}`}
              startLunchAction={startLunchAction}
              endLunchAction={endLunchAction}
            />
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
