"use client";

import StudentNavbar from "../../../components/StudentNavbar";
import { TrendingUp, Brain, Clock, Target, Zap, BookOpen, Award, BarChart3 } from "lucide-react";

const QUIZ_HISTORY = [
  { date: "May 15", score: 42, level: "Junior" },
  { date: "May 22", score: 58, level: "Intermediate" },
  { date: "May 29", score: 71, level: "Intermediate" },
  { date: "Jun 3",  score: 84, level: "Senior" },
];

const SKILL_BARS = [
  { topic: "React & Hooks",        pct: 84, color: "#6c63ff" },
  { topic: "TypeScript",           pct: 72, color: "#00d4ff" },
  { topic: "Node.js & APIs",       pct: 61, color: "#e7c365" },
  { topic: "Databases & SQL",      pct: 53, color: "#6c63ff" },
  { topic: "System Design",        pct: 38, color: "#00d4ff" },
  { topic: "Testing",              pct: 29, color: "#e7c365" },
];

const STATS = [
  { label: "Quizzes Taken",    value: "4",     icon: Brain,    color: "#6c63ff" },
  { label: "Best Score",       value: "84%",   icon: Award,    color: "#00d4ff" },
  { label: "Topics Assessed",  value: "12",    icon: Target,   color: "#e7c365" },
  { label: "Hours Learning",   value: "14h",   icon: Clock,    color: "#6c63ff" },
];

export default function AnalyticsPage() {
  const maxScore = Math.max(...QUIZ_HISTORY.map(q => q.score));

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Learning Analytics</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Track your skill growth and quiz performance over time.</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Score trend */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Score Progression</p>
              <p className="text-xs text-[#7c7a8a] mb-5">Your quiz scores are improving each attempt</p>
              <div className="flex items-end gap-3 h-32">
                {QUIZ_HISTORY.map((q, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold" style={{ color: q.score >= 70 ? "#00d4ff" : q.score >= 50 ? "#6c63ff" : "#e7c365" }}>
                      {q.score}%
                    </span>
                    <div
                      className="w-full rounded-t-lg"
                      style={{
                        height: `${(q.score / maxScore) * 100}%`,
                        background: q.score >= 70 ? "linear-gradient(180deg,#00d4ff,#6c63ff)" : "linear-gradient(180deg,#6c63ff80,#6c63ff30)",
                        minHeight: 4,
                      }}
                    />
                    <span className="text-[9px] text-[#7c7a8a]">{q.date}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#00d4ff] bg-[#00d4ff]/5 border border-[#00d4ff]/10 rounded-xl px-3 py-2">
                <TrendingUp size={13} />
                <span>+42 points improvement since first attempt</span>
              </div>
            </div>

            {/* Skill breakdown */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Skill Breakdown</p>
              <p className="text-xs text-[#7c7a8a] mb-5">Based on your latest assessment results</p>
              <div className="space-y-3.5">
                {SKILL_BARS.map((s) => (
                  <div key={s.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#cbc4d2]">{s.topic}</span>
                      <span className="text-xs font-semibold" style={{ color: s.color }}>{s.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Improvement tip */}
          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-[#6c63ff]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">AI Recommendation</p>
              <p className="text-sm text-[#7c7a8a] leading-relaxed">
                Your weakest areas are <span className="text-white font-medium">System Design</span> and <span className="text-white font-medium">Testing</span>.
                Retaking your assessment after studying these topics could push your score above 90%.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
