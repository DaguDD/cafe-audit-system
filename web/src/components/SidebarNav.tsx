"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export default function SidebarNav({
  sections,
  mobile,
}: {
  sections: NavSection[];
  mobile?: boolean;
}) {
  const pathname = usePathname();

  if (mobile) {
    const flat = sections.flatMap((s) => s.items);
    return (
      <nav className="mobile-nav">
        {flat.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}
          >
            {item.label}
            {item.badge && item.badge > 0 ? ` (${item.badge})` : ""}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="sidebar-nav">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} title={item.label}>
                <span className="nav-label">{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className="nav-badge">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
