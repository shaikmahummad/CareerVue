import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet } from "../../lib/api";

interface Stats {
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

interface Enrollment {
  id: string;
  course_id: string;
  progress_pct: number;
  completed_at: string | null;
  course?: { title: string; category: string | null };
}

interface RoadmapItem { id: string; topic: string; status: string; priority: string }
interface Roadmap { id: string; goal: string; items: RoadmapItem[] }

export default function DashboardScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const fullName = session?.user?.user_metadata?.full_name as string | undefined;
      setName(fullName?.split(" ")[0] ?? "there");

      const [s, e, r] = await Promise.allSettled([
        apiGet<Stats>("/api/v1/students/stats"),
        apiGet<Enrollment[]>("/api/v1/enrollments/mine"),
        apiGet<Roadmap>("/api/v1/roadmap/mine"),
      ]);

      if (s.status === "fulfilled") setStats(s.value);
      if (e.status === "fulfilled") setEnrollments(e.value);
      if (r.status === "fulfilled") setRoadmap(r.value);
      setLoading(false);
    }
    load();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const inProgress = enrollments
    .filter((e) => !e.completed_at)
    .sort((a, b) => 0)[0];

  const pending = roadmap?.items.filter((i) => i.status !== "completed") ?? [];
  const done = roadmap?.items.filter((i) => i.status === "completed").length ?? 0;
  const total = roadmap?.items.length ?? 0;

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
        <Text className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">
          CareerVue
        </Text>
        <Text className="text-2xl font-bold text-gray-900">
          {greeting}{name ? `, ${name}` : ""}!
        </Text>
        <Text className="text-sm text-gray-400 mt-0.5">Here&apos;s your learning overview.</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-24">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View className="px-4 py-5 gap-4">
          {/* Stats row */}
          <View className="flex-row gap-3">
            {[
              { label: "XP", value: stats?.xp_points ?? 0,       icon: "flash",       color: "#d97706", bg: "#fef3c7" },
              { label: "Streak", value: `${stats?.streak_days ?? 0}d`, icon: "flame", color: "#ea580c", bg: "#fff7ed" },
              { label: "Enrolled", value: stats?.enrolled_count ?? 0, icon: "book",  color: "#2563eb", bg: "#eff6ff" },
              { label: "Done", value: stats?.completed_count ?? 0, icon: "trophy",    color: "#059669", bg: "#ecfdf5" },
            ].map((s) => (
              <View
                key={s.label}
                className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 items-center"
              >
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center mb-1.5"
                  style={{ backgroundColor: s.bg }}
                >
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                </View>
                <Text className="text-base font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-400">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Continue learning */}
          {inProgress && (
            <View className="bg-white rounded-2xl border border-gray-100 p-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Continue Learning
              </Text>
              <Text className="text-sm font-semibold text-gray-900 mb-1 leading-snug" numberOfLines={2}>
                {inProgress.course?.title ?? "Course"}
              </Text>
              {inProgress.course?.category && (
                <Text className="text-xs text-gray-400 mb-2">{inProgress.course.category}</Text>
              )}
              <View className="flex-row items-center gap-2 mb-3">
                <View className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${inProgress.progress_pct ?? 0}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-400">{inProgress.progress_pct ?? 0}%</Text>
              </View>
              <Pressable
                className="bg-blue-600 rounded-xl py-2.5 items-center"
                onPress={() => router.push(`/(student)/courses/${inProgress.course_id}` as any)}
              >
                <Text className="text-white text-sm font-semibold">Continue</Text>
              </Pressable>
            </View>
          )}

          {/* Roadmap preview */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">My Roadmap</Text>
              <Pressable onPress={() => router.push("/(student)/roadmap" as any)}>
                <Text className="text-xs text-blue-600 font-medium">View all</Text>
              </Pressable>
            </View>
            {!roadmap ? (
              <View className="items-center py-4">
                <Ionicons name="map-outline" size={28} color="#d1d5db" />
                <Text className="text-sm text-gray-400 mt-2 mb-3">No roadmap yet</Text>
                <Pressable
                  className="bg-blue-50 px-4 py-2 rounded-xl"
                  onPress={() => router.push("/(student)/quiz" as any)}
                >
                  <Text className="text-xs text-blue-700 font-medium">Take the quiz</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-sm font-semibold text-gray-800 mb-2">{roadmap.goal}</Text>
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : "0%" }}
                    />
                  </View>
                  <Text className="text-xs text-gray-400">{done}/{total}</Text>
                </View>
                {pending.slice(0, 3).map((item) => (
                  <View key={item.id} className="flex-row items-center gap-2 mb-1.5">
                    <View className={`w-1.5 h-1.5 rounded-full ${
                      item.priority === "high" ? "bg-red-400" :
                      item.priority === "medium" ? "bg-orange-400" : "bg-green-400"
                    }`} />
                    <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>{item.topic}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Quick actions */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</Text>
            <View className="gap-2">
              {[
                { label: "Skill Quiz",     desc: "Assess your level",     icon: "school-outline",  tab: "/(student)/quiz" },
                { label: "Browse Courses", desc: "Find new courses",      icon: "book-outline",    tab: "/(student)/courses" },
                { label: "My Roadmap",     desc: "View learning path",    icon: "map-outline",     tab: "/(student)/roadmap" },
                { label: "My Profile",     desc: "Edit your details",     icon: "person-outline",  tab: "/(student)/profile" },
              ].map(({ label, desc, icon, tab }) => (
                <Pressable
                  key={label}
                  className="flex-row items-center gap-3 p-2.5 rounded-xl active:bg-gray-50"
                  onPress={() => router.push(tab as any)}
                >
                  <View className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center">
                    <Ionicons name={icon as any} size={16} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">{label}</Text>
                    <Text className="text-xs text-gray-400">{desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sign out */}
          <Pressable
            className="py-4 items-center"
            onPress={() => supabase.auth.signOut()}
          >
            <Text className="text-sm text-red-500 font-medium">Sign Out</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
