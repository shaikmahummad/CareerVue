import { View, Text, ScrollView } from "react-native";

export default function TutorCoursesScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-6">My Courses</Text>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 items-center">
        <Text className="text-gray-500 text-center">You haven't created any courses yet.</Text>
      </View>
    </ScrollView>
  );
}
