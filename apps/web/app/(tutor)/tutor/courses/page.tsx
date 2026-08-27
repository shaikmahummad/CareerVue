"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, PlusCircle, Clock, CheckCircle, XCircle,
  AlertCircle, Users, Star, Pencil, Trash2, Send, Loader2,
} from "lucide-react";
import TutorNavbar from "../../../../components/TutorNavbar";
import { apiGet, apiDelete, apiPost } from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  status: string;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  thumbnail_url: string | null;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Draft",        color: "text-[#cbc4d2] bg-white/[0.06]",      icon: Clock },
  pending_approval: { label: "Under Review", color: "text-[#e7c365] bg-[#e7c365]/10",     icon: AlertCircle },
  approved:         { label: "Published",    color: "text-[#00d4ff] bg-[#00d4ff]/10", icon: CheckCircle },
  rejected:         { label: "Rejected",     color: "text-red-400 bg-red-500/10",         icon: XCircle },
};

const FILTERS = ["all", "draft", "pending_approval", "approved", "rejected"] as const;
type Filter = typeof FILTERS[number];

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  onDelete,
  onSubmit,
}: {
  course: Course;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/courses/${course.id}`);
      onDelete(course.id);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/courses/${course.id}/submit`);
      onSubmit(course.id);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to submit course");
    } finally {
      setSubmitting(false);
    }
  }

  const canEdit   = course.status === "draft" || course.status === "rejected";
  const canSubmit = course.status === "draft" || course.status === "rejected";
  const canDelete = course.status === "draft";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail / placeholder */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6c63ff]/10 to-[#00d4ff]/10 flex items-center justify-center flex-shrink-0">
          <BookOpen size={22} className="text-[#6c63ff]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-white leading-snug line-clamp-2">{course.title}</h3>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
              <Icon size={11} /> {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#7c7a8a] mb-3">
            {course.category && <span>{course.category}</span>}
            {course.level    && <span className="capitalize">{course.level}</span>}
            <span className="flex items-center gap-1"><Users size={11} /> {course.enrolled_count}</span>
            {course.avg_rating > 0 && (
              <span className="flex items-center gap-1"><Star size={11} /> {course.avg_rating.toFixed(1)}</span>
            )}
            <span className="font-medium text-[#cbc4d2]">
              {course.is_free ? "Free" : `₹${course.price}`}
            </span>
          </div>

          {/* Rejection note */}
          {course.status === "rejected" && (
            <div className="mb-3 p-2.5 bg-red-500/10 rounded-lg">
              <p className="text-xs text-red-400 font-medium">Course was rejected. Please edit and resubmit.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/tutor/courses/${course.id}/edit`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.06] text-[#cbc4d2] hover:bg-white/[0.1] transition-colors"
              >
                <Pencil size={12} /> Edit
              </Link>
            )}

            {course.status === "approved" && (
              <Link
                href={`/tutor/courses/${course.id}/edit`}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.06] text-[#cbc4d2] hover:bg-white/[0.1] transition-colors"
              >
                <Pencil size={12} /> View / Edit Modules
              </Link>
            )}

            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#6c63ff] text-white hover:bg-[#5b54e6] transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit for Review
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TutorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    apiGet<Course[]>("/api/v1/courses/my-courses")
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSubmit(id: string) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "pending_approval" } : c))
    );
  }

  const filtered = filter === "all" ? courses : courses.filter((c) => c.status === filter);

  const filterLabel: Record<Filter, string> = {
    all:              "All",
    draft:            "Draft",
    pending_approval: "Under Review",
    approved:         "Published",
    rejected:         "Rejected",
  };

  return (
    <div className="min-h-screen bg-[#050508]">
      <TutorNavbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Courses</h1>
            <p className="text-[#7c7a8a] text-sm mt-0.5">{courses.length} course{courses.length !== 1 ? "s" : ""} total</p>
          </div>
          <Link
            href="/tutor/courses/new"
            className="inline-flex items-center gap-2 bg-[#6c63ff] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#5b54e6] transition-colors"
          >
            <PlusCircle size={16} /> New Course
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => {
            const count = f === "all" ? courses.length : courses.filter((c) => c.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f
                    ? "bg-[#6c63ff] text-white"
                    : "bg-[#0d0d14] border border-white/[0.1] text-[#cbc4d2] hover:bg-[#050508]"
                }`}
              >
                {filterLabel[f]} ({count})
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <BookOpen size={36} className="text-[#7c7a8a] mx-auto mb-3" />
            {filter === "all" ? (
              <>
                <p className="text-[#7c7a8a] mb-4">You haven&apos;t created any courses yet.</p>
                <Link
                  href="/tutor/courses/new"
                  className="inline-flex items-center gap-2 bg-[#6c63ff] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#5b54e6] transition-colors"
                >
                  <PlusCircle size={16} /> Create your first course
                </Link>
              </>
            ) : (
              <p className="text-[#7c7a8a] text-sm">No courses with status &quot;{filterLabel[filter]}&quot;</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onDelete={handleDelete}
                  onSubmit={handleSubmit}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
