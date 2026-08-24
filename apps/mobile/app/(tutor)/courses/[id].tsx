import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiDelete, apiGet, apiPut, apiPost } from "../../../lib/api";
import { colors } from "../../../constants/theme";

interface Module {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration_mins: number | null;
  order_index: number;
  is_preview: boolean;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price: number;
  status: string;
  rejection_note: string | null;
  modules: Module[];
}

const CATEGORIES = ["Web Dev", "Mobile", "DSA", "Design", "Cloud", "Security", "AI/ML", "Business"];
const LEVELS     = ["beginner", "intermediate", "advanced"];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: "Draft",          color: colors.textVariant,  bg: "rgba(255,255,255,0.06)" },
  pending_approval: { label: "Under Review",   color: colors.warning,      bg: "rgba(255,184,0,0.12)"   },
  approved:         { label: "Live",           color: colors.success,      bg: "rgba(0,229,160,0.12)"   },
  rejected:         { label: "Rejected",       color: colors.error,        bg: "rgba(255,180,171,0.12)" },
};

export default function CourseEditor() {
  const { id }     = useLocalSearchParams<{ id: string }>();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const [course,   setCourse]   = useState<CourseDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Editable fields
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [level,    setLevel]    = useState<string | null>(null);
  const [isFree,   setIsFree]   = useState(true);
  const [price,    setPrice]    = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiGet<CourseDetail>(`/api/v1/courses/${id}`);
      setCourse(data);
      setTitle(data.title);
      setDesc(data.description ?? "");
      setCategory(data.category);
      setLevel(data.level);
      setIsFree(data.is_free);
      setPrice(data.price?.toString() ?? "0");
    } catch {
      Alert.alert("Error", "Could not load course.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Reload modules when screen is focused (after adding/editing a module)
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function handleSave() {
    if (!title.trim()) { Alert.alert("Validation", "Title is required."); return; }
    setSaving(true);
    try {
      await apiPut(`/api/v1/courses/${id}`, {
        title:       title.trim(),
        description: desc.trim() || null,
        category,
        level,
        is_free:     isFree,
        price:       isFree ? 0 : parseFloat(price) || 0,
      });
      Alert.alert("Saved", "Course info updated.");
    } catch (error: unknown) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    Alert.alert(
      "Submit for Review",
      "Once submitted, you cannot edit the course until the review is complete.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiPost(`/api/v1/courses/${id}/submit`, {});
              Alert.alert("Submitted!", "Your course is now under review.");
              load();
            } catch (error: unknown) {
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to submit.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  async function handleDeleteModule(moduleId: string, title: string) {
    Alert.alert("Delete Module", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/v1/courses/${id}/modules/${moduleId}`);
            setCourse((prev) =>
              prev ? { ...prev, modules: prev.modules.filter((m) => m.id !== moduleId) } : prev
            );
          } catch (error: unknown) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete.");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusMeta = STATUS_META[course?.status ?? "draft"] ?? STATUS_META.draft;
  const canEdit    = course?.status === "draft" || course?.status === "rejected";
  const canSubmit  = canEdit && (course?.modules?.length ?? 0) > 0;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{title || "Course Editor"}</Text>
        <View style={[s.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[s.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 52 + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Rejection note */}
        {course?.rejection_note && (
          <View style={s.rejectCard}>
            <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.rejectTitle}>Rejected</Text>
              <Text style={s.rejectNote}>{course.rejection_note}</Text>
            </View>
          </View>
        )}

        {/* ── Course Info ────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Course Info</Text>

        <View style={s.card}>
          <Text style={s.fieldLabel}>Title</Text>
          <TextInput
            style={[s.input, !canEdit && s.inputDisabled]}
            value={title}
            onChangeText={setTitle}
            placeholder="Course title..."
            placeholderTextColor={colors.textVariant}
            editable={canEdit}
          />

          <Text style={[s.fieldLabel, { marginTop: 12 }]}>Description</Text>
          <TextInput
            style={[s.input, s.textArea, !canEdit && s.inputDisabled]}
            value={desc}
            onChangeText={setDesc}
            placeholder="What will students learn?"
            placeholderTextColor={colors.textVariant}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={canEdit}
          />
        </View>

        {/* Category */}
        <Text style={s.sectionLabel}>Category</Text>
        <View style={s.chipRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[s.chip, category === cat && s.chipActive]}
              onPress={() => canEdit && setCategory(cat)}
            >
              <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>

        {/* Level */}
        <Text style={s.sectionLabel}>Level</Text>
        <View style={s.chipRow}>
          {LEVELS.map((lv) => (
            <Pressable
              key={lv}
              style={[s.chip, level === lv && s.chipActive]}
              onPress={() => canEdit && setLevel(lv)}
            >
              <Text style={[s.chipText, level === lv && s.chipTextActive, { textTransform: "capitalize" }]}>
                {lv}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Pricing */}
        <Text style={s.sectionLabel}>Pricing</Text>
        <View style={s.card}>
          <Pressable
            style={s.toggleRow}
            onPress={() => canEdit && setIsFree((v) => !v)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Free Course</Text>
              <Text style={s.rowSub}>Students enroll at no cost</Text>
            </View>
            <View style={[s.toggle, isFree && s.toggleOn]}>
              <View style={[s.toggleThumb, isFree && s.toggleThumbOn]} />
            </View>
          </Pressable>
          {!isFree && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.fieldLabel}>Price (₹)</Text>
              <TextInput
                style={[s.input, !canEdit && s.inputDisabled]}
                value={price}
                onChangeText={setPrice}
                placeholder="999"
                placeholderTextColor={colors.textVariant}
                keyboardType="numeric"
                editable={canEdit}
              />
            </View>
          )}
        </View>

        {canEdit && (
          <Pressable
            style={({ pressed }) => [s.saveBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={s.saveBtnText}>Save Changes</Text>
            }
          </Pressable>
        )}

        {/* ── Curriculum ────────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>Curriculum</Text>
          <Text style={s.moduleCount}>{course?.modules?.length ?? 0} modules</Text>
        </View>

        {(course?.modules?.length ?? 0) === 0 ? (
          <View style={s.emptyModules}>
            <Ionicons name="play-circle-outline" size={40} color={colors.textVariant} style={{ opacity: 0.4 }} />
            <Text style={s.emptyTitle}>No modules yet</Text>
            <Text style={s.emptySub}>Add your first module to build the curriculum</Text>
          </View>
        ) : (
          <View style={s.moduleList}>
            {course!.modules
              .sort((a, b) => a.order_index - b.order_index)
              .map((mod, idx) => (
                <View key={mod.id} style={s.moduleRow}>
                  <View style={s.moduleIndex}>
                    <Text style={s.moduleIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.moduleTitle} numberOfLines={1}>{mod.title}</Text>
                    <View style={s.moduleMeta}>
                      {mod.duration_mins != null && (
                        <Text style={s.moduleMetaText}>{mod.duration_mins} min</Text>
                      )}
                      {mod.video_url && (
                        <View style={s.badge}>
                          <Ionicons name="videocam-outline" size={10} color={colors.secondary} />
                          <Text style={[s.badgeText, { color: colors.secondary }]}>Video</Text>
                        </View>
                      )}
                      {mod.is_preview && (
                        <View style={[s.badge, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
                          <Text style={[s.badgeText, { color: colors.success }]}>Preview</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {canEdit && (
                    <View style={s.moduleActions}>
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          router.push({
                            pathname: "/(tutor)/module-editor" as never,
                            params: { courseId: id, moduleId: mod.id },
                          })
                        }
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => handleDeleteModule(mod.id, mod.title)}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}

        {canEdit && (
          <Pressable
            style={s.addModuleBtn}
            onPress={() =>
              router.push({
                pathname: "/(tutor)/module-editor" as never,
                params: { courseId: id },
              })
            }
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={s.addModuleBtnText}>Add Module</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Submit for review CTA */}
      {canSubmit && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [s.submitBtn, { opacity: pressed || submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <>
                <LinearGradient
                  colors={["#c4c0ff", "#8781ff"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={s.submitBtnText}>Submit for Review</Text>
                <Ionicons name="send-outline" size={16} color="#1b0091" />
              </>
            )}
          </Pressable>
        </View>
      )}
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
    lineHeight:    22,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  statusPill: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    flexShrink:        0,
  },
  statusText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
  },

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
  sectionRow: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      16,
    marginBottom:   6,
    paddingHorizontal: 4,
  },
  moduleCount: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
    opacity:    0.6,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
  },

  rejectCard: {
    flexDirection:   "row",
    gap:             12,
    alignItems:      "flex-start",
    backgroundColor: "rgba(255,180,171,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(255,180,171,0.25)",
    borderRadius:    16,
    padding:         14,
    marginBottom:    8,
  },
  rejectTitle: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   14,
    color:      colors.error,
    marginBottom: 2,
  },
  rejectNote: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    lineHeight: 18,
    color:      colors.error,
    opacity:    0.8,
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
  },
  textArea:     { minHeight: 96 },
  inputDisabled: { opacity: 0.5 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  chipActive: {
    backgroundColor: "rgba(196,192,255,0.15)",
    borderColor:     colors.primary,
  },
  chipText:       { fontFamily: "HankenGrotesk_500Medium", fontSize: 13, color: colors.textVariant },
  chipTextActive: { color: colors.primary },

  toggleRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
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

  saveBtn: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    14,
    paddingVertical: 13,
    alignItems:      "center",
    marginTop:       8,
  },
  saveBtnText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15, color: colors.primary },

  emptyModules: {
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         40,
    gap:             8,
  },
  emptyTitle: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 16, color: colors.text },
  emptySub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 13, color: colors.textVariant, textAlign: "center" },

  moduleList: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    overflow:        "hidden",
  },
  moduleRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleIndex: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(196,192,255,0.1)",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  moduleIndexText: { fontFamily: "JetBrainsMono_500Medium", fontSize: 12, color: colors.primary },
  moduleTitle:     { fontFamily: "HankenGrotesk_500Medium", fontSize: 14, color: colors.text, marginBottom: 4 },
  moduleMeta:      { flexDirection: "row", alignItems: "center", gap: 8 },
  moduleMetaText:  { fontFamily: "JetBrainsMono_500Medium", fontSize: 11, color: colors.textVariant },
  badge: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             3,
    backgroundColor: "rgba(162,231,255,0.1)",
    borderRadius:    6,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  badgeText: { fontFamily: "JetBrainsMono_500Medium", fontSize: 10 },
  moduleActions: { flexDirection: "row", gap: 16, alignItems: "center" },

  addModuleBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    backgroundColor: "rgba(196,192,255,0.06)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.2)",
    borderStyle:     "dashed",
    borderRadius:    16,
    paddingVertical: 14,
    marginTop:       8,
  },
  addModuleBtnText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 14, color: colors.primary },

  bottomBar: {
    position:          "absolute",
    bottom:            0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop:        12,
    backgroundColor:   "rgba(19,18,27,0.95)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.05)",
  },
  submitBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    borderRadius:    16,
    paddingVertical: 16,
    overflow:        "hidden",
  },
  submitBtnText: { fontFamily: "HankenGrotesk_700Bold", fontSize: 16, color: "#1b0091" },
});
