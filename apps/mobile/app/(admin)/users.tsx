import { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPut } from "../../lib/api";

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string | null;
}

const ROLES = ["", "student", "tutor", "admin"];

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  student:     { color: "#2563eb", bg: "#eff6ff" },
  tutor:       { color: "#7c3aed", bg: "#ede9fe" },
  admin:       { color: "#059669", bg: "#ecfdf5" },
  deactivated: { color: "#6b7280", bg: "#f3f4f6" },
};

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center flex-shrink-0">
      <Text className="text-sm font-bold text-gray-600">{initials || "U"}</Text>
    </View>
  );
}

export default function UsersScreen() {
  const [users,    setUsers]    = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildUrl() {
    const params = new URLSearchParams();
    if (roleFilter) params.set("role",   roleFilter);
    if (search.trim()) params.set("search", search.trim());
    return `/api/v1/admin/users?${params}`;
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await apiGet<UserProfile[]>(buildUrl());
      setUsers(data);
    } catch {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(fetchUsers, 350);
  }, [search, roleFilter]);

  function handleRoleChange(user: UserProfile) {
    const options: Array<"student" | "tutor" | "admin"> = ["student", "tutor", "admin"];
    Alert.alert(
      "Change Role",
      `Change role for ${user.full_name}`,
      options.map((r) => ({
        text: r.charAt(0).toUpperCase() + r.slice(1),
        onPress: async () => {
          setUpdating(user.id);
          try {
            await apiPut(`/api/v1/admin/users/${user.id}/role`, { role: r });
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: r } : u));
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to update role");
          } finally {
            setUpdating(null);
          }
        },
      })).concat([{ text: "Cancel", style: "cancel" } as any]),
    );
  }

  function renderUser({ item: u }: { item: UserProfile }) {
    const sty = ROLE_STYLE[u.role] ?? ROLE_STYLE.deactivated;
    const isUpdating = updating === u.id;
    return (
      <View className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 mb-2.5">
        <View className="flex-row items-center gap-3">
          <UserAvatar name={u.full_name} />
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{u.full_name}</Text>
            <Text className="text-xs text-gray-400" numberOfLines={1}>{u.email}</Text>
            {u.created_at && (
              <Text className="text-xs text-gray-300 mt-0.5">
                Joined {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            )}
          </View>
          <Pressable
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: sty.bg }}
            onPress={() => handleRoleChange(u)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={sty.color} />
            ) : (
              <>
                <Text className="text-xs font-semibold capitalize" style={{ color: sty.color }}>
                  {u.role}
                </Text>
                <Ionicons name="chevron-down" size={10} color={sty.color} />
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-900 mb-3">Users</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 text-sm text-gray-900"
            placeholder="Search by name or email..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Role filter */}
      <View className="bg-white border-b border-gray-100">
        <FlatList
          horizontal
          data={ROLES}
          keyExtractor={(r) => r || "all"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: r }) => (
            <Pressable
              className={`rounded-xl px-3 py-1.5 border ${
                roleFilter === r ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
              }`}
              onPress={() => setRoleFilter(r)}
            >
              <Text className={`text-xs font-medium capitalize ${roleFilter === r ? "text-white" : "text-gray-600"}`}>
                {r || "All Roles"}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="people-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-3">No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
