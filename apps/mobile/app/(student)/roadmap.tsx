import { View, Text, ScrollView } from "react-native";

export default function RoadmapScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-2">My Roadmap</Text>
      <Text className="text-gray-500 mb-8">Your personalized learning path</Text>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 items-center">
        <Text className="text-gray-500 text-center">
          Complete the skill quiz first to generate your roadmap.
        </Text>
      </View>
    </ScrollView>
  );
}
