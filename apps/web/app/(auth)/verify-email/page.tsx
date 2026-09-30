"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://careervue-api.welcos.in";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verifyOtp() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(body?.detail ?? "That OTP is invalid or expired.");
        return;
      }
      setSuccess(true);
      setMessage("Your email has been verified. You can now sign in.");
    } catch {
      setMessage("We could not verify the OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setResending(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? "A new OTP is on its way."
          : body?.detail ?? "We could not resend the OTP. Please try again."
      );
    } catch {
      setMessage("We could not resend the OTP. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
      <section className="glass-card w-full max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">
          {success ? "Email verified" : "Verify your email"}
        </h1>
        <p className="text-sm text-[#7c7a8a] mb-6">
          Enter the 6-digit OTP sent to {email || "your email address"}.
        </p>
        {!success && (
          <>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit OTP"
              className="w-full bg-[#050508] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white text-center tracking-[0.4em] focus:outline-none focus:border-[#6c63ff]"
              aria-label="Email verification OTP"
            />
            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={loading || !email || otp.length !== 6}
              className="btn-primary w-full mt-3 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify email"}
            </button>
            <button
              type="button"
              onClick={() => void resendOtp()}
              disabled={resending || !email}
              className="btn-secondary w-full mt-3 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {resending ? "Resending…" : "Resend OTP"}
            </button>
          </>
        )}
        {message && (
          <p className={`text-xs mt-4 ${success ? "text-emerald-400" : "text-[#c4c0ff]"}`}>
            {message}
          </p>
        )}
        {(success || !email) && (
          <Link href="/login" className="btn-primary inline-flex mt-4 px-6 py-3 rounded-xl text-sm font-semibold">
            Go to sign in
          </Link>
        )}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050508]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
