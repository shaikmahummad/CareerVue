import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiPost } from "../../lib/api";
import { colors } from "../../constants/theme";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [flowId, setFlowId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    try { await action(); }
    catch (e: unknown) { Alert.alert("Unable to continue", e instanceof Error ? e.message : "Please try again."); }
    finally { setLoading(false); }
  }

  function sendCode() {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) return Alert.alert("Invalid email", "Enter a valid email address.");
    run(async () => {
      const data = await apiPost<{ flow_id: string }>("/api/v1/auth/forgot-password/request", { email: normalized });
      setEmail(normalized); setFlowId(data.flow_id); setStep("code");
    });
  }

  function verifyCode() {
    if (!/^\d{6}$/.test(code)) return Alert.alert("Invalid code", "Enter the 6-digit code.");
    run(async () => {
      const data = await apiPost<{ reset_token: string }>("/api/v1/auth/forgot-password/verify", { email, flow_id: flowId, code });
      setResetToken(data.reset_token); setStep("password");
    });
  }

  function changePassword() {
    if (password !== confirm) return Alert.alert("Passwords do not match", "Enter the same password twice.");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
      return Alert.alert("Weak password", "Use 8+ characters with uppercase, lowercase, and a number.");
    run(async () => {
      await apiPost("/api/v1/auth/forgot-password/reset", { reset_token: resetToken, new_password: password });
      setStep("done");
    });
  }

  const title = step === "email" ? "Forgot Password?" : step === "code" ? "Enter your code" : step === "password" ? "New password" : "Password changed";
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}><Pressable style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={colors.text} /></Pressable></View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={s.icon}><Ionicons name={step === "done" ? "checkmark-circle-outline" : step === "email" ? "mail-outline" : "key-outline"} size={38} color={colors.primary} /></View>
        <Text style={s.title}>{title}</Text>

        {step === "email" && <><Text style={s.subtitle}>Enter the email registered with your CareerVue account.</Text><Field value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoComplete="email" /><Action loading={loading} label="Send code" onPress={sendCode} /></>}
        {step === "code" && <><Text style={s.subtitle}>A code is sent to your Registered mail if it exist. It expires in 10 minutes.</Text><Field value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))} placeholder="6-digit code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} style={s.code} /><Action loading={loading} label="Verify code" onPress={verifyCode} /><Pressable onPress={() => { setStep("email"); setCode(""); }}><Text style={s.link}>Use another email</Text></Pressable></>}
        {step === "password" && <><Text style={s.subtitle}>Use 8+ characters with uppercase, lowercase, and a number.</Text><Field value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry autoComplete="new-password" /><Field value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" secureTextEntry autoComplete="new-password" /><Action loading={loading} label="Change password" onPress={changePassword} /></>}
        {step === "done" && <><Text style={s.subtitle}>Your password was updated. You can now sign in with it.</Text><Action loading={false} label="Back to login" onPress={() => router.replace("/(auth)/login" as never)} /></>}
        {step !== "done" && <Pressable onPress={() => router.replace("/(auth)/login" as never)}><Text style={s.link}>Back to login</Text></Pressable>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput {...props} placeholderTextColor={colors.textVariant} autoCapitalize="none" style={[s.input, props.style]} />; }
function Action({ loading, label, onPress }: { loading: boolean; label: string; onPress: () => void }) { return <Pressable disabled={loading} onPress={onPress} style={s.button}><LinearGradient colors={["#c4c0ff", "#8781ff"]} style={s.gradient}>{loading ? <ActivityIndicator color="#1b0091" /> : <Text style={s.buttonText}>{label}</Text>}</LinearGradient></Pressable>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, topBar: { paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, gap: 16 },
  icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(196,192,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: "HankenGrotesk_700Bold", fontSize: 28, color: colors.text },
  subtitle: { fontFamily: "HankenGrotesk_400Regular", fontSize: 15, lineHeight: 22, color: colors.textVariant, marginBottom: 4 },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 15 },
  code: { textAlign: "center", letterSpacing: 10, fontSize: 20 }, button: { borderRadius: 16, overflow: "hidden" }, gradient: { height: 54, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "HankenGrotesk_700Bold", fontSize: 16, color: "#1b0091" }, link: { textAlign: "center", color: colors.textVariant, fontSize: 14, paddingVertical: 4 },
});
