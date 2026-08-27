"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, Check, AlertCircle, Plus, X } from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { apiGet, apiPut } from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TutorProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  expertise_tags: string[];
  qualification: string | null;
  years_experience: number | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_verified: boolean;
  total_earnings: number;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarInitial({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-[0_0_24px_rgba(108,99,255,0.2)] flex-shrink-0">
      {initials || "T"}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#cbc4d2] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#050508] px-3.5 py-2.5 border border-white/[0.1] rounded-xl text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/40 focus:border-[#6c63ff] transition-all";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TutorProfilePage() {
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    bio: "", qualification: "", years_experience: "",
    linkedin_url: "", website_url: "", phone: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    apiGet<TutorProfile>("/api/v1/tutors/profile")
      .then((data) => {
        setProfile(data);
        setForm({
          bio:              data.bio ?? "",
          qualification:    data.qualification ?? "",
          years_experience: data.years_experience != null ? String(data.years_experience) : "",
          linkedin_url:     data.linkedin_url ?? "",
          website_url:      data.website_url ?? "",
          phone:            data.phone ?? "",
        });
        setTags(data.expertise_tags ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof typeof form) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");
    try {
      const updated = await apiPut<TutorProfile>("/api/v1/tutors/profile", {
        bio:              form.bio.trim() || null,
        qualification:    form.qualification.trim() || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        linkedin_url:     form.linkedin_url.trim() || null,
        website_url:      form.website_url.trim() || null,
        phone:            form.phone.trim() || null,
        expertise_tags:   tags,
      });
      setProfile(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508]">
        <TutorNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508]">
      <TutorNavbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

        {/* Identity card */}
        <div className="glass-card rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-4 mb-6">
            <AvatarInitial name={profile?.full_name ?? ""} />
            <div>
              <p className="text-lg font-bold text-white">{profile?.full_name}</p>
              <p className="text-sm text-[#7c7a8a]">{profile?.email}</p>
              {profile?.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded-full mt-1">
                  <Check size={11} /> Verified Tutor
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-[#050508] rounded-xl p-4">
              <p className="text-[#7c7a8a] text-xs mb-0.5">Total Earnings</p>
              <p className="font-bold text-white">₹{(profile?.total_earnings ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-[#050508] rounded-xl p-4">
              <p className="text-[#7c7a8a] text-xs mb-0.5">Account Status</p>
              <p className="font-medium text-white">{profile?.is_verified ? "Verified" : "Pending verification"}</p>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="glass-card rounded-2xl p-6 mb-5">
          <p className="text-sm font-semibold text-[#cbc4d2] mb-4">Professional Details</p>
          <div className="space-y-4">
            <Field label="Phone">
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+91 9876543210" />
            </Field>

            <Field label="Bio">
              <textarea
                className={inputCls + " min-h-[100px] resize-y"}
                value={form.bio}
                onChange={(e) => set("bio")(e.target.value)}
                placeholder="Tell students about yourself, your experience, and teaching style..."
              />
            </Field>

            <Field label="Qualification">
              <input className={inputCls} value={form.qualification} onChange={(e) => set("qualification")(e.target.value)} placeholder="e.g. B.Tech Computer Science, IIT Delhi" />
            </Field>

            <Field label="Years of Experience">
              <input type="number" min="0" max="50" className={inputCls} value={form.years_experience} onChange={(e) => set("years_experience")(e.target.value)} placeholder="e.g. 5" />
            </Field>

            <Field label="Expertise Tags">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium bg-[#6c63ff]/10 text-[#c4c0ff] px-2.5 py-1 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-[#00d4ff] transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a skill (e.g. React, Python)"
                />
                <button
                  onClick={addTag}
                  className="px-3 py-2 bg-white/[0.06] rounded-xl hover:bg-white/[0.1] transition-colors flex-shrink-0"
                >
                  <Plus size={16} className="text-[#cbc4d2]" />
                </button>
              </div>
            </Field>

            <Field label="LinkedIn URL">
              <input className={inputCls} value={form.linkedin_url} onChange={(e) => set("linkedin_url")(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </Field>

            <Field label="Website URL">
              <input className={inputCls} value={form.website_url} onChange={(e) => set("website_url")(e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.07]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#6c63ff] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#5b54e6] transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Profile
            </button>
            <AnimatePresence>
              {saveStatus === "saved" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-[#00d4ff] flex items-center gap-1"
                >
                  <Check size={14} /> Saved successfully
                </motion.span>
              )}
              {saveStatus === "error" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-500 flex items-center gap-1"
                >
                  <AlertCircle size={14} /> {saveError}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
