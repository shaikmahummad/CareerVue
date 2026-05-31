"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut, TrendingUp, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface AppSidebarProps {
  navItems: NavItem[];
  tierLabel: string;
  userName: string;
  userRoleLabel: string;
  showUpgrade?: boolean;
  settingsHref?: string;
  onLogout: () => void;
}

export default function AppSidebar({
  navItems,
  tierLabel,
  userName,
  userRoleLabel,
  showUpgrade = true,
  settingsHref = "/settings",
  onLogout,
}: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard" || href === "/tutor/dashboard" || href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40 border-r border-white/[0.07]"
      style={{ background: "#0d0d14" }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
        <Link href="/" className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp size={13} className="text-white" />
          </div>
          <div>
            <span className="text-[13px] font-bold text-white leading-none block">CareerVue AI</span>
          </div>
        </Link>
        <span className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 border border-[#6c63ff]/20 px-2.5 py-1 rounded-full">
          {tierLabel}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                active
                  ? "bg-[#6c63ff]/15 text-white"
                  : "text-[#7c7a8a] hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#6c63ff] rounded-full" />
              )}
              <item.icon size={16} className={active ? "text-[#6c63ff]" : "text-current"} />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/[0.07] pt-3">
        <Link
          href={settingsHref}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#7c7a8a] hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <Settings size={16} />
          Settings
        </Link>

        {showUpgrade && (
          <button className="w-full btn-primary text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-2 justify-center mt-2">
            <Zap size={13} />
            Upgrade to Pro
          </button>
        )}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl hover:bg-white/[0.03] transition-colors">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-[#7c7a8a] truncate">{userRoleLabel}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1 rounded-lg text-[#7c7a8a] hover:text-white transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
