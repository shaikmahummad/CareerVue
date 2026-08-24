import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../../lib/auth-validation";
import { colors } from "../../constants/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      Alert.alert("Invalid password", `Use ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!password.trim()) {
      Alert.alert("Invalid password", "Password cannot contain only whitespace.");
      return;
    }
    if (password !== confirmation) {
      Alert.alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert("Reset failed", "The reset link is invalid or expired. Request a new one.");
      return;
    }
    await supabase.auth.signOut();
    Alert.alert("Password updated", "Sign in with your new password.", [
      { text: "Sign in", onPress: () => router.replace("/(auth)/login" as never) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Text style={s.title}>Set a new password</Text>
        <Text style={s.subtitle}>Choose a password you have not used before.</Text>
        <TextInput value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.outline} secureTextEntry autoComplete="new-password" style={s.input} />
        <TextInput value={confirmation} onChangeText={setConfirmation} placeholder="Confirm new password" placeholderTextColor={colors.outline} secureTextEntry autoComplete="new-password" style={s.input} />
        <Pressable onPress={handleReset} disabled={loading} style={[s.button, loading && s.disabled]}>
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>Update password</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  card: { gap: 14, padding: 24, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 24, fontFamily: "HankenGrotesk_700Bold" },
  subtitle: { color: colors.textVariant, fontSize: 15, marginBottom: 6 },
  input: { height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, color: colors.text, backgroundColor: colors.bg },
  button: { height: 52, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontFamily: "HankenGrotesk_700Bold" },
  disabled: { opacity: 0.6 },
});
