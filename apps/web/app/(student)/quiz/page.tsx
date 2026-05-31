"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Loader2, Sparkles, Brain, Clock, Timer,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Question {
  id: string; topic: string; question: string;
  options: { A: string; B: string; C: string; D: string }; difficulty: string;
}
interface QuizTemplate {
  id: string; goal: string; topic_areas: string[]; questions: Question[]; total_questions: number;
}
interface SkillAssessment {
  topic: string; score_pct: number; level: "strong" | "intermediate" | "weak"; correct: number; total: number;
}
interface QuizResult {
  attempt_id: string; score: number; total_questions: number; skill_assessments: SkillAssessment[];
}

const CAREER_GOALS = [
  { label: "Frontend Developer",         icon: "🎨", desc: "React, TypeScript, CSS, UI/UX" },
  { label: "Backend Developer",           icon: "⚙️", desc: "Node.js, Python, Databases, APIs" },
  { label: "Full Stack Developer",        icon: "🏗️", desc: "End-to-end web development" },
  { label: "Data Scientist",              icon: "📊", desc: "Python, ML, Statistics, Analytics" },
  { label: "Machine Learning Engineer",   icon: "🤖", desc: "Deep Learning, MLOps, PyTorch" },
  { label: "DevOps Engineer",             icon: "🚀", desc: "CI/CD, Docker, Kubernetes, Cloud" },
  { label: "Android Developer",           icon: "📱", desc: "Kotlin, Jetpack Compose, Android SDK" },
  { label: "Cloud Architect",             icon: "☁️", desc: "AWS, Azure, GCP, Infrastructure" },
];

const LEVEL_CONFIG = {
  strong:       { label: "Strong",       color: "#00d4ff",  icon: CheckCircle2 },
  intermediate: { label: "Intermediate", color: "#6c63ff",  icon: CheckCircle2 },
  weak:         { label: "Needs work",   color: "#e7c365",  icon: XCircle },
};

type AppStep = "goal" | "quiz" | "results";

/* ─── Radar SVG ──────────────────────────────────────────────────────────── */

