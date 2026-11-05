import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Alert, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform, Image, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPut } from "../../lib/api";
import { colors } from "../../constants/theme";

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
  tags: string[];
  duration_hours: number | null;
  language: string | null;
  status: string;
  enrolled_count: number;
  avg_rating: number;
  created_at: string | null;
  tutor_name: string | null;
  tutor_avatar: string | null;
  thumbnail_url: string | null;
  modules: Module[];
}

export default function CourseReviewScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();

  const [course,      setCourse]      = useState<CourseDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [processing,  setProcessing]  = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote,  setRejectNote]  = useState("");

  useEffect(() => {
    apiGet<CourseDetail>(`/api/v1/courses/${id}`)
      .then(setCourse)
      .catch(() => Alert.alert("Error", "Could not load course."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    Alert.alert("Approve Course", `Approve "${course?.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setProcessing(true);
          try {
            await apiPut(`/api/v1/admin/courses/${id}/approve`);
            Alert.alert("Approved!", "Course is now live.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to approve.");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  }

  async function handleRejectSubmit() {
    if (!rejectNote.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection.");
      return;
    }
    setProcessing(true);
    setRejectModal(false);
    try {
      await apiPut(`/api/v1/admin/courses/${id}/reject`, { rejection_note: rejectNote.trim() });
      Alert.alert("Rejected", "The tutor has been notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to reject.");
    } finally {
      setProcessing(false);
      setRejectNote("");
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!course) return null;

  const totalMins = course.modules.reduce((sum, m) => sum + (m.duration_mins ?? 0), 0);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>Course Review</Text>
        <View style={s.reviewBadge}>
          <Text style={s.reviewBadgeText}>Pending</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 52 + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tutor ─────────────────────────────────────────────────────── */}
        <View style={s.card}>
          {course.thumbnail_url && <Image source={{ uri: course.thumbnail_url }} style={{ width: "100%", height: 180, borderRadius: 14, marginBottom: 16 }} resizeMode="cover" />}
          <View style={s.tutorRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(course.tutor_name ?? "T").split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tutorName}>{course.tutor_name ?? "Unknown Tutor"}</Text>
              {course.created_at && (
                <Text style={s.tutorSub}>
                  Submitted {new Date(course.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Course Info ───────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Course Info</Text>
        <View style={s.card}>
          <Text style={s.courseTitle}>{course.title}</Text>

          {course.description ? (
            <Text style={s.description}>{course.description}</Text>
          ) : (
            <Text style={s.noContent}>No description provided.</Text>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            {course.category && (
              <View style={s.tag}>
                <Ionicons name="grid-outline" size={11} color={colors.primary} />
                <Text style={[s.tagText, { color: colors.primary }]}>{course.category}</Text>
              </View>
            )}
            {course.level && (
              <View style={s.tag}>
                <Ionicons name="bar-chart-outline" size={11} color={colors.textVariant} />
                <Text style={s.tagText}>{course.level}</Text>
              </View>
            )}
            <View style={s.tag}>
              <Ionicons name="pricetag-outline" size={11} color={colors.success} />
              <Text style={[s.tagText, { color: colors.success }]}>
                {course.is_free ? "Free" : `₹${course.price}`}
              </Text>
            </View>
            {course.language && (
              <View style={s.tag}>
                <Ionicons name="language-outline" size={11} color={colors.textVariant} />
                <Text style={s.tagText}>{course.language}</Text>
              </View>
            )}
            {course.duration_hours != null && (
              <View style={s.tag}>
                <Ionicons name="time-outline" size={11} color={colors.textVariant} />
                <Text style={s.tagText}>{course.duration_hours}h</Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {course.tags.length > 0 && (
            <View style={s.tagsRow}>
              {course.tags.map((t) => (
                <View key={t} style={s.tagPill}>
                  <Text style={s.tagPillText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Curriculum ───────────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>Curriculum</Text>
          <Text style={s.moduleCount}>
            {course.modules.length} module{course.modules.length !== 1 ? "s" : ""}
            {totalMins > 0 ? ` · ${totalMins} min` : ""}
          </Text>
        </View>

        {course.modules.length === 0 ? (
          <View style={s.card}>
            <Text style={s.noContent}>No modules added.</Text>
          </View>
        ) : (
          <View style={s.moduleList}>
            {[...course.modules]
              .sort((a, b) => a.order_index - b.order_index)
              .map((mod, idx) => (
                <View key={mod.id} style={[s.moduleRow, idx === course.modules.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.moduleIdx}>
                    <Text style={s.moduleIdxText}>{idx + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.moduleTitle}>{mod.title}</Text>
                    {mod.description ? (
                      <Text style={s.moduleSub} numberOfLines={2}>{mod.description}</Text>
                    ) : null}

                    <View style={s.moduleBadges}>
                      {mod.video_url && (
                        <Pressable style={s.badge} onPress={() => Linking.openURL(mod.video_url!)}>
                          <Ionicons name="videocam-outline" size={10} color={colors.secondary} />
                          <Text style={[s.badgeText, { color: colors.secondary }]}>Watch Video</Text>
                        </Pressable>
                      )}
                      {mod.pdf_url && (
                        <View style={[s.badge, { backgroundColor: "rgba(255,184,0,0.1)" }]}>
                          <Ionicons name="document-outline" size={10} color={colors.warning} />
                          <Text style={[s.badgeText, { color: colors.warning }]}>PDF</Text>
                        </View>
                      )}
                      {mod.is_preview && (
                        <View style={[s.badge, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
                          <Text style={[s.badgeText, { color: colors.success }]}>Preview</Text>
                        </View>
                      )}
                      {mod.duration_mins != null && (
                        <Text style={s.moduleDuration}>{mod.duration_mins} min</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <View style={[s.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={({ pressed }) => [s.rejectBtn, { opacity: pressed || processing ? 0.7 : 1 }]}
          onPress={() => setRejectModal(true)}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <Text style={s.rejectBtnText}>Reject</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.approveBtn, { opacity: pressed || processing ? 0.7 : 1 }]}
          onPress={handleApprove}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.bg} />
              <Text style={s.approveBtnText}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* ── Reject Note Modal ─────────────────────────────────────────────── */}
      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(false)}>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Reject Course</Text>
            <Text style={s.modalSub}>
              Provide feedback so the tutor knows what to improve before resubmitting.
            </Text>

            <TextInput
              style={s.noteInput}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. Modules are missing video content, description is too vague…"
              placeholderTextColor={colors.textVariant}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />

            <View style={s.modalActions}>
              <Pressable
                style={s.modalCancelBtn}
                onPress={() => { setRejectModal(false); setRejectNote(""); }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.modalRejectBtn} onPress={handleRejectSubmit}>
                <Text style={s.modalRejectText}>Send Rejection</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    backgroundColor:   "rgba(19,18,27,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap:               12,
  },
  headerTitle: {
    flex:       1,
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize:   17,
    color:      colors.text,
  },
  reviewBadge: {
    backgroundColor:   "rgba(255,184,0,0.15)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  reviewBadgeText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.warning,
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
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
    marginTop:         16,
    marginBottom:      6,
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
    gap:             10,
  },

  tutorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(196,192,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: { fontFamily: "HankenGrotesk_700Bold", fontSize: 14, color: colors.primary },
  tutorName:  { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15, color: colors.text },
  tutorSub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 12, color: colors.textVariant, marginTop: 2 },

  courseTitle: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize:   18,
    color:      colors.text,
    lineHeight: 24,
  },
  description: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    color:      colors.textVariant,
    lineHeight: 22,
  },
  noContent: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    color:      colors.textVariant,
    opacity:    0.5,
    fontStyle:  "italic",
  },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "rgba(255,255,255,0.04)",
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  tagText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    color:         colors.textVariant,
    textTransform: "capitalize",
  },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagPill: {
    backgroundColor:   "rgba(196,192,255,0.1)",
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  tagPillText: { fontFamily: "JetBrainsMono_500Medium", fontSize: 11, color: colors.primary },

  moduleList: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    overflow:        "hidden",
  },
  moduleRow: {
    flexDirection:     "row",
    alignItems:        "flex-start",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleIdx: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(196,192,255,0.1)",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
    marginTop:       2,
  },
  moduleIdxText:  { fontFamily: "JetBrainsMono_500Medium", fontSize: 12, color: colors.primary },
  moduleTitle:    { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 14, color: colors.text, marginBottom: 3 },
  moduleSub:      { fontFamily: "HankenGrotesk_400Regular", fontSize: 12, color: colors.textVariant, lineHeight: 18, marginBottom: 6 },
  moduleBadges:   { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               3,
    backgroundColor:   "rgba(162,231,255,0.1)",
    borderRadius:      6,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  badgeText:      { fontFamily: "JetBrainsMono_500Medium", fontSize: 10 },
  moduleDuration: { fontFamily: "JetBrainsMono_500Medium", fontSize: 11, color: colors.textVariant },

  actionBar: {
    position:          "absolute",
    bottom:            0, left: 0, right: 0,
    flexDirection:     "row",
    gap:               12,
    paddingHorizontal: 16,
    paddingTop:        12,
    backgroundColor:   "rgba(19,18,27,0.97)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.05)",
  },
  rejectBtn: {
    flex:            1,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    borderWidth:     1,
    borderColor:     "rgba(255,180,171,0.3)",
    borderRadius:    16,
    paddingVertical: 15,
  },
  rejectBtnText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15, color: colors.error },
  approveBtn: {
    flex:            1.6,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    backgroundColor: colors.success,
    borderRadius:    16,
    paddingVertical: 15,
  },
  approveBtnText: { fontFamily: "HankenGrotesk_700Bold", fontSize: 15, color: colors.bg },

  modalOverlay: {
    flex:            1,
    justifyContent:  "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:         24,
    paddingBottom:   36,
    gap:             12,
  },
  modalHandle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.border,
    alignSelf:       "center",
    marginBottom:    4,
  },
  modalTitle: { fontFamily: "HankenGrotesk_700Bold", fontSize: 18, color: colors.text },
  modalSub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 13, color: colors.textVariant, lineHeight: 20 },
  noteInput: {
    backgroundColor:   colors.card,
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontFamily:        "HankenGrotesk_400Regular",
    fontSize:          14,
    color:             colors.text,
    minHeight:         110,
    marginTop:         4,
  },
  modalActions:    { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 14,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    14,
  },
  modalCancelText: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 15, color: colors.textVariant },
  modalRejectBtn: {
    flex:              1.5,
    alignItems:        "center",
    justifyContent:    "center",
    paddingVertical:   14,
    backgroundColor:   "rgba(255,180,171,0.15)",
    borderWidth:       1,
    borderColor:       "rgba(255,180,171,0.3)",
    borderRadius:      14,
  },
  modalRejectText: { fontFamily: "HankenGrotesk_700Bold", fontSize: 15, color: colors.error },
});
