"use client";

import TutorNavbar from "../../../../components/TutorNavbar";
import { BarChart3, Users, TrendingUp, DollarSign, Star } from "lucide-react";

const STATS = [
  { label: "Total Students",    value: "247",    sub: "+18 this month",   icon: Users,       color: "#6c63ff" },
  { label: "Avg Completion",    value: "68%",    sub: "Across all courses",icon: TrendingUp,  color: "#00d4ff" },
  { label: "Total Revenue",     value: "₹24,800",sub: "+₹3,200 this month",icon: DollarSign, color: "#e7c365" },
  { label: "Avg Rating",        value: "4.7",    sub: "From 89 reviews",   icon: Star,        color: "#6c63ff" },
];

const COURSE_PERF = [
  { title: "Complete Python Bootcamp",      students: 98,  completion: 72, rating: 4.8, revenue: 0     },
  { title: "React & TypeScript Masterclass",students: 74,  completion: 65, rating: 4.7, revenue: 73926 },
  { title: "Node.js Backend Development",   students: 51,  completion: 61, rating: 4.6, revenue: 40749 },
  { title: "Cybersecurity Essentials",      students: 24,  completion: 54, rating: 4.5, revenue: 21576 },
];

const MONTHLY = [
  { month: "Jan", students: 12 },
  { month: "Feb", students: 19 },
  { month: "Mar", students: 28 },
  { month: "Apr", students: 41 },
  { month: "May", students: 67 },
  { month: "Jun", students: 80 },
];

export default function TutorAnalyticsPage() {
  const maxStudents = Math.max(...MONTHLY.map(m => m.students));

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <TutorNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Course Analytics</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Performance insights across all your published courses.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-[#7c7a8a] mt-0.5">{s.label}</p>
                <p className="text-[10px] text-[#6c63ff] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Enrollment trend */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Monthly Enrollments</p>
              <p className="text-xs text-[#7c7a8a] mb-5">New students across all courses</p>
              <div className="flex items-end gap-2 h-28">
                {MONTHLY.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-lg"
                      style={{
                        height: `${(m.students / maxStudents) * 100}%`,
                        background: "linear-gradient(180deg,#6c63ff,#6c63ff50)",
                        minHeight: 4,
                      }}
                    />
                    <span className="text-[9px] text-[#7c7a8a]">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion rates */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Completion Rates</p>
              <p className="text-xs text-[#7c7a8a] mb-5">Student progress per course</p>
              <div className="space-y-3.5">
                {COURSE_PERF.map((c) => (
                  <div key={c.title}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#cbc4d2] truncate max-w-[70%]">{c.title}</span>
                      <span className="text-xs font-semibold text-[#6c63ff]">{c.completion}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.completion}%`, background: "#6c63ff" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Course table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">Course Performance</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Course", "Students", "Completion", "Rating", "Revenue"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold text-[#7c7a8a] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {COURSE_PERF.map((c) => (
                  <tr key={c.title} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium text-xs max-w-[200px] truncate">{c.title}</td>
                    <td className="px-6 py-4 text-[#7c7a8a] text-xs">{c.students}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold" style={{ color: c.completion >= 65 ? "#00d4ff" : "#e7c365" }}>{c.completion}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-xs text-amber-400">★ {c.rating}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#7c7a8a]">{c.revenue > 0 ? `₹${c.revenue.toLocaleString("en-IN")}` : "Free"}</td>
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
