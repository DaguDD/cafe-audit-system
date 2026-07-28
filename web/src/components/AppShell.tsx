import { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import type { Role } from "@prisma/client";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "manager", "auditor", "server", "kitchen", "staff"] },
  { href: "/inventory", label: "Inventory", roles: ["admin", "manager", "auditor", "kitchen"] },
  { href: "/products", label: "Products", roles: ["admin", "manager", "kitchen"] },
  { href: "/audit", label: "Audit", roles: ["admin", "manager", "auditor"] },
  { href: "/tables", label: "Tables & QR", roles: ["admin", "manager"] },
  { href: "/orders", label: "Orders", roles: ["admin", "manager", "server"] },
  { href: "/kitchen", label: "Kitchen", roles: ["admin", "manager", "kitchen"] },
  { href: "/payments", label: "Payments", roles: ["admin", "manager", "server", "staff"] },
  { href: "/sales", label: "Sales", roles: ["admin", "manager", "server", "staff"] },
];

export default async function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="min-h-screen bg-[#12100e] text-[#f5f0ea]">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-[#3d352c] bg-[#1a1714] p-4 md:block">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-[#e8954a]">Cafe Audit System</p>
            <p className="mt-1 text-sm text-[#a89f94]">{session?.user?.name}</p>
            <p className="text-xs text-[#a89f94]">{role}</p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.filter((n) => role && n.roles.includes(role)).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm text-[#f5f0ea]/90 hover:bg-[#2a2520]"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="w-full rounded-lg border border-[#3d352c] px-3 py-2 text-sm text-[#a89f94] hover:bg-[#2a2520]">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between border-b border-[#3d352c] pb-4">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Link href="/login" className="text-sm text-[#e8954a] md:hidden">
              Account
            </Link>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
