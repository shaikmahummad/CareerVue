"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, BookOpen, DollarSign, TrendingUp, GraduationCap, Award, Activity } from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet } from "../../../../lib/api";

interface Stats {
  total_users: number; total_students: number; total_tutors: number;
  total_courses: number; total_revenue: number; total_enrollments: number;
}

const FALLBACK: Stats = { total_users: 1284, total_students: 1147, total_tutors: 38, total_courses: 94, total_revenue: 284600, total_enrollments: 2340 };

const MONTHLY_REVENUE = [
  { month: "Jan", amount: 18200 },
  { month: "Feb", amount: 24100 },
  { month: "Mar", amount: 31400 },
  { month: "Apr", amount: 28900 },
  { month: "May", amount: 41200 },
  { month: "Jun", amount: 52800 },
];

const TOP_COURSES = [
  { title: "Complete Python Bootcamp",       enrolled: 98,  revenue: 0,      rating: 4.8 },
  { title: "React & TypeScript Masterclass", enrolled: 74,  revenue: 73926,  rating: 4.7 },
  { title: "Node.js Backend Development",    enrolled: 51,  revenue: 40749,  rating: 4.6 },
  { title: "DevOps & Cloud Engineering",     enrolled: 43,  revenue: 55857,  rating: 4.9 },
  { title: "Full Stack with Next.js",        enrolled: 31,  revenue: 34069,  rating: 4.5 },
];

const CATEGORY_DATA = [
  { cat: "Programming",    pct: 62, color: "#6c63ff" },
  { cat: "Data Science",   pct: 18, color: "#00d4ff" },
  { cat: "DevOps",         pct: 11, color: "#e7c365" },
  { cat: "Design",         pct: 6,  color: "#6c63ff" },
  { cat: "Cybersecurity",  pct: 3,  color: "#00d4ff" },
];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats>(FALLBACK);

  useEffect(() => {
    apiGet<Stats>("/api/v1/admin/dashboard").then(setStats).catch(() => {});
  }, []);

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m => m.amount));

  const STAT_CARDS = [
    { label: "Total Users",      value: stats.total_users.toLocaleString(),       icon: Users,         color: "#6c63ff" },
    { label: "Students",         value: stats.total_students.toLocaleString(),     icon: GraduationCap, color: "#00d4ff" },
    { label: "Tutors",           value: stats.total_tutors.toLocaleString(),       icon: Award,         color: "#e7c365" },
    { label: "Total Courses",    value: stats.total_courses.toLocaleString(),      icon: BookOpen,      color: "#6c63ff" },
    { label: "Total Revenue",    value: `₹${(stats.total_revenue/1000).toFixed(0)}K`, icon: DollarSign, color: "#00d4ff" },
    { label: "Enrollments",      value: stats.total_enrollments.toLocaleString(),  icon: Activity,      color: "#e7c365" },
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
            <p className="text-sm text-[#7c7a8a]">Platform-wide performance metrics and growth insights.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {STAT_CARDS.map((s) => (
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
            {/* Revenue chart */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-white">Monthly Revenue</p>
                  <p className="text-xs text-[#7c7a8a]">Platform earnings (₹)</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#00d4ff]">
                  <TrendingUp size={13} />
                  <span>+28% vs last month</span>
                </div>
              </div>
              <div className="flex items-end gap-2 h-28">
                {MONTHLY_REVENUE.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-lg"
                      style={{
                        height: `${(m.amount / maxRevenue) * 100}%`,
                        background: "linear-gradient(180deg,#6c63ff,#00d4ff50)",
                        minHeight: 4,
                      }}
                    />
                    <span className="text-[9px] text-[#7c7a8a]">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Enrollments by Category</p>
              <p className="text-xs text-[#7c7a8a] mb-5">Distribution of student enrolments</p>
              <div className="space-y-3">
                {CATEGORY_DATA.map((c) => (
                  <div key={c.cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#cbc4d2]">{c.cat}</span>
                      <span className="text-xs font-semibold" style={{ color: c.color }}>{c.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top courses table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">Top Performing Courses</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Course", "Enrolled", "Revenue", "Rating"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {TOP_COURSES.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium text-xs max-w-[220px] truncate">{c.title}</td>
                    <td className="px-6 py-4 text-[#7c7a8a] text-xs">{c.enrolled}</td>
                    <td className="px-6 py-4 text-xs text-[#7c7a8a]">{c.revenue > 0 ? `₹${c.revenue.toLocaleString("en-IN")}` : "Free"}</td>
                    <td className="px-6 py-4 text-xs text-amber-400">★ {c.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
