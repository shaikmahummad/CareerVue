"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, BookOpen, BarChart3, Settings } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { createClient } from "../lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview",   icon: LayoutDashboard },
  { href: "/admin/approvals", label: "Approvals",  icon: CheckSquare, badge: 5 },
  { href: "/admin/users",     label: "Users",      icon: Users },
  { href: "/admin/courses",   label: "Courses",    icon: BookOpen },
  { href: "/admin/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/admin/settings",  label: "Settings",   icon: Settings },
];

export default function AdminNavbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin User");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.full_name as string | undefined;
      if (name) setUserName(name);
    })();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AppSidebar
      navItems={NAV_ITEMS}
      tierLabel="Admin Control Center"
      userName={userName}
      userRoleLabel="Platform Admin"
      showUpgrade={false}
      settingsHref="/admin/settings"
      onLogout={handleLogout}
    />
  );
}
