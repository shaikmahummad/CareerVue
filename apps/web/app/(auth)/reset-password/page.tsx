"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../../../lib/auth-validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH || !password.trim()) {
      setError(`Password must contain ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} non-blank characters.`);
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError("The reset link is invalid or expired. Request a new one.");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login?password=updated");
  }

  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
      <section className="glass-card w-full max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff]" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button disabled={loading} className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50">{loading ? "Updating…" : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
