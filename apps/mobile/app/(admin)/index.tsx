import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet } from "../../lib/api";

interface DashboardStats {
  total_users: number;
  total_students: number;
  total_tutors: number;
  total_courses: number;
  total_revenue: number;
  total_enrollments: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashboardStats>("/api/v1/admin/dashboard")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
        <Text className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">
          CareerVue · Admin
        </Text>
        <Text className="text-2xl font-bold text-gray-900">Platform Overview</Text>
        <Text className="text-sm text-gray-400 mt-0.5">Monitor and manage everything.</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-24">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View className="px-4 py-5 gap-4">
          {/* Stats grid */}
          <View className="flex-row gap-3">
            {[
              { label: "Users",       value: stats?.total_users ?? 0,       icon: "people",      color: "#2563eb", bg: "#eff6ff" },
              { label: "Students",    value: stats?.total_students ?? 0,     icon: "school",      color: "#7c3aed", bg: "#ede9fe" },
              { label: "Tutors",      value: stats?.total_tutors ?? 0,       icon: "easel",       color: "#d97706", bg: "#fef3c7" },
              { label: "Courses",     value: stats?.total_courses ?? 0,      icon: "book",        color: "#059669", bg: "#ecfdf5" },
            ].map((s) => (
              <View
                key={s.label}
                className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 items-center"
              >
                <View className="w-8 h-8 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: s.bg }}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                </View>
                <Text className="text-base font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-400">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Revenue + enrollments */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2 bg-emerald-50">
                <Ionicons name="cash-outline" size={20} color="#059669" />
              </View>
              <Text className="text-xl font-bold text-gray-900">₹{(stats?.total_revenue ?? 0).toFixed(0)}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Total Revenue</Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mb-2 bg-blue-50">
                <Ionicons name="layers-outline" size={20} color="#2563eb" />
              </View>
              <Text className="text-xl font-bold text-gray-900">{stats?.total_enrollments ?? 0}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Enrollments</Text>
            </View>
          </View>

          {/* Navigation cards */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Manage Platform
            </Text>
            <View className="gap-2">
              {[
                { label: "Pending Approvals", desc: "Review courses awaiting approval", icon: "checkmark-circle-outline", route: "/(admin)/approvals", badge: true },
                { label: "Manage Users",       desc: "View and update user accounts",   icon: "people-outline",            route: "/(admin)/users"     },
                { label: "All Courses",        desc: "Browse and filter all courses",   icon: "book-outline",              route: "/(admin)/admin-courses" },
              ].map(({ label, desc, icon, route, badge }) => (
                <Pressable
                  key={label}
                  className="flex-row items-center gap-3 p-2.5 rounded-xl active:bg-gray-50"
                  onPress={() => router.push(route as any)}
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
