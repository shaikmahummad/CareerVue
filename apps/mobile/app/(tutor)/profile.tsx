import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPut } from "../../lib/api";
import { supabase } from "../../lib/supabase";

interface TutorProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  expertise_tags: string[] | null;
  qualification: string | null;
  years_experience: number | null;
  linkedin_url: string | null;
  website_url: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function TutorProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile,  setProfile]  = useState<TutorProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Editable fields
  const [bio,         setBio]         = useState("");
  const [tags,        setTags]        = useState("");   // comma-separated string
  const [qual,        setQual]        = useState("");
  const [years,       setYears]       = useState("");
  const [linkedin,    setLinkedin]    = useState("");
  const [website,     setWebsite]     = useState("");
  const [phone,       setPhone]       = useState("");

  useEffect(() => {
    apiGet<TutorProfile>("/api/v1/tutors/profile")
      .then((p) => {
        setProfile(p);
        setBio(p.bio ?? "");
        setTags((p.expertise_tags ?? []).join(", "));
        setQual(p.qualification ?? "");
        setYears(p.years_experience?.toString() ?? "");
        setLinkedin(p.linkedin_url ?? "");
        setWebsite(p.website_url ?? "");
        setPhone(p.phone ?? "");
      })
      .catch((error) => {
        console.warn("Failed to load tutor profile", error instanceof Error ? error.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPut("/api/v1/tutors/profile", {
        bio:              bio.trim() || null,
        expertise_tags:   tags.split(",").map((t) => t.trim()).filter(Boolean),
        qualification:    qual.trim() || null,
        years_experience: years ? parseInt(years, 10) : null,
        linkedin_url:     linkedin.trim() || null,
        website_url:      website.trim() || null,
        phone:            phone.trim() || null,
      });
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as never);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (profile?.email?.[0]?.toUpperCase() ?? "T");

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="bg-white border-b border-gray-100 px-5 pb-4 flex-row items-end justify-between"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-2xl font-bold text-gray-900">Profile</Text>
          <Pressable
            className="flex-row items-center gap-1.5 bg-blue-600 rounded-xl px-4 py-2"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
            <Text className="text-white text-sm font-semibold">Save</Text>
          </Pressable>
        </View>

        {/* Avatar + name */}
        <View className="items-center py-8 bg-white border-b border-gray-100 gap-3">
          <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-3xl font-bold text-blue-600">{initials}</Text>
          </View>
          <View className="items-center gap-0.5">
            <Text className="text-lg font-bold text-gray-900">{profile?.full_name ?? "—"}</Text>
            <Text className="text-sm text-gray-400">{profile?.email ?? "—"}</Text>
          </View>
          <View className="bg-blue-50 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-blue-600">Tutor</Text>
          </View>
        </View>

        <View className="px-5 pt-6 gap-6">
          {/* Bio */}
          <Field label="Bio">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell students about yourself..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 96 }}
            />
          </Field>

          {/* Expertise tags */}
          <Field label="Expertise Tags" hint="Comma-separated, e.g. React, Node.js, Python">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={tags}
              onChangeText={setTags}
              placeholder="React, Node.js, Python..."
              placeholderTextColor="#9ca3af"
            />
          </Field>

          {/* Qualification */}
          <Field label="Qualification">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={qual}
              onChangeText={setQual}
              placeholder="e.g. B.Tech Computer Science, Google SWE..."
              placeholderTextColor="#9ca3af"
            />
          </Field>

          {/* Years experience */}
          <Field label="Years of Experience">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={years}
              onChangeText={setYears}
              placeholder="5"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </Field>

          {/* LinkedIn */}
          <Field label="LinkedIn URL">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={linkedin}
              onChangeText={setLinkedin}
              placeholder="https://linkedin.com/in/..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
            />
          </Field>

          {/* Website */}
          <Field label="Website">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
            />
          </Field>

          {/* Phone */}
          <Field label="Phone">
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </Field>

          {/* Sign out */}
          <Pressable
            className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-100 rounded-2xl py-4 mt-2"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text className="text-red-600 font-semibold text-sm">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Text>
      {hint && <Text className="text-xs text-gray-400 mb-0.5">{hint}</Text>}
      {children}
    </View>
  );
}
