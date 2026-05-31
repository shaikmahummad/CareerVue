"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, GraduationCap, BookOpen, ChevronLeft, Zap, ArrowRight } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

type Role = "student" | "tutor";
type Step = "role" | "form";

interface StudentFields {
  college: string; branch: string; year_of_study: string; city: string;
  linkedin_url: string; github_url: string;
}
interface TutorFields {
  bio: string; qualification: string; years_experience: string;
  expertise_tags: string; linkedin_url: string; website_url: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FEATURES = [
  { icon: Zap,      label: "AI Roadmaps",       desc: "Data-driven career paths tailored to your goals." },
  { icon: BookOpen, label: "Curated Learning",   desc: "Top-tier courses selected by industry experts." },
];

function StepIndicator({ current }: { current: number }) {
  const steps = ["Role", "Details", "Confirm"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            i + 1 === current ? "text-white" : i + 1 < current ? "text-[#6c63ff]" : "text-[#7c7a8a]"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              i + 1 === current
                ? "gradient-primary border-transparent text-white"
                : i + 1 < current
                ? "border-[#6c63ff] text-[#6c63ff]"
                : "border-white/[0.15] text-[#7c7a8a]"
            }`}>
              {i + 1}
            </div>
            Step {i + 1}: {label}
          </div>
          {i < steps.length - 1 && <div className="w-6 h-px bg-white/[0.1]" />}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [studentFields, setStudentFields] = useState<StudentFields>({
    college: "", branch: "", year_of_study: "", city: "", linkedin_url: "", github_url: "",
  });
  const [tutorFields, setTutorFields] = useState<TutorFields>({
    bio: "", qualification: "", years_experience: "", expertise_tags: "", linkedin_url: "", website_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateStudent(key: keyof StudentFields, val: string) {
    setStudentFields((p) => ({ ...p, [key]: val }));
  }
  function updateTutor(key: keyof TutorFields, val: string) {
    setTutorFields((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const common = { full_name: fullName, email, password, phone: phone || undefined };
    const body =
      role === "student"
        ? {
            ...common,
            college: studentFields.college || undefined,
            branch: studentFields.branch || undefined,
            year_of_study: studentFields.year_of_study ? Number(studentFields.year_of_study) : undefined,
            city: studentFields.city || undefined,
            linkedin_url: studentFields.linkedin_url || undefined,
            github_url: studentFields.github_url || undefined,
          }
        : {
            ...common,
            bio: tutorFields.bio || undefined,
            qualification: tutorFields.qualification || undefined,
            years_experience: tutorFields.years_experience ? Number(tutorFields.years_experience) : undefined,
            expertise_tags: tutorFields.expertise_tags
              ? tutorFields.expertise_tags.split(",").map((t) => t.trim()).filter(Boolean)
              : undefined,
            linkedin_url: tutorFields.linkedin_url || undefined,
            website_url: tutorFields.website_url || undefined,
          };
    try {
      const res = await fetch(`${API}/api/v1/auth/register/${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.detail ?? json?.message ?? "Registration failed";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);
      router.push(role === "tutor" ? "/tutor/dashboard" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:border-[#6c63ff] transition-colors";

  return (
    <div className="min-h-screen bg-[#050508] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #080810 0%, #0d0d1a 100%)" }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6c63ff]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">CareerVue AI</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Join the elite circle of professionals leveraging AI to redefine career trajectories.
          </h2>
          <div className="space-y-3 mt-8">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 glass-card rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <f.icon size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{f.label}</p>
                  <p className="text-[11px] text-[#7c7a8a]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#7c7a8a] relative z-10">
          &copy; 2024 CareerVue AI. Accelerating Futures.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
                <TrendingUp size={11} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white">CareerVue</span>
            </div>
            <p className="text-xs text-[#7c7a8a] ml-auto">
              Already have an account?{" "}
              <Link href="/login" className="text-[#6c63ff] hover:text-[#00d4ff] font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </div>

          <StepIndicator current={step === "role" ? 1 : 2} />

          {step === "role" ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Accelerate your journey.</h1>
              <p className="text-sm text-[#7c7a8a] mb-8">
                Tell us who you are so we can personalise your experience.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {([
                  {
                    value: "student" as Role,
                    icon: GraduationCap,
                    label: "Student",
                    desc: "I want to discover my path, learn skills, and land my dream job.",
                  },
                  {
                    value: "tutor" as Role,
                    icon: BookOpen,
                    label: "Tutor",
                    desc: "I want to share my expertise, monetise knowledge, and grow my influence.",
                  },
                ] as const).map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    className={`flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all ${
                      role === value
                        ? "border-[#6c63ff] bg-[#6c63ff]/10"
                        : "border-white/[0.07] hover:border-white/20 bg-white/[0.02]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      role === value ? "gradient-primary" : "bg-white/[0.06]"
                    }`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-[11px] text-[#7c7a8a] mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-secondary flex-1 text-sm text-center py-3 rounded-xl">
                  <ChevronLeft size={14} className="inline mr-1" /> Back
                </Link>
                <button
                  onClick={() => setStep("form")}
                  className="btn-primary flex-1 text-sm py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  Continue to Details <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setStep("role")}
                  className="text-[#7c7a8a] hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <h1 className="text-xl font-bold text-white">
                  {role === "student" ? "Student" : "Tutor"} Registration
                </h1>
              </div>

              {error && (
                <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" placeholder="Full Name *" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} required className={inputCls} />
                <input type="email" placeholder="Email *" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputCls} />
                <input type="password" placeholder="Password (min 6 chars) *" value={password}
                  onChange={(e) => setPassword(e.target.value)} minLength={6} required className={inputCls} />
                <input type="tel" placeholder="Phone (optional)" value={phone}
                  onChange={(e) => setPhone(e.target.value)} className={inputCls} />

                {role === "student" && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">
                      Academic Details (optional)
                    </p>
                    <input type="text" placeholder="College / University" value={studentFields.college}
                      onChange={(e) => updateStudent("college", e.target.value)} className={inputCls} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Branch / Major" value={studentFields.branch}
                        onChange={(e) => updateStudent("branch", e.target.value)} className={inputCls} />
                      <input type="number" placeholder="Year (1–4)" min={1} max={5} value={studentFields.year_of_study}
                        onChange={(e) => updateStudent("year_of_study", e.target.value)} className={inputCls} />
                    </div>
                    <input type="text" placeholder="City" value={studentFields.city}
                      onChange={(e) => updateStudent("city", e.target.value)} className={inputCls} />
                    <input type="url" placeholder="LinkedIn URL" value={studentFields.linkedin_url}
                      onChange={(e) => updateStudent("linkedin_url", e.target.value)} className={inputCls} />
                    <input type="url" placeholder="GitHub URL" value={studentFields.github_url}
                      onChange={(e) => updateStudent("github_url", e.target.value)} className={inputCls} />
                  </div>
                )}

                {role === "tutor" && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">
                      Professional Details (optional)
                    </p>
                    <textarea placeholder="Short bio — tell students about yourself" value={tutorFields.bio}
                      onChange={(e) => updateTutor("bio", e.target.value)} rows={3}
                      className={`${inputCls} resize-none`} />
                    <input type="text" placeholder="Expertise tags (React, Python, ML...)" value={tutorFields.expertise_tags}
                      onChange={(e) => updateTutor("expertise_tags", e.target.value)} className={inputCls} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Qualification" value={tutorFields.qualification}
                        onChange={(e) => updateTutor("qualification", e.target.value)} className={inputCls} />
                      <input type="number" placeholder="Years exp." min={0} value={tutorFields.years_experience}
                        onChange={(e) => updateTutor("years_experience", e.target.value)} className={inputCls} />
                    </div>
                    <input type="url" placeholder="LinkedIn URL" value={tutorFields.linkedin_url}
                      onChange={(e) => updateTutor("linkedin_url", e.target.value)} className={inputCls} />
                    <input type="url" placeholder="Website / Portfolio" value={tutorFields.website_url}
                      onChange={(e) => updateTutor("website_url", e.target.value)} className={inputCls} />
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full btn-primary py-3 text-sm font-semibold rounded-xl disabled:opacity-50 mt-2">
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 flex justify-center gap-6">
            {["Features", "Pricing", "Privacy", "Terms"].map((item) => (
              <a key={item} href="#" className="text-[11px] text-[#7c7a8a] hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
