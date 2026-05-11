import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet, apiPut } from "../../lib/api";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  college: string | null;
  branch: string | null;
  year_of_study: number | null;
  graduation_year: number | null;
  city: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  career_goal: string | null;
  xp_points: number;
  streak_days: number;
  enrolled_count: number;
  completed_count: number;
}

function AvatarInitial({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <View
      className="w-20 h-20 rounded-2xl items-center justify-center"
      style={{ backgroundColor: "#2563eb" }}
    >
      <Text className="text-white text-2xl font-bold">{initials || "S"}</Text>
    </View>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "url";
  editable?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</Text>
      <TextInput
        className={`border rounded-xl px-3.5 py-2.5 text-sm ${
          editable
            ? "border-gray-200 bg-white text-gray-900"
            : "border-gray-100 bg-gray-50 text-gray-400"
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    phone: "", college: "", branch: "",
    year_of_study: "", graduation_year: "",
    city: "", linkedin_url: "", github_url: "",
  });

  useEffect(() => {
    apiGet<StudentProfile>("/api/v1/students/profile")
      .then((data) => {
        setProfile(data);
        setForm({
          phone:           data.phone ?? "",
          college:         data.college ?? "",
          branch:          data.branch ?? "",
          year_of_study:   data.year_of_study != null ? String(data.year_of_study) : "",
          graduation_year: data.graduation_year != null ? String(data.graduation_year) : "",
          city:            data.city ?? "",
          linkedin_url:    data.linkedin_url ?? "",
          github_url:      data.github_url ?? "",
        });
      })
      .catch(() => Alert.alert("Error", "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof typeof form) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiPut<StudentProfile>("/api/v1/students/profile", {
        phone:           form.phone.trim() || null,
        college:         form.college.trim() || null,
        branch:          form.branch.trim() || null,
        year_of_study:   form.year_of_study ? parseInt(form.year_of_study) : null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        city:            form.city.trim() || null,
        linkedin_url:    form.linkedin_url.trim() || null,
        github_url:      form.github_url.trim() || null,
      });
      setProfile(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-14 pb-8">
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900 mb-5">My Profile</Text>

        {/* Identity card */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-4 mb-4">
            <AvatarInitial name={profile?.full_name ?? ""} />
            <View className="flex-1 min-w-0">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                {profile?.full_name}
              </Text>
              <Text className="text-sm text-gray-400" numberOfLines={1}>{profile?.email}</Text>
              {profile?.career_goal && (
                <View className="bg-blue-50 self-start rounded-lg px-2 py-0.5 mt-1.5">
                  <Text className="text-xs text-blue-600 font-medium" numberOfLines={1}>
                    {profile.career_goal}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats mini row */}
          <View className="flex-row gap-3">
            {[
              { label: "XP",       value: profile?.xp_points ?? 0,      color: "#d97706" },
              { label: "Streak",   value: `${profile?.streak_days ?? 0}d`, color: "#ea580c" },
              { label: "Enrolled", value: profile?.enrolled_count ?? 0,  color: "#2563eb" },
              { label: "Done",     value: profile?.completed_count ?? 0, color: "#059669" },
            ].map((s) => (
              <View key={s.label} className="flex-1 bg-gray-50 rounded-xl py-2.5 items-center">
                <Text className="text-sm font-bold" style={{ color: s.color }}>{s.value}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Read-only fields */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <Text className="text-sm font-semibold text-gray-700 mb-4">Account Info</Text>
          <Field label="Full Name" value={profile?.full_name ?? ""} editable={false} />
          <Field label="Email"     value={profile?.email ?? ""}     editable={false} />
        </View>

        {/* Editable fields */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <Text className="text-sm font-semibold text-gray-700 mb-4">Personal Details</Text>
          <Field label="Phone"           value={form.phone}           onChangeText={set("phone")}           placeholder="+91 9876543210" keyboardType="phone-pad" />
          <Field label="City"            value={form.city}            onChangeText={set("city")}            placeholder="Hyderabad" />
          <Field label="College"         value={form.college}         onChangeText={set("college")}         placeholder="IIT Bombay" />
          <Field label="Branch"          value={form.branch}          onChangeText={set("branch")}          placeholder="Computer Science" />
          <Field label="Year of Study"   value={form.year_of_study}   onChangeText={set("year_of_study")}   placeholder="3" keyboardType="numeric" />
          <Field label="Graduation Year" value={form.graduation_year} onChangeText={set("graduation_year")} placeholder="2026" keyboardType="numeric" />
        </View>

        {/* Links */}
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <Text className="text-sm font-semibold text-gray-700 mb-4">Links</Text>
          <Field label="LinkedIn" value={form.linkedin_url} onChangeText={set("linkedin_url")} placeholder="https://linkedin.com/in/..." keyboardType="url" />
          <Field label="GitHub"   value={form.github_url}   onChangeText={set("github_url")}   placeholder="https://github.com/..."   keyboardType="url" />
        </View>

        {/* Save */}
        <Pressable
          className="bg-blue-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="save-outline" size={16} color="white" />}
          <Text className="text-white font-semibold text-sm">
            {saving ? "Saving…" : "Save Profile"}
          </Text>
        </Pressable>

        {/* Sign out */}
        <Pressable
          className="mt-4 py-4 items-center"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-sm text-red-500 font-medium">Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
