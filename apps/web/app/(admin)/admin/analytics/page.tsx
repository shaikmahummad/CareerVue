"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, BookOpen, DollarSign, GraduationCap, Award, Activity, Loader2 } from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet } from "../../../../lib/api";

interface DashboardStats {
  total_users: number;
  total_students: number;
  total_tutors: number;
  total_courses: number;
  total_revenue: number;
  total_enrollments: number;
}

interface AnalyticsData {
  revenue_by_month: { year: number; month: number; revenue: number; payment_count: number }[];
  enrollments_by_category: { category: string; enrollments: number }[];
  top_courses: { id: string; title: string; category: string | null; enrolled_count: number; avg_rating: number }[];
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiGet<DashboardStats>("/api/v1/admin/dashboard"),
      apiGet<AnalyticsData>("/api/v1/admin/analytics"),
    ]).then(([statsR, analyticsR]) => {
      if (statsR.status === "fulfilled") setStats(statsR.value);
      if (analyticsR.status === "fulfilled") setAnalytics(analyticsR.value);
    }).finally(() => setLoading(false));
  }, []);

  const revenueData = analytics?.revenue_by_month ?? [];
  const categoryData = analytics?.enrollments_by_category ?? [];
  const topCourses = analytics?.top_courses ?? [];
  const maxRevenue = revenueData.length ? Math.max(...revenueData.map((m) => m.revenue), 1) : 1;

  const statCards = [
    { label: "Total Users", value: stats?.total_users?.toLocaleString() ?? "0", icon: Users, color: "#6c63ff" },
    { label: "Students", value: stats?.total_students?.toLocaleString() ?? "0", icon: GraduationCap, color: "#00d4ff" },
    { label: "Tutors", value: stats?.total_tutors?.toLocaleString() ?? "0", icon: Award, color: "#e7c365" },
    { label: "Total Courses", value: stats?.total_courses?.toLocaleString() ?? "0", icon: BookOpen, color: "#6c63ff" },
    { label: "Total Revenue", value: `₹${((stats?.total_revenue ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "#00d4ff" },
    { label: "Enrollments", value: stats?.total_enrollments?.toLocaleString() ?? "0", icon: Activity, color: "#e7c365" },
  ];

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <AdminNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Platform-wide performance metrics from live data.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  <p className="text-sm font-semibold text-white mb-1">Monthly Revenue</p>
                  <p className="text-xs text-[#7c7a8a] mb-5">Platform earnings (₹)</p>
                  {revenueData.length > 0 ? (
                    <div className="flex items-end gap-2 h-28">
                      {revenueData.slice(-6).map((m, i) => {
                        const month = new Date(m.year, m.month - 1, 1).toLocaleString("en-US", { month: "short" });
                        const displayHeight = Math.max((m.revenue / maxRevenue) * 100, 10);
                        return (
                          <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1.5">
                            <div
                              className="w-full rounded-t-lg"
                              style={{
                                height: `${displayHeight}%`,
                                background: i % 2 === 0 ? "linear-gradient(180deg,#6c63ff,#00d4ff50)" : "linear-gradient(180deg,#00d4ff,#6c63ff50)",
                                minHeight: 4,
                              }}
                            />
                            <span className="text-[9px] text-[#7c7a8a]">{month}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-28 text-sm text-[#7c7a8a]">No revenue data yet</div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <p className="text-sm font-semibold text-white mb-1">Enrollments by Category</p>
                  <p className="text-xs text-[#7c7a8a] mb-5">Distribution of student enrolments</p>
                  {categoryData.length > 0 ? (
                    <div className="space-y-3">
                      {categoryData.map((c, idx) => {
                        const colors = ["#6c63ff", "#00d4ff", "#e7c365", "#8b5cf6", "#f472b6"];
                        const pct = Math.max((c.enrollments / Math.max(categoryData.reduce((sum, item) => sum + item.enrollments, 0), 1)) * 100, 5);
                        return (
                          <div key={`${c.category}-${idx}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#cbc4d2]">{c.category}</span>
                              <span className="text-xs font-semibold" style={{ color: colors[idx % colors.length] }}>{Math.round(pct)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[idx % colors.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-28 text-sm text-[#7c7a8a]">No category data yet</div>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white">Top Performing Courses</p>
                </div>
                {topCourses.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Course', 'Enrolled', 'Rating'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {topCourses.slice(0, 8).map((course) => (
                        <tr key={course.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-white font-medium text-xs max-w-[220px] truncate">{course.title}</td>
                          <td className="px-6 py-4 text-[#7c7a8a] text-xs">{course.enrolled_count}</td>
                          <td className="px-6 py-4 text-xs text-amber-400">★ {course.avg_rating.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-[#7c7a8a]">No course analytics yet</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
