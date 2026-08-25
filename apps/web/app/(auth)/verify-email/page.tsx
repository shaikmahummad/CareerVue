"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://careervue-api.welcos.in";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setState("error");
        setMessage("This verification link is invalid or incomplete.");
        return;
      }
      const response = await fetch(
        `${API}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setState("error");
        setMessage(body?.detail ?? "This verification link is invalid or expired.");
        return;
      }
      setState("success");
      setMessage("Your email has been verified. You can now sign in.");
    }

    void verify();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
      <section className="glass-card w-full max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">
          {state === "success" ? "Email verified" : state === "error" ? "Verification failed" : "Verifying email"}
        </h1>
        <p className={`text-sm mb-6 ${state === "error" ? "text-red-400" : "text-[#7c7a8a]"}`}>
          {message}
        </p>
        {state !== "loading" && (
          <Link href="/login" className="btn-primary inline-flex px-6 py-3 rounded-xl text-sm font-semibold">
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
