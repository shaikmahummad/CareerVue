import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { GlowButton } from "../../components/ui/GlowButton";
import { FormInput } from "../../components/ui/FormInput";
import { colors } from "../../constants/theme";

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Sign in failed", error.message);
  }, [email, password]);

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Violet glow blob top-right */}
      <View style={s.glowBlob} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo row */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20, delay: 100 }}
          style={s.logoRow}
        >
          <View style={s.logoIcon}>
            <Text style={{ fontSize: 18, color: "#fff" }}>◎</Text>
          </View>
          <Text style={s.logoText}>CareerVue</Text>
        </MotiView>

        {/* Heading */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 200, damping: 20 }}
        >
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.sub}>Sign in to continue your journey.</Text>
        </MotiView>

        {/* Google button */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 320, damping: 20 }}
        >
          <Pressable style={s.googleBtn}>
            <Text style={s.googleG}>G</Text>
            <Text style={s.googleLabel}>Continue with Google</Text>
          </Pressable>
        </MotiView>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>or</Text>
          <View style={s.divLine} />
        </View>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 420, damping: 20 }}
          style={s.form}
        >
          <FormInput
            label="Email"
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <FormInput
            label="Password"
            placeholder="••••••••"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            rightIcon={
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.muted}
              />
            }
            onRightPress={() => setShowPass(v => !v)}
          />

          <Pressable style={s.forgot} onPress={() => {}}>
            <Text style={s.forgotText}>Forgot Password?</Text>
          </Pressable>
        </MotiView>

        {/* Sign In button */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 520, damping: 20 }}
          style={{ marginTop: 4 }}
        >
          <GlowButton
            label={loading ? "Signing in…" : "Sign In"}
            onPress={handleLogin}
            loading={loading}
            variant="primary"
          />
        </MotiView>

        {/* Register link */}
        <View style={s.registerRow}>
          <Text style={s.registerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={s.registerLink}>Create one →</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  glowBlob: {
    position:        "absolute",
    top:             -20,
    right:           -20,
    width:           160,
    height:          160,
    borderRadius:    80,
    backgroundColor: colors.primary,
    opacity:         0.18,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop:        60,
    paddingBottom:     40,
    gap:               20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
    marginBottom:  4,
  },
  logoIcon: {
    width:           40,
    height:          40,
    borderRadius:    10,
    backgroundColor: colors.primary,
    alignItems:      "center",
    justifyContent:  "center",
  },
  logoText: {
    fontSize:    20,
    fontWeight:  "700",
    color:       colors.text,
  },
  heading: {
    fontSize:    34,
    fontWeight:  "700",
    color:       colors.text,
    lineHeight:  41,
    marginBottom: 6,
  },
  sub: {
    fontSize: 17,
    color:    colors.muted,
  },
  googleBtn: {
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "center",
    backgroundColor:  "#ffffff",
    borderRadius:     16,
    height:           56,
    gap:              12,
    shadowColor:      "#000",
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.3,
    shadowRadius:     8,
    elevation:        6,
  },
  googleG: {
    fontSize:    20,
    fontWeight:  "700",
    color:       "#4285F4",
    fontFamily:  "System",
  },
  googleLabel: {
    fontSize:    17,
    fontWeight:  "500",
    color:       "#1a1a2a",
  },
  divider: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  divLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border,
  },
  divText: {
    fontSize: 13,
    color:    colors.muted,
  },
  form: {
    gap: 16,
  },
  forgot: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize:   14,
    color:      colors.primary,
    fontWeight: "500",
  },
  registerRow: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      8,
  },
  registerText: {
    fontSize: 15,
    color:    colors.muted,
  },
  registerLink: {
    fontSize:   15,
    color:      colors.primary,
    fontWeight: "600",
  },
});
