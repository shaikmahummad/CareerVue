import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, Dimensions, ScrollView, Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView, MotiText } from "moti";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from "react-native-reanimated";
import { GlowButton } from "../components/ui/GlowButton";
import { colors, gradients } from "../constants/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon:        "🎯",
    title:       "Build Your Dream Career",
    description: "CareerVue maps your unique skills and goals into a personalised step-by-step roadmap curated by AI.",
    iconBg:      gradients.primary,
  },
  {
    icon:        "🧠",
    title:       "Discover Your Skill Level",
    description: "Our AI quiz identifies exactly where you're strong and where to improve across 5 key technical areas.",
    iconBg:      ["#6c63ff", "#ff4d6d"] as const,
  },
  {
    icon:        "📚",
    title:       "Learn from Expert Tutors",
    description: "Access hand-picked courses from real industry experts and accelerate your journey to your first job.",
    iconBg:      gradients.success,
  },
] as const;

function SlideIllustration({ slide, active }: { slide: typeof SLIDES[number]; active: boolean }) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.85 }}
      transition={{ type: "spring", damping: 18, stiffness: 160 }}
      style={s.illustrationWrap}
    >
      {/* Background glow rings */}
      {[1, 2, 3].map((ring) => (
        <MotiView
          key={ring}
          from={{ scale: 0.8, opacity: 0.15 }}
          animate={{ scale: [0.8, 1 + ring * 0.12], opacity: [0.15, 0] }}
          transition={{ type: "timing", duration: 2000 + ring * 500, loop: true, delay: ring * 400 }}
          style={[
            s.glowRing,
            {
              width:           140 + ring * 40,
              height:          140 + ring * 40,
              borderRadius:    (140 + ring * 40) / 2,
              borderColor:     colors.primary,
            },
          ]}
        />
      ))}

      {/* Main icon */}
      <View style={s.mainIcon}>
        <Text style={s.mainEmoji}>{slide.icon}</Text>
      </View>

      {/* Floating glass card – quiz card for slide 2 */}
      {slide.title.includes("Discover") && (
        <MotiView
          from={{ opacity: 0, translateY: 20, translateX: 40 }}
          animate={{ opacity: 1, translateY: [0, -8, 0], translateX: 40 }}
          transition={{ type: "timing", duration: 3000, loop: true }}
          style={s.quizCard}
        >
          <Text style={s.quizQ}>Which hook runs side-effects?</Text>
          {["useContext", "useEffect", "useState"].map((opt, i) => (
            <View key={opt} style={[s.quizOpt, i === 1 && s.quizOptCorrect]}>
              <Text style={[s.quizOptText, i === 1 && s.quizOptTextCorrect]}>{opt}</Text>
            </View>
          ))}
        </MotiView>
      )}
    </MotiView>
  );
}

export default function OnboardingScreen() {
  const [active, setActive] = useState(0);
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  function next() {
    if (active < SLIDES.length - 1) {
      const nextIndex = active + 1;
      setActive(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      router.push("/(auth)/login");
    }
  }

  function skip() {
    router.push("/(auth)/login");
  }

  return (
    <View style={[s.root, { paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Dot grid bg */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...Array(8)].map((_, row) =>
          [...Array(6)].map((_, col) => (
            <View
              key={`${row}-${col}`}
              style={[
                s.gridDot,
                { top: row * 100 + 20, left: col * 64 + 10 },
              ]}
            />
          ))
        )}
      </View>

      {/* Skip button */}
      <View style={[s.topRow, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Illustrations */}
      <View style={s.illustrationRow}>
        {SLIDES.map((slide, i) => (
          <View key={i} style={{ width, alignItems: "center" }}>
            <SlideIllustration slide={slide} active={i === active} />
          </View>
        ))}
      </View>

      {/* Bottom content area */}
      <View style={s.bottom}>
        {/* Progress dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <MotiView
              key={i}
              animate={{
                width:           i === active ? 20 : 8,
                backgroundColor: i === active ? colors.primary : "rgba(255,255,255,0.3)",
              }}
              transition={{ type: "timing", duration: 250 }}
              style={s.dot}
            />
          ))}
        </View>

        {/* Text */}
        <MotiText
          key={`title-${active}`}
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20 }}
          style={s.title}
        >
          {SLIDES[active].title}
        </MotiText>

        <MotiText
          key={`desc-${active}`}
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 100, damping: 20 }}
          style={s.desc}
        >
          {SLIDES[active].description}
        </MotiText>

        <GlowButton
          label={active === SLIDES.length - 1 ? "Get Started →" : "Next →"}
          onPress={next}
          variant="primary"
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  topRow: {
    flexDirection:   "row",
    paddingHorizontal: 16,
    alignItems:      "center",
  },
  skip: {
    fontSize: 14,
    color:    colors.muted,
  },
  gridDot: {
    position:        "absolute",
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  illustrationRow: {
    flex:            1,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
  },
  illustrationWrap: {
    width:           260,
    height:          260,
    alignItems:      "center",
    justifyContent:  "center",
    position:        "relative",
  },
  glowRing: {
    position:   "absolute",
    borderWidth: 1,
  },
  mainIcon: {
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(108,99,255,0.15)",
    borderWidth:     1,
    borderColor:     "rgba(108,99,255,0.3)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  mainEmoji: {
    fontSize: 52,
  },
  quizCard: {
    position:        "absolute",
    right:           -30,
    top:             20,
    backgroundColor: "rgba(13,13,20,0.92)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    14,
    padding:         12,
    width:           160,
    gap:             6,
  },
  quizQ: {
    fontSize:   12,
    fontWeight: "600",
    color:      colors.text,
    marginBottom: 4,
  },
  quizOpt: {
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderRadius:      6,
    backgroundColor:   "rgba(255,255,255,0.05)",
  },
  quizOptCorrect: {
    backgroundColor: colors.successBg,
    borderWidth:     1,
    borderColor:     colors.success,
  },
  quizOptText: {
    fontSize: 11,
    color:    colors.muted,
  },
  quizOptTextCorrect: {
    color:      colors.success,
    fontWeight: "600",
  },
  bottom: {
    paddingHorizontal: 16,
    paddingBottom:     8,
    gap:               12,
  },
  dots: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            6,
    marginBottom:   4,
  },
  dot: {
    height:          8,
    borderRadius:    4,
  },
  title: {
    fontSize:    28,
    fontWeight:  "700",
    color:       colors.text,
    textAlign:   "center",
    lineHeight:  34,
  },
  desc: {
    fontSize:   16,
    color:      colors.muted,
    textAlign:  "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
});
