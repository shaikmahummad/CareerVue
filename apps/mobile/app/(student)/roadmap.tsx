import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

interface RoadmapItem {
  id: string;
  topic: string;
  reason: string | null;
  priority: string;
  status: string;
  order_index: number;
  progress?: number;
}

interface Roadmap {
  id: string;
  goal: string;
  status: string;
  items: RoadmapItem[];
}

const STATUS_CYCLE: Record<string, string> = {
  pending:   "enrolled",
  enrolled:  "completed",
  completed: "pending",
};

const FALLBACK: Roadmap = {
  id: "fallback",
  goal: "Full Stack Developer",
  status: "active",
  items: [
    {
      id: "1", topic: "HTML/CSS Mastery",
      reason: "Semantic HTML, Flexbox, Grid, and Responsive Web Design principles.",
      priority: "high", status: "completed", order_index: 0,
    },
    {
      id: "2", topic: "React Fundamentals",
      reason: "Hooks, State Management, Component Lifecycle, and Virtual DOM.",
      priority: "high", status: "enrolled", order_index: 1, progress: 45,
    },
    {
      id: "3", topic: "Node.js Backend",
      reason: "Express.js frameworks, REST APIs, and Authentication flows.",
      priority: "medium", status: "pending", order_index: 2,
    },
    {
      id: "4", topic: "Database Architecture",
      reason: null, priority: "medium", status: "pending", order_index: 3,
    },
    {
      id: "5", topic: "Cloud Deployment",
      reason: null, priority: "low", status: "pending", order_index: 4,
    },
  ],
};

const RING_R      = 28;
const RING_CIRCUM = 2 * Math.PI * RING_R; // ≈ 175.9

type NodeType = "completed" | "active" | "upcoming" | "locked";

function getNodeType(item: RoadmapItem, items: RoadmapItem[]): NodeType {
  if (item.status === "completed") return "completed";
  if (item.status === "enrolled")  return "active";
  const firstPendingId = items.find(i => i.status === "pending")?.id;
  if (item.id === firstPendingId)  return "upcoming";
  return "locked";
}

