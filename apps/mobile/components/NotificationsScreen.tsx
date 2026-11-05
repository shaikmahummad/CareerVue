import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPut } from "../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../constants/theme";

interface Notice { id: string; type?: string | null; title: string; body: string | null; is_read: boolean; link: string | null; created_at: string | null }

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet<Notice[]>("/api/v1/notifications/").then(setItems).finally(() => setLoading(false)); }, []);
  async function open(item: Notice) {
    if (!item.is_read) {
      await apiPut(`/api/v1/notifications/${item.id}/read`);
      setItems((all) => all.map((value) => value.id === item.id ? { ...value, is_read: true } : value));
    }
    if (item.link) {
      const target = item.type?.startsWith("course_") && item.link.startsWith("/tutor")
        ? `/(tutor)${item.link.slice("/tutor".length)}`
        : item.type === "goal_course" ? `/(student)${item.link}` : item.link;
      router.push(target as never);
    }
  }
  async function markAll() {
    await apiPut("/api/v1/notifications/read-all");
    setItems((all) => all.map((item) => ({ ...item, is_read: true })));
  }
  return (
    <View style={s.root}>
      <View style={s.header}><Text style={s.title}>Notifications</Text><Pressable onPress={markAll}><Text style={s.action}>Mark all read</Text></Pressable></View>
      {loading ? <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} /> : (
        <ScrollView contentContainerStyle={s.list}>
          {items.length === 0 && <Text style={s.empty}>No notifications yet.</Text>}
          {items.map((item) => (
            <Pressable key={item.id} onPress={() => void open(item)} style={[s.card, !item.is_read && s.unread]}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.title}</Text>{item.body && <Text style={s.body}>{item.body}</Text>}{item.created_at && <Text style={s.time}>{new Date(item.created_at).toLocaleString()}</Text>}</View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, header: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 26, fontFamily: "HankenGrotesk_700Bold" }, action: { color: colors.primary, fontFamily: "HankenGrotesk_600SemiBold" },
  list: { padding: 16, paddingBottom: TAB_BAR_HEIGHT + 30, gap: 12 }, empty: { color: colors.textVariant, textAlign: "center", marginTop: 80 },
  card: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, unread: { borderColor: colors.primary, backgroundColor: colors.surfaceContainer },
  cardTitle: { color: colors.text, fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15 }, body: { color: colors.textVariant, marginTop: 4, lineHeight: 19 }, time: { color: colors.textVariant, fontSize: 11, marginTop: 8 },
});
