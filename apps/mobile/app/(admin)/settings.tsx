import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

interface DashboardStats {
  total_users: number;
  total_courses: number;
  pending_approvals?: number;
}

export default function AdminSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email,        setEmail]        = useState<string | null>(null);
  const [name,         setName]         = useState<string | null>(null);
  const [stats,        setStats]        = useState<DashboardStats | null>(null);
  const [notifications,    setNotifications]    = useState(true);
  const [maintenance,      setMaintenance]      = useState(false);
  const [registrations,    setRegistrations]    = useState(true);
  const [autoApprove,      setAutoApprove]      = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const meta = user.user_metadata;
      setName(meta?.full_name ?? meta?.name ?? null);
    });
    apiGet<DashboardStats>("/api/v1/admin/dashboard").then(setStats).catch(() => {});
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as never);
  }

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email?.[0]?.toUpperCase() ?? "A");

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    insets.top + 16,
          paddingBottom: TAB_BAR_HEIGHT + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Settings</Text>

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.profileName} numberOfLines={1}>{name ?? "Administrator"}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{email ?? "—"}</Text>
          </View>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text style={s.rolePillText}>Admin</Text>
          </View>
        </View>

        {/* ── Platform ─────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Platform</Text>
        <View style={s.sectionCard}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(196,192,255,0.12)" }]}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Total Users</Text>
              <Text style={s.rowSub}>{stats?.total_users?.toLocaleString() ?? "—"} registered accounts</Text>
            </View>
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(162,231,255,0.12)" }]}>
              <Ionicons name="library-outline" size={18} color={colors.secondary} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Total Courses</Text>
              <Text style={s.rowSub}>{stats?.total_courses?.toLocaleString() ?? "—"} courses on platform</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,184,0,0.12)" }]}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Pending Approvals</Text>
              <Text style={s.rowSub}>{stats?.pending_approvals ?? "—"} courses awaiting review</Text>
            </View>
          </View>
        </View>

        {/* ── Access Control ───────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Access Control</Text>
        <View style={s.sectionCard}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,180,171,0.12)" }]}>
              <Ionicons name="construct-outline" size={18} color={colors.error} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowTitle, maintenance && { color: colors.error }]}>Maintenance Mode</Text>
              <Text style={s.rowSub}>Blocks all non-admin access to the platform</Text>
            </View>
            <Switch
              value={maintenance}
              onValueChange={(v) => {
                if (v) {
                  Alert.alert(
                    "Enable Maintenance Mode?",
                    "This will block all students and tutors from accessing the platform.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Enable", style: "destructive", onPress: () => setMaintenance(true) },
                    ]
                  );
                } else {
                  setMaintenance(false);
                }
              }}
              trackColor={{ false: colors.surfaceContainer, true: "rgba(255,180,171,0.4)" }}
              thumbColor={maintenance ? colors.error : colors.surfaceHighest}
            />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(0,229,160,0.12)" }]}>
              <Ionicons name="person-add-outline" size={18} color={colors.success} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>New Registrations</Text>
              <Text style={s.rowSub}>Allow new student and tutor sign-ups</Text>
            </View>
            <Switch
              value={registrations}
              onValueChange={setRegistrations}
              trackColor={{ false: colors.surfaceContainer, true: "rgba(0,229,160,0.4)" }}
              thumbColor={registrations ? colors.success : colors.surfaceHighest}
            />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,184,0,0.12)" }]}>
              <Ionicons name="checkmark-done-outline" size={18} color={colors.warning} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Auto-Approve Courses</Text>
              <Text style={s.rowSub}>Skip admin review for new course submissions</Text>
            </View>
            <Switch
              value={autoApprove}
              onValueChange={(v) => {
                if (v) {
                  Alert.alert("Enable Auto-Approve?", "New courses will be published without admin review.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Enable", onPress: () => setAutoApprove(true) },
                  ]);
                } else {
                  setAutoApprove(false);
                }
              }}
              trackColor={{ false: colors.surfaceContainer, true: "rgba(255,184,0,0.4)" }}
              thumbColor={autoApprove ? colors.warning : colors.surfaceHighest}
            />
          </View>
        </View>

        {/* ── Platform Info ─────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Platform Info</Text>
        <View style={s.sectionCard}>
          {[
            { label: "Version",      value: "2.0.0 (Mobile)" },
            { label: "Environment",  value: "Production" },
            { label: "Database",     value: "PostgreSQL · Supabase" },
            { label: "Auth",         value: "Supabase Auth" },
          ].map(({ label, value }, i, arr) => (
            <View key={label} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
              <View style={s.rowContent}>
                <Text style={s.rowTitle}>{label}</Text>
              </View>
              <Text style={s.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Account ──────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.sectionCard}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,184,0,0.12)" }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.warning} />
            </View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Notifications</Text>
              <Text style={s.rowSub}>Platform alerts and updates</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.surfaceContainer, true: "rgba(196,192,255,0.4)" }}
              thumbColor={notifications ? colors.primary : colors.surfaceHighest}
            />
          </View>
          <Pressable
            style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleSignOut}
          >
            <View style={[s.iconWrap, { backgroundColor: "rgba(255,180,171,0.12)" }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowTitle, { color: colors.error }]}>Sign Out</Text>
            </View>
          </Pressable>
        </View>

        <Text style={s.versionText}>CareerVue v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  scroll: { paddingHorizontal: 16, gap: 8 },

  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    marginBottom:  8,
  },

  // Profile card
  profileCard: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             12,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: "rgba(196,192,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.3)",
    flexShrink:      0,
  },
  avatarText: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize:   18,
    color:      colors.primary,
  },
  profileName: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      16,
    lineHeight:    21,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   12,
    color:      colors.textVariant,
    opacity:    0.8,
  },
  rolePill: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             4,
    backgroundColor: "rgba(196,192,255,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.25)",
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    flexShrink:      0,
  },
  rolePillText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.4,
    color:         colors.primary,
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
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   15,
    lineHeight: 21,
    color:      colors.text,
  },
  rowSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    lineHeight: 17,
    color:      colors.textVariant,
    marginTop:  1,
  },

  infoValue: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    color:         colors.textVariant,
    letterSpacing: 0.2,
    flexShrink:    0,
  },

  versionText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
    color:         colors.textVariant,
    opacity:       0.4,
    textAlign:     "center",
    marginTop:     16,
    marginBottom:  8,
  },
});
