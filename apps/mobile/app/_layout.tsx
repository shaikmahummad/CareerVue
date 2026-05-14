import "../global.css";
import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";
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
  const router   = useRouter();

  useEffect(() => {
    if (!ready) return;

    const inAuth      = segments[0] === "(auth)";
    const inOnboard   = segments[0] === "onboarding";
    const inRoot      = segments.length === 0;
    const isPublic    = inAuth || inOnboard || inRoot;

    if (!session) {
      if (!isPublic) router.replace("/");
    } else {
      if (isPublic) {
        const role = (session.user.user_metadata?.role as string) ?? "student";
        if (role === "tutor") router.replace("/(tutor)/" as never);
        else if (role === "admin") router.replace("/(admin)/" as never);
        else router.replace("/(student)/" as never);
      }
    }
  }, [session, segments, ready, router]);

  return null;
}

export default function RootLayout() {
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

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
