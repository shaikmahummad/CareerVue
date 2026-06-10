"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Flag, RefreshCw, FileText, Bell, LogOut,
  ChevronRight, Loader2, AlertTriangle,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";

interface Profile {
  career_goal: string | null;
  full_name: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    apiGet<Profile>("/api/v1/students/profile")
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleChangeGoal() {
    if (!confirm(
      "Changing your goal will archive your current roadmap and you'll need to take a new assessment.\n\nAre you sure you want to continue?"
    )) return;
    router.push("/quiz?change=1");
  }

  async function handleRegenerateRoadmap() {
    if (!confirm("This will replace your current roadmap with a new one based on your latest skill profile. Continue?")) return;
    setRegenerating(true);
    try {
      await apiPost("/api/v1/roadmap/generate");
      router.push("/roadmap");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate roadmap");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />
      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Settings size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Manage your career goal, roadmap, and account preferences.</p>
          </div>

          {/* ── Goal & Roadmap ── */}
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Goal &amp; Roadmap</p>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">

            {/* Current goal */}
            <div className="px-5 py-4">
              <p className="text-xs text-[#7c7a8a] mb-1">Current Goal</p>
              {loading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 size={13} className="animate-spin text-[#6c63ff]" />
                  <span className="text-sm text-[#7c7a8a]">Loading…</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-white">
                  {profile?.career_goal ?? <span className="text-[#7c7a8a] font-normal">No goal set yet</span>}
                </p>
              )}
            </div>

            {/* Change Career Goal */}
            <button
              onClick={handleChangeGoal}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Flag size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Change Career Goal</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Archive roadmap and start a fresh assessment</p>
              </div>
              <ChevronRight size={16} className="text-[#7c7a8a]" />
            </button>

            {/* Regenerate Roadmap */}
            <button
              onClick={handleRegenerateRoadmap}
              disabled={regenerating}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                {regenerating ? (
                  <Loader2 size={16} className="animate-spin text-green-400" />
                ) : (
                  <RefreshCw size={16} className="text-green-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Regenerate Roadmap</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Rebuild from your current skill profile</p>
              </div>
              <ChevronRight size={16} className="text-[#7c7a8a]" />
            </button>
          </div>

          {/* ── Assessment ── */}
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Assessment</p>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">
            <a
              href="/quiz"
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-[#6c63ff]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Take Assessment</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Retake quiz to track your improvement</p>
              </div>
              <ChevronRight size={16} className="text-[#7c7a8a]" />
            </a>
          </div>

          {/* ── Account ── */}
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-3">Account</p>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-white/[0.05] mb-6">

            {/* Account info */}
            <div className="px-5 py-4">
              <p className="text-xs text-[#7c7a8a] mb-1">Account</p>
              <p className="text-sm font-medium text-white">{profile?.full_name ?? "—"}</p>
              <p className="text-xs text-[#7c7a8a] mt-0.5">{profile?.email ?? "—"}</p>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Bell size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Notifications</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">Learning reminders and updates</p>
              </div>
              <button
                onClick={() => setNotifications((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${notifications ? "bg-[#6c63ff]" : "bg-white/[0.1]"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <LogOut size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Sign Out</p>
              </div>
            </button>
          </div>

          {/* Warning note */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
            <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#7c7a8a]">
              Changing your career goal archives your current roadmap. Your quiz history is always preserved.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
