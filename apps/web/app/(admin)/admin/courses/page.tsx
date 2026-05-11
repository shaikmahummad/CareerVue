"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, CheckCircle, XCircle, Clock, AlertCircle,
  Users, Star, Loader2, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import AdminNavbar from "../../../../components/AdminNavbar";
import { apiGet, apiPut } from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseWithTutor {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  tags: string[];
  status: string;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  rejection_note: string | null;
  tutor_id: string;
  tutor: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:            { label: "Draft",        color: "text-gray-600 bg-gray-100",      dot: "bg-gray-400" },
  pending_approval: { label: "Pending",      color: "text-amber-700 bg-amber-50",     dot: "bg-amber-400" },
  approved:         { label: "Approved",     color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  rejected:         { label: "Rejected",     color: "text-red-700 bg-red-50",         dot: "bg-red-400" },
};

const FILTERS = ["all", "pending_approval", "approved", "rejected", "draft"] as const;
type Filter = typeof FILTERS[number];
const FILTER_LABELS: Record<Filter, string> = {
  all:              "All",
  pending_approval: "Pending",
  approved:         "Approved",
  rejected:         "Rejected",
  draft:            "Draft",
};

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  courseTitle,
  onConfirm,
  onCancel,
}: {
  courseTitle: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Reject Course</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-1">&ldquo;{courseTitle}&rdquo;</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Rejection reason (optional)
        </label>
        <textarea
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all min-h-[80px] resize-y"
          placeholder="Tell the tutor what needs to be fixed..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            className="flex-1 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Reject Course
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  onApprove,
  onReject,
}: {
  course: CourseWithTutor;
  onApprove: (id: string) => void;
  onReject:  (id: string, note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [acting, setActing] = useState(false);

  const cfg = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;

  async function handleApprove() {
    setApproving(true);
    try {
      await apiPut(`/api/v1/admin/courses/${course.id}/approve`);
      onApprove(course.id);
    } catch (e: any) {
      alert(e.message ?? "Failed to approve");
    } finally {
      setApproving(false);
    }
  }

  async function handleRejectConfirm(note: string) {
    setShowRejectModal(false);
    setActing(true);
    try {
      await apiPut(`/api/v1/admin/courses/${course.id}/reject`, { rejection_note: note || null });
      onReject(course.id, note);
    } catch (e: any) {
      alert(e.message ?? "Failed to reject");
    } finally {
      setActing(false);
    }
  }

  const isPending = course.status === "pending_approval";

  return (
    <>
      {showRejectModal && (
        <RejectModal
          courseTitle={course.title}
          onConfirm={handleRejectConfirm}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
          isPending ? "border-amber-200" : "border-gray-100"
        }`}
      >
        {/* Header row */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-violet-100 flex items-center justify-center flex-shrink-0">
              <BookOpen size={20} className="text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-gray-900 leading-snug">{course.title}</h3>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                <span className="font-medium text-gray-600">
                  {course.tutor?.full_name ?? "Unknown tutor"}
                </span>
                {course.category && <span>{course.category}</span>}
                {course.level    && <span className="capitalize">{course.level}</span>}
                <span className="flex items-center gap-1"><Users size={11} /> {course.enrolled_count}</span>
                {course.avg_rating > 0 && (
                  <span className="flex items-center gap-1"><Star size={11} /> {course.avg_rating.toFixed(1)}</span>
                )}
                <span className="font-medium">{course.is_free ? "Free" : `₹${course.price}`}</span>
              </div>

              {/* Rejection note */}
              {course.rejection_note && (
                <div className="mb-3 p-2.5 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600"><span className="font-medium">Rejected:</span> {course.rejection_note}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isPending && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approving || acting}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {approving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={approving || acting}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {acting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                  </>
                )}

                {course.status === "approved" && (
                  <button
                    onClick={() => apiPut(`/api/v1/admin/courses/${course.id}/reject`, { rejection_note: null }).then(() => onReject(course.id, ""))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <XCircle size={12} /> Revoke approval
                  </button>
                )}

                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                >
                  {expanded ? <><ChevronUp size={13} /> Less</> : <><ChevronDown size={13} /> Details</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-2">
            {course.description && (
              <p className="text-sm text-gray-600">{course.description}</p>
            )}
            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-400">
              Submitted: {course.created_at ? new Date(course.created_at).toLocaleDateString() : "—"}
              {course.tutor && <> · {course.tutor.email}</>}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── Inner content ────────────────────────────────────────────────────────────

function CoursesContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") ?? "all") as Filter;

  const [courses, setCourses] = useState<CourseWithTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    apiGet<CourseWithTutor[]>(`/api/v1/admin/courses?${params}`)
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  function handleApprove(id: string) {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status: "approved" } : c));
  }

  function handleReject(id: string, note: string) {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status: "rejected", rejection_note: note } : c));
  }

  const filtered = search.trim()
    ? courses.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.tutor?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : courses;

  const counts: Record<Filter, number> = {
    all:              courses.length,
    pending_approval: courses.filter((c) => c.status === "pending_approval").length,
    approved:         courses.filter((c) => c.status === "approved").length,
    rejected:         courses.filter((c) => c.status === "rejected").length,
    draft:            courses.filter((c) => c.status === "draft").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and approve tutor-submitted courses.</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
            placeholder="Search by title or tutor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {FILTER_LABELS[f]}
              {f === "pending_approval" && counts.pending_approval > 0 && (
                <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === f ? "bg-amber-400 text-gray-900" : "bg-amber-100 text-amber-700"}`}>
                  {counts.pending_approval}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <CheckCircle size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {search ? "No courses match your search." : `No ${filter === "all" ? "" : FILTER_LABELS[filter] + " "}courses.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400">{filtered.length} course{filtered.length !== 1 ? "s" : ""}</p>
            <AnimatePresence>
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      </div>
    }>
      <CoursesContent />
    </Suspense>
  );
}
