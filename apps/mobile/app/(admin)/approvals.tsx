import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPut } from "../../lib/api";

interface PendingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  tags: string[];
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
    <View className="w-8 h-8 rounded-full bg-violet-100 items-center justify-center">
      <Text className="text-xs font-bold text-violet-700">{initials || "T"}</Text>
    </View>
  );
}

export default function ApprovalsScreen() {
  const [courses,     setCourses]     = useState<PendingCourse[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [processing,  setProcessing]  = useState<string | null>(null);

  useEffect(() => { load(); }, []);

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

  const handleApprove = useCallback(async (id: string) => {
    setProcessing(id);
    try {
      await apiPut(`/api/v1/admin/courses/${id}/approve`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to approve course");
    } finally {
      setProcessing(null);
    }
  }, []);

  const handleReject = useCallback((id: string) => {
    Alert.alert(
      "Reject Course",
      "Are you sure you want to reject this course?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessing(id);
            try {
              await apiPut(`/api/v1/admin/courses/${id}/reject`, { rejection_note: null });
              setCourses((prev) => prev.filter((c) => c.id !== id));
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to reject course");
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-900">Pending Approvals</Text>
        {!loading && (
          <Text className="text-sm text-gray-400 mt-0.5">
            {courses.length === 0 ? "All caught up!" : `${courses.length} course${courses.length !== 1 ? "s" : ""} awaiting review`}
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {courses.map((c) => {
            const isProcessing = processing === c.id;
            return (
              <View key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                {/* Tutor info */}
                {c.tutor && (
                  <View className="flex-row items-center gap-2 mb-3">
                    <TutorAvatar name={c.tutor.full_name} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-xs font-semibold text-gray-700" numberOfLines={1}>
                        {c.tutor.full_name}
                      </Text>
                      <Text className="text-xs text-gray-400" numberOfLines={1}>{c.tutor.email}</Text>
                    </View>
                    {c.created_at && (
                      <Text className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </Text>
                    )}
                  </View>
                )}

                {/* Course title */}
                <Text className="text-sm font-semibold text-gray-900 leading-snug mb-2">
                  {c.title}
                </Text>

                {c.description ? (
                  <Text className="text-xs text-gray-500 leading-relaxed mb-3" numberOfLines={3}>
                    {c.description}
                  </Text>
                ) : null}

                {/* Meta */}
                <View className="flex-row flex-wrap gap-2 mb-4">
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
                </View>

                {/* Tags */}
                {c.tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-1.5 mb-4">
                    {c.tags.slice(0, 4).map((tag) => (
                      <View key={tag} className="bg-violet-50 rounded-md px-2 py-0.5">
                        <Text className="text-xs text-violet-600">{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row gap-3">
                  <Pressable
                    className="flex-1 bg-red-50 rounded-xl py-3 items-center flex-row justify-center gap-1.5"
                    onPress={() => handleReject(c.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <Ionicons name="close" size={16} color="#dc2626" />
                    )}
                    <Text className="text-sm font-semibold text-red-600">Reject</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-emerald-600 rounded-xl py-3 items-center flex-row justify-center gap-1.5"
                    onPress={() => handleApprove(c.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                    <Text className="text-sm font-semibold text-white">Approve</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
