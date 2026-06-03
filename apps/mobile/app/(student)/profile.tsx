import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet, apiPut } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  college: string | null;
  branch: string | null;
  year_of_study: number | null;
  graduation_year: number | null;
  city: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  career_goal: string | null;
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarInitial({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <View style={a.avatar}>
      <Text style={a.avatarText}>{initials || "S"}</Text>
    </View>
  );
}

const a = StyleSheet.create({
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    20,
    backgroundColor: "#2000a4",
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize:   28,
    color:      colors.primary,
  },
});

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, keyboardType, editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "url";
  editable?: boolean;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, editable ? f.inputEditable : f.inputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textVariant}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize="none"
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
    marginBottom:  6,
  },
  input: {
    borderWidth:       1,
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   11,
    fontFamily:        "HankenGrotesk_400Regular",
    fontSize:          14,
  },
  inputEditable: {
    backgroundColor: colors.surfaceContainer,
    borderColor:     colors.border,
    color:           colors.text,
  },
  inputReadOnly: {
    backgroundColor: colors.surfaceHighest,
    borderColor:     colors.border,
    color:           colors.textVariant,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const [form, setForm] = useState({
    phone: "", college: "", branch: "",
    year_of_study: "", graduation_year: "",
    city: "", linkedin_url: "", github_url: "",
  });

  useEffect(() => {
    apiGet<StudentProfile>("/api/v1/students/profile")
      .then((data) => {
        setProfile(data);
        setForm({
          phone:           data.phone ?? "",
          college:         data.college ?? "",
          branch:          data.branch ?? "",
          year_of_study:   data.year_of_study != null ? String(data.year_of_study) : "",
          graduation_year: data.graduation_year != null ? String(data.graduation_year) : "",
          city:            data.city ?? "",
          linkedin_url:    data.linkedin_url ?? "",
          github_url:      data.github_url ?? "",
        });
      })
      .catch(() => Alert.alert("Error", "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof typeof form) {
    return (val: string) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiPut<StudentProfile>("/api/v1/students/profile", {
        phone:           form.phone.trim() || null,
        college:         form.college.trim() || null,
        branch:          form.branch.trim() || null,
        year_of_study:   form.year_of_study ? parseInt(form.year_of_study) : null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        city:            form.city.trim() || null,
        linkedin_url:    form.linkedin_url.trim() || null,
        github_url:      form.github_url.trim() || null,
      });
      setProfile(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Screen ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={s.pageTitle}>My Profile</Text>

        {/* Identity card */}
        <View style={s.card}>
          <View style={s.identityRow}>
            <AvatarInitial name={profile?.full_name ?? ""} />
            <View style={s.identityInfo}>
              <Text style={s.identityName} numberOfLines={1}>
                {profile?.full_name}
              </Text>
              <Text style={s.identityEmail} numberOfLines={1}>{profile?.email}</Text>
              {profile?.career_goal && (
                <View style={s.goalBadge}>
                  <Text style={s.goalBadgeText} numberOfLines={1}>
                    {profile.career_goal}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats mini row */}
          <View style={s.statsRow}>
            {[
              { label: "XP",       value: profile?.xp_points ?? 0,          color: colors.warning },
              { label: "Streak",   value: `${profile?.streak_days ?? 0}d`,   color: colors.tertiary },
              { label: "Enrolled", value: profile?.enrolled_count ?? 0,      color: colors.primary },
              { label: "Done",     value: profile?.completed_count ?? 0,     color: colors.success },
            ].map((s_) => (
              <View key={s_.label} style={s.statCell}>
                <Text style={[s.statValue, { color: s_.color }]}>{s_.value}</Text>
                <Text style={s.statLabel}>{s_.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Career Goal card */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Career Goal</Text>
          {profile?.career_goal ? (
            <>
              <View style={s.currentGoalBox}>
                <Text style={s.currentGoalCaption}>Current Goal</Text>
                <Text style={s.currentGoalText}>{profile.career_goal}</Text>
              </View>
              <Pressable
                style={s.changeGoalBtn}
                onPress={() => {
                  Alert.alert(
                    "Change Career Goal",
                    "Changing your goal will archive your current roadmap. You'll need to take a new assessment to generate a fresh roadmap.\n\nAre you sure?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Change Goal",
                        style: "destructive",
                        onPress: () => router.push("/(student)/quiz?change=1" as any),
                      },
                    ]
                  );
                }}
              >
                <Text style={s.changeGoalBtnText}>Change Goal</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={s.primaryBtn}
              onPress={() => router.push("/(student)/quiz" as any)}
            >
              <Text style={s.primaryBtnText}>Set Career Goal</Text>
            </Pressable>
          )}
        </View>

        {/* Quiz History row */}
        <Pressable
          style={s.quizHistoryRow}
          onPress={() => router.push("/(student)/quiz-history" as any)}
        >
          <View style={s.quizHistoryLeft}>
            <View style={s.quizHistoryIcon}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={s.quizHistoryTitle}>Quiz History</Text>
              <Text style={s.quizHistorySub}>View past attempts &amp; answers</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textVariant} />
        </Pressable>

        {/* Account Info (read-only) */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Account Info</Text>
          <Field label="Full Name" value={profile?.full_name ?? ""} editable={false} />
          <Field label="Email"     value={profile?.email ?? ""}     editable={false} />
        </View>

        {/* Personal Details (editable) */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Personal Details</Text>
          <Field label="Phone"           value={form.phone}           onChangeText={set("phone")}           placeholder="+91 9876543210" keyboardType="phone-pad" />
          <Field label="City"            value={form.city}            onChangeText={set("city")}            placeholder="Hyderabad" />
          <Field label="College"         value={form.college}         onChangeText={set("college")}         placeholder="IIT Bombay" />
          <Field label="Branch"          value={form.branch}          onChangeText={set("branch")}          placeholder="Computer Science" />
          <Field label="Year of Study"   value={form.year_of_study}   onChangeText={set("year_of_study")}   placeholder="3" keyboardType="numeric" />
          <Field label="Graduation Year" value={form.graduation_year} onChangeText={set("graduation_year")} placeholder="2026" keyboardType="numeric" />
        </View>

        {/* Links */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Links</Text>
          <Field label="LinkedIn" value={form.linkedin_url} onChangeText={set("linkedin_url")} placeholder="https://linkedin.com/in/..." keyboardType="url" />
          <Field label="GitHub"   value={form.github_url}   onChangeText={set("github_url")}   placeholder="https://github.com/..."   keyboardType="url" />
        </View>

        {/* Save */}
        <Pressable
          style={[s.primaryBtn, s.saveBtn]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <Ionicons name="save-outline" size={16} color={colors.onPrimary} />}
          <Text style={s.primaryBtnText}>
            {saving ? "Saving…" : "Save Profile"}
          </Text>
        </Pressable>

        {/* Sign out */}
        <Pressable
          style={s.signOutBtn}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: {
    paddingHorizontal: 16,
    gap:               16,
  },

  // Page header
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             12,
  },

  // Section title
  sectionTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    lineHeight:    20,
    color:         colors.text,
  },

  // Identity card internals
  identityRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           16,
  },
  identityInfo: {
    flex:   1,
    gap:    3,
    minWidth: 0,
  },
  identityName: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    lineHeight:    22,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  identityEmail: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 18,
    color:      colors.textVariant,
  },
  goalBadge: {
    alignSelf:         "flex-start",
    backgroundColor:   "rgba(196,192,255,0.1)",
    borderWidth:       1,
    borderColor:       "rgba(196,192,255,0.2)",
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:         2,
  },
  goalBadgeText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   11,
    color:      colors.primary,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap:           8,
  },
  statCell: {
    flex:           1,
    backgroundColor: colors.surfaceContainer,
    borderRadius:   12,
    paddingVertical: 10,
    alignItems:     "center",
    gap:            2,
  },
  statValue: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      14,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   11,
    color:      colors.textVariant,
  },

  // Career goal internals
  currentGoalBox: {
    backgroundColor:   colors.surfaceContainer,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    gap:               4,
  },
  currentGoalCaption: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  currentGoalText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      15,
    lineHeight:    21,
    color:         colors.primary,
  },
  changeGoalBtn: {
    backgroundColor: colors.surfaceContainer,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    12,
    paddingVertical: 11,
    alignItems:      "center",
  },
  changeGoalBtnText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.text,
  },

  // Primary button
  primaryBtn: {
    flexDirection:   "row",
    backgroundColor: colors.primary,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
  },
  primaryBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   15,
    color:      colors.onPrimary,
  },

  // Quiz history row
  quizHistoryRow: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   14,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
  },
  quizHistoryLeft: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  quizHistoryIcon: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: "rgba(196,192,255,0.1)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  quizHistoryTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    lineHeight:    20,
    color:         colors.text,
  },
  quizHistorySub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    color:      colors.textVariant,
  },

  // Save button
  saveBtn: {
    marginTop: 4,
  },

  // Sign out
  signOutBtn: {
    paddingVertical: 16,
    alignItems:      "center",
  },
  signOutText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.error,
  },
});
