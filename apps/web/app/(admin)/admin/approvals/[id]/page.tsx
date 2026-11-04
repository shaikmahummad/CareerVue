"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, BookOpen, User, Clock, Tag, Globe,
  Video, FileText, Eye, Loader2, AlertCircle, ChevronRight,
} from "lucide-react";
import AdminNavbar from "../../../../../components/AdminNavbar";
import { apiGet, apiPut } from "../../../../../lib/api";
import CourseVideoPlayer from "../../../../../components/CourseVideoPlayer";

interface Module {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration_mins: number | null;
  order_index: number;
  is_preview: boolean;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  tags: string[];
  duration_hours: number | null;
  language: string | null;
  status: string;
  enrolled_count: number;
  created_at: string | null;
  tutor_name: string | null;
  modules: Module[];
}

export default function CourseReviewPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [course,      setCourse]      = useState<CourseDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [acting,      setActing]      = useState<"approve" | "reject" | null>(null);
  const [rejectNote,  setRejectNote]  = useState("");
  const [showReject,  setShowReject]  = useState(false);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CourseDetail>(`/api/v1/courses/${id}`)
      .then(setCourse)
      .catch((e) => setError(e.message ?? "Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!confirm(`Approve "${course?.title}"? It will go live immediately.`)) return;
    setActing("approve");
    try {
      await apiPut(`/api/v1/admin/courses/${id}/approve`);
      router.push("/admin/approvals");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to approve");
    } finally {
      setActing(null);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectNote.trim()) { alert("Please provide a rejection reason."); return; }
    setActing("reject");
    try {
      await apiPut(`/api/v1/admin/courses/${id}/reject`, { rejection_note: rejectNote.trim() });
      router.push("/admin/approvals");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to reject");
    } finally {
      setActing(null);
      setShowReject(false);
    }
  }

  const totalMins = course?.modules.reduce((s, m) => s + (m.duration_mins ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <AdminNavbar />
      <main className="ml-60 flex-1 overflow-y-auto">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#050508]/90 backdrop-blur border-b border-white/[0.06] px-8 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-[#7c7a8a] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Approvals
          </button>

          {!loading && !error && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReject(true)}
                disabled={!!acting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                {acting === "reject" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={!!acting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {acting === "approve" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve Course
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

          {loading && (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {course && (
            <>
              {/* ── Tutor ─────────────────────────────────────────────── */}
              <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#6c63ff]/15 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[#6c63ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{course.tutor_name ?? "Unknown Tutor"}</p>
                  {course.created_at && (
                    <p className="text-xs text-[#7c7a8a] mt-0.5">
                      Submitted {new Date(course.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full">
                  Pending Review
                </span>
              </div>

              {/* ── Course Info ───────────────────────────────────────── */}
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <h1 className="text-xl font-bold text-white leading-snug">{course.title}</h1>

                {course.description ? (
                  <p className="text-sm text-[#7c7a8a] leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                ) : (
                  <p className="text-sm text-[#7c7a8a] italic opacity-60">No description provided.</p>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { icon: BookOpen,  label: "Category",  value: course.category },
                    { icon: ChevronRight, label: "Level",  value: course.level, capitalize: true },
                    { icon: Tag,       label: "Price",     value: course.is_free ? "Free" : `₹${course.price.toLocaleString("en-IN")}` },
                    { icon: Globe,     label: "Language",  value: course.language },
                    { icon: Clock,     label: "Duration",  value: course.duration_hours != null ? `${course.duration_hours} hours` : null },
                  ].filter(m => m.value).map(({ icon: Icon, label, value, capitalize }) => (
                    <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={11} className="text-[#6c63ff]" />
                        <span className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-wide">{label}</span>
                      </div>
                      <p className={`text-sm font-medium text-white ${capitalize ? "capitalize" : ""}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                {course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map(t => (
                      <span key={t} className="text-xs text-[#6c63ff] bg-[#6c63ff]/10 border border-[#6c63ff]/20 px-2.5 py-1 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Curriculum ───────────────────────────────────────── */}
              <div>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <h2 className="text-xs font-semibold text-[#6c63ff] uppercase tracking-widest">Curriculum</h2>
                  <span className="text-xs text-[#7c7a8a]">
                    {course.modules.length} module{course.modules.length !== 1 ? "s" : ""}
                    {totalMins > 0 && ` · ${totalMins} min total`}
                  </span>
                </div>

                {course.modules.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <p className="text-sm text-[#7c7a8a] italic">No modules added yet.</p>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                    {[...course.modules]
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((mod, idx) => (
                        <div key={mod.id} className="p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
                          {/* Index */}
                          <div className="w-7 h-7 rounded-full bg-[#6c63ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[11px] font-bold text-[#6c63ff]">{idx + 1}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white mb-0.5">{mod.title}</p>
                            {mod.description && (
                              <p className="text-xs text-[#7c7a8a] leading-relaxed mb-2">{mod.description}</p>
                            )}
                            <div className="flex items-center flex-wrap gap-2">
                              {mod.video_url && (
                                <button
                                  type="button"
                                  onClick={() => setOpenVideoId((current) => current === mod.id ? null : mod.id)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-400/10 hover:bg-sky-400/20 border border-sky-400/15 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <Video size={10} /> {openVideoId === mod.id ? "Hide video" : "Watch video"}
                                </button>
                              )}
                              {mod.pdf_url && (
                                <a
                                  href={mod.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-semibold text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/15 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <FileText size={9} /> PDF
                                </a>
                              )}
                              {mod.is_preview && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                                  <Eye size={9} /> Free Preview
                                </span>
                              )}
                              {mod.duration_mins != null && (
                                <span className="text-[10px] text-[#7c7a8a]">{mod.duration_mins} min</span>
                              )}
                            </div>
                            {mod.video_url && openVideoId === mod.id && (
                              <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-2xl">
                                <CourseVideoPlayer
                                  url={mod.video_url}
                                  title={`${course.title} — ${mod.title}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f0e17] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Reject Course</h3>
              <p className="text-sm text-[#7c7a8a] mt-1">
                Give the tutor clear feedback on what needs to be improved before resubmitting.
              </p>
            </div>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Modules are missing video content. Description needs more detail about prerequisites…"
              rows={5}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#7c7a8a] focus:outline-none focus:border-[#6c63ff]/50 resize-none"
            />

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowReject(false); setRejectNote(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7c7a8a] border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!!acting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                {acting === "reject" ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Send Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
