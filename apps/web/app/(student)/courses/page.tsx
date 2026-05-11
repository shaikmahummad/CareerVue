"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Star, Users, Clock, BookOpen, Loader2, SlidersHorizontal } from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet } from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  tutor_name: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];
  price: number;
  is_free: boolean;
  level: string | null;
  duration_hours: number | null;
  enrolled_count: number;
  avg_rating: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "All",
  "Web Development",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "Mobile Development",
  "DSA & Algorithms",
  "System Design",
  "Databases",
];

const LEVELS = ["All", "beginner", "intermediate", "advanced"];

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Web Development":     "bg-blue-100 text-blue-700",
  "Data Science":        "bg-purple-100 text-purple-700",
  "Machine Learning":    "bg-violet-100 text-violet-700",
  "DevOps":              "bg-orange-100 text-orange-700",
  "Mobile Development":  "bg-pink-100 text-pink-700",
  "DSA & Algorithms":    "bg-green-100 text-green-700",
  "System Design":       "bg-indigo-100 text-indigo-700",
  "Databases":           "bg-yellow-100 text-yellow-700",
};

// ─── Course card ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          className={s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating > 0 ? rating.toFixed(1) : "New"}</span>
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
  const catColor = course.category ? (CATEGORY_COLORS[course.category] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-600";

  return (
    <Link
      href={`/courses/${course.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-blue-50 to-violet-100 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={36} className="text-blue-300" />
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Category + level */}
        <div className="flex items-center gap-2 mb-2">
          {course.category && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>
              {course.category}
            </span>
          )}
          {course.level && (
            <span className="text-xs text-gray-400 capitalize">{course.level}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
          {course.title}
        </h3>

        {/* Tutor */}
        {course.tutor_name && (
          <p className="text-xs text-gray-500 mb-3">{course.tutor_name}</p>
        )}

        <div className="mt-auto space-y-2">
          {/* Rating + enrolled */}
          <div className="flex items-center justify-between">
            <StarRating rating={course.avg_rating} />
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} />{course.enrolled_count.toLocaleString()}
            </span>
          </div>

          {/* Duration + price */}
          <div className="flex items-center justify-between">
            {course.duration_hours ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />{course.duration_hours}h
              </span>
            ) : <span />}

            {course.is_free ? (
              <span className="text-sm font-bold text-emerald-600">Free</span>
            ) : (
              <span className="text-sm font-bold text-gray-900">₹{course.price.toLocaleString("en-IN")}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function CoursesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [priceType, setPriceType] = useState<"all" | "free" | "paid">("all");

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback((pg: number) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category !== "All") p.set("category", category);
    if (level !== "All") p.set("level", level);
    if (priceType !== "all") p.set("price_type", priceType);
    p.set("page", String(pg));
    p.set("limit", "12");
    return p.toString();
  }, [search, category, level, priceType]);

  const fetchCourses = useCallback(async (pg: number, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await apiGet<Course[]>(`/api/v1/courses/?${buildParams(pg)}`);
      setCourses((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 12);
      setPage(pg);
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Debounce search + filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCourses(1, false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchCourses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Browse Courses</h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Loading…" : `${courses.length}${hasMore ? "+" : ""} courses available`}
          </p>
        </div>

        {/* Search + filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <SlidersHorizontal size={14} className="text-gray-400 flex-shrink-0" />

            {/* Category */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    category === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Level + price */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Level:</span>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                    level === l ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {l === "All" ? "All" : LEVEL_LABELS[l]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Price:</span>
              {(["all", "free", "paid"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriceType(p)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg capitalize transition-colors ${
                    priceType === p ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No courses found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search term</p>
            <button
              onClick={() => { setSearch(""); setCategory("All"); setLevel("All"); setPriceType("all"); }}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchCourses(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 mx-auto text-sm font-medium text-gray-600 hover:text-gray-900 px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  Load more courses
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <StudentNavbar />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    }>
      <CoursesContent />
    </Suspense>
  );
}
