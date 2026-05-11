import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../../lib/api";

interface Module {
  id: string;
  title: string;
  description: string | null;
  duration_mins: number | null;
  is_preview: boolean;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  language: string | null;
  duration_hours: number | null;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  tutor_name: string | null;
  tags: string[];
  modules: Module[];
  is_enrolled: boolean;
  status: string;
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Course>(`/api/v1/courses/${id}`)
      .then(setCourse)
      .catch(() => setError("Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    try {
      await apiPost("/api/v1/enrollments/", { course_id: course.id });
      setCourse((c) => c ? { ...c, is_enrolled: true } : c);
      Alert.alert("Enrolled!", "You are now enrolled in this course.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!course || error) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-gray-500 text-center">{error || "Course not found"}</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="text-blue-600 text-sm font-medium">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const totalMins = course.modules.reduce((acc, m) => acc + (m.duration_mins ?? 0), 0);
  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="bg-white pt-14 pb-6 px-5 border-b border-gray-100">
          {/* Back */}
          <Pressable
            className="flex-row items-center gap-1 mb-4"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color="#2563eb" />
            <Text className="text-sm text-blue-600 font-medium">Back</Text>
          </Pressable>

          {/* Category badge */}
          {course.category && (
            <View className="bg-blue-50 self-start rounded-lg px-2.5 py-1 mb-2">
              <Text className="text-xs font-semibold text-blue-600">{course.category}</Text>
            </View>
          )}

          <Text className="text-xl font-bold text-gray-900 leading-snug mb-2">{course.title}</Text>

          {course.tutor_name && (
            <Text className="text-sm text-gray-500 mb-3">by {course.tutor_name}</Text>
          )}

          {/* Meta row */}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            {course.avg_rating > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={13} color="#f59e0b" />
                <Text className="text-xs text-gray-600 font-medium">{course.avg_rating.toFixed(1)}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-1">
              <Ionicons name="people-outline" size={13} color="#9ca3af" />
              <Text className="text-xs text-gray-500">{course.enrolled_count} enrolled</Text>
            </View>
            {course.level && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="bar-chart-outline" size={13} color="#9ca3af" />
                <Text className="text-xs text-gray-500 capitalize">{course.level}</Text>
              </View>
            )}
            {totalMins > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={13} color="#9ca3af" />
                <Text className="text-xs text-gray-500">
                  {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}m` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {course.description && (
          <View className="bg-white px-5 py-4 border-b border-gray-100">
            <Text className="text-sm font-semibold text-gray-700 mb-2">About this course</Text>
            <Text className="text-sm text-gray-600 leading-relaxed">{course.description}</Text>
          </View>
        )}

        {/* Tags */}
        {course.tags.length > 0 && (
          <View className="px-5 py-4 bg-white border-b border-gray-100">
            <View className="flex-row flex-wrap gap-2">
              {course.tags.map((tag) => (
                <View key={tag} className="bg-gray-100 rounded-lg px-2.5 py-1">
                  <Text className="text-xs text-gray-600">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Modules */}
        <View className="px-5 py-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Course Content · {course.modules.length} modules
          </Text>
          <View className="gap-2">
            {course.modules.map((mod, i) => (
              <View
                key={mod.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex-row items-center gap-3"
              >
                <View className="w-7 h-7 bg-blue-50 rounded-lg items-center justify-center flex-shrink-0">
                  <Text className="text-xs font-bold text-blue-600">{i + 1}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                    {mod.title}
                  </Text>
                  {mod.duration_mins && (
                    <Text className="text-xs text-gray-400 mt-0.5">{mod.duration_mins} min</Text>
                  )}
                </View>
                {mod.is_preview && (
                  <View className="bg-blue-50 rounded-md px-1.5 py-0.5">
                    <Text className="text-xs text-blue-600 font-medium">Preview</Text>
                  </View>
                )}
                {!mod.is_preview && !course.is_enrolled && (
                  <Ionicons name="lock-closed-outline" size={14} color="#d1d5db" />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom padding for the sticky button */}
        <View className="h-24" />
      </ScrollView>

      {/* Sticky enroll button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4">
        {course.is_enrolled ? (
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text className="text-sm font-semibold text-emerald-600">Enrolled — learning in progress</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">
                {course.is_free ? "Free" : `₹${course.price}`}
              </Text>
              <Text className="text-xs text-gray-400">
                {course.is_free ? "No cost to enroll" : "One-time payment"}
              </Text>
            </View>
            <Pressable
              className="flex-1 bg-blue-600 rounded-2xl py-3.5 items-center"
              onPress={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold text-sm">
                  {course.is_free ? "Enroll for Free" : "Enroll Now"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
