"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { apiPost } from "../../../lib/api";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [flowId, setFlowId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitEmail(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const result = await apiPost<{ flow_id: string }>("/api/v1/auth/forgot-password/request", { email: email.trim().toLowerCase() });
      setEmail(email.trim().toLowerCase()); setFlowId(result.flow_id); setStep("code");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to continue"); }
    finally { setLoading(false); }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const result = await apiPost<{ reset_token: string }>("/api/v1/auth/forgot-password/verify", { email, flow_id: flowId, code });
      setResetToken(result.reset_token); setStep("password");
    } catch (err) { setError(err instanceof Error ? err.message : "Invalid code"); }
    finally { setLoading(false); }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/forgot-password/reset", { reset_token: resetToken, new_password: password });
      setStep("done");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset password"); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
      <section className="w-full max-w-md glass-card rounded-2xl border border-white/[0.08] p-7">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5">
          {step === "done" ? <CheckCircle2 className="text-white" /> : step === "email" ? <Mail className="text-white" /> : <KeyRound className="text-white" />}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{step === "done" ? "Password changed" : "Forgot password"}</h1>

        {step === "email" && <form onSubmit={submitEmail} className="space-y-4">
          <p className="text-sm text-[#9b98a8]">Enter the email registered with your CareerVue account.</p>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full bg-[#050508] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
          <SubmitButton loading={loading} label="Send code" />
        </form>}

        {step === "code" && <form onSubmit={submitCode} className="space-y-4">
          <p className="text-sm text-[#9b98a8]">A code is sent to your Registered mail if it exist. It expires in 10 minutes.</p>
          <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" autoComplete="one-time-code" className="w-full tracking-[0.4em] text-center bg-[#050508] border border-white/[0.1] rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-[#6c63ff]" />
          <SubmitButton loading={loading} label="Verify code" />
          <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="w-full text-xs text-[#9b98a8]">Use another email</button>
        </form>}

        {step === "password" && <form onSubmit={submitPassword} className="space-y-4">
          <p className="text-sm text-[#9b98a8]">Use at least 8 characters with uppercase, lowercase, and a number.</p>
          <input type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full bg-[#050508] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
          <input type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full bg-[#050508] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
          <SubmitButton loading={loading} label="Change password" />
        </form>}

        {step === "done" && <div><p className="text-sm text-[#9b98a8] mb-5">Your password was updated. You can now sign in with it.</p><Link href="/login" className="block text-center btn-primary py-3 rounded-xl text-sm font-semibold">Back to sign in</Link></div>}
        {error && <p role="alert" className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
        {step !== "done" && <Link href="/login" className="block mt-5 text-center text-xs text-[#9b98a8] hover:text-white">Back to sign in</Link>}
      </section>
    </main>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return <button type="submit" disabled={loading} className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50">{loading ? "Please wait…" : label}</button>;
}
