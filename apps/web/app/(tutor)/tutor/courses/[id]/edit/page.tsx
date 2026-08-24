"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Save, Send, Loader2, PlusCircle, Trash2,
  GripVertical, Video, FileText, ChevronRight, Check,
  AlertCircle, CheckCircle, XCircle, Clock,
} from "lucide-react";
import TutorNavbar from "../../../../../../components/TutorNavbar";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  language: string | null;
  duration_hours: number | null;
  thumbnail_url: string | null;
  tags: string[];
  status: string;
  rejection_note: string | null;
  modules: CourseModule[];
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration_mins: number | null;
  order_index: number;
  is_preview: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Draft",        color: "text-gray-600 bg-gray-100",      icon: Clock },
  pending_approval: { label: "Under Review", color: "text-amber-700 bg-amber-50",     icon: AlertCircle },
  approved:         { label: "Published",    color: "text-emerald-700 bg-emerald-50", icon: CheckCircle },
  rejected:         { label: "Rejected",     color: "text-red-700 bg-red-50",         icon: XCircle },
};

const CATEGORIES = ["Programming", "Design", "Data Science", "Business", "Marketing", "DevOps", "Cybersecurity", "Other"];
const LEVELS     = ["beginner", "intermediate", "advanced"];
const LANGUAGES  = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam"];

const inputCls  = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all";
const selectCls = inputCls + " bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── Module editor row ────────────────────────────────────────────────────────

interface LocalModule extends CourseModule {
  _unsaved?: boolean;
  _deleting?: boolean;
  _saving?: boolean;
  _error?: string;
}

