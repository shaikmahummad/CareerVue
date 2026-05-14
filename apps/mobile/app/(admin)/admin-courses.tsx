import { useEffect, useState } from "react";
import {
  View, Text, FlatList, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPut } from "../../lib/api";

interface AdminCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  status: string;
  is_free: boolean;
  price: number;
  enrolled_count: number;
  avg_rating: number;
  rejection_note: string | null;
  created_at: string | null;
  tutor: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

const STATUSES = ["", "approved", "pending_approval", "draft", "rejected"];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: "Draft",          color: "#6b7280", bg: "#f3f4f6" },
  pending_approval: { label: "Pending Review", color: "#d97706", bg: "#fef3c7" },
  approved:         { label: "Approved",       color: "#059669", bg: "#d1fae5" },
  rejected:         { label: "Rejected",       color: "#dc2626", bg: "#fee2e2" },
};

export default function AdminCoursesScreen() {
  const [courses,    setCourses]    = useState<AdminCourse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  function buildUrl() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    return `/api/v1/admin/courses?${params}`;
  }

  async function fetchCourses() {
    setLoading(true);
    try {
      const data = await apiGet<AdminCourse[]>(buildUrl());
      setCourses(data);
    } catch {
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCourses(); }, [statusFilter]);

  async function handleApprove(id: string) {
    setProcessing(id);
    try {
      await apiPut(`/api/v1/admin/courses/${id}/approve`);
      setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status: "approved" } : c));
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to approve");
    } finally {
      setProcessing(null);
    }
  }

  function handleReject(id: string) {
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
              setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status: "rejected", rejection_note: null } : c));
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to reject");
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
    );
  }

  function renderCourse({ item: c }: { item: AdminCourse }) {
    const sty = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
    const isProcessing = processing === c.id;
    const canApprove = c.status === "pending_approval" || c.status === "rejected";
    const canReject  = c.status === "pending_approval" || c.status === "approved";

    return (
      <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
        {/* Status + title */}
        <View className="flex-row items-start justify-between gap-2 mb-1.5">
          <Text className="text-sm font-semibold text-gray-900 flex-1 leading-snug" numberOfLines={2}>
            {c.title}
          </Text>
          <View className="rounded-full px-2.5 py-0.5 flex-shrink-0" style={{ backgroundColor: sty.bg }}>
            <Text className="text-xs font-semibold" style={{ color: sty.color }}>{sty.label}</Text>
          </View>
        </View>

        {/* Tutor */}
        {c.tutor && (
          <Text className="text-xs text-gray-400 mb-2">by {c.tutor.full_name}</Text>
        )}

        {/* Meta */}
        <View className="flex-row flex-wrap gap-2 mb-3">
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
          <View className="flex-row items-center gap-1">
            <Ionicons name="people-outline" size={11} color="#9ca3af" />
            <Text className="text-xs text-gray-500">{c.enrolled_count}</Text>
          </View>
          {c.avg_rating > 0 && (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="star" size={11} color="#f59e0b" />
              <Text className="text-xs text-gray-500">{c.avg_rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Rejection note */}
        {c.rejection_note && (
          <View className="bg-red-50 rounded-xl px-3 py-2 mb-3">
            <Text className="text-xs text-red-600">{c.rejection_note}</Text>
          </View>
        )}

        {/* Action buttons */}
        {(canApprove || canReject) && (
          <View className="flex-row gap-2">
            {canReject && (
              <Pressable
                className="flex-1 bg-red-50 rounded-xl py-2.5 items-center flex-row justify-center gap-1"
                onPress={() => handleReject(c.id)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <ActivityIndicator size="small" color="#dc2626" />
                  : <Ionicons name="close" size={14} color="#dc2626" />}
                <Text className="text-xs font-semibold text-red-600">Reject</Text>
              </Pressable>
            )}
            {canApprove && (
              <Pressable
                className="flex-1 bg-emerald-600 rounded-xl py-2.5 items-center flex-row justify-center gap-1"
                onPress={() => handleApprove(c.id)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="checkmark" size={14} color="white" />}
                <Text className="text-xs font-semibold text-white">Approve</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-3">
        <Text className="text-xl font-bold text-gray-900">All Courses</Text>
      </View>

      {/* Status filter */}
      <View className="bg-white border-b border-gray-100">
        <FlatList
          horizontal
          data={STATUSES}
          keyExtractor={(s) => s || "all"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: s }) => (
            <Pressable
              className={`rounded-xl px-3 py-1.5 border ${
                statusFilter === s ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
              }`}
              onPress={() => setStatusFilter(s)}
            >
              <Text className={`text-xs font-medium ${statusFilter === s ? "text-white" : "text-gray-600"}`}>
                {s ? STATUS_STYLE[s]?.label ?? s : "All"}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={renderCourse}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="book-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-3">No courses found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
