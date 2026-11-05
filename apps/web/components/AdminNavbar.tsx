"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, BookOpen, BarChart3, Settings } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { createClient } from "../lib/supabase/client";
import { apiGet } from "../lib/api";

interface CurrentProfile {
  full_name: string;
  avatar_url: string | null;
}

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview",   icon: LayoutDashboard },
  { href: "/admin/approvals", label: "Approvals",  icon: CheckSquare },
  { href: "/admin/users",     label: "Users",      icon: Users },
  { href: "/admin/courses",   label: "Courses",    icon: BookOpen },
  { href: "/admin/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/admin/settings",  label: "Settings",   icon: Settings },
];

export default function AdminNavbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.full_name as string | undefined;
      if (name) setUserName(name);
      try {
        const profile = await apiGet<CurrentProfile>("/api/v1/auth/me");
        setUserName(profile.full_name);
        setAvatarUrl(profile.avatar_url);
      } catch {
        // Keep the session metadata fallback when the API is unavailable.
      }
      try {
        const pending = await apiGet<unknown[]>("/api/v1/admin/courses/pending");
        setPendingCount(pending.length);
      } catch {
        setPendingCount(0);
      }
    })();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AppSidebar
      navItems={NAV_ITEMS.map((item) => item.href === "/admin/approvals" ? { ...item, badge: pendingCount } : item)}
      tierLabel="Admin Control Center"
      userName={userName}
      userRoleLabel="Platform Admin"
      avatarUrl={avatarUrl}
      showUpgrade={false}
      settingsHref="/admin/settings"
      onLogout={handleLogout}
    />
  );
}
