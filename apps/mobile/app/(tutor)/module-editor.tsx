import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { uploadToStorage } from "../../lib/upload";
import { colors } from "../../constants/theme";

interface ModuleData {
  id?: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration_mins: number | null;
  order_index: number;
  is_preview: boolean;
}

export default function ModuleEditor() {
  const { courseId, moduleId } = useLocalSearchParams<{ courseId: string; moduleId?: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const isEdit  = !!moduleId;

  const [loading,        setLoading]        = useState(isEdit);
  const [saving,         setSaving]         = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPdf,   setUploadingPdf]   = useState(false);

  // Form fields
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl,    setVideoUrl]    = useState("");
  const [pdfUrl,      setPdfUrl]      = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [orderStr,    setOrderStr]    = useState("1");
  const [isPreview,   setIsPreview]   = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    apiGet<{ modules: ModuleData[] }>(`/api/v1/courses/${courseId}`)
      .then(({ modules }) => {
        const mod = modules.find((m) => m.id === moduleId);
        if (mod) {
          setTitle(mod.title);
          setDescription(mod.description ?? "");
          setVideoUrl(mod.video_url ?? "");
          setPdfUrl(mod.pdf_url ?? "");
          setDurationStr(mod.duration_mins?.toString() ?? "");
          setOrderStr(mod.order_index.toString());
          setIsPreview(mod.is_preview);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleId]);

  async function pickAndUploadVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Allow access to your media library to upload videos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality:    1,
      videoMaxDuration: 3600,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingVideo(true);
    try {
      const ext      = asset.uri.split(".").pop() ?? "mp4";
      const fileName = `${courseId}/${Date.now()}.${ext}`;
      const url      = await uploadToStorage(asset.uri, "course-videos", fileName, "video/mp4");
      setVideoUrl(url);
      Alert.alert("Uploaded", "Video uploaded successfully.");
    } catch (e: any) {
      Alert.alert("Upload Failed", e?.message ?? "Could not upload video. Check your Supabase storage bucket.");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Validation", "Module title is required.");
      return;
    }
    setSaving(true);
    const payload = {
      title:         title.trim(),
      description:   description.trim() || null,
      video_url:     videoUrl.trim() || null,
      pdf_url:       pdfUrl.trim() || null,
      duration_mins: durationStr ? parseInt(durationStr, 10) : null,
      order_index:   parseInt(orderStr, 10) || 1,
      is_preview:    isPreview,
    };

    try {
      if (isEdit) {
        await apiPut(`/api/v1/courses/${courseId}/modules/${moduleId}`, payload);
      } else {
        await apiPost(`/api/v1/courses/${courseId}/modules`, payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save module.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>{isEdit ? "Edit Module" : "Add Module"}</Text>
        <Pressable
          style={[s.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={s.saveHeaderBtnText}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 52 + 16, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Basic Info ────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Module Info</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Title *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Introduction to React Hooks"
            placeholderTextColor={colors.textVariant}
          />

          <Text style={[s.fieldLabel, { marginTop: 12 }]}>Description</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What will students learn in this module?"
            placeholderTextColor={colors.textVariant}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Duration (min)</Text>
              <TextInput
                style={s.input}
                value={durationStr}
                onChangeText={setDurationStr}
                placeholder="15"
                placeholderTextColor={colors.textVariant}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Order</Text>
              <TextInput
                style={s.input}
                value={orderStr}
                onChangeText={setOrderStr}
                placeholder="1"
                placeholderTextColor={colors.textVariant}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Free Preview toggle */}
          <Pressable style={s.toggleRow} onPress={() => setIsPreview((v) => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Free Preview</Text>
              <Text style={s.rowSub}>Non-enrolled students can watch this module</Text>
            </View>
            <View style={[s.toggle, isPreview && s.toggleOn]}>
              <View style={[s.toggleThumb, isPreview && s.toggleThumbOn]} />
            </View>
          </Pressable>
        </View>

        {/* ── Video ─────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Video</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Video URL</Text>
          <TextInput
            style={s.input}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://youtube.com/... or uploaded URL"
            placeholderTextColor={colors.textVariant}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or upload a video file</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            style={[s.uploadBtn, uploadingVideo && { opacity: 0.6 }]}
            onPress={pickAndUploadVideo}
            disabled={uploadingVideo}
          >
            {uploadingVideo ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.uploadBtnText}>Uploading video…</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                <Text style={s.uploadBtnText}>Upload from Gallery</Text>
              </>
            )}
          </Pressable>

          {videoUrl ? (
            <View style={s.uploadedTag}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.uploadedTagText} numberOfLines={1}>{videoUrl}</Text>
            </View>
          ) : null}
        </View>

        {/* ── PDF / Resources ───────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Resources (Optional)</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>PDF / Notes URL</Text>
          <TextInput
            style={s.input}
            value={pdfUrl}
            onChangeText={setPdfUrl}
            placeholder="https://drive.google.com/..."
            placeholderTextColor={colors.textVariant}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={s.hint}>
            Link to a PDF, Google Drive document, or any resource file.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  header: {
    position:          "absolute",
    top: 0, left: 0, right: 0,
    zIndex:            50,
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(19,18,27,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap:               12,
  },
  headerTitle: {
    flex:          1,
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      17,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  saveHeaderBtn: {
    backgroundColor:   colors.primary,
    borderRadius:      10,
    paddingHorizontal: 16,
    paddingVertical:   7,
    minWidth:          56,
    alignItems:        "center",
  },
  saveHeaderBtnText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 14, color: colors.bg },

  scroll: { paddingHorizontal: 16, gap: 8 },

  sectionLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    marginTop:     16,
    marginBottom:  6,
    marginLeft:    4,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
    gap:             0,
  },

  fieldLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
    color:         colors.textVariant,
    marginBottom:  6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    12,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontFamily:      "HankenGrotesk_400Regular",
    fontSize:        15,
    color:           colors.text,
    marginBottom:    0,
  },
  textArea: { minHeight: 80 },
  twoCol:   { flexDirection: "row", gap: 12, marginTop: 12 },

  toggleRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            12,
    paddingTop:     14,
    marginTop:      12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTitle: { fontFamily: "HankenGrotesk_500Medium", fontSize: 15, color: colors.text },
  rowSub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 12, color: colors.textVariant, marginTop: 1 },
  toggle: {
    width:           48,
    height:          28,
    borderRadius:    14,
    backgroundColor: colors.surfaceContainer,
    padding:         2,
    justifyContent:  "center",
  },
  toggleOn:       { backgroundColor: "rgba(196,192,255,0.3)" },
  toggleThumb: {
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: colors.surfaceHighest,
  },
  toggleThumbOn: { backgroundColor: colors.primary, transform: [{ translateX: 20 }] },

  divider: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            12,
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
    opacity:    0.6,
  },

  uploadBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    backgroundColor: "rgba(196,192,255,0.06)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.2)",
    borderStyle:     "dashed",
    borderRadius:    14,
    paddingVertical: 14,
  },
  uploadBtnText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 14, color: colors.primary },

  uploadedTag: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginTop:     10,
    backgroundColor: "rgba(0,229,160,0.08)",
    borderRadius:  8,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },
  uploadedTagText: {
    flex:       1,
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.success,
  },

  hint: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   12,
    color:      colors.textVariant,
    opacity:    0.7,
    marginTop:  8,
  },
});
