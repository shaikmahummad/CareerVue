"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

type Role = "student" | "tutor";
type Step = "role" | "form";

interface StudentFields {
  college: string;
  branch: string;
  year_of_study: string;
  city: string;
  linkedin_url: string;
  github_url: string;
}

interface TutorFields {
  bio: string;
  qualification: string;
  years_experience: string;
  expertise_tags: string;
  linkedin_url: string;
  website_url: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    setStudentFields((prev) => ({ ...prev, [key]: val }));
  }
  function updateTutor(key: keyof TutorFields, val: string) {
    setTutorFields((prev) => ({ ...prev, [key]: val }));
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

      // Sign in with Supabase to establish the cookie-based session
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

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-1">CareerVue</h1>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-500 text-sm mb-8">I want to join as a…</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setRole("student")}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                role === "student"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 text-gray-700"
              }`}
            >
              <span className="text-4xl">🎓</span>
              <div className="text-center">
                <p className="font-semibold">Student</p>
                <p className="text-xs text-gray-500 mt-1">Learn & grow</p>
              </div>
            </button>

            <button
              onClick={() => setRole("tutor")}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                role === "tutor"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 text-gray-700"
              }`}
            >
              <span className="text-4xl">📚</span>
              <div className="text-center">
                <p className="font-semibold">Tutor</p>
                <p className="text-xs text-gray-500 mt-1">Teach & earn</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => setStep("form")}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Continue as {role === "student" ? "Student" : "Tutor"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setStep("role")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
        </div>
        <h1 className="text-3xl font-bold text-blue-600 mb-1">CareerVue</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {role === "student" ? "Student" : "Tutor"} Registration
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Fields marked <span className="text-red-500">*</span> are required
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common fields */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Student-specific fields */}
          {role === "student" && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Academic Details (optional)
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="College / University"
                    value={studentFields.college}
                    onChange={(e) => updateStudent("college", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Branch / Major"
                      value={studentFields.branch}
                      onChange={(e) => updateStudent("branch", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Year (1–4)"
                      min={1}
                      max={5}
                      value={studentFields.year_of_study}
                      onChange={(e) => updateStudent("year_of_study", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="City"
                    value={studentFields.city}
                    onChange={(e) => updateStudent("city", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={studentFields.linkedin_url}
                    onChange={(e) => updateStudent("linkedin_url", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    placeholder="GitHub URL"
                    value={studentFields.github_url}
                    onChange={(e) => updateStudent("github_url", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tutor-specific fields */}
          {role === "tutor" && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Professional Details (optional)
                </p>
                <div className="space-y-3">
                  <textarea
                    placeholder="Short bio — tell students about yourself"
                    value={tutorFields.bio}
                    onChange={(e) => updateTutor("bio", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Expertise tags (comma-separated: React, Python, ML)"
                    value={tutorFields.expertise_tags}
                    onChange={(e) => updateTutor("expertise_tags", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Qualification (e.g. M.Tech)"
                      value={tutorFields.qualification}
                      onChange={(e) => updateTutor("qualification", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Years experience"
                      min={0}
                      value={tutorFields.years_experience}
                      onChange={(e) => updateTutor("years_experience", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={tutorFields.linkedin_url}
                    onChange={(e) => updateTutor("linkedin_url", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    placeholder="Website / Portfolio URL"
                    value={tutorFields.website_url}
                    onChange={(e) => updateTutor("website_url", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
