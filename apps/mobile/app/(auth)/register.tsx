import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { GlowButton } from "../../components/ui/GlowButton";
import { colors, radius, shadows } from "../../constants/theme";

type Role = "student" | "tutor";

interface RoleCardProps {
  role:      Role;
  selected:  boolean;
  onSelect:  () => void;
}

function StepIndicator({ step }: { step: number }) {
  const steps = ["Type", "Details", "Confirm"];
  return (
    <View style={si.row}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done   = n < step;
        const active = n === step;
        return (
          <View key={label} style={si.item}>
            {i > 0 && <View style={[si.line, done && si.lineDone]} />}
            <View style={[si.circle, active && si.circleActive, done && si.circleDone]}>
              {done ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[si.num, active && si.numActive]}>{n}</Text>
              )}
            </View>
            <Text style={[si.label, active && si.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RoleCard({ role, selected, onSelect }: RoleCardProps) {
  const isStudent = role === "student";
  const icon      = isStudent ? "school-outline" : "easel-outline";
  const title     = isStudent ? "Student" : "Tutor";
  const desc      = isStudent
    ? "Get a personalised roadmap and learn from expert tutors."
    : "Create courses, earn income, build your reputation.";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={[
        rc.card,
        selected && rc.cardSelected,
        selected && shadows.glow,
        !selected && shadows.card,
      ]}
    >
      {selected && (
        <View style={rc.checkCorner}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}

      <View style={rc.iconWrap}>
        <View style={[rc.iconCircle, selected && rc.iconCircleActive]}>
          <Ionicons name={icon as any} size={26} color={selected ? "#fff" : colors.muted} />
        </View>
      </View>

      <View style={rc.content}>
        <Text style={rc.title}>{title}</Text>
        <Text style={rc.desc}>{desc}</Text>
      </View>

      <View style={[rc.radio, selected && rc.radioActive]}>
        {selected && <View style={rc.radioDot} />}
      </View>
    </Pressable>
  );
}

export default function RegisterStep1Screen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [role, setRole] = useState<Role>("student");

  function handleContinue() {
    router.push({ pathname: "/(auth)/register-step2", params: { role } });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <StepIndicator step={1} />

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 100, damping: 20 }}
        >
          <Text style={s.question}>Who are you joining as?</Text>
          <Text style={s.subtext}>Choose your role to get started.</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 200, damping: 20 }}
          style={s.cards}
        >
          <RoleCard
            role="student"
            selected={role === "student"}
            onSelect={() => setRole("student")}
          />
          <RoleCard
            role="tutor"
            selected={role === "tutor"}
            onSelect={() => setRole("tutor")}
          />
        </MotiView>
      </ScrollView>

      <View style={s.footer}>
        <GlowButton label="Continue" onPress={handleContinue} variant="primary" />
      </View>
    </View>
  );
}

// Step indicator styles
const si = StyleSheet.create({
  row: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "center",
    marginBottom:   24,
    gap:            0,
  },
  item: {
    alignItems:  "center",
    position:    "relative",
    flex:        1,
  },
  line: {
    position:        "absolute",
    top:             14,
    right:           "50%",
    width:           "100%",
    height:          1,
    backgroundColor: colors.border,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
  circle: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  circleDone: {
    backgroundColor: colors.success,
    borderColor:     colors.success,
  },
  num: {
    fontSize:   12,
    fontWeight: "600",
    color:      colors.muted,
  },
  numActive: {
    color: "#fff",
  },
  label: {
    fontSize: 11,
    color:    colors.muted,
  },
  labelActive: {
    color:      colors.text,
    fontWeight: "600",
  },
});

// Role card styles
const rc = StyleSheet.create({
  card: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: colors.card,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         20,
    gap:             14,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  checkCorner: {
    position:        "absolute",
    top:             -1,
    right:           -1,
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: colors.primary,
    alignItems:      "center",
    justifyContent:  "center",
  },
  iconWrap: {},
  iconCircle: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  iconCircleActive: {
    backgroundColor: colors.primaryBg,
  },
  content: {
    flex: 1,
    gap:  4,
  },
  title: {
    fontSize:   20,
    fontWeight: "600",
    color:      colors.text,
  },
  desc: {
    fontSize:   14,
    color:      colors.muted,
    lineHeight: 20,
  },
  radio: {
    width:           22,
    height:          22,
    borderRadius:    11,
    borderWidth:     1.5,
    borderColor:     colors.muted,
    alignItems:      "center",
    justifyContent:  "center",
  },
  radioActive: {
    borderColor:     colors.primary,
    backgroundColor: colors.primary,
  },
  radioDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: "#fff",
  },
});

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  back: {
    width:  40,
    height: 40,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex:       1,
    textAlign:  "center",
    fontSize:   17,
    fontWeight: "600",
    color:      colors.text,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop:        8,
    paddingBottom:     20,
  },
  question: {
    fontSize:    28,
    fontWeight:  "700",
    color:       colors.text,
    marginBottom: 8,
  },
  subtext: {
    fontSize:    15,
    color:       colors.muted,
    marginBottom: 24,
  },
  cards: {
    gap: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     8,
  },
});
