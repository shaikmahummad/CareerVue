"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, BookOpen, GraduationCap, DollarSign,
  TrendingUp, CheckCircle, Clock, Loader2, ArrowRight,
} from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet } from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_users: number;
  total_students: number;
  total_tutors: number;
  total_courses: number;
  total_revenue: number;
  total_enrollments: number;
}

interface Analytics {
  revenue_by_month: { year: number; month: number; revenue: number; payment_count: number }[];
  enrollments_by_category: { category: string; enrollments: number }[];
  top_courses: { id: string; title: string; category: string | null; enrolled_count: number; avg_rating: number }[];
}

interface PendingCourse {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  tutor: { full_name: string; email: string } | null;
  created_at: string | null;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, value, label, color, bg, subtext,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  bg: string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

// ─── Pending approvals preview ────────────────────────────────────────────────

function PendingApprovalsList({ courses }: { courses: PendingCourse[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-700">Pending Approvals</p>
          {courses.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {courses.length}
            </span>
          )}
        </div>
        <Link href="/admin/courses?filter=pending" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle size={28} className="text-emerald-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No pending courses — all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.slice(0, 5).map((course) => (
            <Link
              key={course.id}
              href="/admin/courses?filter=pending"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {course.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  by {course.tutor?.full_name ?? "Unknown tutor"}
                  {course.category ? ` · ${course.category}` : ""}
                </p>
              </div>
              <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                {course.is_free ? "Free" : `₹${course.price}`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top courses ──────────────────────────────────────────────────────────────

function TopCourses({ courses }: { courses: Analytics["top_courses"] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Top Courses by Enrollment</p>
      {courses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-3">
          {courses.slice(0, 6).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate font-medium">{c.title}</p>
                {c.category && <p className="text-xs text-gray-400">{c.category}</p>}
              </div>
              <span className="text-xs font-semibold text-blue-600 flex-shrink-0">
                {c.enrolled_count} enrolled
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Enrollments by category ──────────────────────────────────────────────────

function EnrollmentsByCategory({ data }: { data: Analytics["enrollments_by_category"] }) {
  const max = Math.max(...data.map((d) => d.enrollments), 1);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Enrollments by Category</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-3">
          {data.map(({ category, enrollments }) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{category}</span>
                <span className="text-xs text-gray-500">{enrollments}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(enrollments / max) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</p>
      <div className="space-y-2">
        <Link
          href="/admin/courses?filter=pending"
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Review Pending Courses</span>
          </div>
          {pendingCount > 0 && (
            <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </Link>
        <Link
          href="/admin/courses"
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <BookOpen size={15} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">All Courses</span>
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <Users size={15} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Manage Users</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pending, setPending] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiGet<DashboardStats>("/api/v1/admin/dashboard"),
      apiGet<Analytics>("/api/v1/admin/analytics"),
      apiGet<PendingCourse[]>("/api/v1/admin/courses/pending"),
    ]).then(([statsR, analyticsR, pendingR]) => {
      if (statsR.status === "fulfilled")    setStats(statsR.value);
      if (analyticsR.status === "fulfilled") setAnalytics(analyticsR.value);
      if (pendingR.status === "fulfilled")   setPending(pendingR.value);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and management.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              {[
                { icon: Users,         value: stats?.total_users ?? 0,                              label: "Total Users",       color: "text-blue-600",    bg: "bg-blue-50" },
                { icon: GraduationCap, value: stats?.total_students ?? 0,                           label: "Students",          color: "text-violet-600",  bg: "bg-violet-50" },
                { icon: BookOpen,      value: stats?.total_tutors ?? 0,                             label: "Tutors",            color: "text-indigo-600",  bg: "bg-indigo-50" },
                { icon: BookOpen,      value: stats?.total_courses ?? 0,                            label: "Courses",           color: "text-sky-600",     bg: "bg-sky-50" },
                { icon: TrendingUp,    value: stats?.total_enrollments ?? 0,                        label: "Enrollments",       color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: DollarSign,    value: `₹${(stats?.total_revenue ?? 0).toLocaleString()}`,   label: "Total Revenue",     color: "text-amber-600",   bg: "bg-amber-50" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <StatCard {...s} />
                </motion.div>
              ))}
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left — pending + top courses */}
              <div className="lg:col-span-2 space-y-5">
                <PendingApprovalsList courses={pending} />
                {analytics && <TopCourses courses={analytics.top_courses} />}
              </div>

              {/* Right — category breakdown + actions */}
              <div className="space-y-5">
                <QuickActions pendingCount={pending.length} />
                {analytics && <EnrollmentsByCategory data={analytics.enrollments_by_category} />}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
