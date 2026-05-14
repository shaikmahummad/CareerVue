import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { colors } from "../constants/theme";

const { width, height } = Dimensions.get("window");
const BTN_WIDTH = width - 32;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* True SVG radial gradient background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="42%" rx="65%" ry="50%">
              <Stop offset="0%"   stopColor="#6c63ff" stopOpacity="0.45" />
              <Stop offset="55%"  stopColor="#6c63ff" stopOpacity="0.18" />
              <Stop offset="85%"  stopColor="#6c63ff" stopOpacity="0.04" />
              <Stop offset="100%" stopColor="#050508" stopOpacity="0"    />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#bg)" />
        </Svg>
      </View>

      {/* Center: icon + text */}
      <View style={s.center}>
        <LinearGradient
          colors={["#1c1833", "#0a0a14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.icon}
        >
          <Text style={s.iconLabel}>CV</Text>
        </LinearGradient>

        <View style={s.textBlock}>
          <Text style={s.appName}>CareerVue</Text>
          <Text style={s.tagline}>Your career, by design.</Text>
        </View>
      </View>

      {/* Bottom: dots + buttons */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={s.dots}>
          <View style={[s.dot, s.dotActive]} />
          <View style={s.dot} />
          <View style={s.dot} />
        </View>

        <Pressable
          onPress={() => router.push("/onboarding")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <LinearGradient
            colors={["#7c73ff", "#4f44e2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.btnPrimary, { width: BTN_WIDTH }]}
          >
            <Text style={s.btnPrimaryText}>Get Started</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={s.signInText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      "center",
    justifyContent:  "space-between",
  },
  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            28,
  },
  icon: {
    width:          104,
    height:         104,
    borderRadius:   24,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    borderColor:    "rgba(196,192,255,0.12)",
  },
  iconLabel: {
    fontFamily:    "HankenGrotesk_800ExtraBold",
    fontSize:      32,
    color:         "#c4c0ff",
    letterSpacing: -1,
  },
  textBlock: {
    alignItems: "center",
    gap:        8,
  },
  appName: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         "#ffffff",
  },
  tagline: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      "rgba(228,225,238,0.6)",
  },
  bottom: {
    width:      "100%",
    alignItems: "center",
    gap:        14,
  },
  dots: {
    flexDirection: "row",
    gap:           8,
    marginBottom:  4,
  },
  dot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  btnPrimary: {
    height:         56,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      17,
    color:         "#ffffff",
    letterSpacing: -0.1,
  },
  signInText: {
    fontFamily:    "HankenGrotesk_400Regular",
    fontSize:      17,
    lineHeight:    22,
    color:         "rgba(228,225,238,0.5)",
    paddingVertical: 6,
  },
});
