"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles, RefreshCw, BookOpen, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = "pending" | "enrolled" | "completed";
type Priority = "high" | "medium" | "low";

interface RoadmapItem {
  id: string;
  course_id: string | null;
  topic: string;
  reason: string;
  priority: Priority;
  recommended_course_type: string;
  search_keywords: string[];
  status: ItemStatus;
  order_index: number;
}

interface Roadmap {
  id: string;
  goal: string;
  status: string;
  created_at: string;
  items: RoadmapItem[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: "High priority",   color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  medium: { label: "Medium priority", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  low:    { label: "Low priority",    color: "text-green-700",  bg: "bg-green-50 border-green-200" },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Not started", color: "text-gray-500",   icon: <Clock      size={13} /> },
  enrolled:  { label: "In progress", color: "text-blue-600",   icon: <PlayCircle size={13} /> },
  completed: { label: "Completed",   color: "text-emerald-600",icon: <CheckCircle2 size={13} /> },
};

const STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  pending:   "enrolled",
  enrolled:  "completed",
  completed: "pending",
};

// ─── Item card ────────────────────────────────────────────────────────────────

function RoadmapItemCard({
  item,
  roadmapId,
  onStatusChange,
}: {
  item: RoadmapItem;
  roadmapId: string;
  onStatusChange: (itemId: string, status: ItemStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const priority = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;

  async function cycleStatus() {
    const next = STATUS_CYCLE[item.status];
    setUpdating(true);
    try {
      await apiPut(`/api/v1/roadmap/${roadmapId}/course/${item.id}/status`, { status: next });
      onStatusChange(item.id, next);
    } catch {
      // silently ignore — status stays unchanged
    } finally {
      setUpdating(false);
    }
  }

  const searchQuery = (item.search_keywords?.[0] ?? item.topic).replace(/\s+/g, "+");

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
        item.status === "completed" ? "border-emerald-200 opacity-75" : "border-gray-100 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Order index */}
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
            item.status === "completed"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-50 text-blue-700"
          }`}>
            {item.order_index}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className={`font-semibold text-gray-900 ${item.status === "completed" ? "line-through text-gray-400" : ""}`}>
                {item.topic}
              </h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priority.bg} ${priority.color}`}>
                {priority.label}
              </span>
              <span className="text-xs text-gray-400 capitalize">{item.recommended_course_type}</span>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.reason}</p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status toggle button */}
              <button
                onClick={cycleStatus}
                disabled={updating}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  item.status === "completed"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : item.status === "enrolled"
                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {updating ? <Loader2 size={12} className="animate-spin" /> : statusCfg.icon}
                {statusCfg.label}
              </button>

              {/* Find courses link */}
              <Link
                href={`/courses?q=${searchQuery}`}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <BookOpen size={12} />
                Find courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [noRoadmap, setNoRoadmap] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    setNoRoadmap(false);
    try {
      const data = await apiGet<Roadmap>("/api/v1/roadmap/mine");
      setRoadmap(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("No active roadmap") || msg.includes("404")) {
        setNoRoadmap(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoadmap(); }, [fetchRoadmap]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await apiPost("/api/v1/roadmap/generate");
      await fetchRoadmap();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate roadmap");
    } finally {
      setRegenerating(false);
    }
  }

  function handleStatusChange(itemId: string, status: ItemStatus) {
    setRoadmap((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
        : prev
    );
  }

  const completedCount = roadmap?.items.filter((i) => i.status === "completed").length ?? 0;
  const totalCount = roadmap?.items.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-gray-500 text-sm">Loading your roadmap…</p>
          </div>
        )}

        {/* No roadmap */}
        {!loading && noRoadmap && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗺️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No roadmap yet</h1>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Take the skill assessment quiz first — our AI will build a personalized learning roadmap based on your results.
            </p>
            <button
              onClick={() => router.push("/quiz")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-7 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Sparkles size={16} /> Take the Quiz
            </button>
          </div>
        )}

        {/* Roadmap */}
        {!loading && roadmap && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">My Roadmap</h1>
                <p className="text-gray-500 text-sm">
                  Goal: <span className="font-medium text-gray-700">{roadmap.goal}</span>
                </p>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {regenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Regenerate
              </button>
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Overall progress</span>
                <span className="font-semibold text-gray-900">{completedCount} / {totalCount} completed</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{progressPct}% complete</p>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {roadmap.items
                .sort((a, b) => a.order_index - b.order_index)
                .map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <RoadmapItemCard
                      item={item}
                      roadmapId={roadmap.id}
                      onStatusChange={handleStatusChange}
                    />
                  </motion.div>
                ))}
            </div>

            {/* Bottom CTA */}
            {completedCount === totalCount && totalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-center text-white"
              >
                <div className="text-3xl mb-2">🎉</div>
                <h2 className="text-xl font-bold mb-1">Roadmap Complete!</h2>
                <p className="text-emerald-100 text-sm mb-4">
                  You&apos;ve finished all topics in your roadmap. Ready for your next challenge?
                </p>
                <button
                  onClick={handleRegenerate}
                  className="bg-white text-emerald-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
                >
                  Generate New Roadmap
                </button>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
