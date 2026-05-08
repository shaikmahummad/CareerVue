import { View, Text, ScrollView } from "react-native";

export default function CoursesScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Courses</Text>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 items-center">
        <Text className="text-gray-500 text-center">No courses available yet.</Text>
      </View>
    </ScrollView>
  );
}
