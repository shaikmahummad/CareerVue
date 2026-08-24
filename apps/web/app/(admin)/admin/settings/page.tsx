"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Shield, Bell, Users, Database, LogOut, Loader2 } from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { createClient } from "../../../../lib/supabase/client";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState({
    maintenanceMode: false,
    newRegistrations: true,
    emailNotifications: true,
    autoApprove: false,
  });

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    alert("Platform settings saved.");
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <AdminNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Settings size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Control platform-wide configuration and moderation settings.</p>
          </div>

          {/* Access Control */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Access Control</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            {([
              { key: "maintenanceMode",   label: "Maintenance Mode",      sub: "Disable access for all non-admin users",  icon: Shield,   warn: true },
              { key: "newRegistrations",  label: "New Registrations",     sub: "Allow new users to sign up",              icon: Users,    warn: false },
              { key: "autoApprove",       label: "Auto-Approve Courses",  sub: "Skip manual review for tutor submissions", icon: Database, warn: true },
            ] as const).map(({ key, label, sub, icon: Icon, warn }) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${warn ? "bg-red-500/10" : "bg-[#6c63ff]/10"}`}>
                  <Icon size={16} className={warn ? "text-red-400" : "text-[#6c63ff]"} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-[#7c7a8a] mt-0.5">{sub}</p>
                </div>
                <button
                  onClick={() => setToggles(v => ({ ...v, [key]: !v[key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${toggles[key] ? (warn ? "bg-red-500" : "bg-[#6c63ff]") : "bg-white/[0.1]"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${toggles[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Notifications</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-[#e7c365]/10 flex items-center justify-center flex-shrink-0">
                <Bell size={16} className="text-[#e7c365]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Email Notifications</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Receive alerts for new approvals, reports, and issues</p>
              </div>
              <button
                onClick={() => setToggles(v => ({ ...v, emailNotifications: !v.emailNotifications }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${toggles.emailNotifications ? "bg-[#6c63ff]" : "bg-white/[0.1]"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${toggles.emailNotifications ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Platform info */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Platform Info</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            {[
              { label: "Platform Version", value: "2.0.0" },
              { label: "Environment",      value: "Production" },
              { label: "Database",         value: "PostgreSQL · Supabase" },
              { label: "Auth Provider",    value: "Supabase Auth" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-[#7c7a8a]">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save Settings"}
            </button>
            <button onClick={handleSignOut}
              className="glass-card px-5 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/5 flex items-center gap-2 transition-colors">
              <LogOut size={15} /> Sign Out
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
