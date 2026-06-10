"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Loader2, Sparkles, Brain, Timer, Flag, AlertTriangle, Send,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

const SECS_PER_QUESTION = 90;
const OPT_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPT_KEYS)[number];
type AppStep = "loading" | "assessment" | "goal" | "quiz" | "review" | "results";

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
interface Attempt {
  id: string; quiz_id: string; score: number; total_questions: number; time_taken_secs: number; completed_at: string;
}

const CAREER_GOALS = [
  { label: "Frontend Developer",       icon: "🎨", desc: "React, TypeScript, CSS, UI/UX" },
  { label: "Backend Developer",         icon: "⚙️", desc: "Node.js, Python, Databases, APIs" },
  { label: "Full Stack Developer",      icon: "🏗️", desc: "End-to-end web development" },
  { label: "Data Scientist",            icon: "📊", desc: "Python, ML, Statistics, Analytics" },
  { label: "Machine Learning Engineer", icon: "🤖", desc: "Deep Learning, MLOps, PyTorch" },
  { label: "DevOps Engineer",           icon: "🚀", desc: "CI/CD, Docker, Kubernetes, Cloud" },
  { label: "Android Developer",         icon: "📱", desc: "Kotlin, Jetpack Compose, Android SDK" },
  { label: "Cloud Architect",           icon: "☁️", desc: "AWS, Azure, GCP, Infrastructure" },
];

