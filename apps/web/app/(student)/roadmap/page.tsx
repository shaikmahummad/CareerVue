"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2, Sparkles, RefreshCw, BookOpen, CheckCircle2,
  Clock, PlayCircle, Brain, ChevronRight,
} from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

type ItemStatus = "pending" | "enrolled" | "completed";
type Priority = "high" | "medium" | "low";

interface RoadmapItem {
  id: string; course_id: string | null; topic: string; reason: string;
  priority: Priority; recommended_course_type: string; search_keywords: string[];
  status: ItemStatus; order_index: number;
}
interface Roadmap { id: string; goal: string; status: string; created_at: string; items: RoadmapItem[]; }

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#ff4d4f", medium: "#e7c365", low: "#00d4ff",
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.ElementType }> = {
  pending:   { label: "Not started", icon: Clock },
  enrolled:  { label: "In progress", icon: PlayCircle },
  completed: { label: "Completed",   icon: CheckCircle2 },
};

const STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  pending: "enrolled", enrolled: "completed", completed: "pending",
};

function RoadmapItemCard({ item, roadmapId, index, onStatusChange }: {
  item: RoadmapItem; roadmapId: string; index: number;
  onStatusChange: (id: string, status: ItemStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const priorityColor = PRIORITY_COLORS[item.priority] ?? "#7c7a8a";
  const searchQuery = (item.search_keywords?.[0] ?? item.topic).replace(/\s+/g, "+");
  const isComplete = item.status === "completed";

  async function cycleStatus() {
    const next = STATUS_CYCLE[item.status];
    setUpdating(true);
    try {
      await apiPut(`/api/v1/roadmap/${roadmapId}/course/${item.id}/status`, { status: next });
      onStatusChange(item.id, next);
    } catch { /* silent */ }
    finally { setUpdating(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={`glass-card rounded-2xl p-5 transition-all ${isComplete ? "opacity-60" : "hover:border-white/[0.12]"}`}
    >
      <div className="flex items-start gap-4">
        {/* Number */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isComplete ? "gradient-primary text-white" : "bg-white/[0.05] border border-white/[0.1] text-[#7c7a8a]"
        }`}>
          {item.order_index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`font-semibold text-sm ${isComplete ? "line-through text-[#7c7a8a]" : "text-white"}`}>
              {item.topic}
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${priorityColor}15`, color: priorityColor, border: `1px solid ${priorityColor}25` }}>
              {item.priority}
            </span>
            <span className="text-[10px] text-[#7c7a8a] capitalize">{item.recommended_course_type}</span>
          </div>

          <p className="text-xs text-[#7c7a8a] leading-relaxed mb-3">{item.reason}</p>

          <div className="flex items-center gap-3">
            <button onClick={cycleStatus} disabled={updating}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                isComplete
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : item.status === "enrolled"
                  ? "bg-[#6c63ff]/10 border border-[#6c63ff]/20 text-[#6c63ff]"
                  : "bg-white/[0.05] border border-white/[0.1] text-[#7c7a8a] hover:text-white"
              }`}>
              {updating ? <Loader2 size={11} className="animate-spin" /> : <StatusIcon size={11} />}
              {statusCfg.label}
            </button>
            <Link href={`/courses?q=${searchQuery}`}
              className="flex items-center gap-1.5 text-xs text-[#6c63ff] hover:text-[#00d4ff] transition-colors">
              <BookOpen size={11} /> Find courses
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Velocity stats widget ──────────────────────────────────────────────── */
function VelocityCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-semibold text-white mb-4">Progress Stats</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "128", label: "Hours Spent" },
          { value: "12", label: "Quizzes Passed" },
          { value: "1.4x", label: "Velocity/Week" },
          { value: "Oct 2024", label: "Est. Completion" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-base font-bold gradient-text">{stat.value}</p>
            <p className="text-[10px] text-[#7c7a8a] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

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
      if (msg.includes("No active roadmap") || msg.includes("404")) setNoRoadmap(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoadmap(); }, [fetchRoadmap]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await apiPost("/api/v1/roadmap/generate");
      await fetchRoadmap();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate roadmap");
    } finally { setRegenerating(false); }
  }

  function handleStatusChange(itemId: string, status: ItemStatus) {
    setRoadmap((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => i.id === itemId ? { ...i, status } : i) } : prev
    );
  }

  const done = roadmap?.items.filter((i) => i.status === "completed").length ?? 0;
  const total = roadmap?.items.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />

      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 size={28} className="animate-spin text-[#6c63ff]" />
            <p className="text-sm text-[#7c7a8a]">Loading your roadmap…</p>
          </div>
        )}

        {!loading && noRoadmap && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
              <Brain size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">No roadmap yet</h1>
            <p className="text-[#7c7a8a] mb-8 max-w-sm">
              Take the skill assessment quiz first — our AI will build a personalised learning roadmap based on your results.
            </p>
            <button onClick={() => router.push("/quiz")}
              className="btn-primary inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm">
              <Sparkles size={16} /> Take the Quiz
            </button>
          </div>
        )}

        {!loading && roadmap && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left — roadmap items */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[#6c63ff] uppercase tracking-wider mb-1">GOAL: {roadmap.goal.toUpperCase()}</p>
                  <h1 className="text-2xl font-bold text-white">Your Roadmap to {roadmap.goal}</h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold gradient-text">{done}/{total}</span>
                  <span className="text-xs text-[#7c7a8a]">COMPLETE</span>
                  <button onClick={handleRegenerate} disabled={regenerating}
                    className="flex items-center gap-1.5 text-xs text-[#7c7a8a] hover:text-white glass-card px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ml-2">
                    {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="glass-card rounded-xl p-4 mb-6">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#7c7a8a]">Overall progress</span>
                  <span className="text-white font-semibold">{pct}% complete</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }} className="h-full gradient-primary rounded-full" />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {roadmap.items
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item, i) => (
                    <RoadmapItemCard key={item.id} item={item} roadmapId={roadmap.id} index={i}
                      onStatusChange={handleStatusChange} />
                  ))}
              </div>

              {done === total && total > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 glass-card rounded-2xl p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-[#00d4ff]/10 pointer-events-none" />
                  <div className="text-4xl mb-3">🎉</div>
                  <h2 className="text-xl font-bold text-white mb-2">Roadmap Complete!</h2>
                  <p className="text-sm text-[#7c7a8a] mb-5">You&apos;ve finished all topics. Ready for your next challenge?</p>
                  <button onClick={handleRegenerate}
                    className="btn-primary px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2">
                    <Sparkles size={14} /> Generate New Roadmap
                  </button>
                </motion.div>
              )}
            </div>

            {/* Right — stats sidebar */}
            <div className="space-y-5">
              <VelocityCard />
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs font-semibold text-white mb-3">Stuck on a topic?</p>
                <p className="text-xs text-[#7c7a8a] mb-4 leading-relaxed">
                  Book a 1:1 session with an expert mentor in under 10 minutes.
                </p>
                <button className="w-full btn-secondary text-xs py-2.5 rounded-xl flex items-center justify-center gap-2">
                  Connect with Mentor <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
