import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function StudentDashboard() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Dashboard</Text>
      <Text className="text-gray-500 mb-8">Welcome back, student!</Text>

      <View className="gap-4">
        <Pressable
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          onPress={() => router.push("/(student)/quiz")}
        >
          <Text className="text-lg font-semibold text-gray-800">Take Skill Quiz</Text>
          <Text className="text-gray-500 text-sm mt-1">Assess your skills for your career goal</Text>
        </Pressable>

        <Pressable
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          onPress={() => router.push("/(student)/roadmap")}
        >
          <Text className="text-lg font-semibold text-gray-800">My Roadmap</Text>
          <Text className="text-gray-500 text-sm mt-1">View your personalized learning path</Text>
        </Pressable>

        <Pressable
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          onPress={() => router.push("/(student)/courses")}
        >
          <Text className="text-lg font-semibold text-gray-800">Browse Courses</Text>
          <Text className="text-gray-500 text-sm mt-1">Explore available courses</Text>
        </Pressable>
      </View>

      <Pressable
        className="mt-auto mb-8 py-4 items-center"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-red-500 font-medium">Sign Out</Text>
      </Pressable>
    </View>
  );
}
