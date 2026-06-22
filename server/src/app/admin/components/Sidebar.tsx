"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const NAV_ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "/admin", label: "Dashboard", icon: "⬡" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/library", label: "Library", icon: "🎵" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">M</div>
        <span className="sidebar-logo-text">mugisk</span>
      </div>

      {/* Admin badge */}
      <div className="sidebar-badge">Admin Panel</div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`sidebar-nav-item ${isActive ? "sidebar-nav-item--active" : ""}`}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
