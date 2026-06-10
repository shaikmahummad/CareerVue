import { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking,
  ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { apiGet, apiPut, apiPost } from "../../lib/api";
import { colors } from "../../constants/theme";

const { width, height } = Dimensions.get("window");
const VIDEO_H = Math.round(width * 9 / 16); // 16:9 ratio

interface Module {
  id:            string;
  title:         string;
  description:   string | null;
  video_url:     string | null;
  pdf_url:       string | null;
  duration_mins: number | null;
  is_preview:    boolean;
  order_index:   number;
}

interface Course {
  id:      string;
  title:   string;
  modules: Module[];
}

interface Enrollment {
  id:           string;
  course_id:    string;
  progress_pct: number;
  completed_at: string | null;
  module_progress?: { module_id: string; completed_at: string }[];
}

type EmbedResult =
  | { kind: "iframe"; uri: string }
  | { kind: "video"; uri: string };

function toEmbed(url: string): EmbedResult | null {
  if (!url) return null;
  // YouTube (including ?si= share links and /embed/ URLs)
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return { kind: "iframe", uri: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { kind: "iframe", uri: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  // Direct video file — extension match handles ?token=... query params
  if (/\.(mp4|webm|ogg|mov|m3u8)([\?#]|$)/i.test(url)) return { kind: "video", uri: url };
  // Supabase storage URLs (uploaded via module editor)
  if (url.includes("/storage/v1/object/") || url.includes("/object/public/")) return { kind: "video", uri: url };
  return null;
}

export default function CourseLearnScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [course,      setCourse]      = useState<Course | null>(null);
  const [enrollment,  setEnrollment]  = useState<Enrollment | null>(null);
  const [currentMod,  setCurrentMod]  = useState<Module | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [marking,     setMarking]     = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, [courseId]);

  async function load() {
    try {
      const [courseData, enrollments] = await Promise.all([
        apiGet<Course>(`/api/v1/courses/${courseId}`),
        apiGet<Enrollment[]>("/api/v1/enrollments/mine"),
      ]);
      setCourse(courseData);

      const enroll = enrollments.find((e) => e.course_id === courseId);
      if (!enroll) { router.back(); return; }

      // Load full enrollment with module progress
      const fullEnroll = await apiGet<Enrollment>(`/api/v1/enrollments/${enroll.id}`);
      setEnrollment(fullEnroll);

      const done = new Set((fullEnroll.module_progress ?? []).map((mp) => mp.module_id));
      setCompletedIds(done);

      // Start on first incomplete module
      const sorted = [...courseData.modules].sort((a, b) => a.order_index - b.order_index);
      const nextUp  = sorted.find((m) => !done.has(m.id)) ?? sorted[0];
      setCurrentMod(nextUp ?? null);
    } catch {
      Alert.alert("Error", "Could not load course content.");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkComplete() {
    if (!enrollment || !currentMod) return;
    setMarking(true);
    try {
      await apiPut(`/api/v1/enrollments/${enrollment.id}/progress`, {
        module_id: currentMod.id,
      });

      const newDone = new Set(completedIds).add(currentMod.id);
      setCompletedIds(newDone);

      // Update progress percentage
      const total   = course?.modules.length ?? 1;
      const done    = newDone.size;
      const pct     = Math.round((done / total) * 100);
      setEnrollment((e) => e ? { ...e, progress_pct: pct } : e);

      // Check if all done
      if (done >= total) {
        await apiPost(`/api/v1/enrollments/${enrollment.id}/complete`, {});
        Alert.alert(
          "🎉 Course Complete!",
          "Congratulations! You've completed this course. +100 XP earned!",
          [{ text: "Back to Courses", onPress: () => router.back() }]
        );
        return;
      }

      // Auto-advance to next module
      const sorted = [...(course?.modules ?? [])].sort((a, b) => a.order_index - b.order_index);
      const nextIdx = sorted.findIndex((m) => m.id === currentMod.id) + 1;
      if (nextIdx < sorted.length) setCurrentMod(sorted[nextIdx]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to mark complete.");
    } finally {
      setMarking(false);
    }
  }

  function goToModule(mod: Module) {
    setCurrentMod(mod);
    setShowSidebar(false);
  }

  function goNext() {
    if (!course || !currentMod) return;
    const sorted = [...course.modules].sort((a, b) => a.order_index - b.order_index);
    const idx    = sorted.findIndex((m) => m.id === currentMod.id);
    if (idx < sorted.length - 1) setCurrentMod(sorted[idx + 1]);
  }

  function goPrev() {
    if (!course || !currentMod) return;
    const sorted = [...course.modules].sort((a, b) => a.order_index - b.order_index);
    const idx    = sorted.findIndex((m) => m.id === currentMod.id);
    if (idx > 0) setCurrentMod(sorted[idx - 1]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const sorted       = [...(course?.modules ?? [])].sort((a, b) => a.order_index - b.order_index);
  const currentIdx   = sorted.findIndex((m) => m.id === currentMod?.id);
  const totalMods    = sorted.length;
  const completedCt  = completedIds.size;
  const progressPct  = enrollment?.progress_pct ?? 0;
  const isCompleted  = currentMod ? completedIds.has(currentMod.id) : false;
  const embed        = currentMod?.video_url ? toEmbed(currentMod.video_url) : null;

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.topBarTitle} numberOfLines={1}>{course?.title}</Text>
          <View style={s.progressRow}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={s.progressLabel}>{completedCt}/{totalMods}</Text>
          </View>
        </View>
        <Pressable hitSlop={12} onPress={() => setShowSidebar(true)}>
          <Ionicons name="list-outline" size={24} color={colors.textVariant} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video area */}
        <View style={s.videoContainer}>
          {embed?.kind === "iframe" ? (
            <WebView
              source={{ uri: embed.uri }}
              style={s.webView}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              originWhitelist={["*"]}
            />
          ) : embed?.kind === "video" ? (
            <WebView
              source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#000}video{width:100%;height:100%;display:block}</style></head><body><video src="${embed.uri}" controls playsinline style="width:100%;height:100vh"></video></body></html>` }}
              style={s.webView}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              originWhitelist={["*"]}
            />
          ) : currentMod?.video_url ? (
            /* Unrecognised URL - open in browser */
            <Pressable
              style={s.videoFallback}
              onPress={() => Linking.openURL(currentMod.video_url!)}
            >
              <LinearGradient colors={["#1a1560", "#0d0d14"]} style={StyleSheet.absoluteFill} />
              <Ionicons name="play-circle" size={64} color={colors.primary} style={{ opacity: 0.9 }} />
              <Text style={s.videoFallbackText}>Open Video</Text>
              <Text style={s.videoFallbackSub}>Opens in browser / player app</Text>
            </Pressable>
          ) : (
            <View style={s.noVideo}>
              <LinearGradient colors={["#13121b", "#0d0d14"]} style={StyleSheet.absoluteFill} />
              <Ionicons name="document-text-outline" size={48} color={colors.textVariant} style={{ opacity: 0.4 }} />
              <Text style={s.noVideoText}>Reading / Text Module</Text>
            </View>
          )}
        </View>

        {/* Module info */}
        <View style={s.content}>
          {/* Module nav */}
          <View style={s.moduleNav}>
            <Pressable
              hitSlop={8}
              onPress={goPrev}
              disabled={currentIdx <= 0}
              style={{ opacity: currentIdx <= 0 ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-back-circle-outline" size={28} color={colors.primary} />
            </Pressable>
            <Text style={s.moduleCounter}>
              {currentIdx + 1} / {totalMods}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={goNext}
              disabled={currentIdx >= totalMods - 1}
              style={{ opacity: currentIdx >= totalMods - 1 ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-forward-circle-outline" size={28} color={colors.primary} />
            </Pressable>
          </View>

          <Text style={s.moduleTitle}>{currentMod?.title ?? "—"}</Text>

          {/* Meta row */}
          <View style={s.metaRow}>
            {currentMod?.duration_mins != null && (
              <View style={s.metaChip}>
                <Ionicons name="time-outline" size={12} color={colors.textVariant} />
                <Text style={s.metaChipText}>{currentMod.duration_mins} min</Text>
              </View>
            )}
            {currentMod?.is_preview && (
              <View style={[s.metaChip, { backgroundColor: "rgba(0,229,160,0.08)" }]}>
                <Text style={[s.metaChipText, { color: colors.success }]}>Free Preview</Text>
              </View>
            )}
            {isCompleted && (
              <View style={[s.metaChip, { backgroundColor: "rgba(0,229,160,0.08)" }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={[s.metaChipText, { color: colors.success }]}>Completed</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {currentMod?.description ? (
            <Text style={s.description}>{currentMod.description}</Text>
          ) : null}

          {/* PDF resources */}
          {currentMod?.pdf_url ? (
            <Pressable
              style={s.pdfBtn}
              onPress={() => Linking.openURL(currentMod.pdf_url!)}
            >
              <Ionicons name="document-attach-outline" size={18} color={colors.secondary} />
              <Text style={s.pdfBtnText}>Download Resources / PDF</Text>
              <Ionicons name="open-outline" size={14} color={colors.textVariant} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Mark complete CTA */}
      {!isCompleted && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [s.markBtn, { opacity: pressed || marking ? 0.7 : 1 }]}
            onPress={handleMarkComplete}
            disabled={marking}
          >
            {marking ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <>
                <LinearGradient
                  colors={["#c4c0ff", "#8781ff"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="checkmark-circle-outline" size={20} color="#1b0091" />
                <Text style={s.markBtnText}>Mark Complete</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Curriculum sidebar overlay */}
      {showSidebar && (
        <View style={s.sidebarOverlay}>
          <Pressable style={s.sidebarBackdrop} onPress={() => setShowSidebar(false)} />
          <View style={[s.sidebar, { paddingBottom: insets.bottom }]}>
            <View style={s.sidebarHeader}>
              <Text style={s.sidebarTitle}>Curriculum</Text>
              <Pressable hitSlop={12} onPress={() => setShowSidebar(false)}>
                <Ionicons name="close" size={22} color={colors.textVariant} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {sorted.map((mod, idx) => {
                const done    = completedIds.has(mod.id);
                const current = mod.id === currentMod?.id;
                return (
                  <Pressable
                    key={mod.id}
                    style={[s.sidebarItem, current && s.sidebarItemActive]}
                    onPress={() => goToModule(mod)}
                  >
                    <View style={[
                      s.sidebarIndex,
                      done    && { backgroundColor: colors.success },
                      current && { backgroundColor: colors.primary },
                    ]}>
                      {done ? (
                        <Ionicons name="checkmark" size={12} color={colors.bg} />
                      ) : (
                        <Text style={s.sidebarIndexText}>{idx + 1}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sidebarItemTitle, current && { color: colors.primary }]} numberOfLines={2}>
                        {mod.title}
                      </Text>
                      {mod.duration_mins != null && (
                        <Text style={s.sidebarItemMeta}>{mod.duration_mins} min</Text>
                      )}
                    </View>
                    {mod.video_url && (
                      <Ionicons name="videocam-outline" size={14} color={colors.textVariant} style={{ opacity: 0.5 }} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection:     "row",
    alignItems:        "flex-end",
    gap:               12,
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(19,18,27,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  topBarTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    color:         colors.text,
    letterSpacing: -0.1,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  progressTrack: {
    flex:            1,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.surfaceContainer,
    overflow:        "hidden",
  },
  progressFill: {
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    color:         colors.textVariant,
    letterSpacing: 0.3,
  },

  videoContainer: {
    width:           width,
    height:          VIDEO_H,
    backgroundColor: "#000",
  },
  webView: { flex: 1 },
  videoFallback: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    overflow:       "hidden",
  },
  videoFallbackText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      18,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  videoFallbackSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   13,
    color:      colors.textVariant,
  },
  noVideo: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    overflow:       "hidden",
  },
  noVideoText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.textVariant,
    opacity:    0.6,
  },

  content: {
    padding: 20,
    gap:     12,
  },

  moduleNav: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  moduleCounter: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      13,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },
  moduleTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.text,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             4,
    backgroundColor: colors.surfaceContainer,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  metaChipText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
  },
  description: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   15,
    lineHeight: 23,
    color:      colors.textSecondary ?? colors.textVariant,
  },
  pdfBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             10,
    backgroundColor: "rgba(162,231,255,0.07)",
    borderWidth:     1,
    borderColor:     "rgba(162,231,255,0.15)",
    borderRadius:    14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginTop:       4,
  },
  pdfBtnText: {
    flex:       1,
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   14,
    color:      colors.secondary,
  },

  bottomBar: {
    position:          "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop:        12,
    backgroundColor:   "rgba(19,18,27,0.95)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.05)",
  },
  markBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    borderRadius:    16,
    paddingVertical: 16,
    overflow:        "hidden",
  },
  markBtnText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      16,
    color:         "#1b0091",
    letterSpacing: -0.2,
  },

  // Sidebar overlay
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection:  "row",
    zIndex:         100,
  },
  sidebarBackdrop: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sidebar: {
    width:           Math.min(width * 0.82, 340),
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  sidebarHeader: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      18,
    color:         colors.text,
    letterSpacing: -0.2,
  },
  sidebarItem: {
    flexDirection:     "row",
    alignItems:        "flex-start",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarItemActive: { backgroundColor: "rgba(196,192,255,0.05)" },
  sidebarIndex: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: colors.surfaceContainer,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
    marginTop:       1,
  },
  sidebarIndexText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   12,
    color:      colors.textVariant,
  },
  sidebarItemTitle: {
    fontFamily:    "HankenGrotesk_500Medium",
    fontSize:      14,
    lineHeight:    20,
    color:         colors.text,
    marginBottom:  2,
  },
  sidebarItemMeta: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize:   11,
    color:      colors.textVariant,
    opacity:    0.6,
  },
});
