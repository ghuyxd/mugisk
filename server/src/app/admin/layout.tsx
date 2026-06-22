"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAccessToken } from "@/lib/adminFetch";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import type { Route } from "next";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    // Client-side guard: if no token in localStorage, send to login.
    // Skip the check on the login page itself to avoid redirect loops.
    if (!isLoginPage && !getAccessToken()) {
      router.replace("/admin/login" as Route);
    }
  }, [router, isLoginPage]);

  // Login page renders without the admin chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-main">
        <Header />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
