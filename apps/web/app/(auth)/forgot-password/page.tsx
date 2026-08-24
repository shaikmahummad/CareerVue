"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { isValidEmail, normalizeEmail } from "../../../lib/auth-validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
    setLoading(false);
    if (resetError) {
      setError("Unable to send a reset link. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
      <section className="glass-card w-full max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-2 mb-6 text-sm text-[#7c7a8a]">We will email you a secure password-reset link.</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-400">If an account exists for that email, the reset link is on its way.</p>
            <Link href="/login" className="text-sm text-[#6c63ff]">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button disabled={loading} className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
