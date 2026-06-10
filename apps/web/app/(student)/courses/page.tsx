"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Star, Users, Clock, BookOpen, Loader2, SlidersHorizontal, ChevronDown } from "lucide-react";
import StudentNavbar from "../../../components/StudentNavbar";
import { apiGet } from "../../../lib/api";

interface Course {
  id: string; tutor_name: string | null; title: string; description: string | null;
  thumbnail_url: string | null; category: string | null; tags: string[];
  price: number; is_free: boolean; level: string | null; duration_hours: number | null;
  enrolled_count: number; avg_rating: number;
}

const CATEGORIES = ["All Areas", "Web Development", "Data Science", "DevOps", "UI/UX Design", "Machine Learning", "DSA & Algorithms", "System Design"];
const LEVELS = ["All", "beginner", "intermediate", "advanced"];

const CAT_COLORS: Record<string, string> = {
  "Web Development": "#6c63ff", "Data Science": "#00d4ff", "DevOps": "#e7c365",
  "Machine Learning": "#6c63ff", "UI/UX Design": "#ff6b9d", "DSA & Algorithms": "#00d4ff",
  "System Design": "#6c63ff",
};

function CourseCard({ course }: { course: Course }) {
  const accentColor = course.category ? (CAT_COLORS[course.category] ?? "#6c63ff") : "#6c63ff";
  return (
    <Link href={`/courses/${course.id}`}
      className="glass-card rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Thumbnail */}
      <div className="h-40 relative overflow-hidden flex items-center justify-center border-b border-white/[0.07]"
        style={{ background: `linear-gradient(135deg, ${accentColor}10, #050508)` }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)` }} />
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={28} className="text-[#7c7a8a] relative z-10" />
        )}
        {course.level && (
          <span className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            {course.level.toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {course.category && (
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: accentColor }}>
            {course.category}
          </p>
        )}
        <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 group-hover:text-[#6c63ff] transition-colors leading-snug">
          {course.title}
        </h3>
        {course.tutor_name && (
          <p className="text-[11px] text-[#7c7a8a] mb-3">by {course.tutor_name}</p>
        )}
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-white">{course.avg_rating > 0 ? course.avg_rating.toFixed(1) : "New"}</span>
              <span className="text-[10px] text-[#7c7a8a]">({course.enrolled_count.toLocaleString()})</span>
            </div>
            {course.duration_hours && (
              <span className="flex items-center gap-1 text-[10px] text-[#7c7a8a]">
                <Clock size={10} />{course.duration_hours}h
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold gradient-text">
              {course.is_free ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
            </span>
            <span className="text-[10px] font-medium text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded-full border border-[#6c63ff]/20">
              Enroll Now
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-white/[0.03]" />
      <div className="p-4 space-y-3">
        <div className="h-2.5 bg-white/[0.05] rounded w-1/3" />
        <div className="h-3.5 bg-white/[0.05] rounded w-full" />
        <div className="h-3.5 bg-white/[0.05] rounded w-3/4" />
        <div className="h-2.5 bg-white/[0.05] rounded w-1/2" />
      </div>
    </div>
  );
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("All Areas");
  const [level, setLevel] = useState("All");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback((pg: number) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category !== "All Areas") p.set("category", category);
    if (level !== "All") p.set("level", level);
    p.set("page", String(pg)); p.set("limit", "12");
    return p.toString();
  }, [search, category, level]);

  const fetchCourses = useCallback(async (pg: number, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const data = await apiGet<Course[]>(`/api/v1/courses/?${buildParams(pg)}`);
      setCourses((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 12); setPage(pg);
    } catch { /* empty */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [buildParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCourses(1, false), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchCourses]);

  return (
    <div className="min-h-screen bg-[#050508] flex">
      <StudentNavbar />
      <main className="flex-1 p-8 overflow-y-auto" style={{ marginLeft: "var(--sidebar-w, 15rem)", transition: "margin-left 0.2s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Explore Career Paths</h1>
            <p className="text-sm text-[#7c7a8a] mt-0.5">
              {loading ? "Loading…" : `${courses.length}${hasMore ? "+" : ""} courses`}
            </p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7c7a8a]" />
            <input type="text" placeholder="Search courses, skills…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-[#0d0d14] border border-white/[0.07] rounded-xl text-sm text-white placeholder-[#7c7a8a] focus:outline-none focus:border-[#6c63ff] w-72 transition-colors" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 text-xs font-medium px-4 py-2 rounded-xl transition-all ${
                category === cat
                  ? "gradient-primary text-white"
                  : "bg-white/[0.04] border border-white/[0.07] text-[#7c7a8a] hover:text-white hover:border-white/20"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-[#7c7a8a]">
            <SlidersHorizontal size={13} />
            <span>Level:</span>
          </div>
          <div className="relative">
            <select value={level} onChange={(e) => setLevel(e.target.value)}
              className="appearance-none bg-[#0d0d14] border border-white/[0.07] rounded-xl text-xs text-[#e6e0e9] px-3 py-2 pr-7 focus:outline-none focus:border-[#6c63ff] cursor-pointer">
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l === "All" ? "All Levels" : l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7c7a8a] pointer-events-none" />
          </div>
          <span className="text-xs text-[#7c7a8a] ml-auto">
            Sort: <span className="text-white">Most Recent</span>
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={36} className="text-[#7c7a8a] mx-auto mb-4" />
            <p className="text-white font-semibold mb-1">No courses found</p>
            <p className="text-sm text-[#7c7a8a]">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button onClick={() => fetchCourses(page + 1, true)} disabled={loadingMore}
                  className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-xl text-sm disabled:opacity-50">
                  {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loadingMore ? "Loading…" : "Load More Courses"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function CoursesPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#050508] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-[#6c63ff]" /></div>}><CoursesContent /></Suspense>;
}
