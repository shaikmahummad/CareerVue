import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { GlowButton } from "../../components/ui/GlowButton";
import { FormInput } from "../../components/ui/FormInput";
import { colors } from "../../constants/theme";

const YEAR_PILLS = ["1st", "2nd", "3rd", "4th", "5th"];
const BRANCHES   = ["Computer Science", "Electronics", "Mechanical", "Civil", "Other"];

function StepIndicator() {
  return (
    <View style={si.row}>
      {["Type", "Details", "Confirm"].map((label, i) => {
        const n      = i + 1;
        const done   = n < 2;
        const active = n === 2;
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

export default function RegisterStep2Screen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();

  const [fullName,  setFullName]  = useState("Shaik Mohammed");
  const [email,     setEmail]     = useState("shaik@example.com");
  const [password,  setPassword]  = useState("••••••••");
  const [phone,     setPhone]     = useState("+91 9876543210");
  const [college,   setCollege]   = useState("SRM University");
  const [branch,    setBranch]    = useState("Computer Science");
  const [yearIdx,   setYearIdx]   = useState(2);
  const [showPass,  setShowPass]  = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [linkedin,  setLinkedin]  = useState("");
  const [github,    setGithub]    = useState("");
  const [loading,   setLoading]   = useState(false);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.includes("@") ? email : `${email}@example.com`,
      password: password === "••••••••" ? "changeme123" : password,
      options: {
        data: {
          full_name: fullName,
          role:      role ?? "student",
          college,
          branch,
          year:      YEAR_PILLS[yearIdx],
          phone,
          linkedin,
          github,
        },
      },
    });
    setLoading(false);
    if (error) Alert.alert("Registration failed", error.message);
    else Alert.alert("Success! 🎉", "Check your email to confirm your account.");
  }, [email, password, fullName, role, college, branch, yearIdx, phone, linkedin, github]);

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Your Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator />

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 100, damping: 20 }}
        >
          <Text style={s.sectionTitle}>Tell us about you</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 200, damping: 20 }}
          style={s.form}
        >
          <FormInput
            label="Full Name"
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <FormInput
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            valid={email.includes("@")}
            rightIcon={email.includes("@")
              ? <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              : undefined}
          />
          <FormInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            rightIcon={
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.muted}
              />
            }
            onRightPress={() => setShowPass(v => !v)}
          />
          <FormInput
            label="Phone Number"
            placeholder="+91 9999999999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {/* Section divider */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divLabel}>ACADEMIC INFO</Text>
            <View style={s.divLine} />
          </View>

          <FormInput
            label="College Name"
            placeholder="Your college"
            value={college}
            onChangeText={setCollege}
            autoCapitalize="words"
          />
          <FormInput
            label="Branch"
            placeholder="Select branch"
            value={branch}
            onChangeText={setBranch}
            autoCapitalize="words"
          />

          {/* Year of Study pills */}
          <View style={s.yearWrap}>
            <Text style={s.yearLabel}>Year of Study</Text>
            <View style={s.pills}>
              {YEAR_PILLS.map((yr, i) => (
                <Pressable
                  key={yr}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setYearIdx(i);
                  }}
                  style={[s.pill, yearIdx === i && s.pillActive]}
                >
                  <Text style={[s.pillText, yearIdx === i && s.pillTextActive]}>{yr}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Optional links */}
          <Pressable style={s.optionalHeader} onPress={() => setShowLinks(v => !v)}>
            <Text style={s.optionalLabel}>Optional Links</Text>
            <Ionicons
              name={showLinks ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.muted}
            />
          </Pressable>

          {showLinks && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" as any }}
              style={s.linksWrap}
            >
              <FormInput
                label="LinkedIn URL"
                placeholder="linkedin.com/in/..."
                value={linkedin}
                onChangeText={setLinkedin}
                autoCapitalize="none"
              />
              <FormInput
                label="GitHub URL"
                placeholder="github.com/..."
                value={github}
                onChangeText={setGithub}
                autoCapitalize="none"
              />
            </MotiView>
          )}
        </MotiView>
      </ScrollView>

      <View style={s.footer}>
        <GlowButton
          label={loading ? "Creating account…" : "Create Account →"}
          onPress={handleRegister}
          loading={loading}
          variant="primary"
        />
      </View>
    </View>
  );
}

const si = StyleSheet.create({
  row: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "center",
    marginBottom:   24,
  },
  item: { alignItems: "center", flex: 1, position: "relative" },
  line: {
    position:        "absolute",
    top:             14,
    right:           "50%",
    width:           "100%",
    height:          1,
    backgroundColor: colors.border,
  },
  lineDone:      { backgroundColor: colors.primary },
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
  circleActive:  { backgroundColor: colors.primary,  borderColor: colors.primary  },
  circleDone:    { backgroundColor: colors.success,  borderColor: colors.success  },
  num:           { fontSize: 12, fontWeight: "600", color: colors.muted },
  numActive:     { color: "#fff" },
  label:         { fontSize: 11, color: colors.muted },
  labelActive:   { color: colors.text, fontWeight: "600" },
});

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  back:        { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.text },
  scroll:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  sectionTitle:{ fontSize: 22, fontWeight: "600", color: colors.text, marginBottom: 20 },
  form:        { gap: 16 },
  divider:     { flexDirection: "row", alignItems: "center", gap: 10 },
  divLine:     { flex: 1, height: 1, backgroundColor: colors.border },
  divLabel:    { fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 1 },
  yearWrap:    { gap: 8 },
  yearLabel:   { fontSize: 13, fontWeight: "500", color: colors.muted },
  pills:       { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   "transparent",
  },
  pillActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:      { fontSize: 14, color: colors.muted, fontWeight: "500" },
  pillTextActive:{ color: "#fff", fontWeight: "600" },
  optionalHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  optionalLabel: { fontSize: 15, color: colors.muted, fontWeight: "500" },
  linksWrap:     { gap: 16 },
  footer:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
});
