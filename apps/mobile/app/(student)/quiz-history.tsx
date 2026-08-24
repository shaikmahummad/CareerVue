import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../lib/api";
import { colors } from "../../constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttemptSummary {
  id: string;
  quiz_id: string;
  goal: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  time_taken_secs: number | null;
  completed_at: string;
  roadmap_id: string | null;
}

interface QuestionDetail {
  id: string;
  topic: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string | null;
  your_answer: string | null;
  is_correct: boolean;
}

interface AttemptDetail {
  id: string;
  goal: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  completed_at: string;
  questions: QuestionDetail[];
}

type Screen = "list" | "detail";

const OPTIONS = ["A", "B", "C", "D"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatTime(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function scoreColor(pct: number): string {
  if (pct >= 75) return colors.success;
  if (pct >= 50) return colors.warning;
  return colors.error;
}

function scoreBg(pct: number): string {
  if (pct >= 75) return "rgba(0,229,160,0.12)";
  if (pct >= 50) return "rgba(255,184,0,0.12)";
  return "rgba(255,180,171,0.12)";
}

function trendIcon(current: number, prev: number | null): { name: "trending-up" | "trending-down" | "remove"; color: string } | null {
  if (prev === null) return null;
  if (current > prev) return { name: "trending-up",   color: colors.success };
  if (current < prev) return { name: "trending-down", color: colors.error };
  return { name: "remove", color: colors.textVariant };
}

// ─── Attempt list item ───────────────────────────────────────────────────────

function AttemptCard({
  attempt,
  prevScore,
  onPress,
  onViewRoadmap,
}: {
  attempt: AttemptSummary;
  prevScore: number | null;
  onPress: () => void;
  onViewRoadmap?: () => void;
}) {
  const trend = trendIcon(attempt.score, prevScore);

  return (
    <Pressable style={s.attemptCard} onPress={onPress}>
      {/* Header row */}
      <View style={s.attemptHeader}>
        <View style={s.attemptGoalWrap}>
          <Text style={s.attemptGoal} numberOfLines={1}>{attempt.goal}</Text>
          <Text style={s.attemptDate}>{formatDate(attempt.completed_at)}</Text>
        </View>

        {/* Score badge */}
        <View style={[s.scoreBadge, { backgroundColor: scoreBg(attempt.score) }]}>
          {trend && (
            <Ionicons name={trend.name} size={12} color={trend.color} style={{ marginRight: 2 }} />
          )}
          <Text style={[s.scoreText, { color: scoreColor(attempt.score) }]}>
            {Math.round(attempt.score)}%
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={[s.chip, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
          <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
          <Text style={[s.chipText, { color: colors.success }]}>
            {attempt.correct_count} correct
          </Text>
        </View>
        <View style={[s.chip, { backgroundColor: "rgba(255,180,171,0.1)" }]}>
          <Ionicons name="close-circle-outline" size={12} color={colors.error} />
          <Text style={[s.chipText, { color: colors.error }]}>
            {attempt.wrong_count} wrong
          </Text>
        </View>
        {attempt.time_taken_secs != null && (
          <View style={[s.chip, { backgroundColor: colors.surfaceContainer }]}>
            <Ionicons name="time-outline" size={12} color={colors.textVariant} />
            <Text style={[s.chipText, { color: colors.textVariant }]}>
              {formatTime(attempt.time_taken_secs)}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={s.attemptFooter}>
        <Text style={s.viewDetail}>Tap to view answers</Text>
        {attempt.roadmap_id && onViewRoadmap && (
          <Pressable style={s.roadmapBtn} onPress={(e) => { e.stopPropagation?.(); onViewRoadmap(); }}>
            <Ionicons name="map-outline" size={12} color={colors.primary} />
            <Text style={s.roadmapBtnText}>View Roadmap</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function DetailView({
  attemptId,
  onBack,
}: {
  attemptId: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [detail,  setDetail]  = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AttemptDetail>(`/api/v1/quiz/attempt/${attemptId}`)
      .then(setDetail)
      .catch(() => Alert.alert("Error", "Failed to load attempt details"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!detail) return null;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Pressable hitSlop={12} onPress={onBack} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{detail.goal}</Text>
        <View style={s.headerRight}>
          <Text style={[s.headerScore, { color: scoreColor(detail.score) }]}>
            {Math.round(detail.score)}%
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 56 + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary row */}
        <View style={s.summaryRow}>
          <View style={[s.summaryChip, { backgroundColor: "rgba(0,229,160,0.12)" }]}>
            <Text style={[s.summaryChipNum, { color: colors.success }]}>{detail.correct_count}</Text>
            <Text style={[s.summaryChipLabel, { color: colors.success }]}>Correct</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: "rgba(255,180,171,0.12)" }]}>
            <Text style={[s.summaryChipNum, { color: colors.error }]}>{detail.wrong_count}</Text>
            <Text style={[s.summaryChipLabel, { color: colors.error }]}>Incorrect</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[s.summaryChipNum, { color: colors.textVariant }]}>{detail.total_questions}</Text>
            <Text style={[s.summaryChipLabel, { color: colors.textVariant }]}>Total</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Questions & Answers</Text>

        {(detail.questions ?? []).map((q, idx) => {
          const isCorrect = q.is_correct;
          const selected  = q.your_answer ?? null;
          const correct   = q.correct_answer;

          return (
            <View key={q.id} style={s.questionCard}>
              {/* Question header */}
              <View style={s.questionHeader}>
                <View style={[s.qNum, { backgroundColor: isCorrect ? "rgba(0,229,160,0.15)" : "rgba(255,180,171,0.15)" }]}>
                  <Text style={[s.qNumText, { color: isCorrect ? colors.success : colors.error }]}>
                    Q{idx + 1}
                  </Text>
                </View>
                <View style={s.questionTopicWrap}>
                  <Text style={s.questionTopic}>{q.topic}</Text>
                </View>
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={isCorrect ? colors.success : colors.error}
                />
              </View>

              {/* Question text */}
              <Text style={s.questionText}>{q.question}</Text>

              {/* Options */}
              <View style={s.optionsWrap}>
                {OPTIONS.map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrectOpt = correct === opt;
                  let bg: string = colors.surfaceContainer;
                  let border: string = "transparent";
                  let textCol: string = colors.textVariant;

                  if (isCorrectOpt) {
                    bg     = "rgba(0,229,160,0.12)";
                    border = colors.success;
                    textCol = colors.success;
                  } else if (isSelected && !isCorrect) {
                    bg     = "rgba(255,180,171,0.12)";
                    border = colors.error;
                    textCol = colors.error;
                  }

                  return (
                    <View
                      key={opt}
                      style={[s.optionRow, { backgroundColor: bg, borderColor: border, borderWidth: isCorrectOpt || (isSelected && !isCorrect) ? 1 : 0 }]}
                    >
                      <View style={[s.optionLabel, {
                        backgroundColor: isCorrectOpt ? colors.success : (isSelected && !isCorrect) ? colors.error : colors.surfaceHighest,
                      }]}>
                        <Text style={[s.optionLabelText, {
                          color: isCorrectOpt || (isSelected && !isCorrect) ? colors.bg : colors.textVariant,
                        }]}>
                          {opt}
                        </Text>
                      </View>
                      <Text style={[s.optionText, { color: textCol }]} numberOfLines={3}>
                        {q.options[opt as keyof typeof q.options]}
                      </Text>
                      {isCorrectOpt && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      )}
                      {isSelected && !isCorrect && (
                        <Ionicons name="close-circle" size={16} color={colors.error} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Explanation */}
              {q.explanation ? (
                <View style={s.explanationWrap}>
                  <Ionicons name="bulb-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={s.explanationText}>{q.explanation}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function QuizHistoryScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [screen,    setScreen]    = useState<Screen>("list");
  const [attempts,  setAttempts]  = useState<AttemptSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AttemptSummary[]>("/api/v1/quiz/my-attempts")
      .then((data) => {
        // Sort most recent first
        const sorted = [...data].sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        setAttempts(sorted);
      })
      .catch(() => Alert.alert("Error", "Failed to load quiz history"))
      .finally(() => setLoading(false));
  }, []);

  if (screen === "detail" && selectedId) {
    return <DetailView attemptId={selectedId} onBack={() => setScreen("list")} />;
  }

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>Quiz History</Text>
        <View style={s.headerRight} />
      </View>

      {attempts.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={56} color={colors.surfaceHighest} />
          <Text style={s.emptyTitle}>No attempts yet</Text>
          <Text style={s.emptySubtitle}>Take your first quiz to see your history here</Text>
          <Pressable style={s.emptyBtn} onPress={() => router.push("/(student)/quiz" as any)}>
            <Text style={s.emptyBtnText}>Take a Quiz</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 56 + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.pageTitle}>Quiz History</Text>
          <Text style={s.pageSubtitle}>{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</Text>

          {attempts.map((attempt, idx) => {
            // prevScore: the score of the OLDER attempt just before this one in time
            // Since sorted most-recent first, "previous" means idx+1
            const prevScore = idx < attempts.length - 1 ? attempts[idx + 1].score : null;
            return (
              <AttemptCard
                key={attempt.id}
                attempt={attempt}
                prevScore={prevScore}
                onPress={() => {
                  setSelectedId(attempt.id);
                  setScreen("detail");
                }}
                onViewRoadmap={
                  attempt.roadmap_id
                    ? () => router.push("/(student)/roadmap" as any)
                    : undefined
                }
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  // Header — height is set inline as insets.top + 56
  header: {
    position:          "absolute",
    top: 0, left: 0, right: 0,
    zIndex:            50,
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(5,5,8,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:      { width: 32, alignItems: "flex-start" },
  headerTitle: {
    flex:          1,
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      17,
    lineHeight:    22,
    letterSpacing: -0.2,
    color:         colors.text,
    textAlign:     "center",
  },
  headerRight: { width: 32, alignItems: "flex-end" },
  headerScore: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      14,
    letterSpacing: 0.5,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingBottom:     40,
    gap:               12,
  },

  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    marginBottom:  2,
  },
  pageSubtitle: {
    fontFamily:  "HankenGrotesk_400Regular",
    fontSize:    14,
    lineHeight:  20,
    color:       colors.textVariant,
    marginBottom: 8,
  },

  // Attempt card
  attemptCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             10,
  },
  attemptHeader: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            8,
  },
  attemptGoalWrap: { flex: 1 },
  attemptGoal: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      16,
    lineHeight:    22,
    letterSpacing: -0.2,
    color:         colors.text,
    marginBottom:  2,
  },
  attemptDate: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    lineHeight: 16,
    color:      colors.textVariant,
  },
  scoreBadge: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:   12,
  },
  scoreText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      16,
    letterSpacing: 0.5,
    fontWeight:    "700" as const,
  },

  statsRow: {
    flexDirection: "row",
    gap:           8,
    flexWrap:      "wrap" as const,
  },
  chip: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:   8,
  },
  chipText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   11,
    lineHeight: 14,
  },

  attemptFooter: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  viewDetail: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    color:      colors.textVariant,
  },
  roadmapBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "rgba(196,192,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      8,
  },
  roadmapBtnText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   12,
    color:      colors.primary,
  },

  // Empty state
  emptyTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    26,
    letterSpacing: -0.2,
    color:         colors.text,
    marginTop:     16,
    marginBottom:  6,
  },
  emptySubtitle: {
    fontFamily:  "HankenGrotesk_400Regular",
    fontSize:    14,
    lineHeight:  20,
    color:       colors.textVariant,
    textAlign:   "center",
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor:   colors.primary,
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      14,
  },
  emptyBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   14,
    color:      colors.onPrimary,
  },

  // Detail view
  summaryRow: {
    flexDirection:  "row",
    gap:            12,
    marginBottom:   20,
  },
  summaryChip: {
    flex:           1,
    alignItems:     "center",
    paddingVertical: 12,
    borderRadius:   14,
    gap:            4,
  },
  summaryChipNum: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      22,
    letterSpacing: 0.5,
    fontWeight:    "700" as const,
  },
  summaryChipLabel: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   11,
  },

  sectionLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    marginBottom:  12,
  },

  // Question card
  questionCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    marginBottom:    12,
    gap:             12,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  qNum: {
    width:          30,
    height:         30,
    borderRadius:   9,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  qNumText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
  },
  questionTopicWrap: { flex: 1 },
  questionTopic: {
    fontFamily:    "HankenGrotesk_500Medium",
    fontSize:      12,
    color:         colors.textVariant,
    letterSpacing: 0.1,
  },
  questionText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      15,
    lineHeight:    22,
    letterSpacing: -0.1,
    color:         colors.text,
  },

  optionsWrap: { gap: 8 },
  optionRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderRadius:      12,
  },
  optionLabel: {
    width:          24,
    height:         24,
    borderRadius:   7,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  optionLabelText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
  },
  optionText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 19,
    flex:       1,
  },

  explanationWrap: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    backgroundColor: "rgba(196,192,255,0.08)",
    borderRadius:    12,
    padding:         10,
  },
  explanationText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 19,
    color:      colors.textVariant,
    flex:       1,
  },
});
