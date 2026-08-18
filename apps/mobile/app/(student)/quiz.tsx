import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  topic: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  difficulty: string;
}

interface QuizTemplate {
  id: string;
  goal: string;
  questions: Question[];
  total_questions: number;
}

interface SkillAssessment {
  topic: string;
  level: string;
  score_pct: number;
  correct_count: number;
  total_count: number;
}

interface SubmitResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  skill_assessments: SkillAssessment[];
}

type QuizState =
  | "init"        // loading profile
  | "improvement" // has goal, show start button
  | "goal"        // no goal, enter goal
  | "loading"     // loading quiz template
  | "quiz"
  | "submitting"
  | "results"
  | "generating"
  | "done";

const POPULAR_GOALS = [
  "Full Stack Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Cybersecurity Analyst",
  "Cloud Architect",
  "Product Manager",
];

const OPTIONS = ["A", "B", "C", "D"] as const;
type OptionKey = typeof OPTIONS[number];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const isChangingGoal = change === "1";

  const [state,        setState]        = useState<QuizState>("init");
  const [goal,         setGoal]         = useState("");
  const [existingGoal, setExistingGoal] = useState<string | null>(null);
  const [fullName,     setFullName]     = useState("");
  const [template,     setTemplate]     = useState<QuizTemplate | null>(null);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState<Record<string, OptionKey>>({});
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [attemptId,    setAttemptId]    = useState<string | null>(null);
  const [error,        setError]        = useState("");

  // ── On mount: load profile to check for existing goal ─────────────────────

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet<{ career_goal: string | null; full_name: string }>(
        "/api/v1/students/profile"
      );
      setFullName(data.full_name ?? "");
      if (data.career_goal) {
        setExistingGoal(data.career_goal);
        setGoal(data.career_goal);
        if (isChangingGoal) {
          setState("goal");
        } else {
          setState("improvement");
        }
      } else {
        setState("goal");
      }
    } catch {
      setState("goal");
    }
  }

  // ── Load quiz template for a given goal ────────────────────────────────────

  async function loadQuiz(goalStr: string) {
    setState("loading");
    setError("");
    try {
      const data = await apiGet<QuizTemplate>(
        `/api/v1/quiz/template/${encodeURIComponent(goalStr)}`
      );
      setTemplate(data);
      setCurrent(0);
      setAnswers({});
      setState("quiz");
    } catch (e: any) {
      setError(e.message ?? "Failed to load quiz");
      setState(existingGoal ? "improvement" : "goal");
    }
  }

  // ── Goal screen: start quiz ────────────────────────────────────────────────

  async function handleStartQuizFromGoal() {
    const trimmed = goal.trim();
    if (!trimmed) { Alert.alert("Please enter a career goal"); return; }
    // Save goal to DB so roadmap generation can use it later
    try { await apiPut("/api/v1/students/goal", { career_goal: trimmed }); } catch { /* non-fatal */ }
    await loadQuiz(trimmed);
  }

  // ── Improvement screen: start assessment for existing goal ─────────────────

  async function handleStartAssessment() {
    if (existingGoal) await loadQuiz(existingGoal);
  }

  // ── Answer a question ──────────────────────────────────────────────────────

  function handleAnswer(option: OptionKey) {
    if (!template) return;
    const q = template.questions[current];
    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);
    if (current < template.questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      handleSubmit(newAnswers);
    }
  }

  // ── Submit quiz ────────────────────────────────────────────────────────────

  async function handleSubmit(finalAnswers: Record<string, OptionKey>) {
    if (!template) return;
    setError("");
    setState("submitting");
    try {
      const payload = {
        quiz_id: template.id,
        answers: Object.entries(finalAnswers).map(([question_id, selected_option]) => ({
          question_id, selected_option,
        })),
      };
      const result = await apiPost<SubmitResult>("/api/v1/quiz/attempt", payload);
      setSubmitResult(result);
      setAttemptId(result.attempt_id);
      setState("results");
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? `Your answers were not saved: ${e.message}`
          : "Your answers were not saved. Please try again."
      );
      // Keep the completed answers and return to the final question so the
      // student can retry without receiving a fabricated result.
      setState("quiz");
    }
  }

  // ── Generate roadmap ───────────────────────────────────────────────────────

  async function handleGenerateRoadmap() {
    setState("generating");
    try {
      const body: Record<string, string> = {};
      if (attemptId) body.attempt_id = attemptId;
      await apiPost("/api/v1/roadmap/generate", body);
      setState("done");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to generate roadmap");
      setState("results");
    }
  }

  // ── Compute totals from skill_assessments ─────────────────────────────────

  function getTotals() {
    if (!submitResult) return { correct: 0, incorrect: 0, total: 0 };
    const assessments = submitResult.skill_assessments ?? [];
    if (assessments.length > 0) {
      const correct = assessments.reduce((sum, sa) => sum + (sa.correct_count ?? 0), 0);
      const total   = submitResult.total_questions || assessments.reduce((sum, sa) => sum + (sa.total_count ?? 0), 0);
      return { correct, incorrect: total - correct, total };
    }
    // fallback
    const total   = submitResult.total_questions || Object.keys(answers).length;
    const correct = Math.round((submitResult.score / 100) * total);
    return { correct, incorrect: total - correct, total };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── INIT ─────────────────────────────────────────────────────────────────────

  if (state === "init") {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── IMPROVEMENT MODE ──────────────────────────────────────────────────────

  if (state === "improvement") {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.pageTitle}>Assessment</Text>
          <Text style={s.pageSubtitle}>
            Retake your quiz to track improvement. Each attempt gets harder as you grow.
          </Text>

          {/* Current goal card */}
          <View style={s.goalCard}>
            <View style={s.goalCardRow}>
              <View style={s.goalIconWrap}>
                <Ionicons name="briefcase-outline" size={15} color={colors.onPrimary} />
              </View>
              <Text style={s.goalCardLabel}>Your Goal</Text>
            </View>
            <Text style={s.goalCardTitle}>{existingGoal}</Text>
            <Text style={s.goalCardSub}>
              Questions adapt to your skill level with every attempt
            </Text>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable style={[s.primaryBtn, { flexDirection: "row", justifyContent: "center", gap: 6 }]} onPress={handleStartAssessment}>
            <Ionicons name="flash" size={16} color={colors.onPrimary} />
            <Text style={s.primaryBtnText}>Start Assessment</Text>
          </Pressable>

          <Pressable
            style={s.secondaryBtn}
            onPress={() => router.push("/(student)/quiz-history" as any)}
          >
            <Text style={s.secondaryBtnText}>View Past Results</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── GOAL ENTRY (no existing goal) ─────────────────────────────────────────

  if (state === "goal") {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.pageTitle}>{isChangingGoal ? "Change Goal" : "Skill Quiz"}</Text>
          <Text style={s.pageSubtitle}>
            {isChangingGoal
              ? "Enter your new goal. Your current roadmap will be archived."
              : "Enter your career goal and we'll generate a personalized assessment."}
          </Text>

          <Text style={s.fieldLabel}>Your Career Goal</Text>
          <TextInput
            style={s.textInput}
            placeholder="e.g. Full Stack Developer"
            placeholderTextColor={colors.textVariant}
            value={goal}
            onChangeText={setGoal}
            returnKeyType="done"
            onSubmitEditing={handleStartQuizFromGoal}
          />

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable style={[s.primaryBtn, { marginBottom: 24 }]} onPress={handleStartQuizFromGoal}>
            <Text style={s.primaryBtnText}>Start Quiz</Text>
          </Pressable>

          <Text style={s.popularLabel}>Popular Goals</Text>
          <View style={s.goalChipsWrap}>
            {POPULAR_GOALS.map((g) => (
              <Pressable
                key={g}
                style={[s.goalChip, goal === g && s.goalChipSelected]}
                onPress={() => setGoal(g)}
              >
                <Text style={[s.goalChipText, goal === g && s.goalChipTextSelected]}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── LOADING / SUBMITTING / GENERATING ─────────────────────────────────────

  if (state === "loading" || state === "submitting" || state === "generating") {
    const msg =
      state === "loading"    ? "Generating your quiz…" :
      state === "submitting" ? "Scoring your answers…" :
                               "Building your roadmap…";
    return (
      <View style={[s.root, s.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>{msg}</Text>
      </View>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────

  if (state === "quiz" && template) {
    const q     = template.questions[current];
    const total = template.questions.length;
    const pct   = (current / total) * 100;

    return (
      <View style={s.root}>
        <StatusBar style="light" />

        {/* Progress header */}
        <View style={[s.quizHeader, { paddingTop: insets.top }]}>
          <View style={s.quizHeaderTop}>
            <Text style={s.quizTopicText}>{q.topic}</Text>
            <Text style={s.quizCountText}>{current + 1} / {total}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` as any }]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, {
            paddingTop: insets.top + 64 + 16,
            paddingBottom: TAB_BAR_HEIGHT + 24,
          }]}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[s.errorBox, { marginBottom: 16, gap: 10 }]}>
              <Text style={s.errorText}>{error}</Text>
              <Pressable
                style={[s.primaryBtn, { paddingVertical: 10 }]}
                onPress={() => handleSubmit(answers)}
              >
                <Text style={s.primaryBtnText}>Retry submission</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Question card */}
          <View style={s.questionCard}>
            <View style={s.difficultyBadgeWrap}>
              <Text style={s.difficultyBadge}>{q.difficulty}</Text>
            </View>
            <Text style={s.questionText}>{q.question}</Text>
          </View>

          {/* Options */}
          <View style={s.optionsWrap}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={s.optionRow}
                onPress={() => handleAnswer(opt)}
              >
                <View style={s.optionLabel}>
                  <Text style={s.optionLabelText}>{opt}</Text>
                </View>
                <Text style={s.optionText}>{q.options[opt]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Dot navigator */}
          <View style={s.dotNav}>
            {template.questions.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i < current  ? s.dotPast    :
                  i === current ? s.dotCurrent : s.dotFuture,
                  i === current && { width: 16 },
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────

  if (state === "results" && submitResult) {
    const score      = submitResult.score ?? 0;
    const scoreColor = score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.error;
    const scoreLabel = score >= 75 ? "Excellent!" : score >= 50 ? "Good job!" : "Keep learning!";
    const { correct, incorrect, total } = getTotals();

    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={[s.scroll, {
            paddingTop: insets.top + 16,
            paddingBottom: TAB_BAR_HEIGHT + 24,
            alignItems: "center",
          }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.pageTitle}>Quiz Complete!</Text>
          <Text style={[s.pageSubtitle, { textAlign: "center" }]}>
            {template?.goal ?? existingGoal}
          </Text>

          {/* Score circle */}
          <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[s.scoreCircleNum, { color: scoreColor }]}>
              {Math.round(score)}%
            </Text>
          </View>
          <Text style={[s.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>

          {/* Answer summary card */}
          <View style={[s.card, { width: "100%", marginBottom: 16 }]}>
            <Text style={s.cardSectionTitle}>Your Answers</Text>
            <Text style={s.cardBodyText}>
              {correct} correct, {incorrect} incorrect out of {total} questions
            </Text>

            {/* Correct / incorrect chips */}
            <View style={s.resultsChipsRow}>
              <View style={[s.resultsChip, { backgroundColor: "rgba(0,229,160,0.12)" }]}>
                <Text style={[s.resultsChipNum, { color: colors.success }]}>{correct}</Text>
                <Text style={[s.resultsChipLabel, { color: colors.success }]}>Correct</Text>
              </View>
              <View style={[s.resultsChip, { backgroundColor: "rgba(255,180,171,0.12)" }]}>
                <Text style={[s.resultsChipNum, { color: colors.error }]}>{incorrect}</Text>
                <Text style={[s.resultsChipLabel, { color: colors.error }]}>Incorrect</Text>
              </View>
            </View>

            {/* Per-topic breakdown */}
            {submitResult.skill_assessments && submitResult.skill_assessments.length > 0 && (
              <View style={s.topicBreakdown}>
                <Text style={s.topicBreakdownLabel}>Topic Breakdown</Text>
                {submitResult.skill_assessments.map((sa) => {
                  const saColor =
                    sa.score_pct >= 75 ? colors.success :
                    sa.score_pct >= 50 ? colors.warning  : colors.error;
                  const saBg =
                    sa.score_pct >= 75 ? "rgba(0,229,160,0.12)" :
                    sa.score_pct >= 50 ? "rgba(255,184,0,0.12)"  : "rgba(255,180,171,0.12)";
                  return (
                    <View key={sa.topic} style={s.topicRow}>
                      <Text style={s.topicName} numberOfLines={1}>{sa.topic}</Text>
                      <Text style={s.topicCount}>
                        {sa.correct_count}/{sa.total_count}
                      </Text>
                      <View style={[s.topicBadge, { backgroundColor: saBg }]}>
                        <Text style={[s.topicBadgeText, { color: saColor }]}>
                          {Math.round(sa.score_pct)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Pressable style={[s.primaryBtn, { width: "100%", marginBottom: 12 }]} onPress={handleGenerateRoadmap}>
            <Text style={s.primaryBtnText}>Generate My Roadmap</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────

  if (state === "done") {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar style="light" />
        <View style={s.doneIconWrap}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        </View>
        <Text style={[s.pageTitle, { textAlign: "center" }]}>Roadmap Ready!</Text>
        <Text style={[s.pageSubtitle, { textAlign: "center", marginBottom: 32 }]}>
          Your personalized learning path has been generated based on your quiz results.
        </Text>
        <Pressable
          style={[s.primaryBtn, { width: "100%", marginBottom: 12 }]}
          onPress={() => router.push("/(student)/roadmap" as any)}
        >
          <Text style={s.primaryBtnText}>View My Roadmap</Text>
        </Pressable>
        <Pressable
          style={s.secondaryBtn}
          onPress={() => router.push("/(student)/quiz-history" as any)}
        >
          <Text style={s.secondaryBtnText}>View Quiz History</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },

  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },

  // Typography
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  pageSubtitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
  },
  loadingText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
    marginTop:  12,
    textAlign:  "center",
  },

  // Goal card (improvement mode)
  goalCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             8,
  },
  goalCardRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  goalIconWrap: {
    width:           28,
    height:          28,
    borderRadius:    8,
    backgroundColor: colors.primary,
    alignItems:      "center",
    justifyContent:  "center",
  },
  goalCardLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  goalCardTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    26,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  goalCardSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 18,
    color:      colors.textVariant,
  },

  // Hint text
  hintText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    lineHeight: 17,
    color:      colors.textVariant,
    textAlign:  "center",
  },

  // Error box
  errorBox: {
    backgroundColor: "rgba(255,180,171,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(255,180,171,0.2)",
    borderRadius:    12,
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  errorText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    color:      colors.error,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      "center",
  },
  primaryBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   15,
    color:      colors.onPrimary,
  },

  // Secondary button
  secondaryBtn: {
    width:           "100%",
    backgroundColor: colors.surfaceContainer,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      "center",
  },
  secondaryBtnText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.textVariant,
  },

  // Goal entry (goal mode)
  fieldLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
    marginBottom:  6,
  },
  textInput: {
    backgroundColor:  colors.surfaceContainer,
    borderWidth:      1,
    borderColor:      colors.border,
    borderRadius:     14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontFamily:       "HankenGrotesk_400Regular",
    fontSize:         15,
    color:            colors.text,
  },
  popularLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  goalChipsWrap: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  goalChip: {
    backgroundColor: colors.surfaceContainer,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    12,
    paddingHorizontal: 12,
    paddingVertical:   7,
  },
  goalChipSelected: {
    borderColor:     colors.primary,
    backgroundColor: "rgba(196,192,255,0.1)",
  },
  goalChipText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   12,
    color:      colors.textVariant,
  },
  goalChipTextSelected: {
    color: colors.primary,
  },

  // Quiz header (fixed progress bar area)
  quizHeader: {
    position:          "absolute",
    top: 0, left: 0, right: 0,
    zIndex:            50,
    backgroundColor:   "rgba(5,5,8,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom:     12,
  },
  quizHeaderTop: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   8,
  },
  quizTopicText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  quizCountText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.primary,
  },
  progressTrack: {
    height:          5,
    backgroundColor: colors.surfaceContainer,
    borderRadius:    3,
    overflow:        "hidden",
  },
  progressFill: {
    height:          "100%" as any,
    backgroundColor: colors.primary,
    borderRadius:    3,
  },

  // Question card
  questionCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             10,
  },
  difficultyBadgeWrap: {
    alignSelf:         "flex-start",
    backgroundColor:   "rgba(196,192,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      8,
  },
  difficultyBadge: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.3,
    color:         colors.primary,
    textTransform: "capitalize",
  },
  questionText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      16,
    lineHeight:    24,
    letterSpacing: -0.1,
    color:         colors.text,
  },

  // Options
  optionsWrap: { gap: 10 },
  optionRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    backgroundColor:   colors.surfaceContainer,
    borderWidth:       1,
    borderColor:       "transparent",
    borderRadius:      16,
    paddingHorizontal: 14,
    paddingVertical:   14,
  },
  optionLabel: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: colors.surfaceHighest,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  optionLabelText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      13,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },
  optionText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.text,
    flex:       1,
  },

  // Dot navigator
  dotNav: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    gap:            5,
    paddingVertical: 8,
  },
  dot: {
    height:       6,
    width:        6,
    borderRadius: 3,
  },
  dotPast:    { backgroundColor: colors.primary, opacity: 0.5 },
  dotCurrent: { backgroundColor: colors.primary },
  dotFuture:  { backgroundColor: colors.surfaceHighest },

  // Results
  scoreCircle: {
    width:           144,
    height:          144,
    borderRadius:    72,
    borderWidth:     8,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    8,
  },
  scoreCircleNum: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      30,
    letterSpacing: 0.5,
  },
  scoreLabel: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      16,
    lineHeight:    22,
    marginBottom:  16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             12,
  },
  cardSectionTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    lineHeight:    20,
    color:         colors.text,
  },
  cardBodyText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 18,
    color:      colors.textVariant,
  },
  resultsChipsRow: {
    flexDirection: "row",
    gap:           12,
  },
  resultsChip: {
    flex:           1,
    borderRadius:   14,
    paddingVertical: 12,
    alignItems:     "center",
    gap:            4,
  },
  resultsChipNum: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      22,
    letterSpacing: 0.5,
  },
  resultsChipLabel: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   11,
  },
  topicBreakdown: { gap: 8 },
  topicBreakdownLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  topicRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
  },
  topicName: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    color:      colors.textVariant,
    flex:       1,
  },
  topicCount: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.3,
    color:         colors.text,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      999,
  },
  topicBadgeText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
  },

  // Done
  doneIconWrap: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: "rgba(0,229,160,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    16,
  },
});
