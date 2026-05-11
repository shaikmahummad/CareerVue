"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Check, BookOpen,
  Video, FileText, Loader2, PlusCircle, Trash2, GripVertical,
} from "lucide-react";
import TutorNavbar from "../../../../../components/TutorNavbar";
import { apiPost } from "../../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseForm {
  title: string;
  description: string;
  category: string;
  level: string;
  is_free: boolean;
  price: string;
  language: string;
  duration_hours: string;
  thumbnail_url: string;
  tags: string;
}

interface ModuleForm {
  title: string;
  description: string;
  video_url: string;
  pdf_url: string;
  duration_mins: string;
  is_preview: boolean;
}

interface Module extends ModuleForm {
  id: string;
  saved: boolean;
  saving: boolean;
  error: string;
}

const CATEGORIES = ["Programming", "Design", "Data Science", "Business", "Marketing", "DevOps", "Cybersecurity", "Other"];
const LEVELS     = ["beginner", "intermediate", "advanced"];
const LANGUAGES  = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam"];

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all";
const selectCls = inputCls + " bg-white";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Course Details", "Add Modules", "Review & Submit"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done    ? "bg-blue-600 text-white" :
                current ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                          "bg-gray-100 text-gray-400"
              }`}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${current ? "text-gray-900" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${done ? "bg-blue-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Course details ───────────────────────────────────────────────────

function DetailsStep({
  form,
  onChange,
}: {
  form: CourseForm;
  onChange: (k: keyof CourseForm, v: string | boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Course Title" required>
        <input
          className={inputCls}
          placeholder="e.g. Complete React Developer Course"
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
        />
      </Field>

      <Field label="Description">
        <textarea
          className={inputCls + " min-h-[100px] resize-y"}
          placeholder="What will students learn? What are the prerequisites?"
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" required>
          <select
            className={selectCls}
            value={form.category}
            onChange={(e) => onChange("category", e.target.value)}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Level" required>
          <select
            className={selectCls}
            value={form.level}
            onChange={(e) => onChange("level", e.target.value)}
          >
            <option value="">Select level</option>
            {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Language">
          <select
            className={selectCls}
            value={form.language}
            onChange={(e) => onChange("language", e.target.value)}
          >
            <option value="">Select language</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>

        <Field label="Duration (hours)">
          <input
            type="number"
            min="0"
            step="0.5"
            className={inputCls}
            placeholder="e.g. 12"
            value={form.duration_hours}
            onChange={(e) => onChange("duration_hours", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Pricing">
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            onClick={() => onChange("is_free", true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              form.is_free
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Free
          </button>
          <button
            type="button"
            onClick={() => onChange("is_free", false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              !form.is_free
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Paid
          </button>
        </div>
        {!form.is_free && (
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              type="number"
              min="0"
              className={inputCls + " pl-7"}
              placeholder="0"
              value={form.price}
              onChange={(e) => onChange("price", e.target.value)}
            />
          </div>
        )}
      </Field>

      <Field label="Thumbnail URL">
        <input
          className={inputCls}
          placeholder="https://..."
          value={form.thumbnail_url}
          onChange={(e) => onChange("thumbnail_url", e.target.value)}
        />
      </Field>

      <Field label="Tags (comma-separated)">
        <input
          className={inputCls}
          placeholder="React, JavaScript, Web Development"
          value={form.tags}
          onChange={(e) => onChange("tags", e.target.value)}
        />
      </Field>
    </div>
  );
}

// ─── Step 2: Modules ──────────────────────────────────────────────────────────

function ModuleRow({
  mod,
  index,
  courseId,
  onChange,
  onDelete,
}: {
  mod: Module;
  index: number;
  courseId: string;
  onChange: (id: string, k: keyof ModuleForm, v: string | boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(!mod.saved);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {mod.title || `Module ${index + 1}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {mod.video_url && <span className="text-xs text-gray-400 flex items-center gap-1"><Video size={10} /> Video</span>}
            {mod.pdf_url   && <span className="text-xs text-gray-400 flex items-center gap-1"><FileText size={10} /> PDF</span>}
            {mod.is_preview && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">Preview</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {mod.saved && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Saved</span>}
          {mod.error && <span className="text-xs text-red-500">{mod.error}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(mod.id); }}
            className="p-1 text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <ChevronRight
            size={14}
            className={`text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
          <Field label="Title" required>
            <input
              className={inputCls}
              placeholder="e.g. Introduction to React"
              value={mod.title}
              onChange={(e) => onChange(mod.id, "title", e.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              className={inputCls + " min-h-[64px] resize-y"}
              placeholder="What will students learn in this module?"
              value={mod.description}
              onChange={(e) => onChange(mod.id, "description", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Video URL">
              <input
                className={inputCls}
                placeholder="YouTube / Vimeo / direct URL"
                value={mod.video_url}
                onChange={(e) => onChange(mod.id, "video_url", e.target.value)}
              />
            </Field>
            <Field label="PDF URL">
              <input
                className={inputCls}
                placeholder="https://..."
                value={mod.pdf_url}
                onChange={(e) => onChange(mod.id, "pdf_url", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="e.g. 15"
                value={mod.duration_mins}
                onChange={(e) => onChange(mod.id, "duration_mins", e.target.value)}
              />
            </Field>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mod.is_preview}
                  onChange={(e) => onChange(mod.id, "is_preview", e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700">Free preview</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModulesStep({
  courseId,
  modules,
  onAdd,
  onChange,
  onDelete,
  onSaveAll,
  saving,
}: {
  courseId: string;
  modules: Module[];
  onAdd: () => void;
  onChange: (id: string, k: keyof ModuleForm, v: string | boolean) => void;
  onDelete: (id: string) => void;
  onSaveAll: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{modules.length} module{modules.length !== 1 ? "s" : ""} added</p>
          <p className="text-xs text-gray-400 mt-0.5">You need at least 1 module to submit for review.</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <PlusCircle size={14} /> Add Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <Video size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-3">No modules yet</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={14} /> Add your first module
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, i) => (
            <ModuleRow
              key={mod.id}
              mod={mod}
              index={i}
              courseId={courseId}
              onChange={onChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {modules.length > 0 && (
        <button
          onClick={onSaveAll}
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save All Modules
        </button>
      )}
    </div>
  );
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

function ReviewStep({
  courseId,
  form,
  modules,
  onSubmit,
  submitting,
}: {
  courseId: string;
  form: CourseForm;
  modules: Module[];
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Course Details</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">Title</span>
          <span className="text-gray-900 font-medium">{form.title || "—"}</span>
          <span className="text-gray-500">Category</span>
          <span className="text-gray-900">{form.category || "—"}</span>
          <span className="text-gray-500">Level</span>
          <span className="text-gray-900 capitalize">{form.level || "—"}</span>
          <span className="text-gray-500">Language</span>
          <span className="text-gray-900">{form.language || "—"}</span>
          <span className="text-gray-500">Price</span>
          <span className="text-gray-900">{form.is_free ? "Free" : `₹${form.price}`}</span>
          <span className="text-gray-500">Duration</span>
          <span className="text-gray-900">{form.duration_hours ? `${form.duration_hours} hrs` : "—"}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">{modules.length} Module{modules.length !== 1 ? "s" : ""}</p>
        {modules.length === 0 ? (
          <p className="text-sm text-red-500">⚠ No modules added. Go back and add at least 1 module.</p>
        ) : (
          <div className="space-y-2">
            {modules.map((mod, i) => (
              <div key={mod.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-800">{mod.title || "Untitled module"}</span>
                {mod.saved ? (
                  <Check size={12} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <span className="text-xs text-amber-500 flex-shrink-0">not saved</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800 font-medium mb-1">Before you submit</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Once submitted, the course will be reviewed by an admin.</li>
          <li>You won&apos;t be able to edit it while it&apos;s under review.</li>
          <li>Make sure all modules have valid video or PDF content.</li>
        </ul>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || modules.length === 0}
        className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Submit for Review
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

let localId = 0;

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>({
    title: "", description: "", category: "", level: "",
    is_free: true, price: "", language: "", duration_hours: "",
    thumbnail_url: "", tags: "",
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setField(k: keyof CourseForm, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Step 1 → Create course and advance
  async function handleNext() {
    setError("");

    if (step === 0) {
      if (!form.title.trim()) { setError("Course title is required."); return; }
      if (!form.category)     { setError("Please select a category.");  return; }
      if (!form.level)        { setError("Please select a level.");      return; }

      if (!courseId) {
        // Create the course
        setCreating(true);
        try {
          const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
          const data = await apiPost<{ id: string }>("/api/v1/courses/", {
            title:          form.title.trim(),
            description:    form.description.trim() || null,
            category:       form.category,
            level:          form.level,
            is_free:        form.is_free,
            price:          form.is_free ? 0 : parseFloat(form.price) || 0,
            language:       form.language || null,
            duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
            thumbnail_url:  form.thumbnail_url.trim() || null,
            tags,
          });
          setCourseId(data.id);
        } catch (e: any) {
          setError(e.message ?? "Failed to create course");
          setCreating(false);
          return;
        }
        setCreating(false);
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      // Save all unsaved modules before advancing
      await handleSaveAllModules();
      setStep(2);
    }
  }

  function addModule() {
    const id = `local-${localId++}`;
    setModules((m) => [
      ...m,
      { id, title: "", description: "", video_url: "", pdf_url: "",
        duration_mins: "", is_preview: false, saved: false, saving: false, error: "" },
    ]);
  }

  function changeModule(id: string, k: keyof ModuleForm, v: string | boolean) {
    setModules((m) => m.map((mod) => mod.id === id ? { ...mod, [k]: v, saved: false } : mod));
  }

  function deleteModule(id: string) {
    setModules((m) => m.filter((mod) => mod.id !== id));
  }

  async function handleSaveAllModules() {
    if (!courseId) return;
    setSavingModules(true);
    const unsaved = modules.filter((m) => !m.saved && m.title.trim());
    const results = await Promise.allSettled(
      unsaved.map((mod, i) =>
        apiPost(`/api/v1/courses/${courseId}/modules`, {
          title:        mod.title.trim(),
          description:  mod.description.trim() || null,
          video_url:    mod.video_url.trim() || null,
          pdf_url:      mod.pdf_url.trim() || null,
          duration_mins: mod.duration_mins ? parseInt(mod.duration_mins) : null,
          order_index:  modules.indexOf(mod),
          is_preview:   mod.is_preview,
        })
      )
    );
    setModules((prev) => {
      const updated = [...prev];
      let ri = 0;
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].saved && updated[i].title.trim()) {
          updated[i] = {
            ...updated[i],
            saved: results[ri].status === "fulfilled",
            error: results[ri].status === "rejected" ? (results[ri] as PromiseRejectedResult).reason?.message ?? "Error" : "",
          };
          ri++;
        }
      }
      return updated;
    });
    setSavingModules(false);
  }

  async function handleSubmit() {
    if (!courseId || modules.length === 0) return;
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/courses/${courseId}/submit`);
      router.push("/tutor/courses?submitted=1");
    } catch (e: any) {
      setError(e.message ?? "Failed to submit course");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TutorNavbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/tutor/courses"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back to courses
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Course</h1>

        <StepBar step={step} />

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <DetailsStep form={form} onChange={setField} />}
              {step === 1 && courseId && (
                <ModulesStep
                  courseId={courseId}
                  modules={modules}
                  onAdd={addModule}
                  onChange={changeModule}
                  onDelete={deleteModule}
                  onSaveAll={handleSaveAllModules}
                  saving={savingModules}
                />
              )}
              {step === 2 && courseId && (
                <ReviewStep
                  courseId={courseId}
                  form={form}
                  modules={modules}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Navigation */}
          {step < 2 && (
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
              {step > 0 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                disabled={creating || savingModules}
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {creating || savingModules ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {step === 0 ? "Save & Continue" : "Review & Submit"}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