const LEVEL_CONFIG = {
  strong:       { label: "Strong",       color: "#00d4ff", icon: CheckCircle2 },
  intermediate: { label: "Intermediate", color: "#6c63ff", icon: CheckCircle2 },
  weak:         { label: "Needs work",   color: "#e7c365", icon: XCircle },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerColor(secs: number, total: number) {
  const p = secs / total;
  if (p > 0.4) return "#00d4ff";
  if (p > 0.15) return "#e7c365";
  return "#ef4444";
}

/* ─── Radar SVG ──────────────────────────────────────────────────────────── */

function RadarChart({ skills }: { skills: { label: string; value: number }[] }) {
  const size = 180, cx = size / 2, cy = size / 2, r = 65, n = skills.length;
  function pt(i: number, val: number) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + (val / 100) * r * Math.cos(a), y: cy + (val / 100) * r * Math.sin(a) };
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
        return <path key={s} d={pts.map((q, i) => `${i === 0 ? "M" : "L"}${q.x},${q.y}`).join(" ") + "Z"} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {Array.from({ length: n }, (_, i) => { const e = gpt(i, 1); return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />; })}
      <path d={path} fill="rgba(108,99,255,0.2)" stroke="#6c63ff" strokeWidth="1.5" />
      {dp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6c63ff" />)}
      {skills.map((s, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <text key={s.label} x={cx + (r + 20) * Math.cos(a)} y={cy + (r + 20) * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#7c7a8a">{s.label}</text>;
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
      {error && <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CAREER_GOALS.map((goal) => (
          <button key={goal.label} onClick={() => setSelected(goal.label)}
            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
              selected === goal.label ? "border-[#6c63ff] bg-[#6c63ff]/10" : "border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
            }`}>
            <span className="text-2xl flex-shrink-0">{goal.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === goal.label ? "text-white" : "text-[#cbc4d2]"}`}>{goal.label}</p>
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

function QuizInterface({
  template, answers, currentIdx, flagged, timeLeft, totalTime, timeExpired,
  onAnswer, onNav, onFlag, onGoToReview,
}: {
  template: QuizTemplate; answers: Record<string, string>; currentIdx: number;
  flagged: Set<string>; timeLeft: number; totalTime: number; timeExpired: boolean;
  onAnswer: (qId: string, opt: OptionKey) => void; onNav: (i: number) => void;
  onFlag: (qId: string) => void; onGoToReview: () => void;
}) {
  const question = template.questions[currentIdx];
  const total = template.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isFlagged = flagged.has(question.id);
  const isLast = currentIdx === total - 1;
  const color = timerColor(timeLeft, totalTime);
  const timerPct = (timeLeft / totalTime) * 100;
  const isWarning = timeLeft <= 300 && timeLeft > 60;
  const isDanger = timeLeft <= 60;

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toUpperCase();
      if (OPT_KEYS.includes(k as OptionKey)) {
        onAnswer(question.id, k as OptionKey);
      } else if (e.key === "ArrowRight") {
        if (currentIdx < total - 1) onNav(currentIdx + 1);
      } else if (e.key === "ArrowLeft") {
        if (currentIdx > 0) onNav(currentIdx - 1);
      } else if (k === "F") {
        e.preventDefault();
        onFlag(question.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question.id, currentIdx, total, onAnswer, onNav, onFlag]);

  function jumpToNextUnanswered() {
    let idx = template.questions.findIndex((q, i) => i > currentIdx && !answers[q.id]);
    if (idx === -1) idx = template.questions.findIndex((q, i) => i < currentIdx && !answers[q.id]);
    if (idx !== -1) onNav(idx);
  }
  const hasUnanswered = answeredCount < total;

  return (
    <div>
      {/* Timer bar */}
      <div className={`mb-6 glass-card rounded-2xl p-4 flex items-center gap-4 transition-all ${isDanger ? "border border-red-500/30 bg-red-500/[0.04]" : isWarning ? "border border-yellow-500/20" : ""}`}>
        <Timer size={18} style={{ color }} className={isDanger ? "animate-pulse" : ""} />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-[#7c7a8a] font-medium">Time Remaining</span>
            {isWarning && !isDanger && <span className="text-[10px] font-bold text-yellow-400 animate-pulse">Less than 5 minutes!</span>}
            {isDanger && <span className="text-[10px] font-bold text-red-400 animate-pulse">Less than 1 minute!</span>}
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${timerPct}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
        <span className="text-lg font-mono font-bold tabular-nums" style={{ color, minWidth: "4.5rem", textAlign: "right" }}>
          {timeExpired ? "00:00" : formatTime(timeLeft)}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">{template.goal} Assessment</p>
          <h1 className="text-xl font-bold text-white mt-0.5">
            Question {currentIdx + 1} <span className="text-[#7c7a8a] font-normal text-base">of {total}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass-card px-3 py-1.5 rounded-lg text-[11px] text-[#7c7a8a]">{answeredCount}/{total} answered</span>
          {flagged.size > 0 && (
            <span className="glass-card px-3 py-1.5 rounded-lg text-[11px] text-yellow-400 flex items-center gap-1.5">
              <Flag size={10} />{flagged.size} flagged
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-6">
        <motion.div className="h-full gradient-primary rounded-full" animate={{ width: `${((currentIdx + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Question card */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div key={question.id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="ai-chip text-[10px] font-semibold px-2.5 py-1 rounded-full">{question.topic}</span>
                  <span className="text-[10px] text-[#7c7a8a] capitalize">{question.difficulty}</span>
                </div>
                <button onClick={() => onFlag(question.id)} title="Flag for review (F)"
                  className={`p-1.5 rounded-lg transition-all ${isFlagged ? "bg-yellow-500/20 text-yellow-400" : "text-[#7c7a8a] hover:text-yellow-400 hover:bg-yellow-500/10"}`}>
                  <Flag size={14} />
                </button>
              </div>
              <p className="text-white font-medium text-sm leading-relaxed mb-6">{question.question}</p>
              <div className="space-y-3">
                {OPT_KEYS.map((key) => (
                  <button key={key} onClick={() => onAnswer(question.id, key)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      answers[question.id] === key ? "border-[#6c63ff] bg-[#6c63ff]/10" : "border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}>
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      answers[question.id] === key ? "gradient-primary text-white" : "bg-white/[0.06] text-[#7c7a8a]"
                    }`}>{key}</span>
                    <span className={`text-sm leading-relaxed ${answers[question.id] === key ? "text-white" : "text-[#cbc4d2]"}`}>
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
            <div className="flex items-center gap-2">
              {hasUnanswered && (
                <button onClick={jumpToNextUnanswered}
                  className="text-xs text-[#7c7a8a] hover:text-white px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors border border-white/[0.05]">
                  Next Unanswered
                </button>
              )}
              {isLast ? (
                <button onClick={onGoToReview}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
                  <Send size={13} /> Review &amp; Submit
                </button>
              ) : (
                <button onClick={() => onNav(currentIdx + 1)}
                  className="btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold">
                  Next <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Keyboard hints */}
          <p className="text-[10px] text-[#7c7a8a]/50 mt-3 text-center select-none">
            <kbd className="px-1 rounded bg-white/[0.05]">A</kbd>–<kbd className="px-1 rounded bg-white/[0.05]">D</kbd> select &nbsp;·&nbsp;
            <kbd className="px-1 rounded bg-white/[0.05]">←</kbd> <kbd className="px-1 rounded bg-white/[0.05]">→</kbd> navigate &nbsp;·&nbsp;
            <kbd className="px-1 rounded bg-white/[0.05]">F</kbd> flag
          </p>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Question map */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold text-white mb-3">Question Map</p>
            <div className="flex flex-wrap gap-1.5">
              {template.questions.map((q, i) => {
                const isActive = i === currentIdx;
                const isAns = !!answers[q.id];
                const isF = flagged.has(q.id);
                return (
                  <button key={q.id} onClick={() => onNav(i)}
                    className={`relative w-7 h-7 rounded-lg text-[11px] font-medium transition-all ${
                      isActive ? "gradient-primary text-white shadow-lg shadow-[#6c63ff]/20" :
                      isAns && isF ? "bg-yellow-500/25 text-yellow-300 border border-yellow-400/40" :
                      isAns ? "bg-[#6c63ff]/25 text-[#a09aff] border border-[#6c63ff]/40" :
                      isF ? "bg-yellow-500/10 text-yellow-400/70 border border-yellow-500/20" :
                      "bg-white/[0.05] text-[#7c7a8a] hover:text-white hover:bg-white/[0.08]"
                    }`}>
                    {i + 1}
                    {isF && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1 text-[9px] text-[#7c7a8a]"><span className="w-2 h-2 rounded-sm inline-block bg-[#6c63ff]/40" />Answered</span>
              <span className="flex items-center gap-1 text-[9px] text-[#7c7a8a]"><span className="w-2 h-2 rounded-sm inline-block bg-yellow-500/30" />Flagged</span>
              <span className="flex items-center gap-1 text-[9px] text-[#7c7a8a]"><span className="w-2 h-2 rounded-sm inline-block bg-white/[0.05]" />Unanswered</span>
            </div>
          </div>

          {/* Coach tip */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-[#00d4ff]" />
              <p className="text-xs font-semibold text-white">AI Career Coach</p>
            </div>
            <p className="text-xs text-[#7c7a8a] leading-relaxed">
              Answer each question based on your current knowledge. Your results will power a personalised learning roadmap.
            </p>
          </div>

          {/* Review shortcut */}
          <button onClick={onGoToReview}
            className="w-full glass-card rounded-xl py-3 text-xs font-semibold text-[#7c7a8a] hover:text-white flex items-center justify-center gap-2 transition-all hover:border-white/20">
            <Send size={12} /> Review &amp; Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Review Screen ──────────────────────────────────────────────────────── */

function QuizReview({
  template, answers, flagged, timeExpired, submitting,
  onBack, onGoToQuestion, onSubmit,
}: {
  template: QuizTemplate; answers: Record<string, string>; flagged: Set<string>;
  timeExpired: boolean; submitting: boolean;
  onBack: () => void; onGoToQuestion: (idx: number) => void; onSubmit: () => void;
}) {
  const total = template.questions.length;
  const answeredCount = Object.keys(answers).length;
  const unanswered = template.questions.map((q, i) => ({ q, i })).filter(({ q }) => !answers[q.id]);
  const flaggedList = template.questions.map((q, i) => ({ q, i })).filter(({ q }) => flagged.has(q.id));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="ai-chip text-[10px] font-semibold px-3 py-1 rounded-full inline-block mb-4">REVIEW</span>
        <h1 className="text-2xl font-bold text-white mb-1">Review Your Answers</h1>
        <p className="text-sm text-[#7c7a8a]">{template.goal} · {total} questions</p>
      </div>

      {timeExpired && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 font-medium">Time&apos;s up! You can no longer modify answers. Submit when ready.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#00d4ff]">{answeredCount}</p>
          <p className="text-[10px] text-[#7c7a8a] mt-0.5">Answered</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className={`text-2xl font-bold ${unanswered.length > 0 ? "text-red-400" : "text-[#00d4ff]"}`}>{unanswered.length}</p>
          <p className="text-[10px] text-[#7c7a8a] mt-0.5">Unanswered</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{flaggedList.length}</p>
          <p className="text-[10px] text-[#7c7a8a] mt-0.5">Flagged</p>
        </div>
      </div>

      {/* Unanswered warning */}
      {unanswered.length > 0 && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400 mb-1.5">{unanswered.length} unanswered question{unanswered.length > 1 ? "s" : ""}</p>
            {!timeExpired && (
              <div className="flex flex-wrap gap-1.5">
                {unanswered.map(({ q, i }) => (
                  <button key={q.id} onClick={() => onGoToQuestion(i)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
                    Q{i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flagged */}
      {flaggedList.length > 0 && !timeExpired && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-yellow-500/10">
          <Flag size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400 mb-1.5">Flagged for review</p>
            <div className="flex flex-wrap gap-1.5">
              {flaggedList.map(({ q, i }) => (
                <button key={q.id} onClick={() => onGoToQuestion(i)}
                  className="text-[11px] px-2.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                  Q{i + 1}: {q.topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All questions list */}
      <div className="glass-card rounded-2xl p-5 mb-6 max-h-80 overflow-y-auto">
        <p className="text-xs font-semibold text-white mb-3">All Questions</p>
        <div className="space-y-1.5">
          {template.questions.map((q, i) => {
            const ans = answers[q.id];
            const isF = flagged.has(q.id);
            return (
              <button key={q.id} onClick={() => !timeExpired && onGoToQuestion(i)} disabled={timeExpired}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${!timeExpired ? "hover:bg-white/[0.04] cursor-pointer" : "cursor-default"}`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${ans ? "bg-[#6c63ff]/20 text-[#a09aff]" : "bg-red-500/20 text-red-400"}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-xs text-[#7c7a8a] truncate">{q.question}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isF && <Flag size={10} className="text-yellow-400" />}
                  {ans ? (
                    <span className="text-[11px] font-bold text-[#a09aff] w-5 h-5 flex items-center justify-center rounded bg-[#6c63ff]/20">{ans}</span>
                  ) : (
                    <span className="text-[10px] text-red-400 font-mono">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!timeExpired && (
          <button onClick={onBack}
            className="flex-1 glass-card py-3.5 rounded-xl text-sm font-semibold text-[#7c7a8a] hover:text-white flex items-center justify-center gap-2 transition-all hover:border-white/20">
            <ChevronLeft size={16} /> Back to Quiz
          </button>
        )}
        <button onClick={onSubmit} disabled={submitting}
          className="flex-1 btn-primary py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Send size={16} /> Submit Quiz</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Quiz Results ───────────────────────────────────────────────────────── */

function QuizResults({ result, goal, onGenerateRoadmap, generating, error }: {
  result: QuizResult; goal: string; onGenerateRoadmap: () => void; generating: boolean; error: string;
}) {
  const pct = result.score;
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

        <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-2">Skill Distribution</p>
          <RadarChart skills={radarSkills} />
        </div>
      </div>

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

      {error && <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
      <button onClick={onGenerateRoadmap} disabled={generating}
        className="w-full btn-primary py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mb-3">
        {generating ? <><Loader2 size={18} className="animate-spin" /> Generating your roadmap…</> : <><Sparkles size={18} /> Generate My Personalized Roadmap</>}
      </button>
      <p className="text-center text-xs text-[#7c7a8a]">Privacy first — AI generates data-driven paths locally</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<AppStep>("loading");
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [existingGoal, setExistingGoal] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const startTimeRef = useRef<number>(0);
  const stepRef = useRef<AppStep>("loading");
  stepRef.current = step;

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const isChanging = params.get("change") === "1";
      try {
        const profile = await apiGet<{ career_goal: string | null }>("/api/v1/students/profile");
        if (profile.career_goal && !isChanging) {
          setExistingGoal(profile.career_goal);
          setStep("assessment");
        } else {
          setStep("goal");
        }
      } catch {
        setStep("goal");
      }
      apiGet<Attempt[]>("/api/v1/quiz/my-attempts").then(setAttempts).catch(() => {});
    }
    init();
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, timerActive]);

  // Auto-expire: go to review if still in quiz step
  useEffect(() => {
    if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      setTimeExpired(true);
      if (stepRef.current === "quiz") setStep("review");
    }
  }, [timeLeft, timerActive]);

  async function handleGoalSelect(goal: string) {
    setGoalLoading(true);
    setGoalError("");
    try {
      await apiPut("/api/v1/students/goal", { career_goal: goal });
      const tmpl = await apiGet<QuizTemplate>(`/api/v1/quiz/template/${encodeURIComponent(goal)}`);
      const t = tmpl.questions.length * SECS_PER_QUESTION;
      setTemplate(tmpl);
      setAnswers({});
      setCurrentIdx(0);
      setFlagged(new Set());
      setTimeLeft(t);
      setTotalTime(t);
      setTimerActive(true);
      setTimeExpired(false);
      startTimeRef.current = Date.now();
      setStep("quiz");
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally {
      setGoalLoading(false);
    }
  }

  function handleGoToQuestion(idx: number) {
    setCurrentIdx(idx);
    setStep("quiz");
  }

  async function handleSubmit() {
    if (!template) return;
    setSubmitting(true);
    setTimerActive(false);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const res = await apiPost<QuizResult>("/api/v1/quiz/attempt", {
        quiz_id: template.id,
        answers: Object.entries(answers).map(([question_id, selected_option]) => ({ question_id, selected_option })),
        time_taken_secs: timeTaken,
      });
      setResult(res);
      setStep("results");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFlag(qId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  }

  async function handleGenerateRoadmap() {
    setGenerating(true);
    setGenerateError("");
    try {
      await apiPost("/api/v1/roadmap/generate");
      router.push("/roadmap");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed");
      setGenerating(false);
    }
  }

  const isFullScreen = step === "quiz" || step === "review";

  return (
    <div className="min-h-screen bg-[#050508] flex">
      {!isFullScreen && <StudentNavbar />}
      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: isFullScreen ? 0 : "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        {step === "loading" && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={32} className="animate-spin text-[#6c63ff]" />
          </div>
        )}

        {step === "assessment" && existingGoal && (
          <>
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <span className="ai-chip text-[10px] font-semibold px-3 py-1 rounded-full inline-block mb-4">SKILL ASSESSMENT</span>
                <h1 className="text-2xl font-bold text-white mb-2">Ready to Assess?</h1>
                <p className="text-sm text-[#7c7a8a]">
                  Retake your assessment to track improvement. Each attempt adapts to your current level.
                </p>
              </div>

              {/* Current goal card */}
              <div className="glass-card rounded-2xl p-5 mb-6">
                <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-widest mb-2">Your Goal</p>
                <p className="text-xl font-bold text-white mb-1">{existingGoal}</p>
                <p className="text-xs text-[#7c7a8a]">Questions adapt to your skill level with every attempt</p>
              </div>

              {goalError && (
                <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{goalError}</p>
              )}

              <button
                onClick={() => handleGoalSelect(existingGoal)}
                disabled={goalLoading}
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-4 w-full justify-center"
              >
                {goalLoading ? <><Loader2 size={16} className="animate-spin" /> Generating quiz…</> : <><Sparkles size={16} /> Start Assessment</>}
              </button>

              <button
                onClick={() => {
                  if (!confirm("Changing your goal will archive your current roadmap. Are you sure?")) return;
                  setExistingGoal(null);
                  setStep("goal");
                }}
                className="w-full text-xs text-[#7c7a8a] hover:text-white py-2 transition-colors"
              >
                Change Goal
              </button>
            </div>

            {attempts.length > 0 && (
              <div className="max-w-2xl mx-auto mt-10">
                <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-3">Past Attempts</p>
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div key={a.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#7c7a8a]">
                          {new Date(a.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-sm text-white font-medium">{a.total_questions} questions · {formatTime(a.time_taken_secs ?? 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: a.score >= 70 ? "#00d4ff" : a.score >= 50 ? "#6c63ff" : "#e7c365" }}>{a.score}%</p>
                        <p className="text-[10px] text-[#7c7a8a]">{a.score >= 70 ? "Senior" : a.score >= 50 ? "Intermediate" : "Junior"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === "goal" && (
          <>
            <GoalSelect onSelect={handleGoalSelect} loading={goalLoading} error={goalError} />
            {attempts.length > 0 && (
              <div className="max-w-2xl mx-auto mt-10">
                <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-3">Past Attempts</p>
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div key={a.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#7c7a8a]">
                          {new Date(a.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-sm text-white font-medium">{a.total_questions} questions · {formatTime(a.time_taken_secs ?? 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: a.score >= 70 ? "#00d4ff" : a.score >= 50 ? "#6c63ff" : "#e7c365" }}>{a.score}%</p>
                        <p className="text-[10px] text-[#7c7a8a]">{a.score >= 70 ? "Senior" : a.score >= 50 ? "Intermediate" : "Junior"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === "quiz" && template && (
          <QuizInterface
            template={template} answers={answers} currentIdx={currentIdx}
            flagged={flagged} timeLeft={timeLeft} totalTime={totalTime} timeExpired={timeExpired}
            onAnswer={(qId, opt) => setAnswers((p) => ({ ...p, [qId]: opt }))}
            onNav={setCurrentIdx} onFlag={toggleFlag} onGoToReview={() => setStep("review")}
          />
        )}

        {step === "review" && template && (
          <QuizReview
            template={template} answers={answers} flagged={flagged}
            timeExpired={timeExpired} submitting={submitting}
            onBack={() => setStep("quiz")}
            onGoToQuestion={handleGoToQuestion}
            onSubmit={handleSubmit}
          />
        )}

        {step === "results" && result && template && (
          <QuizResults result={result} goal={template.goal}
            onGenerateRoadmap={handleGenerateRoadmap} generating={generating} error={generateError} />
        )}
      </main>
    </div>
  );
}
