"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckSquare, Check, Clock, BookOpen, Loader2, User, ArrowRight } from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet } from "../../../../lib/api";

interface PendingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  price: number;
  is_free: boolean;
  tags: string[];
  duration_hours: number | null;
  tutor: { full_name: string; email: string } | null;
  created_at: string | null;
}

export default function AdminApprovalsPage() {
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PendingCourse[]>("/api/v1/admin/courses/pending")
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

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
            <div className="space-y-3">
              <p className="text-xs text-[#7c7a8a]">
                {courses.length} course{courses.length !== 1 ? "s" : ""} pending review
              </p>
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/admin/approvals/${course.id}`}
                  className="block glass-card rounded-2xl p-5 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-[#6c63ff]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-[#c4c0ff] transition-colors truncate">
                        {course.title}
                      </p>

                      {course.description && (
                        <p className="text-xs text-[#7c7a8a] mt-1 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {course.category && (
                          <span className="text-[10px] font-semibold text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded-full">
                            {course.category}
                          </span>
                        )}
                        {course.level && (
                          <span className="text-[10px] text-[#7c7a8a] bg-white/[0.05] px-2 py-0.5 rounded-full capitalize">
                            {course.level}
                          </span>
                        )}
                        <span className="text-[10px] text-[#7c7a8a]">
                          {course.is_free ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
                        </span>
                        {course.duration_hours != null && (
                          <span className="text-[10px] text-[#7c7a8a]">{course.duration_hours}h</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        {course.tutor?.full_name && (
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-[#7c7a8a]" />
                            <span className="text-xs text-[#7c7a8a]">{course.tutor.full_name}</span>
                          </div>
                        )}
                        {course.created_at && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-[#7c7a8a]" />
                            <span className="text-[10px] text-[#7c7a8a]">
                              {new Date(course.created_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7c7a8a] group-hover:text-[#c4c0ff] transition-colors flex-shrink-0 mt-1">
                      Review
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
