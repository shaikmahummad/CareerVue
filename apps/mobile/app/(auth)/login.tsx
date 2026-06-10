import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import { colors } from "../../constants/theme";

const { width, height } = Dimensions.get("window");
const BTN_W = width - 32;

export default function LoginScreen() {
  const router              = useRouter();
  const insets              = useSafeAreaInsets();
  const [email, setEmail]   = useState("");
  const [pass,  setPass]    = useState("");
  const [show,  setShow]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) Alert.alert("Sign in failed", error.message);
  }, [email, pass]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Subtle top-right violet glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height * 0.55}>
          <Defs>
            <RadialGradient id="glow" cx="100%" cy="0%" rx="65%" ry="80%">
              <Stop offset="0%"   stopColor="#6c63ff" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#6c63ff" stopOpacity="0"    />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height * 0.55} fill="url(#glow)" />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    insets.top + 24,
          paddingBottom: insets.bottom + 32,
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo row */}
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>CV</Text>
          </View>
          <Text style={s.logoName}>CareerVue</Text>
        </View>

        {/* Heading */}
        <View style={s.headBlock}>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.sub}>Sign in to continue your journey.</Text>
        </View>

        {/* Google button */}
        <Pressable style={({ pressed }) => [s.googleBtn, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={s.googleG}>G</Text>
          <Text style={s.googleLabel}>Continue with Google</Text>
        </Pressable>

        {/* OR divider */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>— OR —</Text>
          <View style={s.divLine} />
        </View>

        {/* Email */}
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={s.input}
            placeholder="name@career.vue"
            placeholderTextColor={colors.outlineVariant}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <View style={s.fieldWrap}>
          <View style={s.fieldLabelRow}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <Pressable onPress={() => router.push("/(auth)/forgot-password" as never)}>
              <Text style={s.forgot}>FORGOT?</Text>
            </Pressable>
          </View>
          <View>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.outlineVariant}
              value={pass}
              onChangeText={setPass}
              secureTextEntry={!show}
              autoCapitalize="none"
            />
            <Pressable style={s.eyeBtn} onPress={() => setShow(v => !v)}>
              <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* Sign In */}
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, marginTop: 8 })}
        >
          <LinearGradient
            colors={["#c4c0ff", "#8781ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.signInBtn, { width: BTN_W }]}
          >
            <Text style={s.signInText}>{loading ? "Signing in…" : "Sign In"}</Text>
          </LinearGradient>
        </Pressable>

        {/* Footer */}
        <View style={s.footerRow}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={s.footerLink}>Create one →</Text>
          </Pressable>
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
  scroll: {
    paddingHorizontal: 16,
    gap:               24,
  },

  // Logo
  logoRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  logoMark: {
    width:           40,
    height:          40,
    borderRadius:    10,
    backgroundColor: "#1c1833",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  logoMarkText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      14,
    color:         colors.primary,
    letterSpacing: -0.5,
  },
  logoName: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.3,
    color:         colors.text,
  },

  // Heading
  headBlock: { gap: 6 },
  heading: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         colors.text,
  },
  sub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.textVariant,
  },

  // Google
  googleBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#ffffff",
    borderRadius:    12,
    height:          52,
    gap:             10,
  },
  googleG: {
    fontFamily:  "HankenGrotesk_700Bold",
    fontSize:    18,
    color:       "#4285F4",
  },
  googleLabel: {
    fontFamily:  "HankenGrotesk_600SemiBold",
    fontSize:    16,
    color:       "#1f1f28",
  },

  // OR divider
  divider: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    marginVertical: -4,
  },
  divLine: {
    flex:            1,
    height:          1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  divText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 1,
    color:         colors.textVariant,
  },

  // Fields
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.outline,
    textTransform: "uppercase",
    marginLeft:    4,
  },
  fieldLabelRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginLeft:     4,
    marginRight:    4,
  },
  forgot: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
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
  eyeBtn: {
    position: "absolute",
    right:    14,
    top:      0,
    bottom:   0,
    justifyContent: "center",
  },

  // Sign In button
  signInBtn: {
    height:         56,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  signInText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    letterSpacing: -0.2,
    color:         "#1b0091",
  },

  // Footer
  footerRow: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      4,
  },
  footerText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    color:      colors.textVariant,
  },
  footerLink: {
    fontFamily:  "HankenGrotesk_600SemiBold",
    fontSize:    17,
    color:       colors.primary,
  },
});
