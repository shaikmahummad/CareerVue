"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Map, BookOpen, BarChart3, Brain, Trophy, Bell } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { createClient } from "../lib/supabase/client";
import { apiGet } from "../lib/api";

interface CurrentProfile {
  full_name: string;
  avatar_url: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/roadmap",      label: "Roadmap",    icon: Map },
  { href: "/courses",      label: "My Courses", icon: BookOpen },
  { href: "/analytics",    label: "Analytics",  icon: BarChart3 },
  { href: "/quiz",         label: "Assessments",icon: Brain },
  { href: "/profile",      label: "Progress",   icon: Trophy },
  { href: "/notifications",label: "Notifications", icon: Bell },
];

export default function StudentNavbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Student");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      avatarUrl={avatarUrl}
      showUpgrade
      settingsHref="/settings"
      onLogout={handleLogout}
    />
  );
}
