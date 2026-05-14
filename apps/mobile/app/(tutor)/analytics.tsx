import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../lib/api";

interface TutorAnalytics {
  total_students: number;
  total_earnings: number;
  avg_rating: number;
  courses_count: number;
  courses_by_status: {
    draft: number;
    pending_approval: number;
    approved: number;
    rejected: number;
  };
}

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
}

export default function TutorAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<TutorAnalytics | null>(null);
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const [a, c] = await Promise.allSettled([
        apiGet<TutorAnalytics>("/api/v1/tutors/analytics"),
        apiGet<Course[]>("/api/v1/tutors/courses"),
      ]);
      if (a.status === "fulfilled") setAnalytics(a.value);
      if (c.status === "fulfilled") setCourses(c.value);
      setLoading(false);
    }
    load();
  }, []);

  const topCourses = [...courses]
    .filter((c) => c.status === "approved")
    .sort((a, b) => b.enrolled_count - a.enrolled_count)
    .slice(0, 5);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-900">Analytics</Text>
        <Text className="text-sm text-gray-400 mt-0.5">Your teaching performance</Text>
      </View>

      <View className="px-4 py-5 gap-4">
        {/* Key metrics */}
        <View className="flex-row gap-3">
          {[
            { label: "Total Students", value: analytics?.total_students ?? 0,                    icon: "people",  color: "#2563eb", bg: "#eff6ff" },
            { label: "Total Earnings", value: `₹${(analytics?.total_earnings ?? 0).toFixed(0)}`, icon: "wallet",  color: "#059669", bg: "#ecfdf5" },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: s.bg }}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
              <Text className="text-xs text-gray-400 text-center mt-0.5">{s.label}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3">
          {[
            { label: "Avg Rating",    value: (analytics?.avg_rating ?? 0).toFixed(1),  icon: "star",  color: "#d97706", bg: "#fef3c7" },
            { label: "Total Courses", value: analytics?.courses_count ?? 0,             icon: "book",  color: "#7c3aed", bg: "#ede9fe" },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: s.bg }}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
              <Text className="text-xs text-gray-400 text-center mt-0.5">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Course status breakdown */}
        {analytics && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Courses by Status
            </Text>
            {[
              { label: "Approved",        value: analytics.courses_by_status.approved,         color: "#059669", bg: "#d1fae5" },
              { label: "Pending Review",  value: analytics.courses_by_status.pending_approval, color: "#d97706", bg: "#fef3c7" },
              { label: "Draft",           value: analytics.courses_by_status.draft,            color: "#6b7280", bg: "#f3f4f6" },
              { label: "Rejected",        value: analytics.courses_by_status.rejected,         color: "#dc2626", bg: "#fee2e2" },
            ].map(({ label, value, color, bg }) => {
              const total = analytics.courses_count || 1;
              const pct   = Math.round((value / total) * 100);
              return (
                <View key={label} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm text-gray-700">{label}</Text>
                    <Text className="text-xs font-semibold" style={{ color }}>{value} ({pct}%)</Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Top courses */}
        {topCourses.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Top Courses by Enrollment
            </Text>
            <View className="gap-3">
              {topCourses.map((c, i) => (
                <View key={c.id} className="flex-row items-center gap-3">
                  <View className="w-7 h-7 bg-blue-50 rounded-xl items-center justify-center flex-shrink-0">
                    <Text className="text-xs font-bold text-blue-600">{i + 1}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                      {c.title}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      {c.category && (
                        <Text className="text-xs text-gray-400">{c.category}</Text>
                      )}
                    </View>
                  </View>
                  <View className="items-end flex-shrink-0">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="people-outline" size={11} color="#9ca3af" />
                      <Text className="text-xs text-gray-600 font-medium">{c.enrolled_count}</Text>
                    </View>
                    {c.avg_rating > 0 && (
                      <View className="flex-row items-center gap-0.5 mt-0.5">
                        <Ionicons name="star" size={11} color="#f59e0b" />
                        <Text className="text-xs text-gray-500">{c.avg_rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
