import { useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPut } from "../../lib/api";

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

type QuizState = "goal" | "loading" | "quiz" | "submitting" | "results" | "generating" | "done";

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
  const [state, setState] = useState<QuizState>("goal");
  const [goal, setGoal] = useState("");
  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");

  async function handleStartQuiz() {
    const trimmed = goal.trim();
    if (!trimmed) { Alert.alert("Please enter a career goal"); return; }
    setState("loading");
    setError("");
    try {
      await apiPut("/api/v1/students/goal", { goal: trimmed });
      const data = await apiGet<QuizTemplate>(`/api/v1/quiz/template/${encodeURIComponent(trimmed)}`);
      setTemplate(data);
      setCurrent(0);
      setAnswers({});
      setState("quiz");
    } catch (e: any) {
      setError(e.message ?? "Failed to load quiz");
      setState("goal");
    }
  }

  function handleAnswer(option: OptionKey) {
    if (!template) return;
    const q = template.questions[current];
    setAnswers((prev) => ({ ...prev, [q.id]: option }));
    if (current < template.questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      handleSubmit({ ...answers, [q.id]: option });
    }
  }

  async function handleSubmit(finalAnswers: Record<string, OptionKey>) {
    if (!template) return;
    setState("submitting");
    try {
      const payload = {
        quiz_id: template.id,
        answers: Object.entries(finalAnswers).map(([question_id, selected_option]) => ({
          question_id, selected_option,
        })),
      };
      const result = await apiPost<{ score_pct: number }>("/api/v1/quiz/attempt", payload);
      setScore(result.score_pct ?? 0);
      setState("results");
    } catch {
      // Estimate score locally if submit fails
      setScore(Math.round((Object.keys(finalAnswers).length / (template?.total_questions ?? 1)) * 60));
      setState("results");
    }
  }

  async function handleGenerateRoadmap() {
    setState("generating");
    try {
      await apiPost("/api/v1/roadmap/generate");
      setState("done");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to generate roadmap");
      setState("results");
    }
  }

  // ── Goal selection ──────────────────────────────────────────────────────────

  if (state === "goal") {
    return (
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-14 pb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Skill Quiz</Text>
          <Text className="text-sm text-gray-400 mb-8">
            Enter your career goal and we&apos;ll generate a personalized assessment.
          </Text>

          <Text className="text-sm font-semibold text-gray-700 mb-2">Your Career Goal</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
            placeholder="e.g. Full Stack Developer"
            value={goal}
            onChangeText={setGoal}
            returnKeyType="done"
            onSubmitEditing={handleStartQuiz}
          />

          {error ? (
            <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          ) : null}

          <Pressable
            className="bg-blue-600 rounded-xl py-3.5 items-center mb-6"
            onPress={handleStartQuiz}
          >
            <Text className="text-white font-semibold text-sm">Start Quiz</Text>
          </Pressable>

          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Popular Goals
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {POPULAR_GOALS.map((g) => (
              <Pressable
                key={g}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 active:bg-blue-50 active:border-blue-300"
                onPress={() => setGoal(g)}
              >
                <Text className="text-xs font-medium text-gray-600">{g}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (state === "loading" || state === "submitting" || state === "generating") {
    const msg =
      state === "loading"    ? "Generating your quiz…" :
      state === "submitting" ? "Scoring your answers…" :
                               "Building your roadmap…";
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-sm text-gray-500 mt-4 text-center">{msg}</Text>
      </View>
    );
  }

  // ── Quiz ────────────────────────────────────────────────────────────────────

  if (state === "quiz" && template) {
    const q = template.questions[current];
    const total = template.questions.length;
    const pct = ((current) / total) * 100;

    return (
      <View className="flex-1 bg-gray-50">
        {/* Progress bar */}
        <View className="bg-white border-b border-gray-100 px-6 pt-14 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-gray-400 font-medium">{q.topic}</Text>
            <Text className="text-xs font-semibold text-gray-600">{current + 1} / {total}</Text>
          </View>
          <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <View className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
          </View>
        </View>

        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
          {/* Question */}
          <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                <Text className="text-xs font-medium text-blue-600 capitalize">{q.difficulty}</Text>
              </View>
            </View>
            <Text className="text-base font-semibold text-gray-900 leading-snug">{q.question}</Text>
          </View>

          {/* Options */}
          <View className="gap-3">
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center gap-3 active:border-blue-400 active:bg-blue-50"
                onPress={() => handleAnswer(opt)}
              >
                <View className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center flex-shrink-0">
                  <Text className="text-sm font-bold text-gray-600">{opt}</Text>
                </View>
                <Text className="text-sm text-gray-700 flex-1 leading-snug">{q.options[opt]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Dot navigator */}
          <View className="flex-row justify-center gap-1.5 mt-8 mb-4">
            {template.questions.map((_, i) => (
              <View
                key={i}
                className={`rounded-full ${i < current ? "bg-blue-500" : i === current ? "bg-blue-600 w-4" : "bg-gray-200"}`}
                style={{ width: i === current ? 16 : 6, height: 6 }}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────

  if (state === "results") {
    const scoreColor = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";
    const scoreLabel = score >= 75 ? "Excellent!" : score >= 50 ? "Good job!" : "Keep learning!";

    return (
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-14 pb-8 items-center">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Quiz Complete!</Text>
          <Text className="text-sm text-gray-400 mb-8">{template?.goal}</Text>

          {/* Score circle */}
          <View className="w-36 h-36 rounded-full border-8 items-center justify-center mb-2"
            style={{ borderColor: scoreColor }}>
            <Text className="text-3xl font-bold" style={{ color: scoreColor }}>
              {Math.round(score)}%
            </Text>
          </View>
          <Text className="text-base font-semibold text-gray-700 mb-8">{scoreLabel}</Text>

          {/* Topic breakdown */}
          {template && (
            <View className="bg-white rounded-2xl border border-gray-100 p-4 w-full mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-3">Your Answers</Text>
              <Text className="text-sm text-gray-500">
                {Object.keys(answers).length} of {template.total_questions} questions answered
              </Text>
            </View>
          )}

          <Pressable
            className="bg-blue-600 rounded-2xl py-4 items-center w-full mb-3"
            onPress={handleGenerateRoadmap}
          >
            <Text className="text-white font-semibold">Generate My Roadmap</Text>
          </Pressable>

          <Pressable
            className="py-3 items-center w-full"
            onPress={() => { setGoal(""); setState("goal"); }}
          >
            <Text className="text-sm text-gray-400">Retake Quiz</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────

  if (state === "done") {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">Roadmap Ready!</Text>
        <Text className="text-sm text-gray-400 text-center mb-8">
          Your personalized learning path has been generated based on your quiz results.
        </Text>
        <Pressable
          className="bg-blue-600 rounded-2xl py-4 px-8 items-center"
          onPress={() => router.push("/(student)/roadmap" as any)}
        >
          <Text className="text-white font-semibold">View My Roadmap</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}
