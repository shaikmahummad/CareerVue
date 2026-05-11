"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Flame, BookOpen, Trophy, Loader2,
  CheckCircle2, AlertCircle, ExternalLink, Brain,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPut } from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  college: string | null;
  branch: string | null;
  year_of_study: number | null;
  graduation_year: number | null;
  city: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  career_goal: string | null;
  xp_points: number;
  streak_days: number;
  placement_ready: boolean;
}

interface Stats {
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

// ─── Avatar initial ───────────────────────────────────────────────────────────

function AvatarInitial({ name, size = "lg" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const cls = size === "lg"
    ? "w-20 h-20 text-2xl"
    : "w-12 h-12 text-base";

  return (
    <div className={`${cls} rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

// ─── Field group ──────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
  min,
  max,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      min={min}
      max={max}
      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
        readOnly
          ? "bg-gray-50 border-gray-100 text-gray-500 cursor-default"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state — mirrors editable fields
  const [form, setForm] = useState({
    phone: "",
    college: "",
    branch: "",
    year_of_study: "",
    graduation_year: "",
    city: "",
    linkedin_url: "",
    github_url: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  function set(key: keyof typeof form) {
    return (val: string) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const [profileR, statsR] = await Promise.allSettled([
        apiGet<StudentProfile>("/api/v1/students/profile"),
        apiGet<Stats>("/api/v1/students/stats"),
      ]);

      if (profileR.status === "fulfilled") {
        const p = profileR.value;
        setProfile(p);
        setForm({
          phone: p.phone ?? "",
          college: p.college ?? "",
          branch: p.branch ?? "",
          year_of_study: p.year_of_study != null ? String(p.year_of_study) : "",
          graduation_year: p.graduation_year != null ? String(p.graduation_year) : "",
          city: p.city ?? "",
          linkedin_url: p.linkedin_url ?? "",
          github_url: p.github_url ?? "",
        });
      }
      if (statsR.status === "fulfilled") setStats(statsR.value);
      setLoading(false);
    }
    load();
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");

    const payload: Record<string, string | number | null> = {};
    if (form.phone) payload.phone = form.phone;
    if (form.college) payload.college = form.college;
    if (form.branch) payload.branch = form.branch;
    if (form.year_of_study) payload.year_of_study = Number(form.year_of_study);
    if (form.graduation_year) payload.graduation_year = Number(form.graduation_year);
    if (form.city) payload.city = form.city;
    if (form.linkedin_url) payload.linkedin_url = form.linkedin_url;
    if (form.github_url) payload.github_url = form.github_url;

    try {
      const updated = await apiPut<StudentProfile>("/api/v1/students/profile", payload);
      setProfile(updated);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="text-center py-32">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
          <p className="text-gray-500">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        >
          <div className="flex items-start gap-5">
            <AvatarInitial name={profile.full_name} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full capitalize">
                  Student
                </span>
                {profile.career_goal && (
                  <span className="text-xs font-medium bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full">
                    🎯 {profile.career_goal}
                  </span>
                )}
                {profile.placement_ready && (
                  <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                    ✓ Placement Ready
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats mini-bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Zap,      value: stats?.xp_points ?? profile.xp_points,  label: "XP",         color: "text-yellow-600", bg: "bg-yellow-50" },
            { icon: Flame,    value: `${stats?.streak_days ?? profile.streak_days}d`, label: "Streak", color: "text-orange-600", bg: "bg-orange-50" },
            { icon: BookOpen, value: stats?.enrolled_count ?? "—",            label: "Enrolled",    color: "text-blue-600",   bg: "bg-blue-50" },
            { icon: Trophy,   value: stats?.completed_count ?? "—",           label: "Completed",   color: "text-emerald-600",bg: "bg-emerald-50" },
          ].map(({ icon: Icon, value, label, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900">Edit Profile</h2>

          {/* Read-only identity fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identity (managed by your account)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <Input value={profile.full_name} readOnly />
              </Field>
              <Field label="Email">
                <Input value={profile.email} readOnly />
              </Field>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91 9876543210"
                type="tel"
              />
            </Field>
          </div>

          {/* Academic */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Academic Details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="College / University">
                <Input value={form.college} onChange={set("college")} placeholder="IIT Delhi" />
              </Field>
              <Field label="Branch / Major">
                <Input value={form.branch} onChange={set("branch")} placeholder="Computer Science" />
              </Field>
              <Field label="Year of Study">
                <Input
                  value={form.year_of_study}
                  onChange={set("year_of_study")}
                  placeholder="3"
                  type="number"
                  min={1}
                  max={5}
                />
              </Field>
              <Field label="Graduation Year">
                <Input
                  value={form.graduation_year}
                  onChange={set("graduation_year")}
                  placeholder="2026"
                  type="number"
                  min={2020}
                  max={2035}
                />
              </Field>
              <Field label="City" >
                <Input value={form.city} onChange={set("city")} placeholder="Bangalore" />
              </Field>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Links</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="LinkedIn URL" hint="Your LinkedIn profile URL">
                <Input
                  value={form.linkedin_url}
                  onChange={set("linkedin_url")}
                  placeholder="https://linkedin.com/in/username"
                  type="url"
                />
              </Field>
              <Field label="GitHub URL" hint="Your GitHub profile URL">
                <Input
                  value={form.github_url}
                  onChange={set("github_url")}
                  placeholder="https://github.com/username"
                  type="url"
                />
              </Field>
            </div>
          </div>

          {/* Save button + status */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "Saving…" : "Save Changes"}
            </button>

            {saveStatus === "success" && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"
              >
                <CheckCircle2 size={14} /> Saved!
              </motion.span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle size={14} /> {saveError}
              </span>
            )}
          </div>
        </div>

        {/* Career goal section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Career Goal</h2>

          {profile.career_goal ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Brain size={18} className="text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile.career_goal}</p>
                  <p className="text-xs text-gray-400">Your current career goal</p>
                </div>
              </div>
              <Link
                href="/quiz"
                className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Brain size={13} /> Retake Quiz
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <Brain size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">No career goal set yet</p>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Brain size={14} /> Take the Skill Quiz
              </Link>
            </div>
          )}
        </div>

        {/* External links (if set) */}
        {(profile.linkedin_url || profile.github_url) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Links</h2>
            <div className="flex flex-wrap gap-3">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  LinkedIn <ExternalLink size={12} />
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  GitHub <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
