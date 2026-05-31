"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Map, BookOpen, BarChart3, Brain, Trophy } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { createClient } from "../lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/roadmap",      label: "Roadmap",    icon: Map },
  { href: "/courses",      label: "My Courses", icon: BookOpen },
  { href: "/analytics",    label: "Analytics",  icon: BarChart3 },
  { href: "/quiz",         label: "Assessments",icon: Brain },
  { href: "/profile",      label: "Progress",   icon: Trophy },
];

export default function StudentNavbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Student");

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
      userRoleLabel="Pro Learner"
      showUpgrade
      settingsHref="/settings"
      onLogout={handleLogout}
    />
  );
}
