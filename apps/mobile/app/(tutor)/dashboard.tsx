import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function TutorDashboard() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Tutor Dashboard</Text>
      <Text className="text-gray-500 mb-8">Manage your courses</Text>

      <Pressable
        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4"
        onPress={() => router.push("/(tutor)/courses")}
      >
        <Text className="text-lg font-semibold text-gray-800">My Courses</Text>
        <Text className="text-gray-500 text-sm mt-1">View and manage your courses</Text>
      </Pressable>

      <Pressable
        className="mt-auto mb-8 py-4 items-center"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-red-500 font-medium">Sign Out</Text>
      </Pressable>
    </View>
  );
}
