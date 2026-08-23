import { useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

const { width, height } = Dimensions.get("window");
const BTN_W = width - 32;

const SLIDES = [
  {
    title:       "Build Your Dream Career",
    description: "CareerVue maps your skills and goals into a personalised step-by-step roadmap using verified course data.",
    icon:        "map-outline" as const,
    iconColor:   colors.primary,
  },
  {
    title:       "Discover Your Skill Level",
    description: "Our reviewed quiz identifies where you're strong and where you can grow to reach your career goals.",
    icon:        "bulb-outline" as const,
    iconColor:   colors.secondary,
  },
  {
    title:       "Learn from Expert Tutors",
    description: "Access hand-picked courses from real industry experts and accelerate your journey to your first job.",
    icon:        "book-outline" as const,
    iconColor:   colors.tertiary,
  },
] as const;

// Tilted glass quiz card illustration — matches slide 2 in the design
function QuizIllustration() {
  return (
    <View style={il.container}>
      {/* Main tilted quiz card */}
      <View style={il.quizCard}>
        {/* Progress bar */}
        <View style={il.progressTrack}>
          <LinearGradient colors={["#6c63ff", "#c4c0ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={il.progressFill} />
        </View>
        {/* Question badge */}
        <View style={il.qBadge}>
          <Text style={il.qBadgeText}>REACT FUNDAMENTALS</Text>
        </View>
        <Text style={il.qText}>Which React hook is used to perform side effects in a functional component?</Text>

        {/* Options */}
        {["useState", "useEffect", "useContext", "useReducer"].map((opt, i) => (
          <View key={opt} style={[il.opt, i === 1 && il.optSelected]}>
            {i === 1 ? (
              <LinearGradient colors={["#6c63ff", "#c4c0ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={il.optRadioFilled}>
                <Ionicons name="checkmark" size={10} color="#1b0091" />
              </LinearGradient>
            ) : (
              <View style={il.optRadioEmpty} />
            )}
            <Text style={[il.optText, i === 1 && il.optTextSelected]}>{opt}</Text>
          </View>
        ))}
      </View>

      {/* Floating assessment badge */}
      <View style={il.floatingBadge}>
        <View style={il.badgeIcon}>
          <Ionicons name="hardware-chip-outline" size={16} color={colors.tertiary} />
        </View>
        <View style={il.badgeInfo}>
          <Text style={il.badgeLabel}>SKILL ANALYSIS</Text>
          <Text style={il.badgeValue}>Skill Level: Expert</Text>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [active, setActive] = useState(0);
  const router              = useRouter();
  const insets              = useSafeAreaInsets();
  const progress            = useSharedValue(0);

  function goNext() {
    if (active < SLIDES.length - 1) {
      const next = active + 1;
      setActive(next);
      progress.value = withTiming(next, { duration: 300 });
    } else {
      router.replace("/(auth)/login");
    }
  }

  const isLast = active === SLIDES.length - 1;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Subtle dot-grid background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 5 }).map((_, col) => (
            <View
              key={`${row}-${col}`}
              style={[s.gridDot, { top: row * 100 + 30, left: col * 80 + 20 }]}
            />
          ))
        )}
      </View>

      {/* Skip */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={12}>
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Illustration */}
      <View style={s.illustrationArea}>
        {active === 1 ? (
          <QuizIllustration />
        ) : (
          <View style={s.genericIllustration}>
            <View style={[s.iconCircle, { borderColor: `${SLIDES[active].iconColor}33` }]}>
              <View style={[s.iconInner, { backgroundColor: `${SLIDES[active].iconColor}20` }]}>
                <Ionicons name={SLIDES[active].icon} size={52} color={SLIDES[active].iconColor} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom content */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {/* Dot indicators */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                {
                  width:           i === active ? 24 : 8,
                  backgroundColor: i === active ? colors.primaryContainer : "rgba(255,255,255,0.15)",
                },
              ]}
            />
          ))}
        </View>

        {/* Text */}
        <Text style={s.title}>{SLIDES[active].title}</Text>
        <Text style={s.desc}>{SLIDES[active].description}</Text>

        {/* CTA */}
        <Pressable
          onPress={goNext}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={["#6c63ff", "#c4c0ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.nextBtn, { width: BTN_W }]}
          >
            <Text style={s.nextBtnText}>{isLast ? "Get Started" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={18} color="#1b0091" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// Quiz illustration styles
const il = StyleSheet.create({
  container: {
    width:    width - 48,
    alignItems: "center",
    justifyContent: "center",
  },
  quizCard: {
    width:           "100%",
    backgroundColor: "rgba(21,21,31,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    24,
    padding:         16,
    gap:             10,
    transform:       [{ rotate: "-3deg" }],
  },
  progressTrack: {
    height:          4,
    backgroundColor: colors.surfaceHigh,
    borderRadius:    2,
    overflow:        "hidden",
    marginBottom:    4,
  },
  progressFill: {
    width:        "40%",
    height:       "100%",
    borderRadius: 2,
  },
  qBadge: {
    alignSelf:         "flex-start",
    paddingHorizontal: 8,
    paddingVertical:   3,
    backgroundColor:   "rgba(196,192,255,0.12)",
    borderRadius:      6,
  },
  qBadgeText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      9,
    letterSpacing: 0.8,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  qText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      13,
    lineHeight:    18,
    color:         colors.text,
    letterSpacing: -0.1,
  },
  opt: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  optSelected: {
    borderColor:     `${colors.secondary}66`,
    backgroundColor: "rgba(162,231,255,0.08)",
  },
  optRadioEmpty: {
    width:        16,
    height:       16,
    borderRadius: 8,
    borderWidth:  1.5,
    borderColor:  "rgba(255,255,255,0.2)",
  },
  optRadioFilled: {
    width:          16,
    height:         16,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
  },
  optText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   13,
    color:      colors.textVariant,
  },
  optTextSelected: {
    color:      colors.secondary,
    fontFamily: "HankenGrotesk_600SemiBold",
  },
  floatingBadge: {
    position:        "absolute",
    top:             -16,
    right:           -8,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    backgroundColor: "rgba(13,13,20,0.92)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    12,
    padding:         10,
    transform:       [{ rotate: "8deg" }],
  },
  badgeIcon: {
    width:           32,
    height:          32,
    borderRadius:    8,
    backgroundColor: "rgba(255,183,133,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  badgeInfo: { gap: 1 },
  badgeLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      8,
    letterSpacing: 0.8,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  badgeValue: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      12,
    color:         colors.text,
    letterSpacing: -0.1,
  },
});

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  gridDot: {
    position:        "absolute",
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  topBar: {
    flexDirection:     "row",
    paddingHorizontal: 16,
    alignItems:        "center",
  },
  skip: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    color:      colors.textVariant,
  },
  illustrationArea: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Generic (slides 1 & 3)
  genericIllustration: {
    alignItems:     "center",
    justifyContent: "center",
  },
  iconCircle: {
    width:        220,
    height:       220,
    borderRadius: 110,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
  },
  iconInner: {
    width:          160,
    height:         160,
    borderRadius:   80,
    alignItems:     "center",
    justifyContent: "center",
  },

  // Bottom
  bottom: {
    paddingHorizontal: 16,
    alignItems:        "center",
    gap:               14,
  },
  dots: {
    flexDirection: "row",
    gap:           6,
    alignItems:    "center",
  },
  dot: {
    height:       8,
    borderRadius: 4,
  },
  title: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    textAlign:     "center",
  },
  desc: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.textVariant,
    textAlign:  "center",
    maxWidth:   300,
  },
  nextBtn: {
    height:         56,
    borderRadius:   999,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  nextBtnText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    color:         "#1b0091",
    letterSpacing: -0.2,
  },
});
