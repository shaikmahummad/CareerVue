import "../global.css";
import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator, Linking } from "react-native";
import { useFonts } from "expo-font";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import { colors } from "../constants/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function AuthGuard({ session, ready }: { session: Session | null; ready: boolean }) {
  const segments = useSegments();
  const currentSegments = segments as readonly string[];
  const router   = useRouter();

  useEffect(() => {
    if (!ready) return;

    const inAuth      = currentSegments[0] === "(auth)";
    const inPasswordReset = inAuth && currentSegments[1] === "reset-password";
    const inOnboard   = currentSegments[0] === "onboarding";
    const inRoot      = currentSegments.length === 0;
    const isPublic    = inAuth || inOnboard || inRoot;

    if (!session) {
      if (!isPublic) router.replace("/(auth)/login" as never);
    } else {
      if (isPublic && !inPasswordReset) {
        const role = (session.user.user_metadata?.role as string) ?? "student";
        if (role === "tutor") router.replace("/(tutor)/" as never);
        else if (role === "admin") router.replace("/(admin)/" as never);
        else router.replace("/(student)/" as never);
      }
    }
  }, [session, currentSegments, ready, router]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready,   setReady]   = useState(false);
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    async function finishAuthRedirect(url: string | null) {
      if (
        !url ||
        (!url.startsWith("careervue://auth/callback") &&
          !url.startsWith("careervue://reset-password"))
      ) return;
      const isPasswordReset = url.startsWith("careervue://reset-password");
      const parsed = new URL(url.replace("#", "?"));
      const accessToken = parsed.searchParams.get("access_token");
      const refreshToken = parsed.searchParams.get("refresh_token");
      const code = parsed.searchParams.get("code");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      if (isPasswordReset) {
        router.replace("/(auth)/reset-password" as never);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });
    Linking.getInitialURL().then(finishAuthRedirect);
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      void finishAuthRedirect(url);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [router]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard session={session} ready={ready} />
      <Slot />
    </QueryClientProvider>
  );
}
