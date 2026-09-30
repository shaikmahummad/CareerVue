import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiPost } from "../../lib/api";
import {
  isValidEmail,
  normalizeEmail,
  normalizeIndianPhone,
  normalizeName,
  validateSignup,
} from "../../lib/auth-validation";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");
const YEAR_PILLS = ["1st", "2nd", "3rd", "4th", "5th"];

function Field({
  label, placeholder, value, onChangeText, secureText, keyboardType, rightEl, error,
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; secureText?: boolean;
  keyboardType?: any; rightEl?: React.ReactNode; error?: string;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View>
        <TextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor={colors.outlineVariant}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureText}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightEl && <View style={f.right}>{rightEl}</View>}
      </View>
      {error ? <Text style={f.error}>{error}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  wrap:  { gap: 6 },
  label: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.outline,
    textTransform: "uppercase",
    marginLeft:    4,
  },
  input: {
    height:            52,
    backgroundColor:   "#0d0d14",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.08)",
    borderRadius:      12,
    paddingHorizontal: 16,
    paddingRight:      48,
    fontFamily:        "HankenGrotesk_400Regular",
    fontSize:          17,
    color:             colors.text,
  },
  right: {
    position:       "absolute",
    right:          14,
    top:            0,
    bottom:         0,
    justifyContent: "center",
  },
  error: { color: "#f87171", fontSize: 12, marginLeft: 4 },
});

export default function RegisterStep2Screen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();

  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone,     setPhone]     = useState("");
  const [college,   setCollege]   = useState("");
  const [branch,    setBranch]    = useState("");
  const [yearIdx,   setYearIdx]   = useState(2);
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleRegister = useCallback(async () => {
    const errors = validateSignup({ fullName, email, phone, password, confirmPassword });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      Alert.alert("Check your details", "Please correct the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      const accountRole = role === "tutor" ? "tutor" : "student";
      await apiPost(`/api/v1/auth/register/${accountRole}`, {
        full_name: normalizeName(fullName),
        email: normalizeEmail(email),
        password,
        confirm_password: confirmPassword,
        phone: normalizeIndianPhone(phone) ?? undefined,
        ...(accountRole === "student" ? {
          college: college.trim() || undefined,
          branch: branch.trim() || undefined,
          year_of_study: yearIdx + 1,
        } : {}),
      });
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: normalizeEmail(email) },
      } as never);
    } catch (error) {
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, fullName, role, college, branch, yearIdx, phone, router]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>Your Details</Text>
        {/* Step dots */}
        <View style={s.stepDots}>
          <View style={[s.stepDot, s.stepDotInactive]} />
          <View style={[s.stepDot, s.stepDotActive]} />
          <View style={[s.stepDot, s.stepDotInactive]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>Tell us about you</Text>
          <Text style={s.sub}>We'll use this to personalize your career roadmap.</Text>
        </View>

        {/* Personal info */}
        <View style={s.section}>
          <Field
            label="FULL NAME"
            placeholder="Shaik Mohammed"
            value={fullName}
            onChangeText={setFullName}
            error={fieldErrors.fullName}
          />
          <Field
            label="EMAIL ADDRESS"
            placeholder="shaik.m@university.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={fieldErrors.email}
            rightEl={isValidEmail(email)
              ? <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
              : null}
          />
          <Field
            label="PASSWORD"
            placeholder="••••••••••"
            value={password}
            onChangeText={setPassword}
            secureText={!showPass}
            error={fieldErrors.password}
            rightEl={
              <Pressable onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.outline} />
              </Pressable>
            }
          />
          <Field
            label="CONFIRM PASSWORD"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureText={!showPass}
            error={fieldErrors.confirmPassword}
          />
          <Field
            label="PHONE NUMBER"
            placeholder="+91 98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={fieldErrors.phone}
          />
        </View>

        {/* Academic Info */}
        <View style={s.academicSection}>
          <View style={s.academicHeader}>
            <Ionicons name="school-outline" size={20} color={colors.primary} />
            <Text style={s.academicTitle}>Academic Info</Text>
          </View>

          <View style={s.glassCard}>
            <Field
              label="COLLEGE NAME"
              placeholder="SRM University"
              value={college}
              onChangeText={setCollege}
            />
            <Field
              label="BRANCH / MAJOR"
              placeholder="Computer Science"
              value={branch}
              onChangeText={setBranch}
            />

            {/* Year of Study */}
            <View style={s.yearBlock}>
              <Text style={s.yearLabel}>YEAR OF STUDY</Text>
              <View style={s.pills}>
                {YEAR_PILLS.map((yr, i) => (
                  <Pressable
                    key={yr}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setYearIdx(i); }}
                    style={[s.pill, yearIdx === i && s.pillActive]}
                  >
                    <Text style={[s.pillText, yearIdx === i && s.pillTextActive]}>{yr}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Promo banner */}
        <View style={s.banner}>
          <View style={s.bannerContent}>
            <Text style={s.bannerTitle}>Unlock personalized job matches</Text>
            <Text style={s.bannerSub}>CAREER INTELLIGENCE ENGINE</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={["#6c63ff", "#c4c0ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.continueBtn, { width: width - 32 }]}
          >
            <Text style={s.continueBtnText}>{loading ? "Creating account…" : "Continue"}</Text>
            <Ionicons name="arrow-forward" size={18} color="#1b0091" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

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
    backgroundColor:   "rgba(19,18,27,0.9)",
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
    flex:       1,
    textAlign:  "center",
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   17,
    color:      colors.text,
  },
  stepDots: {
    flexDirection: "row",
    gap:           6,
    alignItems:    "center",
  },
  stepDot: {
    height:       8,
    borderRadius: 4,
  },
  stepDotInactive: {
    width:           8,
    backgroundColor: colors.surfaceHighest,
  },
  stepDotActive: {
    width:           24,
    backgroundColor: colors.primary,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop:        24,
    gap:               24,
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
  section: { gap: 16 },

  // Academic
  academicSection: { gap: 12 },
  academicHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  academicTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  glassCard: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             16,
  },
  yearBlock: { gap: 10 },
  yearLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.outline,
    textTransform: "uppercase",
    marginLeft:    4,
  },
  pills: {
    flexDirection: "row",
    gap:           8,
  },
  pill: {
    flex:              1,
    height:            36,
    borderRadius:      8,
    alignItems:        "center",
    justifyContent:    "center",
    backgroundColor:   colors.surfaceContainer,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.05)",
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  pillText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   12,
    color:      colors.textVariant,
  },
  pillTextActive: {
    color:      colors.onPrimary,
    fontFamily: "HankenGrotesk_700Bold",
  },

  // Banner
  banner: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    height:          100,
    justifyContent:  "flex-end",
    padding:         16,
    overflow:        "hidden",
  },
  bannerContent: { gap: 2 },
  bannerTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      15,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 1,
    color:         colors.primary,
    textTransform: "uppercase",
  },

  // Footer
  footer: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 16,
    paddingTop:        12,
    backgroundColor:   "rgba(8,8,16,0.9)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.05)",
    alignItems:        "center",
  },
  continueBtn: {
    height:         56,
    borderRadius:   999,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  continueBtnText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    color:         "#1b0091",
    letterSpacing: -0.2,
  },
});
