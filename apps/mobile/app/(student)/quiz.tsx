import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function QuizScreen() {
  return (
    <View className="flex-1 bg-gray-50 px-6 pt-12">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Skill Quiz</Text>
      <Text className="text-gray-500 mb-8">
        We'll generate questions based on your career goal to assess your current skill level.
      </Text>
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 items-center">
        <Text className="text-gray-700 text-center mb-4">
          Ready to take your personalized skill assessment?
        </Text>
        <Pressable className="bg-primary-600 rounded-lg px-8 py-4">
          <Text className="text-white font-semibold">Start Quiz</Text>
        </Pressable>
      </View>
    </View>
  );
}
