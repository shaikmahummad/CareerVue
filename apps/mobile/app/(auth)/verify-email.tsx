import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiPost } from "../../lib/api";
import { normalizeEmail } from "../../lib/auth-validation";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? normalizeEmail(params.email) : "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const verifyOtp = useCallback(async () => {
    if (!email || otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/verify-otp", { email, otp });
      Alert.alert("Email verified", "Your account is ready. Sign in to continue.", [
        { text: "Go to sign in", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "This OTP is invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  }, [email, otp, router]);

  const resendOtp = useCallback(async () => {
    if (!email || resendSeconds > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      await apiPost("/api/v1/auth/resend-verification", { email });
      setOtp("");
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      Alert.alert("OTP sent", "A new 6-digit OTP is on its way. It expires in 10 minutes.");
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "We could not resend the OTP. Please try again."
      );
    } finally {
      setResending(false);
    }
  }, [email, resendSeconds, resending]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={s.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>

        <View style={s.heading}>
          <View style={s.icon}>
            <Ionicons name="mail-outline" size={28} color={colors.primary} />
          </View>
          <Text style={s.title}>Verify your email</Text>
          <Text style={s.subtitle}>
            Enter the 6-digit OTP we sent to{"\n"}
            <Text style={s.email}>{email || "your email address"}</Text>
          </Text>
        </View>

        <View style={s.form}>
          <TextInput
            value={otp}
            onChangeText={(value) => {
              setError("");
              setOtp(value.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH));
            }}
            style={[s.otpInput, error ? s.otpInputError : null]}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
            placeholder="000000"
            placeholderTextColor={colors.outlineVariant}
          />
          <Text style={s.expiry}>This OTP expires in 10 minutes.</Text>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable onPress={() => void verifyOtp()} disabled={loading || !email}>
            <LinearGradient
              colors={["#c4c0ff", "#8781ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.verifyButton}
            >
              <Text style={s.verifyButtonText}>{loading ? "Verifying…" : "Verify email"}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => void resendOtp()}
            disabled={resending || resendSeconds > 0 || !email}
            style={s.resendButton}
          >
            <Text style={[s.resendText, resendSeconds > 0 && s.resendDisabled]}>
              {resending
                ? "Sending…"
                : resendSeconds > 0
                  ? `Resend OTP in ${resendSeconds}s`
                  : "Resend OTP"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 16, gap: 32 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { alignItems: "center", gap: 12 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(196,192,255,0.1)",
  },
  title: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 30,
    color: colors.text,
  },
  subtitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 17,
    lineHeight: 24,
    color: colors.textVariant,
    textAlign: "center",
  },
  email: { color: colors.text, fontFamily: "HankenGrotesk_600SemiBold" },
  form: { gap: 16 },
  otpInput: {
    width: width - 32,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0d0d14",
    color: colors.text,
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    paddingLeft: 12,
  },
  otpInputError: { borderColor: "#f87171" },
  expiry: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 14,
    color: colors.textVariant,
    textAlign: "center",
  },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
  verifyButton: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 17,
    color: "#1b0091",
  },
  resendButton: { alignItems: "center", padding: 8 },
  resendText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 16,
    color: colors.primary,
  },
  resendDisabled: { color: colors.textVariant },
});
