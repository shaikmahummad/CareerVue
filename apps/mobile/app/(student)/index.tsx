import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 16) / 2;

interface Stats {
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}
interface Enrollment {
  id: string;
  course_id: string;
  progress_pct: number;
  completed_at: string | null;
  course?: { title: string; category: string | null };
}
interface RoadmapItem { id: string; topic: string; status: string; priority: string }
interface Roadmap { id: string; goal: string; items: RoadmapItem[] }

const FALLBACK_NODES = [
  { label: "HTML/CSS",   status: "completed" },
  { label: "JAVASCRIPT", status: "in_progress" },
  { label: "ADV. REACT", status: "locked" },
];

const COURSE_CARDS = [
  { title: "Node.js Masterclass",  desc: "Build scalable backend services.", lessons: 24, level: "BEGINNER", levelColor: colors.primary },
  { title: "Cybersecurity Pro",    desc: "Master network defense systems.",  lessons: 18, level: "ADVANCED",  levelColor: colors.secondary },
];

export default function StudentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name,        setName]        = useState("there");
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [roadmap,     setRoadmap]     = useState<Roadmap | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name as string | undefined;
      setName(fullName?.split(" ")[0] ?? "there");
      const [s, e, r] = await Promise.allSettled([
        apiGet<Stats>("/api/v1/students/stats"),
        apiGet<Enrollment[]>("/api/v1/enrollments/mine"),
        apiGet<Roadmap>("/api/v1/roadmap/mine"),
      ]);
      if (s.status === "fulfilled") setStats(s.value);
      if (e.status === "fulfilled") setEnrollments(e.value);
      if (r.status === "fulfilled") setRoadmap(r.value);
    }
    load();
  }, []);

  const inProgress = enrollments.find(e => !e.completed_at);
  const xp         = stats?.xp_points    ?? 1240;
  const streak     = stats?.streak_days  ?? 7;
  const enrolled   = stats?.enrolled_count  ?? 12;
  const completed  = stats?.completed_count ?? 4;

  const HEADER_H = insets.top + 44;

  const nodes = roadmap
    ? roadmap.items.slice(0, 5).map(i => ({
        label:  i.topic.toUpperCase().slice(0, 12),
        status: i.status,
      }))
    : FALLBACK_NODES;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}>
        <Text style={s.greeting}>Hi {name} 👋</Text>
        <Pressable style={s.notifBtn} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color={colors.textVariant} />
          <View style={s.notifDot} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    HEADER_H + 16,
          paddingBottom: TAB_BAR_HEIGHT + 16,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Banner */}
        <LinearGradient
          colors={["#c4c0ff", "#8781ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.streakBanner}
        >
          <View style={s.streakRow}>
            <View>
              <Text style={s.streakTitle}>7 Day Streak!</Text>
              <Text style={s.streakSub}>You're on fire this week.</Text>
            </View>
            <View style={s.xpBadge}>
              <Text style={s.xpText}>{xp.toLocaleString()} XP</Text>
            </View>
          </View>
          <View style={s.flameWrap} pointerEvents="none">
            <Ionicons name="flame" size={120} color="#1b0091" />
          </View>
        </LinearGradient>

        {/* Stats 2×2 */}
        <View style={s.statsGrid}>
          {([
            { icon: "flash"             as const, iconColor: colors.primary,          label: "XP GAINED",    value: xp.toLocaleString() },
            { icon: "calendar-outline"  as const, iconColor: colors.secondary,        label: "CURR. STREAK", value: `${streak} Days` },
            { icon: "book-outline"      as const, iconColor: colors.tertiary,         label: "ENROLLED",     value: String(enrolled).padStart(2, "0") },
            { icon: "checkmark-circle"  as const, iconColor: colors.primaryContainer, label: "COMPLETED",    value: String(completed).padStart(2, "0") },
          ] as const).map(({ icon, iconColor, label, value }) => (
            <View key={label} style={[s.statCard, { width: CARD_W }]}>
              <Ionicons name={icon} size={24} color={iconColor} style={s.statIcon} />
              <Text style={s.statLabel}>{label}</Text>
              <Text style={s.statValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Continue Learning */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Continue Learning</Text>
          <View style={s.continueLearningCard}>
            <View style={s.clRow}>
              <View style={s.clIconBox}>
                <Ionicons name="terminal-outline" size={24} color={colors.primary} />
              </View>
              <View style={s.clInfo}>
                <Text style={s.clTitle} numberOfLines={1}>
                  {inProgress?.course?.title ?? "React Fundamentals"}
                </Text>
                <Text style={s.clModule}>Module 4: Hooks</Text>
              </View>
              <Text style={s.clPct}>{inProgress?.progress_pct ?? 65}%</Text>
            </View>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={["#c4c0ff", "#8781ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${inProgress?.progress_pct ?? 65}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Roadmap Row */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Roadmap</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hScroll}
          >
            {nodes.map((node, i) => {
              const isDone   = node.status === "completed" || node.status === "done";
              const isActive = node.status === "in_progress" || node.status === "active";
              return (
                <View
                  key={i}
                  style={[
                    s.roadmapNode,
                    isActive && s.roadmapNodeActive,
                    !isDone && !isActive && s.roadmapNodeLocked,
                  ]}
                >
                  <View style={[
                    s.roadmapIconWrap,
                    isDone   && s.roadmapIconDone,
                    isActive && s.roadmapIconActive,
                  ]}>
                    <Ionicons
                      name={isDone ? "checkmark-circle" : isActive ? "play" : "lock-closed"}
                      size={20}
                      color={isActive ? "#1b0091" : colors.primary}
                    />
                  </View>
                  <Text style={s.roadmapLabel}>{node.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Recommended Courses */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recommended</Text>
            <Pressable onPress={() => router.push("/(student)/courses" as any)} hitSlop={8}>
              <Text style={s.seeAll}>SEE ALL</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hScroll}
          >
            {COURSE_CARDS.map((c) => (
              <Pressable key={c.title} style={s.courseCard}>
                <View style={s.courseThumbnail}>
                  <LinearGradient
                    colors={["rgba(108,99,255,0.35)", "rgba(13,13,20,0.6)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons
                    name="code-slash-outline"
                    size={36}
                    color="rgba(196,192,255,0.3)"
                    style={s.thumbnailIcon}
                  />
                  <View style={s.levelBadge}>
                    <Text style={[s.levelText, { color: c.levelColor }]}>{c.level}</Text>
                  </View>
                </View>
                <View style={s.courseBody}>
                  <Text style={s.courseTitle}>{c.title}</Text>
                  <Text style={s.courseDesc}>{c.desc}</Text>
                  <View style={s.courseFooter}>
                    <Text style={s.courseLessons}>{c.lessons} Lessons</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.outline} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
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

  // Header
  header: {
    position:          "absolute",
    top:               0,
    left:              0,
    right:             0,
    zIndex:            50,
    flexDirection:     "row",
    alignItems:        "flex-end",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(19,18,27,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  greeting: {
    flex:          1,
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  notifBtn: {
    width:    40,
    height:   40,
    alignItems:     "center",
    justifyContent: "center",
  },
  notifDot: {
    position:        "absolute",
    top:             8,
    right:           8,
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.error,
  },

  scroll: {
    paddingHorizontal: 16,
    gap:               24,
  },

  // Streak Banner
  streakBanner: {
    borderRadius: 20,
    padding:      16,
    overflow:     "hidden",
  },
  streakRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    zIndex:         1,
  },
  streakTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         "#1b0091",
  },
  streakSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      "rgba(27,0,145,0.8)",
    marginTop:  2,
  },
  xpBadge: {
    backgroundColor:   "rgba(255,255,255,0.25)",
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   6,
  },
  xpText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         "#1b0091",
  },
  flameWrap: {
    position: "absolute",
    right:    -16,
    bottom:   -16,
    opacity:  0.1,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           16,
  },
  statCard: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },
  statValue: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },

  // Sections
  section:    { gap: 8 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  seeAll: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 1,
    color:         colors.primary,
    textTransform: "uppercase",
  },

  // Continue Learning
  continueLearningCard: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius:    20,
    padding:         16,
    gap:             16,
  },
  clRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  clIconBox: {
    width:           48,
    height:          48,
    borderRadius:    12,
    backgroundColor: colors.surfaceContainer,
    alignItems:      "center",
    justifyContent:  "center",
  },
  clInfo:  { flex: 1, gap: 2 },
  clTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  clModule: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },
  clPct: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.primary,
  },
  progressTrack: {
    height:          8,
    backgroundColor: colors.surfaceHighest,
    borderRadius:    4,
    overflow:        "hidden",
  },
  progressFill: {
    height:       "100%",
    borderRadius: 4,
  },

  // Horizontal scroll container
  hScroll: {
    gap:               16,
    paddingHorizontal: 2,
  },

  // Roadmap nodes
  roadmapNode: {
    width:           140,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    alignItems:      "center",
    gap:             8,
  },
  roadmapNodeActive: {
    borderColor: colors.primary,
  },
  roadmapNodeLocked: {
    opacity: 0.5,
  },
  roadmapIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(196,192,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  roadmapIconDone: {
    backgroundColor: "rgba(196,192,255,0.2)",
  },
  roadmapIconActive: {
    backgroundColor: colors.primary,
  },
  roadmapLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.8,
    color:         colors.text,
    textAlign:     "center",
    textTransform: "uppercase",
  },

  // Course cards
  courseCard: {
    width:           260,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    overflow:        "hidden",
  },
  courseThumbnail: {
    height:          128,
    backgroundColor: colors.surfaceContainer,
    alignItems:      "center",
    justifyContent:  "center",
  },
  thumbnailIcon: {
    position: "absolute",
  },
  levelBadge: {
    position:          "absolute",
    bottom:            8,
    left:              8,
    backgroundColor:   "rgba(19,18,27,0.85)",
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  levelText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.8,
  },
  courseBody: {
    padding: 16,
    gap:     4,
  },
  courseTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  courseDesc: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
    marginTop:  2,
  },
  courseFooter: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginTop:      12,
  },
  courseLessons: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.secondary,
  },
});
