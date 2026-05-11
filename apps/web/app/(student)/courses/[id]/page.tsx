"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ChevronLeft, Star, Users, Clock, Globe, BookOpen,
  Lock, Play, FileText, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import StudentNavbar from "../../../../components/StudentNavbar";
import { apiGet, apiPost } from "../../../../lib/api";

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
  tutor_id: string;
  tutor_name: string | null;
  tutor_avatar: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];
  price: number;
  is_free: boolean;
  level: string | null;
  duration_hours: number | null;
  language: string | null;
  enrolled_count: number;
  avg_rating: number;
  modules: Module[];
  is_enrolled: boolean;
}

// ─── Razorpay integration ─────────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Star rating ─────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </span>
  );
}

// ─── Module row ───────────────────────────────────────────────────────────────

function ModuleRow({ module, index, enrolled }: { module: Module; index: number; enrolled: boolean }) {
  const accessible = enrolled || module.is_preview;
  const hasVideo = !!module.video_url;
  const hasPdf = !!module.pdf_url;

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl transition-colors ${
      accessible ? "hover:bg-gray-50 cursor-pointer" : "opacity-60"
    }`}>
      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        accessible ? "bg-blue-50" : "bg-gray-100"
      }`}>
        {accessible ? (
          hasVideo ? <Play size={14} className="text-blue-600" /> : <FileText size={14} className="text-blue-600" />
        ) : (
          <Lock size={13} className="text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">{module.title}</p>
        {module.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{module.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {hasVideo && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Play size={10} /> Video</span>}
          {hasPdf && <span className="text-xs text-gray-400 flex items-center gap-0.5"><FileText size={10} /> PDF</span>}
          {module.duration_mins && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Clock size={10} /> {module.duration_mins}m
            </span>
          )}
          {module.is_preview && !enrolled && (
            <span className="text-xs text-emerald-600 font-medium">Free preview</span>
          )}
        </div>
      </div>

      <span className="flex-shrink-0 text-xs text-gray-300 pt-0.5">{index + 1}</span>
    </div>
  );
}

// ─── Enrollment CTA ───────────────────────────────────────────────────────────

function EnrollCTA({
  course,
  onEnroll,
  enrolling,
  error,
}: {
  course: CourseDetail;
  onEnroll: () => void;
  enrolling: boolean;
  error: string;
}) {
  if (course.is_enrolled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">You&apos;re enrolled in this course</span>
        </div>
        <Link
          href={`/courses/${course.id}/learn`}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Play size={15} /> Continue Learning
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Price */}
      <div className="text-center py-2">
        {course.is_free ? (
          <p className="text-3xl font-bold text-emerald-600">Free</p>
        ) : (
          <p className="text-3xl font-bold text-gray-900">
            ₹{course.price.toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={onEnroll}
        disabled={enrolling}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 text-base"
      >
        {enrolling ? (
          <><Loader2 size={16} className="animate-spin" /> Processing…</>
        ) : course.is_free ? (
          "Enroll for Free"
        ) : (
          `Buy Now — ₹${course.price.toLocaleString("en-IN")}`
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        {course.is_free ? "No credit card required" : "Secure checkout via Razorpay"}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<CourseDetail>(`/api/v1/courses/${id}`);
        setCourse(data);
        setIsEnrolled(data.is_enrolled);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("404") || msg.includes("not found")) setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    setEnrollError("");

    try {
      if (course.is_free) {
        await apiPost("/api/v1/enrollments/", { course_id: course.id });
        setIsEnrolled(true);
        setCourse((prev) => prev ? { ...prev, is_enrolled: true } : prev);
      } else {
        // Paid: Razorpay flow
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Could not load payment gateway. Check your internet connection.");

        const order = await apiPost<{
          order_id: string; amount: number; currency: string; key_id: string; payment_id: string;
        }>("/api/v1/payments/create-order", { course_id: course.id });

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: order.key_id,
            amount: order.amount,
            currency: order.currency,
            order_id: order.order_id,
            name: "CareerVue",
            description: course.title,
            theme: { color: "#2563EB" },
            handler: async (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              try {
                await apiPost("/api/v1/payments/verify", {
                  course_id: course.id,
                  gateway_order_id: response.razorpay_order_id,
                  gateway_payment_id: response.razorpay_payment_id,
                  gateway_signature: response.razorpay_signature,
                });
                setIsEnrolled(true);
                setCourse((prev) => prev ? { ...prev, is_enrolled: true } : prev);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled")),
            },
          });
          rzp.open();
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      if (msg !== "Payment cancelled") setEnrollError(msg);
    } finally {
      setEnrolling(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="text-center py-32">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Course not found</p>
          <Link href="/courses" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const totalDurationMins = course.modules.reduce((sum, m) => sum + (m.duration_mins ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ChevronLeft size={15} /> All Courses
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left column — course info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-violet-100 flex items-center justify-center">
                {course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={48} className="text-blue-300" />
                )}
              </div>

              <div className="p-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {course.category && (
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                      {course.category}
                    </span>
                  )}
                  {course.level && (
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                      {course.level}
                    </span>
                  )}
                  {course.is_free && (
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      Free
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-snug">
                  {course.title}
                </h1>

                {course.description && (
                  <p className="text-gray-600 leading-relaxed mb-4">{course.description}</p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Stars rating={course.avg_rating} />
                    <span className="font-medium text-gray-700">
                      {course.avg_rating > 0 ? course.avg_rating.toFixed(1) : "No ratings yet"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1"><Users size={14} />{course.enrolled_count.toLocaleString()} enrolled</span>
                  {totalDurationMins > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />{Math.round(totalDurationMins / 60)}h {totalDurationMins % 60}m
                    </span>
                  )}
                  {course.language && (
                    <span className="flex items-center gap-1"><Globe size={14} />{course.language}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tutor */}
            {course.tutor_name && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Instructor</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {course.tutor_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{course.tutor_name}</p>
                    <p className="text-xs text-gray-500">Expert Instructor</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Curriculum */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Course Curriculum</h2>
                <span className="text-sm text-gray-500">{course.modules.length} lessons</span>
              </div>

              {course.modules.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No modules added yet — check back soon.
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {course.modules.map((m, i) => (
                    <ModuleRow
                      key={m.id}
                      module={m}
                      index={i}
                      enrolled={isEnrolled}
                    />
                  ))}
                </div>
              )}

              {!isEnrolled && course.modules.some((m) => !m.is_preview) && (
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                  <Lock size={11} /> Enroll to unlock all lessons
                </p>
              )}
            </div>
          </div>

          {/* Right column — sticky CTA card */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <EnrollCTA
                course={{ ...course, is_enrolled: isEnrolled }}
                onEnroll={handleEnroll}
                enrolling={enrolling}
                error={enrollError}
              />

              {/* Course highlights */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This course includes</p>
                {course.modules.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen size={14} className="text-gray-400" />
                    {course.modules.length} lessons
                  </div>
                )}
                {totalDurationMins > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} className="text-gray-400" />
                    {Math.round(totalDurationMins / 60)}h {totalDurationMins % 60}m of content
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 size={14} className="text-gray-400" />
                  Certificate on completion
                </div>
                {course.language && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe size={14} className="text-gray-400" />
                    {course.language}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
