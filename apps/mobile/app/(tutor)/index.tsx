import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
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

interface TutorProfile {
  full_name: string;
  email: string;
  bio: string | null;
  is_verified: boolean;
  expertise_tags: string[];
}

export default function TutorDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<TutorAnalytics | null>(null);
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [a, p] = await Promise.allSettled([
        apiGet<TutorAnalytics>("/api/v1/tutors/analytics"),
        apiGet<TutorProfile>("/api/v1/tutors/profile"),
      ]);
      if (a.status === "fulfilled") setAnalytics(a.value);
      if (p.status === "fulfilled") setProfile(p.value);
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

  const firstName = profile?.full_name?.split(" ")[0] ?? "Tutor";

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">
              CareerVue · Tutor
            </Text>
            <Text className="text-2xl font-bold text-gray-900">
              {greeting}, {firstName}!
            </Text>
          </View>
          {profile?.is_verified && (
            <View className="flex-row items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-700">Verified</Text>
            </View>
          )}
        </View>
        {profile?.bio ? (
          <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>{profile.bio}</Text>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-24">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View className="px-4 py-5 gap-4">
          {/* Stats */}
          <View className="flex-row gap-3">
            {[
              { label: "Students",  value: analytics?.total_students ?? 0,                    icon: "people",   color: "#2563eb", bg: "#eff6ff" },
              { label: "Earnings",  value: `₹${(analytics?.total_earnings ?? 0).toFixed(0)}`, icon: "wallet",   color: "#059669", bg: "#ecfdf5" },
              { label: "Rating",    value: (analytics?.avg_rating ?? 0).toFixed(1),            icon: "star",     color: "#d97706", bg: "#fef3c7" },
              { label: "Courses",   value: analytics?.courses_count ?? 0,                      icon: "book",     color: "#7c3aed", bg: "#ede9fe" },
            ].map((s) => (
              <View
                key={s.label}
                className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 items-center"
              >
                <View className="w-8 h-8 rounded-xl items-center justify-center mb-1.5"
                  style={{ backgroundColor: s.bg }}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                </View>
                <Text className="text-base font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-400">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Course status breakdown */}
          {analytics && (
            <View className="bg-white rounded-2xl border border-gray-100 p-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Courses by Status
              </Text>
              <View className="gap-2">
                {[
                  { label: "Approved",         value: analytics.courses_by_status.approved,         color: "#059669", bg: "#d1fae5" },
                  { label: "Pending Review",    value: analytics.courses_by_status.pending_approval, color: "#d97706", bg: "#fef3c7" },
                  { label: "Draft",             value: analytics.courses_by_status.draft,            color: "#6b7280", bg: "#f3f4f6" },
                  { label: "Rejected",          value: analytics.courses_by_status.rejected,         color: "#dc2626", bg: "#fee2e2" },
                ].map(({ label, value, color, bg }) => (
                  <View key={label} className="flex-row items-center gap-3">
                    <View className="flex-1 flex-row items-center gap-2">
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <Text className="text-sm text-gray-700">{label}</Text>
                    </View>
                    <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: bg }}>
                      <Text className="text-xs font-semibold" style={{ color }}>{value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick actions */}
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Quick Actions
            </Text>
            <View className="gap-2">
              {[
                { label: "My Courses",      desc: "View & manage your courses",   icon: "book-outline",         route: "/(tutor)/courses" },
                { label: "Create Course",   desc: "Publish a new course",          icon: "add-circle-outline",   route: "/(tutor)/create"   },
                { label: "Analytics",       desc: "Track performance",             icon: "trending-up-outline",  route: "/(tutor)/analytics" },
              ].map(({ label, desc, icon, route }) => (
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

          {/* Expertise tags */}
          {(profile?.expertise_tags ?? []).length > 0 && (
            <View className="bg-white rounded-2xl border border-gray-100 p-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Your Expertise
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {profile!.expertise_tags.map((tag) => (
                  <View key={tag} className="bg-violet-50 rounded-lg px-2.5 py-1">
                    <Text className="text-xs font-medium text-violet-700">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
