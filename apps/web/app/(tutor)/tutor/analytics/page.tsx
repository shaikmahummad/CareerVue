"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, TrendingUp, DollarSign, Star, Loader2 } from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { apiGet } from "../../../../lib/api";

interface TutorAnalytics {
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

export default function TutorAnalyticsPage() {
  const [analytics, setAnalytics] = useState<TutorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TutorAnalytics>("/api/v1/tutors/analytics")
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Total Students", value: analytics?.total_students?.toLocaleString() ?? "0", icon: Users, color: "#6c63ff" },
    { label: "Avg Rating", value: analytics ? analytics.avg_rating.toFixed(1) : "0.0", icon: Star, color: "#e7c365" },
    { label: "Total Revenue", value: `₹${(analytics?.total_earnings ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "#00d4ff" },
    { label: "Courses", value: analytics?.courses_count?.toLocaleString() ?? "0", icon: TrendingUp, color: "#6c63ff" },
  ];

  const statusEntries = analytics ? [
    { label: "Approved", value: analytics.courses_by_status.approved, color: "#00d4ff" },
    { label: "Pending Review", value: analytics.courses_by_status.pending_approval, color: "#e7c365" },
    { label: "Draft", value: analytics.courses_by_status.draft, color: "#8b5cf6" },
    { label: "Rejected", value: analytics.courses_by_status.rejected, color: "#f87171" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <TutorNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Course Analytics</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Performance insights from your live course data.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                  <div key={stat.label} className="glass-card rounded-2xl p-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${stat.color}15` }}>
                      <stat.icon size={18} style={{ color: stat.color }} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-[#7c7a8a] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-2xl p-6">
                <p className="text-sm font-semibold text-white mb-4">Course Status</p>
                {statusEntries.length > 0 ? (
                  <div className="space-y-3.5">
                    {statusEntries.map((entry) => {
                      const total = statusEntries.reduce((sum, item) => sum + item.value, 0) || 1;
                      const pct = Math.max((entry.value / total) * 100, 5);
                      return (
                        <div key={entry.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#cbc4d2]">{entry.label}</span>
                            <span className="text-xs font-semibold" style={{ color: entry.color }}>{entry.value}</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: entry.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-[#7c7a8a]">No course status data yet</div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center text-sm text-[#7c7a8a]">
              No analytics data yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
