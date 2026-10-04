import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../../lib/api";

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

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: "Draft",           color: "#6b7280", bg: "#f3f4f6" },
  pending_approval: { label: "Pending Review",  color: "#d97706", bg: "#fef3c7" },
  approved:         { label: "Approved",        color: "#059669", bg: "#d1fae5" },
  rejected:         { label: "Rejected",        color: "#dc2626", bg: "#fee2e2" },
};

export default function TutorCoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Course[]>("/api/v1/tutors/courses")
      .then(setCourses)
      .catch((error) => {
        console.warn("Failed to load tutor courses", error instanceof Error ? error.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">My Courses</Text>
        <Pressable
          className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-3 py-2"
          onPress={() => router.push("/(tutor)/create" as any)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text className="text-white text-sm font-semibold">New</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="book-outline" size={48} color="#d1d5db" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">No Courses Yet</Text>
          <Text className="text-sm text-gray-400 text-center mb-8">
            Create your first course and start sharing your expertise.
          </Text>
          <Pressable
            className="bg-blue-600 rounded-2xl py-3.5 px-8"
            onPress={() => router.push("/(tutor)/create" as any)}
          >
            <Text className="text-white font-semibold">Create Course</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {courses.map((c) => {
            const sty = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
            return (
              <Pressable
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 active:opacity-80"
                onPress={() => router.push(`/(tutor)/courses/${c.id}` as any)}
              >
                {/* Title row */}
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <Text className="text-sm font-semibold text-gray-900 flex-1 leading-snug" numberOfLines={2}>
                    {c.title}
                  </Text>
                  <View className="rounded-full px-2.5 py-0.5 flex-shrink-0" style={{ backgroundColor: sty.bg }}>
                    <Text className="text-xs font-semibold" style={{ color: sty.color }}>{sty.label}</Text>
                  </View>
                </View>

                {/* Meta row */}
                <View className="flex-row items-center gap-3 flex-wrap mb-3">
                  {c.category && (
                    <View className="bg-blue-50 rounded-lg px-2 py-0.5">
                      <Text className="text-xs text-blue-600 font-medium">{c.category}</Text>
                    </View>
                  )}
                  {c.level && (
                    <Text className="text-xs text-gray-400 capitalize">{c.level}</Text>
                  )}
                  <Text className="text-xs font-semibold text-gray-700">
                    {c.is_free ? "Free" : `₹${c.price}`}
                  </Text>
                </View>

                {/* Stats */}
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="people-outline" size={13} color="#9ca3af" />
                    <Text className="text-xs text-gray-500">{c.enrolled_count} students</Text>
                  </View>
                  {c.avg_rating > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={13} color="#f59e0b" />
                      <Text className="text-xs text-gray-600">{c.avg_rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>

                {/* Rejection note */}
                {c.status === "rejected" && (
                  <View className="mt-3 bg-red-50 rounded-xl px-3 py-2">
                    <Text className="text-xs text-red-600">
                      Rejected — tap to edit and resubmit.
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