function RadarChart({ skills }: { skills: { label: string; value: number }[] }) {
  const size = 180; const cx = size / 2; const cy = size / 2; const r = 65;
  const n = skills.length;
  function pt(i: number, val: number) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rv = (val / 100) * r;
    return { x: cx + rv * Math.cos(a), y: cy + rv * Math.sin(a) };
  }
  function gpt(i: number, s: number) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + s * r * Math.cos(a), y: cy + s * r * Math.sin(a) };
  }
  const dp = skills.map((s, i) => pt(i, s.value));
  const path = dp.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((s) => {
        const pts = Array.from({ length: n }, (_, i) => gpt(i, s));
        const p = pts.map((q, i) => `${i === 0 ? "M" : "L"}${q.x},${q.y}`).join(" ") + "Z";
        return <path key={s} d={p} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const e = gpt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      <path d={path} fill="rgba(108,99,255,0.2)" stroke="#6c63ff" strokeWidth="1.5" />
      {dp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6c63ff" />)}
      {skills.map((s, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (r + 20) * Math.cos(a);
        const ly = cy + (r + 20) * Math.sin(a);
        return <text key={s.label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#7c7a8a">{s.label}</text>;
      })}
    </svg>
  );
}

/* ─── Goal Select ────────────────────────────────────────────────────────── */

function GoalSelect({ onSelect, loading, error }: {
  onSelect: (goal: string) => void; loading: boolean; error: string;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="ai-chip text-[10px] font-semibold px-3 py-1 rounded-full inline-block mb-4">SKILL ASSESSMENT</span>
        <h1 className="text-2xl font-bold text-white mb-2">Choose Your Career Goal</h1>
        <p className="text-sm text-[#7c7a8a]">
          Select your target role and we&apos;ll generate a 20-question quiz to assess your current level.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CAREER_GOALS.map((goal) => (
          <button key={goal.label} onClick={() => setSelected(goal.label)}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              selected === goal.label
                ? "border-[#6c63ff] bg-[#6c63ff]/10"
                : "border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
            }`}>
            <span className="text-2xl flex-shrink-0">{goal.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === goal.label ? "text-white" : "text-[#cbc4d2]"}`}>
                {goal.label}
              </p>
              <p className="text-xs text-[#7c7a8a] mt-0.5">{goal.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <button disabled={!selected || loading} onClick={() => onSelect(selected)}
        className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Generating quiz…</> : <><Sparkles size={16} /> Start Assessment</>}
      </button>
    </div>
  );
}

/* ─── Quiz Interface ─────────────────────────────────────────────────────── */

function QuizInterface({ template, answers, currentIdx, onAnswer, onNav, onSubmit, submitting }: {
  template: QuizTemplate; answers: Record<string, string>; currentIdx: number;
  onAnswer: (qId: string, opt: string) => void; onNav: (i: number) => void;
  onSubmit: () => void; submitting: boolean;
}) {
  const question = template.questions[currentIdx];
  const total = template.questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;
  const isLast = currentIdx === total - 1;
  const selectedOption = answers[question.id];
  const optionKeys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">{template.goal} Assessment</p>
          <h1 className="text-xl font-bold text-white mt-0.5">
            Question {currentIdx + 1} of {total}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 glass-card px-3 py-2 rounded-xl text-sm">
            <Timer size={14} className="text-[#6c63ff]" />
            <span className="text-white font-mono font-semibold">{answeredCount}/{total}</span>
            <span className="text-[#7c7a8a] text-xs">answered</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-8">
        <motion.div
          className="h-full gradient-primary rounded-full"
          animate={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left — question */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div key={question.id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="ai-chip text-[10px] font-semibold px-2.5 py-1 rounded-full">{question.topic}</span>
                <span className="text-[10px] text-[#7c7a8a] capitalize">{question.difficulty}</span>
              </div>
              <p className="text-white font-medium text-sm leading-relaxed mb-6">{question.question}</p>

              <div className="space-y-3">
                {optionKeys.map((key) => (
                  <button key={key} onClick={() => onAnswer(question.id, key)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedOption === key
                        ? "border-[#6c63ff] bg-[#6c63ff]/10"
                        : "border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}>
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      selectedOption === key ? "gradient-primary text-white" : "bg-white/[0.06] text-[#7c7a8a]"
                    }`}>{key}</span>
                    <span className={`text-sm leading-relaxed ${selectedOption === key ? "text-white" : "text-[#cbc4d2]"}`}>
                      {question.options[key]}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => onNav(currentIdx - 1)} disabled={currentIdx === 0}
              className="flex items-center gap-1.5 text-sm text-[#7c7a8a] hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} /> Previous
            </button>
            {isLast ? (
              <button onClick={onSubmit} disabled={!allAnswered || submitting}
                className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : `Submit Quiz${!allAnswered ? ` (${total - answeredCount} left)` : ""}`}
              </button>
            ) : (
              <button onClick={() => onNav(currentIdx + 1)}
                className="btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold">
                Next Question <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right — progress map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold text-white mb-3">Question Map</p>
            <div className="flex flex-wrap gap-1.5">
              {template.questions.map((q, i) => (
                <button key={q.id} onClick={() => onNav(i)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-all ${
                    i === currentIdx ? "gradient-primary text-white" :
                    answers[q.id] ? "bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/30" :
                    "bg-white/[0.05] text-[#7c7a8a] hover:text-white"
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#7c7a8a] mt-3">{answeredCount}/{total} questions answered</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-[#00d4ff]" />
              <p className="text-xs font-semibold text-white">AI Career Coach</p>
            </div>
            <p className="text-xs text-[#7c7a8a] leading-relaxed">
              Answer each question based on your current knowledge. Your results will power a personalised learning roadmap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Quiz Results ───────────────────────────────────────────────────────── */

function QuizResults({ result, goal, onGenerateRoadmap, generating, error }: {
  result: QuizResult; goal: string; onGenerateRoadmap: () => void; generating: boolean; error: string;
}) {
  const pct = Math.round((result.score / result.total_questions) * 100);
  const circumference = 2 * Math.PI * 52;
  const strokeDash = (pct / 100) * circumference;
  const sorted = [...result.skill_assessments].sort((a, b) => b.score_pct - a.score_pct);
  const radarSkills = sorted.slice(0, 5).map((s) => ({ label: s.topic, value: s.score_pct }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="ai-chip text-[10px] font-semibold px-3 py-1 rounded-full inline-block mb-4">ASSESSMENT COMPLETE</span>
        <h1 className="text-3xl font-bold text-white mb-2">Assessment Complete!</h1>
        <p className="text-sm text-[#7c7a8a]">Your technical profile is ready for AI optimisation — {goal}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Score circle */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-4">Overall Score</p>
          <div className="relative mb-4">
            <svg width="130" height="130" className="-rotate-90">
              <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <motion.circle cx="65" cy="65" r="52" fill="none"
                stroke={pct >= 70 ? "#00d4ff" : pct >= 50 ? "#6c63ff" : "#e7c365"}
                strokeWidth="10"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${strokeDash} ${circumference}` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold gradient-text">{pct}%</span>
              <span className="text-[10px] text-[#7c7a8a]">AI Benchmarked</span>
            </div>
          </div>
          <p className={`text-sm font-semibold ${pct >= 70 ? "text-[#00d4ff]" : pct >= 50 ? "text-[#6c63ff]" : "text-[#e7c365]"}`}>
            {pct >= 70 ? "Senior Level" : pct >= 50 ? "Intermediate Level" : "Junior Level"}
          </p>
        </div>

        {/* Radar */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-2">Skill Distribution</p>
          <RadarChart skills={radarSkills} />
        </div>
      </div>

      {/* Skill breakdown */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <p className="text-sm font-semibold text-white mb-4">Skill Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((s) => {
            const cfg = LEVEL_CONFIG[s.level] ?? LEVEL_CONFIG.intermediate;
            const Icon = cfg.icon;
            const isCritical = s.level === "weak";
            return (
              <div key={s.topic} className={`rounded-xl p-3 border ${isCritical ? "border-red-500/20 bg-red-500/5" : "border-white/[0.07] bg-white/[0.02]"}`}>
                {isCritical && <span className="text-[9px] font-bold text-red-400 mb-1 block">⚠ Critical Gap</span>}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white truncate">{s.topic}</span>
                  <Icon size={12} style={{ color: cfg.color }} className="flex-shrink-0 ml-1" />
                </div>
                <p className="text-xl font-bold" style={{ color: cfg.color }}>{s.score_pct}%</p>
                <div className="h-1 bg-white/[0.06] rounded-full mt-2">
                  <div className="h-full rounded-full" style={{ width: `${s.score_pct}%`, background: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      {error && (
        <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
      )}
      <button onClick={onGenerateRoadmap} disabled={generating}
        className="w-full btn-primary py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mb-3">
        {generating ? <><Loader2 size={18} className="animate-spin" /> Generating your roadmap…</> : <><Sparkles size={18} /> Generate My Personalized Roadmap</>}
      </button>
      <p className="text-center text-xs text-[#7c7a8a]">
        Privacy first — AI generates data-driven paths locally
      </p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<AppStep>("goal");
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
    setGoalLoading(true); setGoalError("");
    try {
      await apiPut("/api/v1/students/goal", { career_goal: goal });
      const tmpl = await apiGet<QuizTemplate>(`/api/v1/quiz/template/${encodeURIComponent(goal)}`);
      setTemplate(tmpl); setAnswers({}); setCurrentIdx(0); setStep("quiz");
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally { setGoalLoading(false); }
  }

  async function handleSubmit() {
    if (!template) return;
    setSubmitting(true);
    try {
      const res = await apiPost<QuizResult>("/api/v1/quiz/attempt", {
        quiz_id: template.id,
        answers: Object.entries(answers).map(([question_id, selected_option]) => ({ question_id, selected_option })),
      });
      setResult(res); setStep("results");
    } catch (err) { alert(err instanceof Error ? err.message : "Submit failed"); }
    finally { setSubmitting(false); }
  }

  async function handleGenerateRoadmap() {
    setGenerating(true); setGenerateError("");
    try { await apiPost("/api/v1/roadmap/generate"); router.push("/roadmap"); }
    catch (err) { setGenerateError(err instanceof Error ? err.message : "Failed"); setGenerating(false); }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />
      <main className="flex-1 ml-60 p-8 overflow-y-auto">
        {step === "goal" && (
          <GoalSelect onSelect={handleGoalSelect} loading={goalLoading} error={goalError} />
        )}
        {step === "quiz" && template && (
          <QuizInterface template={template} answers={answers} currentIdx={currentIdx}
            onAnswer={(qId, opt) => setAnswers((p) => ({ ...p, [qId]: opt }))}
            onNav={setCurrentIdx} onSubmit={handleSubmit} submitting={submitting} />
        )}
        {step === "results" && result && template && (
          <QuizResults result={result} goal={template.goal}
            onGenerateRoadmap={handleGenerateRoadmap} generating={generating} error={generateError} />
        )}
      </main>
    </div>
  );
}
