import { View, Text, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  return (
    <View className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</Text>
      <Text className="text-gray-500 mb-8">Platform management</Text>

      <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <Text className="text-lg font-semibold text-gray-800">Pending Approvals</Text>
        <Text className="text-gray-500 text-sm mt-1">Review courses awaiting approval</Text>
      </View>

      <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <Text className="text-lg font-semibold text-gray-800">Manage Users</Text>
        <Text className="text-gray-500 text-sm mt-1">View and manage platform users</Text>
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
