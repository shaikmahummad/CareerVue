import "../global.css";
import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { ApiError, apiGet } from "../lib/api";
import type { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator, AppState, Linking } from "react-native";
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

type AccountRole = "student" | "tutor" | "admin";

function AuthGuard({
  session,
  role,
  ready,
}: {
  session: Session | null;
  role: AccountRole | null;
  ready: boolean;
}) {
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
    } else if (role && !inPasswordReset) {
      const targetGroup = `(${role})`;
      if (isPublic || currentSegments[0] !== targetGroup) {
        router.replace(`/${targetGroup}/` as never);
      }
    }
  }, [session, role, currentSegments, ready, router]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready,   setReady]   = useState(false);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [roleReady, setRoleReady] = useState(false);
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

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setAccountRole(null);
      setRoleReady(true);
      return;
    }

    let active = true;
    setRoleReady(false);
    apiGet<{ role: string }>("/api/v1/auth/me")
      .then((profile) => {
        if (!active) return;
        if (["student", "tutor", "admin"].includes(profile.role)) {
          setAccountRole(profile.role as AccountRole);
        } else {
          void supabase.auth.signOut();
          setAccountRole(null);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          void supabase.auth.signOut();
          setAccountRole(null);
          return;
        }
        // Keep an offline-restored session usable; the API will enforce roles.
        const fallback = session.user.user_metadata?.role;
        setAccountRole(
          ["student", "tutor", "admin"].includes(fallback)
            ? fallback as AccountRole
            : "student",
        );
      })
      .finally(() => {
        if (active) setRoleReady(true);
      });
    return () => { active = false; };
  }, [ready, session]);

  useEffect(() => {
    const updateRefreshState = (state: string) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    updateRefreshState(AppState.currentState);
    const subscription = AppState.addEventListener("change", updateRefreshState);
    return () => subscription.remove();
  }, []);

  if (!ready || !roleReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard session={session} role={accountRole} ready={ready && roleReady} />
      <Slot />
    </QueryClientProvider>
  );
}
