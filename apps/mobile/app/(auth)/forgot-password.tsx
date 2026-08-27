import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { colors } from "../../constants/theme";

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: "careervue://reset-password",
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      {/* Background glow */}
      <View style={s.glowWrap} pointerEvents="none">
        <View style={s.glowBlob} />
      </View>

      {/* Back button */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        {sent ? (
          /* ── Sent state ─────────────────────────────────── */
          <View style={s.sentBox}>
            <View style={s.sentIcon}>
              <Ionicons name="mail-open-outline" size={40} color={colors.primary} />
            </View>
            <Text style={s.sentTitle}>Check Your Email</Text>
            <Text style={s.sentSub}>
              We sent a password reset link to{"\n"}
              <Text style={{ color: colors.primary }}>{email}</Text>
            </Text>
            <Text style={s.sentHint}>
              The link expires in 1 hour. Check your spam folder if you don't see it.
            </Text>
            <Pressable style={s.backToLogin} onPress={() => router.replace("/(auth)/login" as never)}>
              <LinearGradient
                colors={["#c4c0ff", "#8781ff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btnGrad}
              >
                <Text style={s.btnText}>Back to Login</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          /* ── Form state ─────────────────────────────────── */
          <>
            <View style={s.iconWrap}>
              <Ionicons name="lock-open-outline" size={36} color={colors.primary} />
            </View>

            <Text style={s.title}>Forgot Password?</Text>
            <Text style={s.subtitle}>
              Enter the email address linked to your account and we'll send you a reset link.
            </Text>

            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textVariant} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textVariant}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>

            <Pressable
              style={({ pressed }) => [s.sendBtn, { opacity: pressed || loading ? 0.75 : 1 }]}
              onPress={handleSend}
              disabled={loading}
            >
              <LinearGradient
                colors={["#c4c0ff", "#8781ff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btnGrad}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#1b0091" />
                  : <Text style={s.btnText}>Send Reset Link</Text>
                }
              </LinearGradient>
            </Pressable>

            <Pressable style={s.loginLink} onPress={() => router.back()}>
              <Text style={s.loginLinkText}>Back to login</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  glowWrap: { ...StyleSheet.absoluteFill, alignItems: "center" },
  glowBlob: {
    width:           320,
    height:          320,
    borderRadius:    160,
    backgroundColor: colors.primary,
    opacity:         0.06,
    marginTop:       80,
  },

  topBar: { paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      "center",
    justifyContent:  "center",
  },

  content: {
    flex:            1,
    paddingHorizontal: 28,
    justifyContent:  "center",
    gap:             16,
  },

  iconWrap: {
    width:           72,
    height:          72,
    borderRadius:    24,
    backgroundColor: "rgba(196,192,255,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
    alignSelf:       "flex-start",
    marginBottom:    4,
  },

  title: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.5,
    color:         colors.text,
  },
  subtitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   15,
    lineHeight: 22,
    color:      colors.textVariant,
    marginBottom: 8,
  },

  inputWrap: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    16,
    paddingHorizontal: 14,
    height:          52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex:       1,
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   15,
    color:      colors.text,
  },

  sendBtn:  { borderRadius: 16, overflow: "hidden" },
  btnGrad: {
    height:         54,
    alignItems:     "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      16,
    color:         "#1b0091",
    letterSpacing: -0.2,
  },

  loginLink: { alignItems: "center", paddingVertical: 4 },
  loginLinkText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.textVariant,
  },

  // Sent state
  sentBox: { alignItems: "center", gap: 14 },
  sentIcon: {
    width:           88,
    height:          88,
    borderRadius:    28,
    backgroundColor: "rgba(196,192,255,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    8,
  },
  sentTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      26,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  sentSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   15,
    lineHeight: 22,
    color:      colors.textVariant,
    textAlign:  "center",
  },
  sentHint: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   12,
    lineHeight: 18,
    color:      colors.textVariant,
    opacity:    0.6,
    textAlign:  "center",
  },
  backToLogin: { borderRadius: 16, overflow: "hidden", width: "100%", marginTop: 8 },
});
