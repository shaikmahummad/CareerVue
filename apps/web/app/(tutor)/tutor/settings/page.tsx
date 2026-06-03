"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, User, Bell, CreditCard, Shield, LogOut, ChevronRight, Loader2 } from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { createClient } from "../../../../lib/supabase/client";

export default function TutorSettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState({ enrollment: true, review: true, payment: true, weekly: false });
  const [saving, setSaving] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    alert("Settings saved successfully.");
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <TutorNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Settings size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Manage your account, notifications and payout preferences.</p>
          </div>

          {/* Profile */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Profile</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            <a href="/tutor/profile" className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-[#6c63ff]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Edit Profile</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Update your name, bio, and expertise tags</p>
              </div>
              <ChevronRight size={16} className="text-[#7c7a8a]" />
            </a>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-[#00d4ff]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Verified Instructor</p>
                <p className="text-xs text-[#00d4ff] mt-0.5">Your account is verified</p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Notifications</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            {([
              { key: "enrollment", label: "New Enrollments",   sub: "When a student enrols in your course" },
              { key: "review",     label: "New Reviews",       sub: "When a student leaves a rating or review" },
              { key: "payment",    label: "Payment Received",  sub: "When a payout is processed" },
              { key: "weekly",     label: "Weekly Summary",    sub: "A weekly digest of your course stats" },
            ] as const).map(({ key, label, sub }) => (
              <div key={key} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-[#e7c365]/10 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-[#e7c365]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-[#7c7a8a] mt-0.5">{sub}</p>
                </div>
                <button
                  onClick={() => setNotifications(v => ({ ...v, [key]: !v[key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${notifications[key] ? "bg-[#6c63ff]" : "bg-white/[0.1]"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Payouts */}
          <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Payouts</p>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={16} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Bank Account</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">XXXX XXXX XXXX 4521 · HDFC Bank</p>
              </div>
              <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-[#7c7a8a]">Revenue split: <span className="text-white font-semibold">70% to instructor</span> · Payouts processed on the 1st of each month.</p>
            </div>
          </div>

          {/* Actions */}
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
