import { useState } from "react";
import {
  View, Text, ScrollView, Pressable, Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const TAB_BAR_HEIGHT = 83;

export default function TutorSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [newEnrollments, setNewEnrollments] = useState(true);
  const [newReviews,     setNewReviews]     = useState(true);
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [weeklySummary,  setWeeklySummary]  = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as never);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          className="bg-white border-b border-gray-100 px-5 pb-4"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>

        <View className="px-5 pt-5 gap-6">

          {/* ── Notifications ─────────────────────────────────────── */}
          <Section label="Notifications">
            <ToggleRow
              icon="person-add-outline"
              iconBg="#eff6ff"
              iconColor="#2563eb"
              label="New Enrollments"
              sub="When a student enrolls in your course"
              value={newEnrollments}
              onChange={setNewEnrollments}
            />
            <ToggleRow
              icon="star-outline"
              iconBg="#fffbeb"
              iconColor="#d97706"
              label="New Reviews"
              sub="When a student leaves a review"
              value={newReviews}
              onChange={setNewReviews}
              border
            />
            <ToggleRow
              icon="card-outline"
              iconBg="#f0fdf4"
              iconColor="#16a34a"
              label="Payment Received"
              sub="When a paid course enrollment is confirmed"
              value={paymentReceived}
              onChange={setPaymentReceived}
              border
            />
            <ToggleRow
              icon="bar-chart-outline"
              iconBg="#faf5ff"
              iconColor="#7c3aed"
              label="Weekly Summary"
              sub="Your weekly earnings and enrollment digest"
              value={weeklySummary}
              onChange={setWeeklySummary}
              border
            />
          </Section>

          {/* ── Payouts ───────────────────────────────────────────── */}
          <Section label="Payouts">
            <View className="flex-row items-center gap-3 py-3 border-b border-gray-100">
              <View className="w-9 h-9 rounded-xl bg-green-50 items-center justify-center">
                <Ionicons name="cash-outline" size={18} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Revenue Split</Text>
                <Text className="text-xs text-gray-400">You receive 70% of each sale</Text>
              </View>
              <View className="bg-green-50 rounded-full px-2.5 py-1">
                <Text className="text-xs font-bold text-green-600">70%</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 py-3 border-b border-gray-100">
              <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Payout Schedule</Text>
                <Text className="text-xs text-gray-400">Processed on the 1st of every month</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 py-3">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                <Ionicons name="business-outline" size={18} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Bank Account</Text>
                <Text className="text-xs text-gray-400">•••• •••• •••• 4321 (contact support to update)</Text>
              </View>
              <View className="bg-green-50 rounded-full px-2 py-0.5">
                <Text className="text-xs font-semibold text-green-600">Active</Text>
              </View>
            </View>
          </Section>

          {/* ── Account ───────────────────────────────────────────── */}
          <Section label="Account">
            <Pressable
              className="flex-row items-center gap-3 py-3"
              onPress={handleSignOut}
            >
              <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center">
                <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              </View>
              <Text className="text-sm font-semibold text-red-600">Sign Out</Text>
            </Pressable>
          </Section>

        </View>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 ml-1">{label}</Text>
      <View className="bg-white rounded-2xl border border-gray-100 px-4">
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  icon, iconBg, iconColor, label, sub, value, onChange, border,
}: {
  icon: any; iconBg: string; iconColor: string;
  label: string; sub: string; value: boolean;
  onChange: (v: boolean) => void; border?: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 py-3 ${border ? "border-t border-gray-100" : ""}`}>
      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{label}</Text>
        <Text className="text-xs text-gray-400">{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#e5e7eb", true: "#bfdbfe" }}
        thumbColor={value ? "#2563eb" : "#d1d5db"}
      />
    </View>
  );
}
