"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Play, FileText,
  Clock, Menu, X, Trophy, Loader2, ExternalLink, BookOpen,
  AlertCircle,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../../../../lib/api";
import CourseVideoPlayer from "../../../../../components/CourseVideoPlayer";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  modules: Module[];
  is_enrolled: boolean;
}

interface ModuleProgressItem {
  id: string;
  module_id: string;
  completed_at: string | null;
}

interface EnrollmentDetail {
  id: string;
  course_id: string;
  progress_pct: number;
  completed_at: string | null;
  module_progress: ModuleProgressItem[];
}

interface EnrollmentSummary {
  id: string;
  course_id: string;
  progress_pct: number;
  completed_at: string | null;
}

// ─── Video player ─────────────────────────────────────────────────────────────

// ─── Module list item ─────────────────────────────────────────────────────────

function ModuleListItem({
  module,
  index,
  isActive,
  isCompleted,
  onClick,
}: {
  module: Module;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-l-2 transition-colors ${
        isActive
          ? "bg-blue-500/10 border-blue-400"
          : "hover:bg-white/[0.04] border-transparent"
      }`}
    >
      {/* Status icon */}
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
        isCompleted ? "bg-emerald-500/15" : isActive ? "bg-blue-500/15" : "bg-white/[0.06]"
      }`}>
        {isCompleted ? (
          <CheckCircle2 size={13} className="text-emerald-600" />
        ) : (
          <span className={`text-xs font-bold ${isActive ? "text-blue-300" : "text-gray-500"}`}>
            {index + 1}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          isActive ? "font-semibold text-white" : isCompleted ? "text-gray-400" : "font-medium text-gray-300"
        }`}>
          {module.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {module.video_url && <Play size={10} className="text-gray-400" />}
          {module.pdf_url && <FileText size={10} className="text-gray-400" />}
          {module.duration_mins && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Clock size={9} />{module.duration_mins}m
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Completion overlay ───────────────────────────────────────────────────────

function CompletionOverlay({ courseTitle }: { courseTitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🏆
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Course Complete!</h2>
        <p className="text-gray-500 mb-2">{courseTitle}</p>

        <div className="flex items-center justify-center gap-3 my-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <p className="text-xs text-emerald-600 font-medium">Certificate issued</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <p className="text-xs text-blue-600 font-medium">+100 XP earned</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Your certificate has been added to your profile. Keep learning!
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/courses"
            className="w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Browse More Courses
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Data
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Actions
  const [marking, setMarking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Parallel: course detail + enrollment list
      const [courseData, enrollments] = await Promise.all([
        apiGet<CourseDetail>(`/api/v1/courses/${id}`),
        apiGet<EnrollmentSummary[]>("/api/v1/enrollments/mine"),
      ]);

      if (!courseData.is_enrolled) {
        router.replace(`/courses/${id}`);
        return;
      }

      setCourse(courseData);

      // Find enrollment for this course
      const enr = enrollments.find((e) => e.course_id === id);
      if (!enr) {
        router.replace(`/courses/${id}`);
        return;
      }

      // Load full enrollment with module progress
      const detail = await apiGet<EnrollmentDetail>(`/api/v1/enrollments/${enr.id}`);
      setEnrollment(detail);

      const done = new Set(detail.module_progress.map((mp) => mp.module_id));
      setCompletedIds(done);

      // Start on first incomplete module
      const firstIncomplete = courseData.modules.findIndex((m) => !done.has(m.id));
      setCurrentIdx(firstIncomplete === -1 ? 0 : firstIncomplete);

      if (detail.completed_at) setShowCelebration(false); // already completed, don't re-show
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  // ── Mark module complete ────────────────────────────────────────────────────

  async function markComplete() {
    if (!course || !enrollment) return;
    const courseModule = course.modules[currentIdx];
    if (!courseModule || completedIds.has(courseModule.id)) return;

    setMarking(true);
    try {
      await apiPut(`/api/v1/enrollments/${enrollment.id}/progress`, {
        module_id: courseModule.id,
      });
      const next = new Set(completedIds);
      next.add(courseModule.id);
      setCompletedIds(next);

      // Auto-advance to next module if available
      const nextIdx = currentIdx + 1;
      if (nextIdx < course.modules.length) {
        setTimeout(() => setCurrentIdx(nextIdx), 400);
      }
    } catch (err) {
      // Non-fatal — show inline
      console.error(err);
    } finally {
      setMarking(false);
    }
  }

  // ── Complete course ─────────────────────────────────────────────────────────

  async function completeCourse() {
    if (!enrollment) return;
    setCompleting(true);
    try {
      await apiPost(`/api/v1/enrollments/${enrollment.id}/complete`);
      setShowCelebration(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete course");
    } finally {
      setCompleting(false);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const modules = course?.modules ?? [];
  const currentModule = modules[currentIdx] ?? null;
  const allCompleted = modules.length > 0 && modules.every((m) => completedIds.has(m.id));
  const progress = modules.length > 0 ? Math.round((completedIds.size / modules.length) * 100) : 0;

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-400 text-sm">Loading course…</p>
        </div>
      </div>
    );
  }

  if (error || !course || !currentModule) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error || "Course not found"}</p>
          <Link href="/courses" className="text-blue-400 text-sm hover:underline">
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {showCelebration && (
        <CompletionOverlay
          courseTitle={course.title}
        />
      )}

      <div className="h-screen flex flex-col bg-[#070b14] text-white overflow-hidden">

        {/* ── Top bar ── */}
        <header className="flex-shrink-0 bg-[#0b1120] border-b border-white/[0.08] px-5 lg:px-8 h-16 flex items-center gap-4">
          <Link
            href={`/courses/${id}`}
            className="flex-shrink-0 flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft size={16} /> Course
          </Link>

          <div className="flex-1 min-w-0 px-2">
            <p className="text-sm font-medium text-white truncate">{course.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 max-w-xs h-1 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {completedIds.size}/{modules.length} done
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            aria-label="Toggle module list"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar ── */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 312, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex-shrink-0 bg-[#0b1120] border-r border-white/[0.08] overflow-y-auto"
              >
                <div className="py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">
                    Curriculum — {modules.length} lessons
                  </p>
                  {modules.map((m, i) => (
                    <ModuleListItem
                      key={m.id}
                      module={m}
                      index={i}
                      isActive={i === currentIdx}
                      isCompleted={completedIds.has(m.id)}
                      onClick={() => setCurrentIdx(i)}
                    />
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ── Content ── */}
          <main className="flex-1 overflow-y-auto bg-[#070b14]">
            <div className="max-w-5xl mx-auto px-4 sm:px-7 lg:px-10 py-7 lg:py-10 space-y-6">

              {/* Video player */}
              {currentModule.video_url && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                  <CourseVideoPlayer
                    url={currentModule.video_url}
                    title={`${course.title} — ${currentModule.title}`}
                  />
                </div>
              )}

              {/* No media placeholder */}
              {!currentModule.video_url && !currentModule.pdf_url && (
                <div className="aspect-video bg-[#0b1120] rounded-2xl flex flex-col items-center justify-center gap-3 border border-white/[0.08]">
                  <BookOpen size={40} className="text-gray-600" />
                  <p className="text-gray-500 text-sm">No video for this module</p>
                </div>
              )}

              {/* Module info */}
              <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">
                    Lesson {currentIdx + 1} of {modules.length}
                  </span>
                  {currentModule.duration_mins && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />{currentModule.duration_mins}m
                    </span>
                  )}
                  {completedIds.has(currentModule.id) && (
                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                      <CheckCircle2 size={11} /> Completed
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{currentModule.title}</h1>

                {currentModule.description && (
                  <p className="text-gray-300 leading-7">{currentModule.description}</p>
                )}

                {/* PDF resource */}
                {currentModule.pdf_url && (
                  <a
                    href={currentModule.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors text-white text-sm font-medium px-4 py-2.5 rounded-xl"
                  >
                    <FileText size={15} className="text-blue-400" />
                    Open PDF Resource
                    <ExternalLink size={12} className="text-gray-500" />
                  </a>
                )}
              </section>

              {/* Action bar */}
              <div className="grid grid-cols-3 items-center gap-3 pt-5 border-t border-white/[0.08]">
                {/* Prev */}
                <button
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="justify-self-start flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                {/* Mark complete / Complete course */}
                <div className="flex items-center justify-center gap-3">
                  {allCompleted && !enrollment?.completed_at ? (
                    <button
                      onClick={completeCourse}
                      disabled={completing}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {completing ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trophy size={15} />
                      )}
                      Complete Course
                    </button>
                  ) : !completedIds.has(currentModule.id) ? (
                    <button
                      onClick={markComplete}
                      disabled={marking}
                      className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {marking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Mark Complete
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-500 text-sm font-medium">
                      <CheckCircle2 size={14} /> Done
                    </span>
                  )}
                </div>

                {/* Next */}
                <button
                  onClick={() => setCurrentIdx((i) => Math.min(modules.length - 1, i + 1))}
                  disabled={currentIdx === modules.length - 1}
                  className="justify-self-end flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>

              {/* Course completion callout when all done but not yet confirmed */}
              {allCompleted && !enrollment?.completed_at && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-700/40 rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="text-3xl flex-shrink-0">🎓</div>
                  <div>
                    <p className="font-semibold text-emerald-300">All lessons complete!</p>
                    <p className="text-sm text-emerald-500/80">
                      Click &ldquo;Complete Course&rdquo; above to claim your certificate and +100 XP.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
