import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost, apiPut } from "../../lib/api";

interface RoadmapItem {
  id: string;
  topic: string;
  reason: string | null;
  priority: string;
  status: string;
  order_index: number;
}

interface Roadmap {
  id: string;
  goal: string;
  status: string;
  items: RoadmapItem[];
}

const STATUS_CYCLE: Record<string, string> = {
  pending:   "enrolled",
  enrolled:  "completed",
  completed: "pending",
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: "Pending",   color: "#6b7280", bg: "#f3f4f6", icon: "ellipse-outline" },
  enrolled:  { label: "Enrolled",  color: "#d97706", bg: "#fef3c7", icon: "time-outline" },
  completed: { label: "Done",      color: "#059669", bg: "#d1fae5", icon: "checkmark-circle" },
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f97316",
  low:    "#22c55e",
};

export default function RoadmapScreen() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [noRoadmap, setNoRoadmap] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setNoRoadmap(false);
    try {
      const data = await apiGet<Roadmap>("/api/v1/roadmap/mine");
      setRoadmap(data);
    } catch {
      setNoRoadmap(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item: RoadmapItem) {
    if (!roadmap || toggling) return;
    const nextStatus = STATUS_CYCLE[item.status] ?? "pending";
    setToggling(item.id);
    try {
      await apiPut(`/api/v1/roadmap/${roadmap.id}/course/${item.id}/status`, { status: nextStatus });
      setRoadmap((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => i.id === item.id ? { ...i, status: nextStatus } : i) }
          : prev
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update status");
    } finally {
      setToggling(null);
    }
  }

  async function handleRegenerate() {
    Alert.alert(
      "Regenerate Roadmap",
      "This will replace your current roadmap. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            setRegenerating(true);
            try {
              const data = await apiPost<Roadmap>("/api/v1/roadmap/generate");
              setRoadmap(data);
              setNoRoadmap(false);
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to generate roadmap");
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  }

  if (loading || regenerating) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        {regenerating && (
          <Text className="text-sm text-gray-400 mt-3">Building your roadmap…</Text>
        )}
      </View>
    );
  }

  if (noRoadmap) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Ionicons name="map-outline" size={48} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">No Roadmap Yet</Text>
        <Text className="text-sm text-gray-400 text-center mb-8">
          Take the skill quiz first so we can generate a personalized learning roadmap for you.
        </Text>
        <Pressable
          className="bg-blue-600 rounded-2xl py-3.5 px-8"
          onPress={() => router.push("/(student)/quiz" as any)}
        >
          <Text className="text-white font-semibold">Take the Quiz</Text>
        </Pressable>
      </View>
    );
  }

  if (!roadmap) return null;

  const done  = roadmap.items.filter((i) => i.status === "completed").length;
  const total = roadmap.items.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total && total > 0;

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-14 pb-8">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-1 mr-3">
            <Text className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">My Roadmap</Text>
            <Text className="text-xl font-bold text-gray-900 leading-snug">{roadmap.goal}</Text>
          </View>
          <Pressable
            className="bg-gray-100 rounded-xl px-3 py-2"
            onPress={handleRegenerate}
          >
            <Ionicons name="refresh" size={16} color="#6b7280" />
          </Pressable>
        </View>

        {/* Progress */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-700">Progress</Text>
            <Text className="text-sm font-bold text-blue-600">{pct}%</Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <View
              className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400">{done} of {total} topics completed</Text>
        </View>

        {/* Completion banner */}
        {allDone && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex-row items-center gap-3">
            <Ionicons name="trophy" size={24} color="#059669" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-emerald-800">All topics completed!</Text>
              <Text className="text-xs text-emerald-600">Great work on finishing your roadmap.</Text>
            </View>
          </View>
        )}

        {/* Items */}
        <View className="gap-3">
          {roadmap.items.map((item, i) => {
            const sty = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
            const isToggling = toggling === item.id;
            return (
              <View key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                {/* Row: index + topic + status */}
                <View className="flex-row items-start gap-3">
                  <View className="w-7 h-7 bg-blue-50 rounded-xl items-center justify-center flex-shrink-0 mt-0.5">
                    <Text className="text-xs font-bold text-blue-600">{i + 1}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-semibold text-gray-900 leading-snug mb-1">
                      {item.topic}
                    </Text>
                    {item.reason && (
                      <Text className="text-xs text-gray-400 leading-snug mb-2" numberOfLines={2}>
                        {item.reason}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-2">
                      <View
                        className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: PRIORITY_COLOR[item.priority] + "20" }}
                      >
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLOR[item.priority] ?? "#9ca3af" }}
                        />
                        <Text
                          className="text-xs font-medium capitalize"
                          style={{ color: PRIORITY_COLOR[item.priority] ?? "#9ca3af" }}
                        >
                          {item.priority}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    className="rounded-xl px-2.5 py-1.5 flex-row items-center gap-1.5 flex-shrink-0"
                    style={{ backgroundColor: sty.bg }}
                    onPress={() => handleToggle(item)}
                    disabled={isToggling}
                  >
                    {isToggling ? (
                      <ActivityIndicator size="small" color={sty.color} />
                    ) : (
                      <Ionicons name={sty.icon as any} size={13} color={sty.color} />
                    )}
                    <Text className="text-xs font-semibold" style={{ color: sty.color }}>
                      {sty.label}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
