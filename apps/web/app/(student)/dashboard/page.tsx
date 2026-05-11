"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Flame, BookOpen, Trophy, ChevronRight,
  ArrowRight, Loader2, Map, Brain,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

interface EnrollmentCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
}

interface Enrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_pct: number;
  course?: EnrollmentCourse;
}

interface RoadmapItem {
  id: string;
  topic: string;
  priority: string;
  status: string;
  order_index: number;
}

interface Roadmap {
  id: string;
  goal: string;
  items: RoadmapItem[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Continue learning card ───────────────────────────────────────────────────

function ContinueLearningCard({ enrollment }: { enrollment: Enrollment }) {
  const course = enrollment.course;
  const pct = enrollment.progress_pct ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Continue Learning
      </p>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-violet-100 flex items-center justify-center flex-shrink-0">
          <BookOpen size={22} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
            {course?.title ?? "Untitled Course"}
          </p>
          {course?.category && (
            <p className="text-xs text-gray-400 mb-2">{course.category}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{pct}%</span>
          </div>
        </div>
      </div>
      <Link
        href={`/courses/${enrollment.course_id}/learn`}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Continue <ArrowRight size={14} />
      </Link>
    </div>
  );
}

// ─── Recent enrollments ───────────────────────────────────────────────────────

function RecentEnrollments({ enrollments }: { enrollments: Enrollment[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">My Courses</p>
        <Link href="/courses" className="text-xs text-blue-600 hover:underline">
          Browse more
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-6">
          <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No courses yet</p>
          <Link href="/courses" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.slice(0, 5).map((e) => (
            <Link
              key={e.id}
              href={`/courses/${e.course_id}/learn`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={14} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {e.course?.title ?? "Course"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        e.completed_at ? "bg-emerald-500" : "bg-blue-400"
                      }`}
                      style={{ width: `${e.progress_pct ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {e.completed_at ? "✓ Done" : `${e.progress_pct ?? 0}%`}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Roadmap preview ──────────────────────────────────────────────────────────

function RoadmapPreview({ roadmap }: { roadmap: Roadmap | null }) {
  if (!roadmap) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">My Roadmap</p>
        <div className="text-center py-4">
          <Map size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-3">No roadmap yet</p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Brain size={12} /> Take the quiz
          </Link>
        </div>
      </div>
    );
  }

  const pending = roadmap.items.filter((i) => i.status !== "completed");
  const done = roadmap.items.filter((i) => i.status === "completed").length;
  const total = roadmap.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Roadmap</p>
        <Link href="/roadmap" className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>

      <p className="text-sm font-semibold text-gray-800 mb-2">{roadmap.goal}</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{done}/{total}</span>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Up next:</p>
          {pending.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                item.priority === "high" ? "bg-red-400" :
                item.priority === "medium" ? "bg-orange-400" : "bg-green-400"
              }`} />
              <span className="text-sm text-gray-600 truncate">{item.topic}</span>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <p className="text-xs text-emerald-600 font-medium">🎉 All topics completed!</p>
      )}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    { href: "/quiz",     icon: "🧠", label: "Skill Quiz",    desc: "Assess your current level" },
    { href: "/roadmap",  icon: "🗺️", label: "My Roadmap",   desc: "View learning path" },
    { href: "/courses",  icon: "📚", label: "Browse Courses", desc: "Find new courses" },
    { href: "/profile",  icon: "👤", label: "My Profile",    desc: "Edit your details" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
      <div className="space-y-1">
        {actions.map(({ href, icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <span className="text-xl w-8 text-center">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                {label}
              </p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      // Get user name from session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name as string | undefined;
      setName(fullName?.split(" ")[0] ?? "there");

      // Load everything in parallel, failing gracefully
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

  // Most recent incomplete enrollment for "Continue Learning"
  const inProgress = enrollments
    .filter((e) => !e.completed_at)
    .sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())[0];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{name ? `, ${name}` : ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your learning overview.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Zap,      value: stats?.xp_points ?? 0,       label: "XP Points",       color: "text-yellow-600", bg: "bg-yellow-50" },
                { icon: Flame,    value: `${stats?.streak_days ?? 0}d`, label: "Streak",          color: "text-orange-600", bg: "bg-orange-50" },
                { icon: BookOpen, value: stats?.enrolled_count ?? 0,   label: "Enrolled",        color: "text-blue-600",   bg: "bg-blue-50" },
                { icon: Trophy,   value: stats?.completed_count ?? 0,  label: "Completed",       color: "text-emerald-600",bg: "bg-emerald-50" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <StatCard {...s} />
                </motion.div>
              ))}
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left — activity */}
              <div className="lg:col-span-3 space-y-5">
                {inProgress && <ContinueLearningCard enrollment={inProgress} />}
                <RecentEnrollments enrollments={enrollments} />
              </div>

              {/* Right — roadmap + actions */}
              <div className="lg:col-span-2 space-y-5">
                <RoadmapPreview roadmap={roadmap} />
                <QuickActions />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
