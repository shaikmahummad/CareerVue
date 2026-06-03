import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Switch, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

interface StudentProfile {
  goal?: string;
  career_goal?: string;
  [key: string]: any;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [goal,          setGoal]          = useState<string | null>(null);
  const [loadingGoal,   setLoadingGoal]   = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    apiGet<StudentProfile>("/api/v1/students/profile")
      .then((data) => {
        setGoal(data.career_goal ?? data.goal ?? null);
      })
      .catch(() => setGoal(null))
      .finally(() => setLoadingGoal(false));
  }, []);

  function handleChangeGoal() {
    Alert.alert(
      "Change Career Goal",
      "Changing your goal will archive your current roadmap. You'll need to take a new assessment to generate a fresh roadmap.\n\nAre you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change Goal",
          style: "destructive",
          onPress: () => router.push("/(student)/quiz?change=1" as any),
        },
      ]
    );
  }

  function handleRegenerateRoadmap() {
    Alert.alert(
      "Regenerate Roadmap",
      "This will regenerate your roadmap using your current skill profile. Your existing roadmap will be replaced.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            try {
              await apiPost("/api/v1/roadmap/generate");
              Alert.alert("Success", "Your roadmap has been regenerated.");
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to regenerate roadmap.");
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Settings</Text>

        {/* ── Section 1: Goal & Roadmap ─────────────────────────────────── */}
        <Text style={s.sectionLabel}>Goal &amp; Roadmap</Text>

        <View style={s.sectionCard}>
          {/* Current Goal — display only */}
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(196,192,255,0.12)" }]}>
              <Ionicons name="flag-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Current Goal</Text>
              {loadingGoal ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 2 }} />
              ) : (
                <Text style={s.rowSubtitle} numberOfLines={2}>
                  {goal ?? "No goal set yet"}
                </Text>
              )}
            </View>
          </View>

          {/* Change Career Goal */}
          <Pressable style={[s.row, s.rowBorder]} onPress={handleChangeGoal}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,184,0,0.12)" }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.warning} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Change Career Goal</Text>
              <Text style={s.rowSubtitle}>Archive roadmap and start fresh</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.surfaceHighest} />
          </Pressable>

          {/* Regenerate Roadmap */}
          <Pressable style={s.row} onPress={handleRegenerateRoadmap}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(0,229,160,0.12)" }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.success} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Regenerate Roadmap</Text>
              <Text style={s.rowSubtitle}>Rebuild from your current skill profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.surfaceHighest} />
          </Pressable>
        </View>

        {/* ── Section 2: Assessment ─────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Assessment</Text>

        <View style={s.sectionCard}>
          {/* Quiz History */}
          <Pressable style={[s.row, s.rowBorder]} onPress={() => router.push("/(student)/quiz-history" as any)}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(196,192,255,0.12)" }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Quiz History</Text>
              <Text style={s.rowSubtitle}>View all past quiz attempts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.surfaceHighest} />
          </Pressable>

          {/* My Skills — display only */}
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(162,231,255,0.12)" }]}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.secondary} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>My Skills</Text>
              <Text style={s.rowSubtitle}>View your current skill breakdown in Quiz History</Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: Account ────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Account</Text>

        <View style={s.sectionCard}>
          {/* Notifications toggle */}
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,184,0,0.12)" }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.warning} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Notifications</Text>
              <Text style={s.rowSubtitle}>Learning reminders and updates</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.surfaceContainer, true: "rgba(196,192,255,0.4)" }}
              thumbColor={notifications ? colors.primary : colors.surfaceHighest}
            />
          </View>

          {/* Sign Out */}
          <Pressable style={s.row} onPress={handleSignOut}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,180,171,0.12)" }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowTitle, { color: colors.error }]}>Sign Out</Text>
            </View>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  scroll: {
    paddingHorizontal: 16,
    gap:               8,
  },

  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    marginBottom:  8,
  },

  // Section label
  sectionLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    marginTop:     16,
    marginBottom:  6,
    marginLeft:    4,
  },

  // Section card
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    overflow:        "hidden",
    padding:         0,
  },

  // Row
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Icon wrap
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },

  // Row content
  rowContent: { flex: 1 },
  rowTitle: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   15,
    lineHeight: 21,
    color:      colors.text,
  },
  rowSubtitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    lineHeight: 17,
    color:      colors.textVariant,
    marginTop:  1,
  },
});
