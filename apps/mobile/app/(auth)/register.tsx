import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");
const BTN_W    = width - 32;

type Role = "student" | "tutor";

function RoleCard({ role, selected, onSelect }: { role: Role; selected: boolean; onSelect: () => void }) {
  const isStudent = role === "student";
  const title     = isStudent ? "Student" : "Tutor";
  const desc      = isStudent
    ? "I want to learn skills, find mentors, and grow my career."
    : "I want to share knowledge, mentor others, and earn.";
  const icon      = isStudent ? "school-outline" : "easel-outline";
  const iconColor = isStudent ? "#a2e7ff" : colors.primary;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(); }}
      style={[rc.card, selected && rc.cardSelected]}
    >
      {/* RECOMMENDED badge for tutor */}
      {role === "tutor" && (
        <View style={rc.badge}>
          <LinearGradient colors={["#c4c0ff", "#8781ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.badgeGrad}>
            <Text style={rc.badgeText}>RECOMMENDED</Text>
          </LinearGradient>
        </View>
      )}

      {/* Role icon thumb */}
      <View style={[rc.thumb, { backgroundColor: selected ? "rgba(196,192,255,0.1)" : colors.surfaceHigh }]}>
        <Ionicons name={icon as any} size={28} color={iconColor} />
      </View>

      {/* Text */}
      <View style={rc.info}>
        <Text style={rc.title}>{title}</Text>
        <Text style={rc.desc}>{desc}</Text>
      </View>

      {/* Radio */}
      {selected ? (
        <LinearGradient colors={["#c4c0ff", "#8781ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={rc.radioFilled}>
          <Ionicons name="checkmark" size={14} color="#1b0091" />
        </LinearGradient>
      ) : (
        <View style={rc.radioEmpty} />
      )}
    </Pressable>
  );
}

export default function RegisterScreen() {
  const router           = useRouter();
  const insets           = useSafeAreaInsets();
  const [role, setRole]  = useState<Role>("student");

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={s.progressBlock}>
          <View style={s.progressRow}>
            <Text style={s.stepLabel}>STEP 1 OF 3</Text>
            <Text style={s.stepPct}>33% Complete</Text>
          </View>
          <View style={s.trackBg}>
            <LinearGradient
              colors={["#c4c0ff", "#8781ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.trackFill}
            />
          </View>
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>Who are you joining as?</Text>
          <Text style={s.sub}>Choose your role to personalize your CareerVue experience.</Text>
        </View>

        {/* Role cards */}
        <View style={s.cards}>
          <RoleCard role="student" selected={role === "student"} onSelect={() => setRole("student")} />
          <RoleCard role="tutor"   selected={role === "tutor"}   onSelect={() => setRole("tutor")}   />
        </View>

        {/* Bento features */}
        <View style={s.bento}>
          <View style={s.bentoCard}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={s.bentoLabel}>Verified Identity</Text>
          </View>
          <View style={s.bentoCard}>
            <Ionicons name="rocket" size={22} color={colors.secondary} />
            <Text style={s.bentoLabel}>Instant Access</Text>
          </View>
        </View>

        {/* Continue button */}
        <View style={s.cta}>
          <Pressable
            onPress={() => router.push({ pathname: "/(auth)/register-step2", params: { role } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
          >
            <LinearGradient
              colors={["#c4c0ff", "#8781ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.continueBtn, { width: BTN_W }]}
            >
              <Text style={s.continueBtnText}>Continue</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Text style={s.signInText}>
              Already have an account? <Text style={{ color: colors.primary, fontFamily: "HankenGrotesk_700Bold" }}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: colors.surfaceLow,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.05)",
    borderRadius:    20,
    padding:         16,
    gap:             14,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
  },
  badge: {
    position: "absolute",
    top:      -12,
    right:    16,
    zIndex:   1,
  },
  badgeGrad: {
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      999,
  },
  badgeText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      9,
    letterSpacing: 1,
    color:         "#1b0091",
    textTransform: "uppercase",
  },
  thumb: {
    width:          64,
    height:         64,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 4 },
  title: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  desc: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
  },
  radioEmpty: {
    width:        24,
    height:       24,
    borderRadius: 12,
    borderWidth:  1.5,
    borderColor:  colors.outlineVariant,
  },
  radioFilled: {
    width:          24,
    height:         24,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
});

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingBottom:     12,
    backgroundColor:   "rgba(19,18,27,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    width:  40,
    height: 40,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex:          1,
    textAlign:     "center",
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      17,
    color:         colors.text,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     40,
    gap:               24,
  },
  progressBlock: { gap: 8 },
  progressRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  stepLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 1,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  stepPct: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
  },
  trackBg: {
    height:         6,
    backgroundColor: colors.surfaceContainer,
    borderRadius:   999,
    overflow:       "hidden",
  },
  trackFill: {
    width:        "33%",
    height:       "100%",
    borderRadius: 999,
  },
  titleBlock: { gap: 6 },
  title: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  sub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.textVariant,
  },
  cards: { gap: 16 },
  bento: {
    flexDirection: "row",
    gap:           12,
  },
  bentoCard: {
    flex:            1,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             10,
  },
  bentoLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.text,
    textTransform: "uppercase",
  },
  cta: {
    alignItems: "center",
    gap:        16,
  },
  continueBtn: {
    height:         56,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    color:         "#1b0091",
    letterSpacing: -0.2,
  },
  signInText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    color:      colors.textVariant,
    textAlign:  "center",
  },
});
