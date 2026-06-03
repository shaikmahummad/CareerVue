"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Check, X, Clock, BookOpen, Loader2, User } from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet, apiPut } from "../../../../lib/api";

interface PendingCourse {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  price: number;
  is_free: boolean;
  tutor: { full_name: string; email: string } | null;
  created_at: string | null;
}

export default function AdminApprovalsPage() {
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PendingCourse[]>("/api/v1/admin/courses/pending")
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    setActing(id);
    try {
      await apiPut(`/api/v1/admin/courses/${id}/approve`);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Failed to approve");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id: string) {
    const note = prompt("Rejection reason (optional):");
    if (note === null) return;
    setActing(id);
    try {
      await apiPut(`/api/v1/admin/courses/${id}/reject`, { rejection_note: note });
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Failed to reject");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <AdminNavbar />
      <main className="ml-60 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <CheckSquare size={20} className="text-[#6c63ff]" />
              <h1 className="text-2xl font-bold text-white">Course Approvals</h1>
            </div>
            <p className="text-sm text-[#7c7a8a]">Review and approve or reject tutor-submitted courses.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-400" />
              </div>
              <p className="text-white font-semibold mb-1">All caught up!</p>
              <p className="text-sm text-[#7c7a8a]">No courses pending approval right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#7c7a8a]">{courses.length} course{courses.length !== 1 ? "s" : ""} pending review</p>
              {courses.map((course) => (
                <div key={course.id} className="glass-card rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={18} className="text-[#6c63ff]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{course.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {course.category && (
                            <span className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded-full">{course.category}</span>
                          )}
                          {course.level && (
                            <span className="text-[10px] text-[#7c7a8a] bg-white/[0.05] px-2 py-0.5 rounded-full capitalize">{course.level}</span>
                          )}
                          <span className="text-[10px] text-[#7c7a8a]">
                            {course.is_free ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
                          </span>
                        </div>
                        {course.tutor?.full_name && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <User size={11} className="text-[#7c7a8a]" />
                            <span className="text-xs text-[#7c7a8a]">{course.tutor.full_name}</span>
                          </div>
                        )}
                        {course.created_at && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock size={11} className="text-[#7c7a8a]" />
                            <span className="text-[10px] text-[#7c7a8a]">
                              Submitted {new Date(course.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReject(course.id)}
                        disabled={acting === course.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {acting === course.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(course.id)}
                        disabled={acting === course.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        {acting === course.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
