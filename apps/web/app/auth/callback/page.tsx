"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";


export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishVerification() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = url.searchParams.get("code");

      let failed = false;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        failed = Boolean(error);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        failed = Boolean(error);
      } else {
        failed = true;
      }
      router.replace(failed ? "/login?verification=failed" : "/login?verified=1");
    }

    void finishVerification();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center text-sm text-[#7c7a8a]">
      Verifying your email…
    </div>
  );
}
