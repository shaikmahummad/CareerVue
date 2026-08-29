"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Users, Star, DollarSign,
  Clock, CheckCircle, XCircle, AlertCircle,
  PlusCircle, Loader2,
} from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { apiGet } from "../../../../lib/api";
import { createClient } from "../../../../lib/supabase/client";

interface Analytics {
  total_students: number; total_earnings: number; avg_rating: number; courses_count: number;
  courses_by_status: { draft: number; pending_approval: number; approved: number; rejected: number; };
}
interface Course {
  id: string; title: string; category: string | null; level: string | null;
  status: string; is_free: boolean; price: number; enrolled_count: number;
  avg_rating: number; thumbnail_url: string | null; created_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Draft",        color: "text-[#7c7a8a] bg-white/[0.05]",        icon: Clock },
  pending_approval: { label: "Under Review", color: "text-[#e7c365] bg-[#e7c365]/10",        icon: AlertCircle },
  approved:         { label: "Published",    color: "text-[#00d4ff] bg-[#00d4ff]/10",        icon: CheckCircle },
  rejected:         { label: "Rejected",     color: "text-red-400 bg-red-500/10",            icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

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

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <TutorNavbar />
      <main className="flex-1 ml-60 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}{name ? `, ${name}` : ""} 👋</h1>
          </div>
          <Link href="/tutor/courses/new" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl">
            <PlusCircle size={15} /> Create New
          </Link>
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
                { icon: DollarSign, value: `₹${(analytics?.total_earnings ?? 0).toLocaleString()}`, label: "EARNINGS", accent: "#00d4ff" },
                { icon: Users,      value: analytics?.total_students ?? 0, label: "STUDENTS", accent: "#6c63ff" },
                { icon: BookOpen,   value: analytics?.courses_count ?? 0, label: "ACTIVE COURSES", accent: "#6c63ff" },
                { icon: Star,       value: analytics?.avg_rating ? analytics.avg_rating.toFixed(1) : "—", label: "RATING", accent: "#e7c365" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${s.accent}18`, border: `1px solid ${s.accent}25` }}>
                      <s.icon size={18} style={{ color: s.accent }} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-[#7c7a8a] uppercase tracking-wider">{s.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Main content */}
            <div className="grid lg:grid-cols-1 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <p className="text-xs font-semibold text-[#7c7a8a] uppercase tracking-wider mb-1">Course Snapshot</p>
                <p className="text-sm text-white">Your current course performance based on real data from the platform.</p>
              </div>
            </div>

            {/* My courses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">My Courses</h2>
                <Link href="/tutor/courses/new" className="accent-chip text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <PlusCircle size={11} /> Create New
                </Link>
              </div>

              {courses.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <BookOpen size={32} className="text-[#7c7a8a] mx-auto mb-4" />
                  <p className="text-white font-semibold mb-1">No courses yet</p>
                  <p className="text-sm text-[#7c7a8a] mb-5">Create your first course and start earning</p>
                  <Link href="/tutor/courses/new" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl">
                    <PlusCircle size={14} /> Create First Course
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.slice(0, 3).map((course) => (
                    <Link key={course.id} href={`/tutor/courses/${course.id}/edit`}
                      className="glass-card rounded-2xl p-5 group hover:border-[#6c63ff]/30 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={16} className="text-[#6c63ff]" />
                        </div>
                        <StatusBadge status={course.status} />
                      </div>
                      <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 group-hover:text-[#6c63ff] transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.07]">
                        <span className="text-xs text-[#7c7a8a]">{course.enrolled_count} students</span>
                        <span className="text-xs font-semibold gradient-text">
                          {course.is_free ? "Free" : `₹${course.price}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {courses.length === 0 && (
                    <Link href="/tutor/courses/new"
                      className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center gap-3 border-dashed hover:border-[#6c63ff]/30 transition-all h-40">
                      <PlusCircle size={24} className="text-[#7c7a8a]" />
                      <span className="text-sm text-[#7c7a8a]">Add Course</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
