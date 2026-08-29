"use client";

import { useEffect, useState } from "react";
import StudentNavbar from "../../../components/StudentNavbar";
import { TrendingUp, Brain, Clock, Target, Zap, Award, BarChart3, Loader2 } from "lucide-react";
import { apiGet } from "../../../lib/api";

interface QuizAttempt {
  id: string;
  score: number | null;
  total_questions: number;
  goal: string | null;
  completed_at: string | null;
}

interface SkillProfile {
  id: string;
  topic: string;
  level: string;
  score_pct: number;
}

interface StudentStats {
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

export default function AnalyticsPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [skills, setSkills] = useState<SkillProfile[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiGet<QuizAttempt[]>("/api/v1/quiz/my-attempts"),
      apiGet<SkillProfile[]>("/api/v1/students/skill-profile"),
      apiGet<StudentStats>("/api/v1/students/stats"),
    ]).then(([attemptsR, skillsR, statsR]) => {
      if (attemptsR.status === "fulfilled") setAttempts(attemptsR.value);
      if (skillsR.status === "fulfilled") setSkills(skillsR.value);
      if (statsR.status === "fulfilled") setStats(statsR.value);
    }).finally(() => setLoading(false));
  }, []);

  const chartData = [...attempts].slice(0, 6).reverse();
  const maxScore = chartData.length ? Math.max(...chartData.map((q) => q.score ?? 0), 1) : 1;
  const skillBars = skills
    .map((s) => ({ topic: s.topic, pct: s.score_pct, color: s.level === "strong" ? "#6c63ff" : s.level === "intermediate" ? "#00d4ff" : "#e7c365" }))
    .sort((a, b) => b.pct - a.pct);

  const statCards = [
    { label: "Quizzes Taken", value: String(attempts.length), icon: Brain, color: "#6c63ff" },
    { label: "Best Score", value: attempts.length ? `${Math.max(...attempts.map((a) => a.score ?? 0))}%` : "0%", icon: Award, color: "#00d4ff" },
    { label: "Topics Assessed", value: String(skills.length), icon: Target, color: "#e7c365" },
    { label: "Hours Learning", value: stats ? `${Math.max(stats.streak_days, 0)}d` : "0d", icon: Clock, color: "#6c63ff" },
  ];

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />
      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Learning Analytics</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Track your skill growth and quiz performance over time.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((s) => (
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
                <div className="glass-card rounded-2xl p-6">
                  <p className="text-sm font-semibold text-white mb-1">Score Progression</p>
                  <p className="text-xs text-[#7c7a8a] mb-5">Recent quiz performance</p>
                  {chartData.length > 0 ? (
                    <>
                      <div className="flex items-end gap-3 h-32">
                        {chartData.map((q, i) => (
                          <div key={q.id ?? i} className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-bold" style={{ color: (q.score ?? 0) >= 70 ? "#00d4ff" : (q.score ?? 0) >= 50 ? "#6c63ff" : "#e7c365" }}>
                              {q.score ?? 0}%
                            </span>
                            <div
                              className="w-full rounded-t-lg"
                              style={{
                                height: `${(((q.score ?? 0) / maxScore) * 100)}%`,
                                background: (q.score ?? 0) >= 70 ? "linear-gradient(180deg,#00d4ff,#6c63ff)" : "linear-gradient(180deg,#6c63ff80,#6c63ff30)",
                                minHeight: 4,
                              }}
                            />
                            <span className="text-[9px] text-[#7c7a8a]">{q.completed_at ? new Date(q.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-[#00d4ff] bg-[#00d4ff]/5 border border-[#00d4ff]/10 rounded-xl px-3 py-2">
                        <TrendingUp size={13} />
                        <span>Based on your latest quiz attempts</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-sm text-[#7c7a8a]">No quiz history yet</div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <p className="text-sm font-semibold text-white mb-1">Skill Breakdown</p>
                  <p className="text-xs text-[#7c7a8a] mb-5">Latest assessment results</p>
                  {skillBars.length > 0 ? (
                    <div className="space-y-3.5">
                      {skillBars.map((s) => (
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
                  ) : (
                    <div className="flex items-center justify-center h-32 text-sm text-[#7c7a8a]">No skills assessed yet</div>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-[#6c63ff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Progress Summary</p>
                  <p className="text-sm text-[#7c7a8a] leading-relaxed">
                    {skillBars.length > 0 ? `Your strongest area is ${skillBars[0].topic} at ${skillBars[0].pct}%. Continue practicing to improve your overall score.` : "Take a quiz to generate your first learning analytics."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
