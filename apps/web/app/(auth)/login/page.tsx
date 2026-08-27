"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, TrendingUp, CheckCircle2, Zap, BookOpen } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import { isValidEmail, normalizeEmail } from "../../../lib/auth-validation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://careervue-api.welcos.in";

const ACHIEVEMENTS = [
  { icon: CheckCircle2, label: "Quiz complete", sub: "Skill profile analysed 100%", color: "text-emerald-400" },
  { icon: Zap,          label: "Roadmap generated", sub: "Focused Python Mastery", color: "text-[#6c63ff]" },
  { icon: BookOpen,     label: "Cert earned", sub: "Cloud Architecture Foundations", color: "text-[#00d4ff]" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const verified = searchParams.get("verified") === "1";
  const verificationFailed = searchParams.get("verification") === "failed";
  const passwordUpdated = searchParams.get("password") === "updated";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isValidEmail(email) || !password) {
      setError("Enter a valid email address and password.");
      setLoading(false);
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });
    } catch {
      setError("Sign in could not be completed. Please try again.");
      setLoading(false);
      return;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.detail ?? "Invalid email or password, or the account is not verified.");
      setLoading(false);
      return;
    }

    const authData = body.data;
    const { error: sessionError } = await createClient().auth.setSession({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
    });
    if (sessionError) {
      setError("Sign in could not be completed. Please try again.");
      setLoading(false);
      return;
    }

    const role = authData.user?.role ?? "student";
    if (role === "tutor") router.push("/tutor/dashboard");
    else if (role === "admin") router.push("/admin/dashboard");
    else router.push("/dashboard");
  }

  async function resendVerification() {
    if (!isValidEmail(email)) {
      setResendMessage("Enter your account email first.");
      return;
    }
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch(`${API}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      setResendMessage(
        response.ok
          ? "If this account is awaiting verification, a new link is on its way."
          : response.status === 429
            ? "Please wait a minute before requesting another link."
            : "Unable to resend right now. Please try again."
      );
    } catch {
      setResendMessage("Unable to resend right now. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(135deg, #080810 0%, #0d0d1a 100%)" }}>
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6c63ff]/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">CareerVue</span>
        </div>

        {/* Main text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-white mb-8 leading-tight tracking-tight">
            Welcome back.
          </h1>

          {/* Achievement chips */}
          <div className="space-y-3 mb-10">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-3 glass-card rounded-xl px-4 py-3"
              >
                <a.icon size={16} className={a.color} />
                <div>
                  <p className="text-xs font-semibold text-white">{a.label}</p>
                  <p className="text-[11px] text-[#7c7a8a]">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <blockquote className="border-l-2 border-[#6c63ff]/40 pl-4">
            <p className="text-sm text-[#cbc4d2] leading-relaxed italic mb-3">
              &ldquo;CareerVue didn&apos;t just suggest jobs; it mapped out a precise trajectory
              that shaved two years off my senior promotion.&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Aisha</p>
                <p className="text-[11px] text-[#7c7a8a]">SDE III @ RAZORPAY</p>
              </div>
            </div>
          </blockquote>
        </div>

        <p className="text-[11px] text-[#7c7a8a] relative z-10">
          &copy; 2024 CareerVue. Accelerating Futures.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">CareerVue</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in to CareerVue</h2>
          <p className="text-sm text-[#7c7a8a] mb-8">Access your personalised career dashboard</p>

          {/* Google */}
          <button className="w-full flex items-center justify-center gap-3 glass-card rounded-xl py-3 text-sm font-medium text-[#e6e0e9] hover:bg-white/[0.05] transition-colors mb-5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[11px] text-[#7c7a8a] font-medium">OR EMAIL</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {error && (
            <div className="mb-4 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
              <p className="text-red-400">{error}</p>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="mt-2 text-[#c4c0ff] hover:text-white disabled:opacity-50"
              >
                {resending ? "Resending…" : "Resend verification email"}
              </button>
              {resendMessage && <p className="mt-2 text-[#7c7a8a]">{resendMessage}</p>}
            </div>
          )}
          {verified && !error && (
            <p className="mb-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
              Email verified. You can now sign in.
            </p>
          )}
          {verificationFailed && !error && (
            <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
              This verification link is invalid or expired. Register again or request a new link.
            </p>
          )}
          {passwordUpdated && !error && (
            <p className="mb-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
              Password updated. Sign in with your new password.
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:border-[#6c63ff] transition-colors"
            />

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:border-[#6c63ff] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7c7a8a] hover:text-white transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#6c63ff]"
                />
                <span className="text-xs text-[#7c7a8a]">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-xs text-[#6c63ff] hover:text-[#00d4ff] transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#7c7a8a]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#6c63ff] hover:text-[#00d4ff] font-medium transition-colors">
              Join the waitlist
            </Link>
          </p>

          <div className="mt-10 flex justify-center gap-6">
            {["Privacy Policy", "Terms of Service", "Support"].map((item) => (
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
