"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

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
  topic_areas: string[];
  questions: Question[];
  total_questions: number;
}

interface SkillAssessment {
  topic: string;
  score_pct: number;
  level: "strong" | "intermediate" | "weak";
  correct: number;
  total: number;
}

interface QuizResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  skill_assessments: SkillAssessment[];
}

// ─── Career goals ─────────────────────────────────────────────────────────────

const CAREER_GOALS = [
  { label: "Frontend Developer", icon: "🎨", desc: "React, TypeScript, CSS, UI/UX" },
  { label: "Backend Developer", icon: "⚙️", desc: "Node.js, Python, Databases, APIs" },
  { label: "Full Stack Developer", icon: "🏗️", desc: "End-to-end web development" },
  { label: "Data Scientist", icon: "📊", desc: "Python, ML, Statistics, Analytics" },
  { label: "Machine Learning Engineer", icon: "🤖", desc: "Deep Learning, MLOps, PyTorch" },
  { label: "DevOps Engineer", icon: "🚀", desc: "CI/CD, Docker, Kubernetes, Cloud" },
  { label: "Android Developer", icon: "📱", desc: "Kotlin, Jetpack Compose, Android SDK" },
  { label: "Cloud Architect", icon: "☁️", desc: "AWS, Azure, GCP, Infrastructure" },
];

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  strong:       { label: "Strong",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
  intermediate: { label: "Intermediate", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",       icon: <CheckCircle2 size={14} className="text-blue-500" /> },
  weak:         { label: "Needs work",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",   icon: <XCircle    size={14} className="text-orange-500" /> },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoalSelect({
  onSelect,
  loading,
  error,
}: {
  onSelect: (goal: string) => void;
  loading: boolean;
  error: string;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Skill Assessment</h1>
      <p className="text-gray-500 mb-8">
        Choose your career goal and we&apos;ll generate a 20-question quiz to assess your current level.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CAREER_GOALS.map((goal) => (
          <button
            key={goal.label}
            onClick={() => setSelected(goal.label)}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              selected === goal.label
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <span className="text-2xl flex-shrink-0">{goal.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === goal.label ? "text-blue-700" : "text-gray-800"}`}>
                {goal.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{goal.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        disabled={!selected || loading}
        onClick={() => onSelect(selected)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Generating quiz…</>
        ) : (
          <><Sparkles size={16} /> Start Quiz</>
        )}
      </button>
    </div>
  );
}

function QuizInterface({
  template,
  answers,
  currentIdx,
  onAnswer,
  onNav,
  onSubmit,
  submitting,
}: {
  template: QuizTemplate;
  answers: Record<string, string>;
  currentIdx: number;
  onAnswer: (questionId: string, option: string) => void;
  onNav: (idx: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const question = template.questions[currentIdx];
  const total = template.questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;
  const isLast = currentIdx === total - 1;
  const selectedOption = answers[question.id];

  const optionKeys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Question {currentIdx + 1} of {total}</span>
          <span>{answeredCount} / {total} answered</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {question.topic}
            </span>
            <span className="text-xs text-gray-400 capitalize">{question.difficulty}</span>
          </div>

          <p className="text-gray-900 font-medium text-base leading-relaxed mb-6">
            {question.question}
          </p>

          <div className="space-y-3">
            {optionKeys.map((key) => (
              <button
                key={key}
                onClick={() => onAnswer(question.id, key)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedOption === key
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                    selectedOption === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {key}
                </span>
                <span className={`text-sm leading-relaxed ${selectedOption === key ? "text-blue-800" : "text-gray-700"}`}>
                  {question.options[key]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNav(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Submitting…</>
            ) : (
              `Submit Quiz ${!allAnswered ? `(${total - answeredCount} unanswered)` : ""}`
            )}
          </button>
        ) : (
          <button
            onClick={() => onNav(currentIdx + 1)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
        {template.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => onNav(i)}
            className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
              i === currentIdx
                ? "bg-blue-600 text-white"
                : answers[q.id]
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizResults({
  result,
  goal,
  onGenerateRoadmap,
  generating,
  error,
}: {
  result: QuizResult;
  goal: string;
  onGenerateRoadmap: () => void;
  generating: boolean;
  error: string;
}) {
  const pct = Math.round((result.score / result.total_questions) * 100);

  const circumference = 2 * Math.PI * 40;
  const strokeDash = (pct / 100) * circumference;

  const sorted = [...result.skill_assessments].sort((a, b) => b.score_pct - a.score_pct);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Assessment Complete!</h1>
      <p className="text-gray-500 mb-8">
        Here&apos;s how you scored for <strong>{goal}</strong>.
      </p>

      {/* Score circle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center gap-8">
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={pct >= 70 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f97316"}
              strokeWidth="8"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">
            {result.score} <span className="text-gray-400 text-xl font-normal">/ {result.total_questions}</span>
          </p>
          <p className="text-gray-500 text-sm mt-1">questions correct</p>
          <p className={`text-sm font-semibold mt-2 ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-blue-600" : "text-orange-600"}`}>
            {pct >= 70 ? "Great foundation!" : pct >= 50 ? "Good start!" : "Lots of room to grow!"}
          </p>
        </div>
      </div>

      {/* Skill breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Skill Breakdown</h2>
        <div className="space-y-3">
          {sorted.map((s) => {
            const cfg = LEVEL_CONFIG[s.level] ?? LEVEL_CONFIG.intermediate;
            return (
              <div key={s.topic}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{s.topic}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{s.correct}/{s.total}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      s.level === "strong" ? "bg-emerald-500" : s.level === "intermediate" ? "bg-blue-500" : "bg-orange-400"
                    }`}
                    style={{ width: `${s.score_pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roadmap CTA */}
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</p>
      )}
      <button
        onClick={onGenerateRoadmap}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-colors text-base disabled:opacity-60"
      >
        {generating ? (
          <><Loader2 size={18} className="animate-spin" /> Generating your roadmap…</>
        ) : (
          <><Sparkles size={18} /> Generate My Personalized Roadmap</>
        )}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">
        Our AI will create a step-by-step learning path based on your results
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "goal" | "quiz" | "results";

export default function QuizPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("goal");
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState("");

  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<QuizResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  async function handleGoalSelect(goal: string) {
    setGoalLoading(true);
    setGoalError("");
    try {
      // Set career goal on the student profile
      await apiPut("/api/v1/students/goal", { career_goal: goal });
      // Fetch (or generate) the quiz template
      const tmpl = await apiGet<QuizTemplate>(`/api/v1/quiz/template/${encodeURIComponent(goal)}`);
      setTemplate(tmpl);
      setAnswers({});
      setCurrentIdx(0);
      setStep("quiz");
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally {
      setGoalLoading(false);
    }
  }

  function handleAnswer(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  async function handleSubmit() {
    if (!template) return;
    setSubmitting(true);
    try {
      const payload = {
        quiz_id: template.id,
        answers: Object.entries(answers).map(([question_id, selected_option]) => ({
          question_id,
          selected_option,
        })),
      };
      const res = await apiPost<QuizResult>("/api/v1/quiz/attempt", payload);
      setResult(res);
      setStep("results");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateRoadmap() {
    setGenerating(true);
    setGenerateError("");
    try {
      await apiPost("/api/v1/roadmap/generate");
      router.push("/roadmap");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate roadmap");
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {step === "goal" && (
          <GoalSelect
            onSelect={handleGoalSelect}
            loading={goalLoading}
            error={goalError}
          />
        )}

        {step === "quiz" && template && (
          <QuizInterface
            template={template}
            answers={answers}
            currentIdx={currentIdx}
            onAnswer={handleAnswer}
            onNav={setCurrentIdx}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {step === "results" && result && template && (
          <QuizResults
            result={result}
            goal={template.goal}
            onGenerateRoadmap={handleGenerateRoadmap}
            generating={generating}
            error={generateError}
          />
        )}
      </main>
    </div>
  );
}
