import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  Switch, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiPost } from "../../lib/api";

const CATEGORIES = ["Programming", "Design", "Data Science", "Business", "DevOps", "Cybersecurity", "Other"];
const LEVELS     = ["beginner", "intermediate", "advanced"];

export default function CreateCourseScreen() {
  const router = useRouter();
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [category,      setCategory]      = useState("");
  const [level,         setLevel]         = useState("");
  const [isFree,        setIsFree]        = useState(true);
  const [price,         setPrice]         = useState("");
  const [tagsInput,     setTagsInput]     = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [loading,       setLoading]       = useState(false);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Missing info", "Please enter a course title.");
      return;
    }
    setLoading(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await apiPost("/api/v1/courses/", {
        title:          title.trim(),
        description:    description.trim() || null,
        category:       category || null,
        level:          level || null,
        is_free:        isFree,
        price:          isFree ? 0 : parseFloat(price) || 0,
        tags,
        duration_hours: durationHours ? parseFloat(durationHours) : null,
      });

      Alert.alert(
        "Course Created!",
        "Your course has been submitted for review. We'll notify you once it's approved.",
        [{ text: "OK", onPress: () => router.replace("/(tutor)/courses" as never) }],
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create course");
    } finally {
      setLoading(false);
    }
  }, [title, description, category, level, isFree, price, tagsInput, durationHours, router]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900 flex-1">Create Course</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Basic info */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 gap-4">
          <Text className="text-sm font-semibold text-gray-700">Basic Info</Text>

          <View>
            <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Title *
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white"
              placeholder="e.g. React Native from Zero to Hero"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Description
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white"
              placeholder="What will students learn?"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>
        </View>

        {/* Category */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 gap-3">
          <Text className="text-sm font-semibold text-gray-700">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                className={`rounded-xl px-3 py-1.5 border ${
                  category === cat ? "bg-blue-600 border-blue-600" : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setCategory(cat === category ? "" : cat)}
              >
                <Text className={`text-xs font-medium ${category === cat ? "text-white" : "text-gray-600"}`}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Level */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 gap-3">
          <Text className="text-sm font-semibold text-gray-700">Level</Text>
          <View className="flex-row gap-2">
            {LEVELS.map((l) => (
              <Pressable
                key={l}
                className={`flex-1 rounded-xl py-2.5 border items-center ${
                  level === l ? "bg-gray-800 border-gray-800" : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setLevel(l === level ? "" : l)}
              >
                <Text className={`text-xs font-medium capitalize ${level === l ? "text-white" : "text-gray-600"}`}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pricing */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 gap-4">
          <Text className="text-sm font-semibold text-gray-700">Pricing</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-800 font-medium">Free Course</Text>
              <Text className="text-xs text-gray-400">Students enroll at no cost</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: "#e5e7eb", true: "#2563eb" }}
              thumbColor="#ffffff"
            />
          </View>
          {!isFree && (
            <View>
              <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Price (₹)
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white"
                placeholder="e.g. 999"
                placeholderTextColor="#9ca3af"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {/* Additional details */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 gap-4">
          <Text className="text-sm font-semibold text-gray-700">Additional Details</Text>

          <View>
            <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Tags (comma-separated)
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white"
              placeholder="e.g. react, javascript, mobile"
              placeholderTextColor="#9ca3af"
              value={tagsInput}
              onChangeText={setTagsInput}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Duration (hours)
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white"
              placeholder="e.g. 12.5"
              placeholderTextColor="#9ca3af"
              value={durationHours}
              onChangeText={setDurationHours}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Submit */}
        <Pressable
          className="bg-blue-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="cloud-upload-outline" size={18} color="white" />}
          <Text className="text-white font-semibold text-sm">
            {loading ? "Creating…" : "Submit for Review"}
          </Text>
        </Pressable>

        <View className="h-4" />
      </ScrollView>
    </View>
  );
}
