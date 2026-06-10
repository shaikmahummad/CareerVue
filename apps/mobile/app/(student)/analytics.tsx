import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_W   = width - 32 - 32; // screen pad - card pad

interface QuizAttempt {
  id:           string;
  score_pct:    number;
  total_q:      number;
  career_goal:  string | null;
  created_at:   string;
  skill_scores?: Record<string, number>;
}

interface StudentStats {
  xp:        number;
  streak:    number;
  enrolled:  number;
  completed: number;
  [key: string]: any;
}

export default function StudentAnalytics() {
  const insets = useSafeAreaInsets();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [profile,  setProfile]  = useState<StudentStats | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<QuizAttempt[]>("/api/v1/quiz/history").catch(() => []),
      apiGet<StudentStats>("/api/v1/students/profile").catch(() => null),
    ]).then(([att, prof]) => {
      setAttempts(att ?? []);
      setProfile(prof);
    }).finally(() => setLoading(false));
  }, []);

  const bestScore   = attempts.length ? Math.max(...attempts.map((a) => a.score_pct)) : 0;
  const avgScore    = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score_pct, 0) / attempts.length)
    : 0;
  const topicScores = aggregateTopics(attempts);
  const recent12    = attempts.slice(-12).reverse();

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    insets.top + 16,
          paddingBottom: TAB_BAR_HEIGHT + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Analytics</Text>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard icon="document-text-outline" color={colors.primary} label="Quizzes" value={String(attempts.length)} />
          <StatCard icon="trophy-outline"        color={colors.tertiary}  label="Best Score" value={`${bestScore}%`} />
          <StatCard icon="analytics-outline"     color={colors.secondary} label="Avg Score"  value={`${avgScore}%`} />
          <StatCard icon="library-outline"       color={colors.success}   label="Enrolled"   value={String(profile?.enrolled ?? "—")} />
        </View>

        {/* ── Score Progression ─────────────────────────────────────── */}
        {recent12.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Score Progression</Text>
            <View style={s.card}>
              <ScoreChart attempts={recent12} chartW={CHART_W} />
              <View style={s.chartFooter}>
                <Text style={s.chartFooterText}>Last {recent12.length} quiz attempts</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Skill Breakdown ───────────────────────────────────────── */}
        {topicScores.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Skill Breakdown</Text>
            <View style={s.card}>
              {topicScores.map(({ topic, score, level }) => (
                <View key={topic} style={s.skillRow}>
                  <View style={s.skillLabel}>
                    <Text style={s.skillName} numberOfLines={1}>{topic}</Text>
                    <Text style={[s.skillLevel, { color: levelColor(level) }]}>{level}</Text>
                  </View>
                  <View style={s.skillBarTrack}>
                    <View style={[s.skillBarFill, { width: `${score}%`, backgroundColor: levelColor(level) }]} />
                  </View>
                  <Text style={s.skillPct}>{score}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── XP & Streaks ──────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Learning Stats</Text>
        <View style={s.statsCard}>
          <Row icon="flash-outline"     color={colors.primary}  label="XP Points"     value={String(profile?.xp ?? "—")} />
          <Row icon="flame-outline"     color={colors.tertiary}  label="Day Streak"    value={`${profile?.streak ?? "—"} days`} borderTop />
          <Row icon="checkmark-circle-outline" color={colors.success}  label="Completed"  value={String(profile?.completed ?? "—")} borderTop />
        </View>

        {/* ── AI Recommendation ─────────────────────────────────────── */}
        {topicScores.length > 0 && (() => {
          const weakest = topicScores.slice(-1)[0];
          return (
            <View style={s.aiCard}>
              <View style={s.aiHeader}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={s.aiLabel}>AI Recommendation</Text>
              </View>
              <Text style={s.aiText}>
                Your weakest area is{" "}
                <Text style={s.aiHighlight}>{weakest.topic}</Text>
                {" "}({weakest.score}%). Focus on this topic to improve your overall score.
              </Text>
            </View>
          );
        })()}

        {attempts.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="analytics-outline" size={48} color={colors.textVariant} style={{ opacity: 0.3 }} />
            <Text style={s.emptyTitle}>No quiz data yet</Text>
            <Text style={s.emptySub}>Take a skill assessment to see your analytics</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function aggregateTopics(attempts: QuizAttempt[]) {
  const map: Record<string, number[]> = {};
  attempts.forEach((a) => {
    if (!a.skill_scores) return;
    Object.entries(a.skill_scores).forEach(([k, v]) => {
      if (!map[k]) map[k] = [];
      map[k].push(v);
    });
  });
  return Object.entries(map)
    .map(([topic, scores]) => {
      const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { topic, score, level: scoreLevel(score) };
    })
    .sort((a, b) => b.score - a.score);
}

function scoreLevel(pct: number) {
  if (pct >= 75) return "Strong";
  if (pct >= 45) return "Intermediate";
  return "Weak";
}

function levelColor(level: string) {
  if (level === "Strong") return colors.success;
  if (level === "Intermediate") return colors.warning;
  return colors.error;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={sc.statCard}>
      <View style={[sc.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={sc.statValue}>{value}</Text>
      <Text style={sc.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, color, label, value, borderTop }: {
  icon: any; color: string; label: string; value: string; borderTop?: boolean;
}) {
  return (
    <View style={[sc.row, borderTop && sc.rowBorder]}>
      <View style={[sc.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={sc.rowLabel}>{label}</Text>
      <Text style={sc.rowValue}>{value}</Text>
    </View>
  );
}

function ScoreChart({ attempts, chartW }: { attempts: QuizAttempt[]; chartW: number }) {
  const H       = 100;
  const barW    = Math.max(8, Math.floor((chartW - 8) / attempts.length) - 4);
  const maxScore = 100;

  return (
    <Svg width={chartW} height={H}>
      <G>
        {attempts.map((a, i) => {
          const barH = Math.max(4, Math.round((a.score_pct / maxScore) * (H - 16)));
          const x    = i * (barW + 4);
          const y    = H - 16 - barH;
          const fill = a.score_pct >= 75
            ? colors.success
            : a.score_pct >= 45
            ? colors.warning
            : colors.error;
          return (
            <G key={a.id}>
              <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={fill} fillOpacity={0.8} />
              <SvgText
                x={x + barW / 2}
                y={H - 2}
                textAnchor="middle"
                fontSize={8}
                fill={colors.textVariant}
                opacity={0.5}
              >
                {`${a.score_pct}%`}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: 16, gap: 12 },

  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    marginBottom:  4,
  },

  statsRow: { flexDirection: "row", gap: 8 },

  sectionTitle: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    marginTop:     8,
    marginLeft:    4,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             0,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    overflow:        "hidden",
  },
  chartFooter: { marginTop: 8 },
  chartFooterText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
    opacity:    0.5,
    textAlign:  "center",
  },

  skillRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skillLabel: { width: 110 },
  skillName:  { fontFamily: "HankenGrotesk_500Medium", fontSize: 13, color: colors.text },
  skillLevel: { fontFamily: "JetBrainsMono_500Medium", fontSize: 10, letterSpacing: 0.3, marginTop: 1 },
  skillBarTrack: {
    flex:            1,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.surfaceContainer,
    overflow:        "hidden",
  },
  skillBarFill:  { height: 6, borderRadius: 3 },
  skillPct: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    color:         colors.textVariant,
    width:         34,
    textAlign:     "right",
  },

  aiCard: {
    backgroundColor: "rgba(196,192,255,0.06)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.15)",
    borderRadius:    20,
    padding:         16,
    gap:             8,
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiLabel:  { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 14, color: colors.primary },
  aiText:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 14, lineHeight: 21, color: colors.textVariant },
  aiHighlight: { fontFamily: "HankenGrotesk_600SemiBold", color: colors.text },

  empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyTitle: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 16, color: colors.text },
  emptySub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 13, color: colors.textVariant, textAlign: "center" },
});

const sc = StyleSheet.create({
  statCard: {
    flex:            1,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    16,
    padding:         12,
    gap:             4,
    alignItems:      "center",
  },
  statIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   2,
  },
  statValue: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      18,
    lineHeight:    23,
    letterSpacing: -0.3,
    color:         colors.text,
  },
  statLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      9,
    letterSpacing: 0.4,
    color:         colors.textVariant,
    textTransform: "uppercase",
    textAlign:     "center",
  },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontFamily: "HankenGrotesk_500Medium", fontSize: 14, color: colors.text },
  rowValue: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15, color: colors.primary, letterSpacing: -0.2 },
});
