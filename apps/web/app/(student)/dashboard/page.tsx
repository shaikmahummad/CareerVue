"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Flame, BookOpen, Trophy, ChevronRight,
  ArrowRight, Loader2, Map, Brain, Star,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";

interface Stats { xp_points: number; streak_days: number; enrolled_count: number; completed_count: number; }
interface EnrollmentCourse { id: string; title: string; thumbnail_url: string | null; category: string | null; level: string | null; is_free: boolean; }
interface Enrollment { id: string; course_id: string; enrolled_at: string; completed_at: string | null; progress_pct: number; course?: EnrollmentCourse; }
interface RoadmapItem { id: string; topic: string; priority: string; status: string; order_index: number; }
interface Roadmap { id: string; goal: string; items: RoadmapItem[]; }

/* ─── Skill Radar (simple SVG pentagon) ──────────────────────────────────── */

function SkillRadar({ skills }: { skills: { label: string; value: number }[] }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const n = skills.length;

  function point(i: number, val: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rv = (val / 100) * r;
    return { x: cx + rv * Math.cos(angle), y: cy + rv * Math.sin(angle) };
  }
  function gridPoint(i: number, scale: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + scale * r * Math.cos(angle), y: cy + scale * r * Math.sin(angle) };
  }

  const dataPoints = skills.map((s, i) => point(i, s.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labelPoints = skills.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lx = cx + (r + 18) * Math.cos(angle);
    const ly = cy + (r + 18) * Math.sin(angle);
    return { label: s.label, x: lx, y: ly };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((scale) => {
        const pts = Array.from({ length: n }, (_, i) => gridPoint(i, scale));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return <path key={scale} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const end = gridPoint(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(108,99,255,0.2)" stroke="#6c63ff" strokeWidth="1.5" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6c63ff" />
      ))}
      {labelPoints.map((lp) => (
        <text key={lp.label} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="#7c7a8a">
          {lp.label}
        </text>
      ))}
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, value, label, sub, accent }: {
  icon: React.ElementType; value: string | number; label: string; sub?: string; accent: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, border: `1px solid ${accent}25` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-[#7c7a8a]">{label}</p>
        {sub && <p className="text-[10px] text-[#6c63ff] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActivePathCard({ roadmap }: { roadmap: Roadmap | null }) {
  if (!roadmap) return (
    <div className="glass-card rounded-2xl p-6">
      <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-wider mb-2">ACTIVE PATH</p>
      <div className="text-center py-6">
        <Map size={28} className="text-[#7c7a8a] mx-auto mb-3" />
        <p className="text-sm text-[#7c7a8a] mb-3">No roadmap yet</p>
        <Link href="/quiz" className="btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5">
          <Brain size={12} /> Take the Quiz
        </Link>
      </div>
    </div>
  );

  const done = roadmap.items.filter((i) => i.status === "completed").length;
  const total = roadmap.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-wider mb-1">ACTIVE PATH</p>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{roadmap.goal}</h3>
        <Link href="/roadmap" className="btn-primary text-xs px-4 py-2 rounded-xl flex-shrink-0 ml-3">
          Continue Learning
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }} className="h-full gradient-primary rounded-full" />
        </div>
        <span className="text-xs text-[#7c7a8a] flex-shrink-0">{pct}% Completed</span>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {roadmap.items.slice(0, 6).map((item, i) => (
          <div key={item.id} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
            ${item.status === "completed" ? "gradient-primary text-white" : "bg-white/[0.05] border border-white/[0.1] text-[#7c7a8a]"}`}>
            {i + 1}
          </div>
        ))}
        {total > 6 && (
          <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[10px] text-[#7c7a8a]">
            +{total - 6}
          </div>
        )}
      </div>
    </div>
  );
}

function CurrentLearning({ enrollments }: { enrollments: Enrollment[] }) {
  const active = enrollments.filter((e) => !e.completed_at).slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Current Learning</h3>
        <Link href="/courses" className="text-xs text-[#6c63ff] hover:text-[#00d4ff] transition-colors flex items-center gap-1">
          View all <ChevronRight size={12} />
        </Link>
      </div>
      {active.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <BookOpen size={28} className="text-[#7c7a8a] mx-auto mb-3" />
          <p className="text-sm text-[#7c7a8a] mb-3">No active courses</p>
          <Link href="/courses" className="btn-primary text-xs px-4 py-2 rounded-xl inline-block">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {active.map((e, i) => (
            <Link key={e.id} href={`/courses/${e.course_id}/learn`}
              className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-[#6c63ff]/30 transition-all group">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${["#6c63ff", "#00d4ff", "#6c63ff"][i]}18, #0d0d14)` }}>
                <BookOpen size={20} className="text-[#7c7a8a]" />
                {e.course?.level && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold text-[#6c63ff] bg-[#6c63ff]/10 px-1 rounded">
                    {e.course.level.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-[#6c63ff] transition-colors">
                  {e.course?.title ?? "Course"}
                </p>
                <p className="text-[11px] text-[#7c7a8a] mb-2">{e.course?.category ?? ""}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full gradient-primary rounded-full" style={{ width: `${e.progress_pct ?? 0}%` }} />
                  </div>
                  <span className="text-[10px] text-[#7c7a8a] flex-shrink-0">{e.progress_pct ?? 0}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendedSection() {
  const recs = [
    { title: "Docker for Devs", sub: "Based on your profile" },
    { title: "AWS Essentials", sub: "Popular in your roadmap" },
    { title: "VueJS for Devs", sub: "Hot this week" },
  ];
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-semibold text-white mb-4">Recommended for You</p>
      <div className="space-y-3">
        {recs.map((r) => (
          <div key={r.title} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen size={13} className="text-[#6c63ff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate group-hover:text-[#6c63ff] transition-colors">{r.title}</p>
              <p className="text-[10px] text-[#7c7a8a]">{r.sub}</p>
            </div>
            <ChevronRight size={12} className="text-[#7c7a8a] flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function StudentDashboardPage() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name as string | undefined;
      setName(fullName?.split(" ")[0] ?? "there");

      const [statsR, enrollR, roadmapR] = await Promise.allSettled([
        apiGet<Stats>("/api/v1/students/stats"),
        apiGet<Enrollment[]>("/api/v1/enrollments/mine"),
        apiGet<Roadmap>("/api/v1/roadmap/mine"),
      ]);
      if (statsR.status === "fulfilled") setStats(statsR.value);
      if (enrollR.status === "fulfilled") setEnrollments(enrollR.value);
      if (roadmapR.status === "fulfilled") setRoadmap(roadmapR.value);
      setLoading(false);
    }
    loadAll();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const SKILL_DATA = [
    { label: "React", value: 82 },
    { label: "Node", value: 65 },
    { label: "Python", value: 54 },
    { label: "SQL", value: 70 },
    { label: "DSA", value: 42 },
  ];

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />

      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}{name ? `, ${name}` : ""} 👋
            </h1>
            <p className="text-sm text-[#7c7a8a] mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-[#7c7a8a] hover:text-white transition-colors">
              <Star size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Zap,      value: stats?.xp_points ?? 0,          label: "Total XP",        sub: "+12% this week", accent: "#e7c365" },
                { icon: Flame,    value: `${stats?.streak_days ?? 0} Days`, label: "Daily Streak",  sub: "Keep it up!", accent: "#ff6b35" },
                { icon: BookOpen, value: stats?.enrolled_count ?? 0,      label: "Active Courses",  sub: undefined, accent: "#6c63ff" },
                { icon: Trophy,   value: stats?.completed_count ?? 0,     label: "Certificates",   sub: undefined, accent: "#00d4ff" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <StatCard {...s} />
                </motion.div>
              ))}
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left — active path + current learning */}
              <div className="lg:col-span-2 space-y-6">
                <ActivePathCard roadmap={roadmap} />
                <CurrentLearning enrollments={enrollments} />
              </div>

              {/* Right — skill radar + recommendations */}
              <div className="space-y-5">
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-white">Skill Profile</p>
                    <span className="ai-chip text-[9px] font-semibold px-2 py-0.5 rounded-full">AI ANALYSED</span>
                  </div>
                  <div className="flex justify-center py-3">
                    <SkillRadar skills={SKILL_DATA} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { label: "Top Skill", value: "Frontend (React)" },
                      { label: "Improve Area", value: "SQL Optimisation" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/[0.03] rounded-xl p-2.5">
                        <p className="text-[10px] text-[#7c7a8a]">{item.label}</p>
                        <p className="text-xs font-medium text-white mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <RecommendedSection />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
