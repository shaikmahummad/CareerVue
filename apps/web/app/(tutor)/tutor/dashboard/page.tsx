"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Users, Star, DollarSign, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, PlusCircle,
  ArrowRight, Loader2,
} from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { apiGet } from "../../../../lib/api";
import { createClient } from "../../../../lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Analytics {
  total_students: number;
  total_earnings: number;
  avg_rating: number;
  courses_count: number;
  courses_by_status: {
    draft: number;
    pending_approval: number;
    approved: number;
    rejected: number;
  };
}

interface Course {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  status: string;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  thumbnail_url: string | null;
  created_at: string | null;
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
  value: string | number;
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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Draft",           color: "text-gray-600 bg-gray-100",    icon: Clock },
  pending_approval: { label: "Under Review",    color: "text-amber-700 bg-amber-50",   icon: AlertCircle },
  approved:         { label: "Published",       color: "text-emerald-700 bg-emerald-50", icon: CheckCircle },
  rejected:         { label: "Rejected",        color: "text-red-700 bg-red-50",       icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Recent courses table ─────────────────────────────────────────────────────

function RecentCourses({ courses }: { courses: Course[] }) {
  const recent = courses.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">Recent Courses</p>
        <Link href="/tutor/courses" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-3">No courses yet</p>
          <Link
            href="/tutor/courses/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={14} /> Create your first course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((course) => (
            <Link
              key={course.id}
              href={`/tutor/courses/${course.id}/edit`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={14} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {course.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={course.status} />
                  <span className="text-xs text-gray-400">{course.enrolled_count} enrolled</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0 text-right">
                {course.is_free ? (
                  <span className="text-emerald-600 font-medium">Free</span>
                ) : (
                  <span>₹{course.price}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status breakdown ─────────────────────────────────────────────────────────

function StatusBreakdown({ breakdown }: { breakdown: Analytics["courses_by_status"] }) {
  const items = [
    { key: "approved",         label: "Published",    color: "bg-emerald-500" },
    { key: "pending_approval", label: "Under Review", color: "bg-amber-400" },
    { key: "draft",            label: "Draft",        color: "bg-gray-300" },
    { key: "rejected",         label: "Rejected",     color: "bg-red-400" },
  ] as const;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Course Status</p>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No courses yet</p>
      ) : (
        <>
          <div className="flex h-2 rounded-full overflow-hidden mb-4">
            {items.map(({ key, color }) =>
              breakdown[key] > 0 ? (
                <div
                  key={key}
                  className={`${color} transition-all`}
                  style={{ width: `${(breakdown[key] / total) * 100}%` }}
                />
              ) : null
            )}
          </div>
          <div className="space-y-2">
            {items.map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
                <span className="text-xs font-medium text-gray-900">{breakdown[key]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</p>
      <div className="space-y-2">
        <Link
          href="/tutor/courses/new"
          className="flex items-center gap-3 p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={16} />
          <span className="text-sm font-medium">Create New Course</span>
        </Link>
        <Link
          href="/tutor/courses"
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <BookOpen size={16} />
          <span className="text-sm font-medium">Manage Courses</span>
        </Link>
        <Link
          href="/tutor/profile"
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <TrendingUp size={16} />
          <span className="text-sm font-medium">Edit Profile</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TutorDashboardPage() {
  const [name, setName] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name as string | undefined;
      setName(fullName?.split(" ")[0] ?? "there");

      const [analyticsR, coursesR] = await Promise.allSettled([
        apiGet<Analytics>("/api/v1/tutors/analytics"),
        apiGet<Course[]>("/api/v1/courses/my-courses"),
      ]);

      if (analyticsR.status === "fulfilled") setAnalytics(analyticsR.value);
      if (coursesR.status === "fulfilled") setCourses(coursesR.value);
      setLoading(false);
    }
    load();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <TutorNavbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{name ? `, ${name}` : ""}!
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your teaching overview.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users,       value: analytics?.total_students ?? 0,                          label: "Total Students", color: "text-blue-600",    bg: "bg-blue-50" },
                { icon: BookOpen,    value: analytics?.courses_count ?? 0,                           label: "Total Courses",  color: "text-violet-600",  bg: "bg-violet-50" },
                { icon: Star,        value: analytics?.avg_rating ? analytics.avg_rating.toFixed(1) : "—", label: "Avg Rating",     color: "text-amber-600",   bg: "bg-amber-50" },
                { icon: DollarSign,  value: `₹${(analytics?.total_earnings ?? 0).toLocaleString()}`, label: "Total Earnings", color: "text-emerald-600", bg: "bg-emerald-50" },
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
              <div className="lg:col-span-3">
                <RecentCourses courses={courses} />
              </div>
              <div className="lg:col-span-2 space-y-5">
                {analytics && <StatusBreakdown breakdown={analytics.courses_by_status} />}
                <QuickActions />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