export default function RoadmapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse  = useRef(new Animated.Value(0.4)).current;

  const [roadmap,      setRoadmap]      = useState<Roadmap | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<Roadmap>("/api/v1/roadmap/mine");
      setRoadmap(data);
    } catch {
      setRoadmap(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item: RoadmapItem) {
    if (!roadmap || toggling || roadmap.id === "fallback") return;
    const nextStatus = STATUS_CYCLE[item.status] ?? "pending";
    setToggling(item.id);
    try {
      await apiPut(`/api/v1/roadmap/${roadmap.id}/course/${item.id}/status`, { status: nextStatus });
      setRoadmap(prev =>
        prev
          ? { ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, status: nextStatus } : i) }
          : prev
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update");
    } finally {
      setToggling(null);
    }
  }

  async function handleRegenerate() {
    Alert.alert("Regenerate Roadmap", "This will replace your current roadmap. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Regenerate",
        onPress: async () => {
          setRegenerating(true);
          try {
            const data = await apiPost<Roadmap>("/api/v1/roadmap/generate");
            setRoadmap(data);
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to generate roadmap");
          } finally {
            setRegenerating(false);
          }
        },
      },
    ]);
  }

  const HEADER_H = insets.top + 44;

  if (loading || regenerating) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
        {regenerating && <Text style={s.loadingText}>Building your roadmap…</Text>}
      </View>
    );
  }

  if (!roadmap) return null;

  const items      = [...roadmap.items].sort((a, b) => a.order_index - b.order_index);
  const done       = items.filter(i => i.status === "completed").length;
  const total      = items.length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
  const dashOffset = RING_CIRCUM * (1 - pct / 100);

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}>
        <View style={s.headerLeft}>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>CareerVue</Text>
        </View>
        <Pressable hitSlop={12} onPress={handleRegenerate}>
          <Ionicons name="settings-outline" size={24} color={colors.textVariant} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    HEADER_H + 16,
          paddingBottom: TAB_BAR_HEIGHT + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large title */}
        <Text style={s.pageTitle}>My Roadmap</Text>

        {/* Active goal card */}
        <View style={s.goalCard}>
          <View style={s.goalInfo}>
            <Text style={s.goalLabel}>ACTIVE GOAL</Text>
            <Text style={s.goalTitle}>{roadmap.goal}</Text>
            <Text style={s.goalSub}>{done} of {total} modules completed</Text>
          </View>

          {/* Circular ring progress */}
          <View style={s.ringWrap}>
            <View style={{ transform: [{ rotate: "-90deg" }] }}>
              <Svg width={64} height={64} viewBox="0 0 64 64">
                <Circle
                  cx="32" cy="32" r={RING_R}
                  stroke={colors.surfaceHighest}
                  strokeWidth="4"
                  fill="none"
                />
                <Circle
                  cx="32" cy="32" r={RING_R}
                  stroke={colors.primary}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={RING_CIRCUM}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={s.ringOverlay}>
              <Text style={s.ringPct}>{pct}%</Text>
            </View>
          </View>
        </View>

        {/* Vertical timeline */}
        <View style={s.timeline}>
          <LinearGradient
            colors={["#c4c0ff", "#35343e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={s.timelineLine}
          />

          {items.map(item => {
            const type = getNodeType(item, items);

            return (
              <View key={item.id} style={s.timelineRow}>
                {/* Dot */}
                <View style={s.dotCol}>
                  {type === "completed" && (
                    <View style={s.dotCompleted}>
                      <Ionicons name="checkmark" size={9} color={colors.onPrimary} />
                    </View>
                  )}
                  {type === "active" && (
                    <View style={s.dotActive}>
                      <Animated.View style={[s.dotPulse, { opacity: pulse }]} />
                    </View>
                  )}
                  {type === "upcoming" && <View style={s.dotUpcoming} />}
                  {type === "locked" && (
                    <View style={s.dotLocked}>
                      <Ionicons name="lock-closed" size={7} color={colors.textVariant} />
                    </View>
                  )}
                </View>

                {/* Card */}
                <Pressable
                  style={s.cardCol}
                  onPress={() => handleToggle(item)}
                  disabled={toggling !== null || roadmap.id === "fallback"}
                >
                  {type === "completed" && (
                    <View style={[s.card, s.cardCompleted]}>
                      <View style={s.cardHead}>
                        <Text style={s.cardTitle} numberOfLines={1}>{item.topic}</Text>
                        <Text style={s.badgeDone}>COMPLETED</Text>
                      </View>
                      {item.reason ? <Text style={s.cardBody}>{item.reason}</Text> : null}
                    </View>
                  )}

                  {type === "active" && (
                    <View style={[s.card, s.cardActive]}>
                      <View style={s.watermark} pointerEvents="none">
                        <Ionicons name="flash" size={56} color={colors.primary} />
                      </View>
                      <View style={s.cardHead}>
                        <Text style={[s.cardTitle, s.titleActive]} numberOfLines={1}>{item.topic}</Text>
                        <View style={s.badgeInProgressWrap}>
                          <Text style={s.badgeInProgress}>IN PROGRESS</Text>
                        </View>
                      </View>
                      {item.reason ? <Text style={s.cardBody}>{item.reason}</Text> : null}
                      <View style={s.progTrack}>
                        <View style={[s.progFill, { width: `${item.progress ?? 45}%` as any }]} />
                      </View>
                    </View>
                  )}

                  {type === "upcoming" && (
                    <View style={s.card}>
                      <View style={s.cardHead}>
                        <Text style={s.cardTitle} numberOfLines={1}>{item.topic}</Text>
                        <Text style={s.badgeUpcoming}>UPCOMING</Text>
                      </View>
                      {item.reason ? <Text style={s.cardBody}>{item.reason}</Text> : null}
                    </View>
                  )}

                  {type === "locked" && (
                    <View style={[s.card, s.cardLocked]}>
                      <View style={s.lockRow}>
                        <Ionicons name="lock-closed" size={18} color={colors.textVariant} />
                        <Text style={[s.cardTitle, { color: colors.textVariant }]} numberOfLines={1}>
                          {item.topic}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  // Header
  header: {
    position:          "absolute",
    top: 0, left: 0, right: 0,
    zIndex:            50,
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(19,18,27,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },

  scroll: { paddingHorizontal: 16, gap: 24 },

  // Page title
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         colors.text,
  },

  // Goal card
  goalCard: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             16,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
  },
  goalInfo:  { flex: 1, gap: 4 },
  goalLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  goalTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.text,
  },
  goalSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
  },
  ringWrap: {
    width:          64,
    height:         64,
    alignItems:     "center",
    justifyContent: "center",
  },
  ringOverlay: {
    position:       "absolute",
    width:          64,
    height:         64,
    alignItems:     "center",
    justifyContent: "center",
  },
  ringPct: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.primary,
  },

  // Timeline
  timeline:     { position: "relative" },
  timelineLine: {
    position:     "absolute",
    left:         15,
    top:          18,
    bottom:       18,
    width:        2,
    borderRadius: 1,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    marginBottom:  16,
  },
  dotCol: {
    width:          32,
    alignItems:     "center",
    paddingTop:     4,
    zIndex:         2,
  },
  cardCol: { flex: 1 },

  // Dots
  dotCompleted: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: colors.primary,
    borderWidth:     3,
    borderColor:     colors.bg,
    alignItems:      "center",
    justifyContent:  "center",
  },
  dotActive: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: colors.primary,
    borderWidth:     3,
    borderColor:     colors.bg,
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     colors.primary,
    shadowOpacity:   0.5,
    shadowRadius:    8,
    elevation:       8,
  },
  dotPulse: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.onPrimary,
  },
  dotUpcoming: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: colors.surfaceHighest,
    borderWidth:     3,
    borderColor:     colors.bg,
  },
  dotLocked: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: colors.surfaceContainer,
    borderWidth:     3,
    borderColor:     colors.bg,
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Cards
  card: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             8,
  },
  cardCompleted: { opacity: 0.6 },
  cardActive: {
    borderColor: "rgba(196,192,255,0.3)",
    overflow:    "hidden",
    shadowColor:    colors.primary,
    shadowOpacity:  0.15,
    shadowRadius:   20,
    elevation:      8,
  },
  cardLocked: {
    backgroundColor: "rgba(27,27,36,0.4)",
    borderColor:     "rgba(255,255,255,0.05)",
    opacity:         0.4,
  },
  watermark: {
    position: "absolute",
    top:      8,
    right:    8,
    opacity:  0.15,
  },
  cardHead: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            8,
  },
  lockRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  cardTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
    flex:          1,
  },
  titleActive: { color: colors.primary },
  cardBody: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
  },

  // Badges
  badgeDone: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    flexShrink:    0,
  },
  badgeInProgressWrap: {
    backgroundColor:  "rgba(196,192,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:     999,
    flexShrink:       0,
  },
  badgeInProgress: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  badgeUpcoming: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
    flexShrink:    0,
  },

  // Progress bar (active card)
  progTrack: {
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.surfaceContainer,
    overflow:        "hidden",
  },
  progFill: {
    height:          "100%" as any,
    backgroundColor: colors.primary,
    borderRadius:    3,
  },

  // Loading
  loadingText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
    marginTop:  12,
  },
});
