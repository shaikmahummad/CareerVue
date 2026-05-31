"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, BookOpen, GraduationCap, DollarSign,
  TrendingUp, CheckCircle, Clock, Loader2, ArrowRight, AlertCircle,
} from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet } from "../../../../lib/api";

interface DashboardStats {
  total_users: number; total_students: number; total_tutors: number;
  total_courses: number; total_revenue: number; total_enrollments: number;
}
interface Analytics {
  revenue_by_month: { year: number; month: number; revenue: number; payment_count: number }[];
  enrollments_by_category: { category: string; enrollments: number }[];
  top_courses: { id: string; title: string; category: string | null; enrolled_count: number; avg_rating: number }[];
}
interface PendingCourse {
  id: string; title: string; category: string | null; level: string | null;
  is_free: boolean; price: number; tutor: { full_name: string; email: string } | null; created_at: string | null;
}

/* ─── User Growth Bars ───────────────────────────────────────────────────── */
function GrowthChart() {
  const weeks = ["WEEK 1", "WEEK 2", "WEEK 3", "WEEK 4"];
  const vals = [42, 65, 88, 120];
  const max = Math.max(...vals);
  return (
    <div className="flex items-end gap-3 h-28">
      {weeks.map((w, i) => (
        <div key={w} className="flex-1 flex flex-col items-center gap-1.5">
          <motion.div
            initial={{ height: 0 }} animate={{ height: `${(vals[i] / max) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="w-full rounded-t-lg relative overflow-hidden"
            style={{ background: `linear-gradient(180deg, #6c63ff 0%, #00d4ff 100%)`, opacity: 0.7 + i * 0.08 }}
          />
          <span className="text-[9px] text-[#7c7a8a]">{w}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Donut Chart ────────────────────────────────────────────────────────── */
function CourseDonut({ data }: { data: Analytics["enrollments_by_category"] }) {
  const colors = ["#6c63ff", "#00d4ff", "#e7c365"];
  const total = data.reduce((a, b) => a + b.enrollments, 0) || 1;
  let cumAngle = 0;

  function describeArc(startAngle: number, endAngle: number) {
    const r = 55; const cx = 70; const cy = 70;
    const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  const segments = data.slice(0, 3).map((d, i) => {
    const angle = (d.enrollments / total) * 360;
    const path = describeArc(cumAngle, cumAngle + angle);
    cumAngle += angle;
    return { path, color: colors[i], label: d.category, value: d.enrollments };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-28 h-28 flex-shrink-0">
        {segments.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.85" />)}
        <circle cx="70" cy="70" r="30" fill="#0d0d14" />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" dominantBaseline="middle" fill="#7c7a8a" fontSize="7">
          Total
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-[#7c7a8a] truncate max-w-[100px]">{s.label}</span>
            <span className="text-[11px] font-semibold text-white ml-auto">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      if (statsR.status === "fulfilled") setStats(statsR.value);
      if (analyticsR.status === "fulfilled") setAnalytics(analyticsR.value);
      if (pendingR.status === "fulfilled") setPending(pendingR.value);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <AdminNavbar />
      <main className="flex-1 ml-60 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">Admin Dashboard</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">Platform Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <input placeholder="Global Search…"
                className="w-full bg-[#0d0d14] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:border-[#6c63ff] transition-colors" />
            </div>
          </div>
        </div>

        {/* Alert banner */}
        {pending.length > 0 && (
          <div className="mb-6 flex items-center justify-between glass-card rounded-xl px-5 py-3.5 border border-[#e7c365]/20 bg-[#e7c365]/5">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-[#e7c365]" />
              <span className="text-sm text-[#e6e0e9]">
                <span className="font-semibold">{pending.length} courses awaiting approval</span> — Quality assurance review needed for newly submitted content.
              </span>
            </div>
            <Link href="/admin/approvals"
              className="text-xs font-semibold text-[#e7c365] bg-[#e7c365]/10 border border-[#e7c365]/20 px-3 py-1.5 rounded-lg hover:bg-[#e7c365]/20 transition-colors flex-shrink-0 ml-4">
              Review Now
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { icon: Users,         value: stats?.total_users ?? 0,                                label: "Total Users",     accent: "#6c63ff" },
                { icon: GraduationCap, value: stats?.total_students ?? 0,                             label: "Active Students", accent: "#00d4ff" },
                { icon: TrendingUp,    value: stats?.total_tutors ?? 0,                               label: "Tutors",          accent: "#6c63ff" },
                { icon: BookOpen,      value: stats?.total_courses ?? 0,                              label: "Total Courses",   accent: "#e7c365" },
                { icon: DollarSign,    value: `₹${((stats?.total_revenue ?? 0) / 1000).toFixed(1)}k`, label: "Monthly Revenue", accent: "#00d4ff" },
                { icon: CheckCircle,   value: stats?.total_enrollments ?? 0,                          label: "Enrollments",     accent: "#6c63ff" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${s.accent}18`, border: `1px solid ${s.accent}25` }}>
                        <s.icon size={15} style={{ color: s.accent }} />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-[#7c7a8a] mt-0.5">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Growth chart */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider">User Growth Signups</p>
                    <p className="text-xs text-[#7c7a8a] mt-0.5">Past 30 days growth performance</p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 px-2.5 py-1 rounded-full border border-[#6c63ff]/20">
                    Last 30 Days
                  </span>
                </div>
                <GrowthChart />
              </div>

              {/* Donut */}
              <div className="glass-card rounded-2xl p-6">
                <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-1">Course Distribution</p>
                <p className="text-xs text-[#7c7a8a] mb-4">Active categories share</p>
                {analytics?.enrollments_by_category && analytics.enrollments_by_category.length > 0 ? (
                  <CourseDonut data={analytics.enrollments_by_category} />
                ) : (
                  <div className="flex items-center justify-center h-28 text-[#7c7a8a] text-sm">
                    No data yet
                  </div>
                )}
              </div>
            </div>

            {/* Pending courses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Recent Course Submissions</h2>
                <Link href="/admin/approvals" className="text-xs text-[#6c63ff] hover:text-[#00d4ff] transition-colors flex items-center gap-1">
                  View All Requests <ArrowRight size={11} />
                </Link>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                {pending.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle size={28} className="text-emerald-400/50 mx-auto mb-3" />
                    <p className="text-sm text-[#7c7a8a]">No pending approvals — all caught up!</p>
                  </div>
                ) : (
                  <div>
                    {pending.slice(0, 5).map((course, i) => (
                      <div key={course.id}
                        className={`flex items-center gap-4 px-5 py-4 ${i < pending.length - 1 ? "border-b border-white/[0.05]" : ""} hover:bg-white/[0.02] transition-colors`}>
                        <div className="w-8 h-8 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={14} className="text-[#6c63ff]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{course.title}</p>
                          <p className="text-xs text-[#7c7a8a]">
                            By {course.tutor?.full_name ?? "Unknown"} · {course.category ?? "Uncategorised"}
                          </p>
                        </div>
                        <span className="text-xs text-[#7c7a8a] flex-shrink-0">
                          {course.created_at ? new Date(course.created_at).toLocaleDateString() : "—"}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link href="/admin/approvals"
                            className="text-[10px] font-semibold text-[#7c7a8a] bg-white/[0.05] border border-white/[0.1] px-3 py-1.5 rounded-lg hover:text-white transition-colors">
                            Details
                          </Link>
                          <Link href="/admin/approvals"
                            className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 border border-[#6c63ff]/20 px-3 py-1.5 rounded-lg hover:bg-[#6c63ff]/20 transition-colors">
                            Review
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
