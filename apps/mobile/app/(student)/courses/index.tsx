import { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../../lib/api";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  tutor_name: string | null;
  thumbnail_url: string | null;
}

const CATEGORIES = ["", "Programming", "Design", "Data Science", "Business", "DevOps", "Cybersecurity"];
const LEVELS     = ["", "beginner", "intermediate", "advanced"];
const PRICE_TYPES = ["", "free", "paid"];

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [priceType, setPriceType] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 12;

  function buildUrl(p: number) {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (search.trim())  params.set("search",     search.trim());
    if (category)       params.set("category",   category);
    if (level)          params.set("level",       level);
    if (priceType)      params.set("price_type",  priceType);
    return `/api/v1/courses/?${params}`;
  }

  async function fetchCourses(reset = true) {
    if (reset) { setLoading(true); setPage(1); }
    else         setLoadingMore(true);

    const p = reset ? 1 : page + 1;
    try {
      const data = await apiGet<Course[]>(buildUrl(p));
      if (reset) {
        setCourses(data);
      } else {
        setCourses((prev) => [...prev, ...data]);
        setPage(p);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchCourses(true), 350);
  }, [search, category, level, priceType]);

  function renderCourse({ item: c }: { item: Course }) {
    return (
      <Pressable
        className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 active:opacity-80"
        onPress={() => router.push(`/(student)/courses/${c.id}` as any)}
      >
        {/* Thumbnail placeholder */}
        <View className="w-full h-32 bg-gradient-to-br from-blue-50 to-violet-100 rounded-xl mb-3 items-center justify-center"
          style={{ backgroundColor: "#eff6ff" }}>
          <Ionicons name="book" size={32} color="#93c5fd" />
        </View>

        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text className="text-sm font-semibold text-gray-900 flex-1 leading-snug" numberOfLines={2}>
            {c.title}
          </Text>
          <Text className="text-sm font-bold text-blue-600 flex-shrink-0">
            {c.is_free ? "Free" : `₹${c.price}`}
          </Text>
        </View>

        {c.tutor_name && (
          <Text className="text-xs text-gray-400 mb-2">{c.tutor_name}</Text>
        )}

        <View className="flex-row items-center gap-3 flex-wrap">
          {c.category && (
            <View className="bg-blue-50 rounded-lg px-2 py-0.5">
              <Text className="text-xs text-blue-600 font-medium">{c.category}</Text>
            </View>
          )}
          {c.level && (
            <Text className="text-xs text-gray-400 capitalize">{c.level}</Text>
          )}
          {c.avg_rating > 0 && (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="star" size={11} color="#f59e0b" />
              <Text className="text-xs text-gray-500">{c.avg_rating.toFixed(1)}</Text>
            </View>
          )}
          <View className="flex-row items-center gap-0.5">
            <Ionicons name="people-outline" size={11} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{c.enrolled_count}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header + search */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-900 mb-3">Courses</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search courses..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters */}
      <View>
        {/* Category */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c || "all"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: cat }) => (
            <Pressable
              className={`rounded-xl px-3 py-1.5 border ${
                category === cat
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-gray-200"
              }`}
              onPress={() => setCategory(cat)}
            >
              <Text className={`text-xs font-medium ${category === cat ? "text-white" : "text-gray-600"}`}>
                {cat || "All Categories"}
              </Text>
            </Pressable>
          )}
        />

        {/* Level + price */}
        <View className="flex-row gap-2 px-4 pb-2">
          {LEVELS.map((l) => (
            <Pressable
              key={l || "all-lvl"}
              className={`rounded-xl px-3 py-1.5 border ${
                level === l ? "bg-gray-800 border-gray-800" : "bg-white border-gray-200"
              }`}
              onPress={() => setLevel(l)}
            >
              <Text className={`text-xs font-medium ${level === l ? "text-white" : "text-gray-600"} capitalize`}>
                {l || "Any level"}
              </Text>
            </Pressable>
          ))}
          {PRICE_TYPES.map((pt) => (
            <Pressable
              key={pt || "all-price"}
              className={`rounded-xl px-3 py-1.5 border ${
                priceType === pt ? "bg-emerald-600 border-emerald-600" : "bg-white border-gray-200"
              }`}
              onPress={() => setPriceType(pt)}
            >
              <Text className={`text-xs font-medium ${priceType === pt ? "text-white" : "text-gray-600"} capitalize`}>
                {pt || "Any price"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Course list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={renderCourse}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="book-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-3">No courses found</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                className="py-3 items-center"
                onPress={() => fetchCourses(false)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color="#2563eb" />
                  : <Text className="text-sm text-blue-600 font-medium">Load more</Text>}
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}
