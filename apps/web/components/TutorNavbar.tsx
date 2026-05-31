"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart3, Settings } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { createClient } from "../lib/supabase/client";

const NAV_ITEMS = [
  { href: "/tutor/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/tutor/courses",   label: "My Courses", icon: BookOpen },
  { href: "/tutor/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/tutor/settings",  label: "Settings",   icon: Settings },
];

export default function TutorNavbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Tutor");

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
      tierLabel="Premium Tier"
      userName={userName}
      userRoleLabel="Senior Instructor"
      showUpgrade
      settingsHref="/tutor/settings"
      onLogout={handleLogout}
    />
  );
}
