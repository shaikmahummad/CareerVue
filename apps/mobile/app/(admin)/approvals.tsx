import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../lib/api";

interface PendingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  tags: string[];
  duration_hours: number | null;
  created_at: string | null;
  tutor: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

function TutorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <View className="w-9 h-9 rounded-full bg-violet-100 items-center justify-center">
      <Text className="text-xs font-bold text-violet-700">{initials || "T"}</Text>
    </View>
  );
}

export default function ApprovalsScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<PendingCourse[]>("/api/v1/admin/courses/pending");
      setCourses(data);
    } catch {
      Alert.alert("Error", "Failed to load pending courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Reload when returning from the review screen
  useFocusEffect(useCallback(() => { if (!loading) load(); }, []));

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-900">Pending Approvals</Text>
        {!loading && (
          <Text className="text-sm text-gray-400 mt-0.5">
            {courses.length === 0
              ? "All caught up!"
              : `${courses.length} course${courses.length !== 1 ? "s" : ""} awaiting review`}
          </Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="checkmark-circle-outline" size={48} color="#d1d5db" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">All Clear!</Text>
          <Text className="text-sm text-gray-400 text-center">
            No courses are waiting for approval right now.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {courses.map((c) => (
            <Pressable
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 active:opacity-75"
              onPress={() => router.push({ pathname: "/(admin)/course-review", params: { id: c.id } } as never)}
            >
              {/* Tutor row */}
              {c.tutor && (
                <View className="flex-row items-center gap-2.5 mb-3">
                  <TutorAvatar name={c.tutor.full_name} />
                  <View className="flex-1 min-w-0">
                    <Text className="text-xs font-semibold text-gray-800" numberOfLines={1}>
                      {c.tutor.full_name}
                    </Text>
                    <Text className="text-xs text-gray-400" numberOfLines={1}>{c.tutor.email}</Text>
                  </View>
                  {c.created_at && (
                    <Text className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}
                    </Text>
                  )}
                </View>
              )}

              {/* Title */}
              <Text className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">
                {c.title}
              </Text>

              {c.description ? (
                <Text className="text-xs text-gray-500 leading-relaxed mb-3" numberOfLines={2}>
                  {c.description}
                </Text>
              ) : null}

              {/* Meta chips */}
              <View className="flex-row flex-wrap gap-2 mb-2">
                {c.category && (
                  <View className="bg-blue-50 rounded-lg px-2 py-0.5">
                    <Text className="text-xs text-blue-600 font-medium">{c.category}</Text>
                  </View>
                )}
                {c.level && (
                  <View className="bg-gray-100 rounded-lg px-2 py-0.5">
                    <Text className="text-xs text-gray-600 capitalize">{c.level}</Text>
                  </View>
                )}
                <View className="bg-gray-100 rounded-lg px-2 py-0.5">
                  <Text className="text-xs text-gray-700 font-semibold">
                    {c.is_free ? "Free" : `₹${c.price}`}
                  </Text>
                </View>
                {c.duration_hours != null && (
                  <View className="bg-gray-100 rounded-lg px-2 py-0.5">
                    <Text className="text-xs text-gray-600">{c.duration_hours}h</Text>
                  </View>
                )}
              </View>

              {/* Tags */}
              {c.tags.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {c.tags.slice(0, 4).map((tag) => (
                    <View key={tag} className="bg-violet-50 rounded-md px-2 py-0.5">
                      <Text className="text-xs text-violet-600">{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Review CTA */}
              <View className="flex-row items-center justify-end gap-1 mt-1">
                <Text className="text-xs font-semibold text-blue-600">Review Course</Text>
                <Ionicons name="chevron-forward" size={13} color="#2563eb" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