function ModuleRow({
  mod,
  index,
  courseId,
  canEdit,
  onSaved,
  onDelete,
}: {
  mod: LocalModule;
  index: number;
  courseId: string;
  canEdit: boolean;
  onSaved: (updated: CourseModule) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(!!mod._unsaved);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [local, setLocal] = useState<LocalModule>(mod);

  function set<K extends keyof CourseModule>(k: K, v: CourseModule[K]) {
    setLocal((l) => ({ ...l, [k]: v }));
  }

  async function handleSave() {
    if (!local.title.trim()) return;
    setSaving(true);
    try {
      if (mod._unsaved) {
        const saved = await apiPost<CourseModule>(`/api/v1/courses/${courseId}/modules`, {
          title:        local.title.trim(),
          description:  local.description?.trim() || null,
          video_url:    local.video_url?.trim() || null,
          pdf_url:      local.pdf_url?.trim() || null,
          duration_mins: local.duration_mins ? Number(local.duration_mins) : null,
          order_index:  index,
          is_preview:   local.is_preview,
        });
        onSaved(saved);
      } else {
        const updated = await apiPut<CourseModule>(
          `/api/v1/courses/${courseId}/modules/${mod.id}`,
          {
            title:        local.title.trim(),
            description:  local.description?.trim() || null,
            video_url:    local.video_url?.trim() || null,
            pdf_url:      local.pdf_url?.trim() || null,
            duration_mins: local.duration_mins ? Number(local.duration_mins) : null,
            order_index:  index,
            is_preview:   local.is_preview,
          }
        );
        onSaved(updated);
      }
      setExpanded(false);
    } catch (error: unknown) {
      setLocal((l) => ({ ...l, _error: error instanceof Error ? error.message : "Save failed" }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this module?")) return;
    setDeleting(true);
    if (!mod._unsaved) {
      try {
        await apiDelete(`/api/v1/courses/${courseId}/modules/${mod.id}`);
      } catch (error: unknown) {
        setLocal((l) => ({ ...l, _error: error instanceof Error ? error.message : "Delete failed" }));
        setDeleting(false);
        return;
      }
    }
    onDelete(mod.id);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => canEdit && setExpanded((e) => !e)}
      >
        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {local.title || `Module ${index + 1}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {local.video_url && <span className="text-xs text-gray-400 flex items-center gap-1"><Video size={10} /> Video</span>}
            {local.pdf_url   && <span className="text-xs text-gray-400 flex items-center gap-1"><FileText size={10} /> PDF</span>}
            {local.is_preview && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">Preview</span>}
            {mod._unsaved && <span className="text-xs text-amber-600">unsaved</span>}
            {local._error && <span className="text-xs text-red-500">{local._error}</span>}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting}
              className="p-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
            <ChevronRight
              size={14}
              className={`text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </div>
        )}
      </div>

      {expanded && canEdit && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
          <Field label="Title">
            <input
              className={inputCls}
              value={local.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              className={inputCls + " min-h-[64px] resize-y"}
              value={local.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Video URL">
              <input className={inputCls} value={local.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="YouTube / Vimeo / direct" />
            </Field>
            <Field label="PDF URL">
              <input className={inputCls} value={local.pdf_url ?? ""} onChange={(e) => set("pdf_url", e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (mins)">
              <input type="number" min="0" className={inputCls} value={local.duration_mins ?? ""} onChange={(e) => set("duration_mins", e.target.value ? parseInt(e.target.value) : null)} />
            </Field>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={local.is_preview} onChange={(e) => set("is_preview", e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">Free preview</span>
              </label>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !local.title.trim()}
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Module
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

let localCounter = 0;

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<LocalModule[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", category: "", level: "",
    is_free: true, price: "", language: "", duration_hours: "", thumbnail_url: "", tags: "",
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<CourseDetail>(`/api/v1/courses/${courseId}`)
      .then((data) => {
        setCourse(data);
        setForm({
          title:          data.title,
          description:    data.description ?? "",
          category:       data.category ?? "",
          level:          data.level ?? "",
          is_free:        data.is_free,
          price:          data.price ? String(data.price) : "",
          language:       data.language ?? "",
          duration_hours: data.duration_hours ? String(data.duration_hours) : "",
          thumbnail_url:  data.thumbnail_url ?? "",
          tags:           (data.tags ?? []).join(", "),
        });
        setModules(data.modules.map((m) => ({ ...m })));
      })
      .catch(() => setError("Failed to load course"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const canEdit = course?.status === "draft" || course?.status === "rejected";

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const updated = await apiPut<CourseDetail>(`/api/v1/courses/${courseId}`, {
        title:          form.title.trim() || undefined,
        description:    form.description.trim() || null,
        category:       form.category || null,
        level:          form.level || null,
        is_free:        form.is_free,
        price:          form.is_free ? 0 : parseFloat(form.price) || 0,
        language:       form.language || null,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
        thumbnail_url:  form.thumbnail_url.trim() || null,
        tags,
      });
      setCourse((c) => c ? { ...c, ...updated } : c);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/courses/${courseId}/submit`);
      router.push("/tutor/courses?submitted=1");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Submit failed");
      setSubmitting(false);
    }
  }

  function addModule() {
    const id = `local-${localCounter++}`;
    setModules((m) => [
      ...m,
      { id, title: "", description: null, video_url: null, pdf_url: null,
        duration_mins: null, order_index: m.length, is_preview: false, _unsaved: true },
    ]);
  }

  function handleModuleSaved(saved: CourseModule) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === saved.id || (m._unsaved && m.title === saved.title)
          ? { ...saved }
          : m
      )
    );
  }

  function handleModuleDelete(id: string) {
    setModules((m) => m.filter((mod) => mod.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TutorNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TutorNavbar />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-gray-500">{error || "Course not found"}</p>
          <Link href="/tutor/courses" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← Back to courses</Link>
        </div>
      </div>
    );
  }

  const cfg   = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;
  const SIcon = cfg.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <TutorNavbar />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link
              href="/tutor/courses"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
            >
              <ChevronLeft size={16} /> Back to courses
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${cfg.color}`}>
            <SIcon size={12} /> {cfg.label}
          </span>
        </div>

        {/* Rejection note */}
        {course.status === "rejected" && course.rejection_note && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-medium text-red-700 mb-1">Rejection reason</p>
            <p className="text-sm text-red-600">{course.rejection_note}</p>
          </div>
        )}

        {/* Course Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Course Details</p>
          <div className="space-y-4">
            <Field label="Title">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={!canEdit}
              />
            </Field>

            <Field label="Description">
              <textarea
                className={inputCls + " min-h-[80px] resize-y"}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!canEdit}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className={selectCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={!canEdit}>
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select className={selectCls} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} disabled={!canEdit}>
                  <option value="">Select</option>
                  {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Language">
                <select className={selectCls} value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} disabled={!canEdit}>
                  <option value="">Select</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Duration (hours)">
                <input type="number" min="0" step="0.5" className={inputCls} value={form.duration_hours} onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))} disabled={!canEdit} />
              </Field>
            </div>

            {canEdit && (
              <Field label="Pricing">
                <div className="flex gap-3 mb-3">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, is_free: true }))} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.is_free ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>Free</button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, is_free: false }))} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!form.is_free ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>Paid</button>
                </div>
                {!form.is_free && (
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input type="number" min="0" className={inputCls + " pl-7"} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                )}
              </Field>
            )}

            <Field label="Tags (comma-separated)">
              <input className={inputCls} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} disabled={!canEdit} placeholder="React, JavaScript, Web Development" />
            </Field>

            <Field label="Thumbnail URL">
              <input className={inputCls} value={form.thumbnail_url} onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))} disabled={!canEdit} placeholder="https://..." />
            </Field>
          </div>

          {canEdit && (
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Changes
              </button>
              <AnimatePresence>
                {saveStatus === "saved" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-emerald-600 flex items-center gap-1"
                  >
                    <Check size={14} /> Saved
                  </motion.span>
                )}
                {saveStatus === "error" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-500"
                  >
                    {error}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modules */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">
              Modules <span className="text-gray-400 font-normal">({modules.length})</span>
            </p>
            {canEdit && (
              <button
                onClick={addModule}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <PlusCircle size={12} /> Add Module
              </button>
            )}
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
              <Video size={24} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No modules yet</p>
              {canEdit && (
                <button onClick={addModule} className="mt-2 text-xs text-blue-600 hover:underline">
                  Add your first module
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, i) => (
                <ModuleRow
                  key={mod.id}
                  mod={mod}
                  index={i}
                  courseId={courseId}
                  canEdit={canEdit}
                  onSaved={handleModuleSaved}
                  onDelete={handleModuleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit for review */}
        {canEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Ready to publish?</p>
            <p className="text-sm text-gray-500 mb-4">
              Once submitted, an admin will review your course. You won&apos;t be able to edit it while it&apos;s under review.
            </p>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting || modules.length === 0}
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Submit for Review
            </button>
            {modules.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">Add at least 1 module before submitting.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
