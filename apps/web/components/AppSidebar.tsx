"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut, TrendingUp, Zap, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

const STORAGE_KEY = "careervue-sidebar-collapsed";
const SIDEBAR_OPEN_W  = "15rem";   // 240px
const SIDEBAR_CLOSE_W = "3.5rem";  // 56px

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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read persisted state on mount and set CSS variable
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const isCollapsed = stored === "true";
      setCollapsed(isCollapsed);
      document.documentElement.style.setProperty("--sidebar-w", isCollapsed ? SIDEBAR_CLOSE_W : SIDEBAR_OPEN_W);
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    document.documentElement.style.setProperty("--sidebar-w", next ? SIDEBAR_CLOSE_W : SIDEBAR_OPEN_W);
  }

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

  // Avoid layout flash before localStorage is read
  if (!mounted) return (
    <aside className="fixed left-0 top-0 h-screen w-60 z-40 border-r border-white/[0.07]" style={{ background: "#0d0d14" }} />
  );

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40 border-r border-white/[0.07] overflow-hidden"
      style={{
        background: "#0d0d14",
        width: collapsed ? SIDEBAR_CLOSE_W : SIDEBAR_OPEN_W,
        transition: "width 0.2s ease",
      }}
    >
      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 border-b border-white/[0.07] flex-shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <TrendingUp size={13} className="text-white" />
            </div>
            <span className="text-[13px] font-bold text-white leading-none truncate">CareerVue</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center mx-auto">
            <TrendingUp size={13} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-[#7c7a8a] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Tier badge — only when expanded */}
      {!collapsed && (
        <div className="px-4 pt-2.5 pb-1 flex-shrink-0">
          <span className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 border border-[#6c63ff]/20 px-2.5 py-1 rounded-full">
            {tierLabel}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all group relative
                ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
                ${active ? "bg-[#6c63ff]/15 text-white" : "text-[#7c7a8a] hover:text-white hover:bg-white/[0.05]"}
              `}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#6c63ff] rounded-full" />
              )}
              <item.icon size={16} className={`flex-shrink-0 ${active ? "text-[#6c63ff]" : "text-current"}`} />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`pb-4 border-t border-white/[0.07] pt-3 flex-shrink-0 ${collapsed ? "px-2" : "px-3"} space-y-1`}>
        {/* Expand button (only when collapsed) */}
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-[#7c7a8a] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <Link
          href={settingsHref}
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 rounded-xl text-sm font-medium text-[#7c7a8a] hover:text-white hover:bg-white/[0.05] transition-all
            ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}
          `}
        >
          <Settings size={16} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {showUpgrade && !collapsed && (
          <button className="w-full btn-primary text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-2 justify-center mt-2">
            <Zap size={13} />
            Upgrade to Pro
          </button>
        )}
        {showUpgrade && collapsed && (
          <button title="Upgrade to Pro" className="w-full flex items-center justify-center py-2.5 rounded-xl text-[#6c63ff] hover:bg-[#6c63ff]/10 transition-colors">
            <Zap size={16} />
          </button>
        )}

        {/* User row */}
        <div className={`flex items-center gap-3 rounded-xl hover:bg-white/[0.03] transition-colors mt-1
          ${collapsed ? "justify-center px-0 py-2" : "px-3 py-2.5"}
        `}>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
