import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../../lib/api";
import { colors } from "../../../constants/theme";

const { width } = Dimensions.get("window");
const BOTTOM_BAR_H = 100;

interface Module {
  id:            string;
  title:         string;
  description:   string | null;
  duration_mins: number | null;
  is_preview:    boolean;
  order_index:   number;
}

interface Course {
  id:             string;
  title:          string;
  description:    string | null;
  category:       string | null;
  level:          string | null;
  language:       string | null;
  duration_hours: number | null;
  is_free:        boolean;
  price:          number;
  enrolled_count: number;
  avg_rating:     number;
  tutor_name:     string | null;
  tags:           string[];
  modules:        Module[];
  is_enrolled:    boolean;
  status:         string;
}

type ActiveTab = "curriculum" | "overview" | "reviews";

function heroGradient(cat: string | null): readonly [string, string] {
  const map: Record<string, [string, string]> = {
    "Programming":   ["#1a1560", "#0d0d14"],
    "Data Science":  ["#002a35", "#0d0d14"],
    "Design":        ["#2e1a00", "#0d0d14"],
    "DevOps":        ["#002820", "#0d0d14"],
    "Cybersecurity": ["#2a0008", "#0d0d14"],
    "Business":      ["#1a0855", "#0d0d14"],
  };
  return map[cat ?? ""] ?? ["#1a1560", "#0d0d14"];
}

function heroIcon(cat: string | null): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    "Programming":   "code-slash-outline",
    "Data Science":  "bar-chart-outline",
    "Design":        "color-palette-outline",
    "DevOps":        "cloud-outline",
    "Cybersecurity": "shield-outline",
    "Business":      "briefcase-outline",
  };
  return map[cat ?? ""] ?? "book-outline";
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function CourseDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  const [course,    setCourse]    = useState<Course | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [tab,       setTab]       = useState<ActiveTab>("curriculum");
  const [error,     setError]     = useState("");

  useEffect(() => {
    apiGet<Course>(`/api/v1/courses/${id}`)
      .then(setCourse)
      .catch((e: any) => setError(e?.message ?? "Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    try {
      await apiPost("/api/v1/enrollments/", { course_id: course.id });
      setCourse(c => c ? { ...c, is_enrolled: true } : c);
      Alert.alert("Enrolled!", "You're now enrolled. Let's get started!");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!course || error) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.errorText}>{error || "Course not found"}</Text>
        <Pressable style={s.backLink} onPress={() => router.back()}>
          <Text style={s.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const totalMins = course.modules.reduce((a, m) => a + (m.duration_mins ?? 0), 0);
  const hours     = course.duration_hours ?? (totalMins > 0 ? totalMins / 60 : null);
  const section1  = course.modules.slice(0, 3);
  const section2  = course.modules.slice(3);

  const HEADER_H = insets.top + 44;
  const bottomPad = insets.bottom + BOTTOM_BAR_H + 8;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed nav */}
      <View style={[s.nav, { paddingTop: insets.top, height: HEADER_H }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={s.backBtnText}>Back</Text>
        </Pressable>
        <Text style={s.navTitle}>CareerVue</Text>
        <Pressable hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.textVariant} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: HEADER_H, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <LinearGradient
            colors={heroGradient(course.category)}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name={heroIcon(course.category)}
            size={120}
            color="rgba(255,255,255,0.06)"
            style={s.heroWatermark}
          />
          {/* Dark overlay */}
          <View style={s.heroOverlay} />
          {/* Play button */}
          <Pressable style={({ pressed }) => [s.playWrap, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
            <LinearGradient
              colors={["#6c63ff", "#c4c0ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.playBtn}
            >
              <Ionicons name="play" size={32} color="#ffffff" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Course info */}
        <View style={s.infoBlock}>
          {/* Title */}
          <Text style={s.courseTitle}>{course.title}</Text>

          {/* Meta row */}
          <View style={s.metaRow}>
            {course.avg_rating > 0 && (
              <View style={s.metaItem}>
                <Ionicons name="star" size={14} color={colors.tertiary} />
                <Text style={s.metaText}>
                  {course.avg_rating.toFixed(1)}
                  {course.enrolled_count > 0 && ` (${fmtCount(course.enrolled_count)})`}
                </Text>
              </View>
            )}
            {course.enrolled_count > 0 && (
              <View style={s.metaItem}>
                <Ionicons name="people-outline" size={14} color={colors.textVariant} />
                <Text style={s.metaText}>{fmtCount(course.enrolled_count)} Students</Text>
              </View>
            )}
            {hours && hours > 0 && (
              <View style={s.metaItem}>
                <Ionicons name="timer-outline" size={14} color={colors.secondary} />
                <Text style={[s.metaText, { color: colors.secondary }]}>
                  {hours % 1 === 0 ? hours : hours.toFixed(1)} Hours
                </Text>
              </View>
            )}
          </View>

          {/* Tutor row */}
          {course.tutor_name && (
            <View style={s.tutorCard}>
              <View style={s.avatarRing}>
                <Text style={s.avatarText}>
                  {course.tutor_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={s.tutorInfo}>
                <Text style={s.instructorLabel}>INSTRUCTOR</Text>
                <Text style={s.tutorName}>{course.tutor_name}</Text>
              </View>
              <Pressable style={s.profileBtn}>
                <Text style={s.profileBtnText}>Profile</Text>
              </Pressable>
            </View>
          )}

          {/* Tabs */}
          <View style={s.tabBar}>
            {(["curriculum", "overview", "reviews"] as ActiveTab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={s.tabItem}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
                {tab === t && <View style={s.tabUnderline} />}
              </Pressable>
            ))}
          </View>

          {/* Tab: Curriculum */}
          {tab === "curriculum" && (
            <View style={s.tabContent}>

              {/* Section 1 */}
              <View style={s.sectionBlock}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>
                    Section 1:{" "}
                    {course.category ? `${course.category} Basics` : "The Basics"}
                  </Text>
                  <Text style={s.sectionMeta}>
                    {section1.length} Lessons
                    {totalMins > 0 && ` • ${fmtDuration(section1.reduce((a, m) => a + (m.duration_mins ?? 0), 0))}`}
                  </Text>
                </View>
                {section1.map((mod, i) => (
                  <LessonRow
                    key={mod.id}
                    mod={mod}
                    index={i}
                    enrolled={course.is_enrolled}
                  />
                ))}
              </View>

              {/* Section 2 */}
              {section2.length > 0 && (
                <View style={[s.sectionBlock, { opacity: course.is_enrolled ? 1 : 0.8 }]}>
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>
                      Section 2: Advanced Topics
                    </Text>
                    <Text style={s.sectionMeta}>
                      {section2.length} Lessons
                      {totalMins > 0 && ` • ${fmtDuration(section2.reduce((a, m) => a + (m.duration_mins ?? 0), 0))}`}
                    </Text>
                  </View>
                  {course.is_enrolled ? (
                    section2.map((mod, i) => (
                      <LessonRow
                        key={mod.id}
                        mod={mod}
                        index={section1.length + i}
                        enrolled
                      />
                    ))
                  ) : (
                    <View style={s.lockedSection}>
                      <Ionicons name="lock-closed-outline" size={16} color={colors.outlineVariant} />
                      <Text style={s.lockedSectionText}>
                        Enroll to unlock {section2.length} more lessons
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Edge case: all modules in section 1 */}
              {course.modules.length === 0 && (
                <View style={s.emptyModules}>
                  <Text style={s.emptyModulesText}>No curriculum available yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* Tab: Overview */}
          {tab === "overview" && (
            <View style={s.tabContent}>
              {course.description ? (
                <View style={s.overviewBlock}>
                  <Text style={s.overviewTitle}>About this course</Text>
                  <Text style={s.overviewBody}>{course.description}</Text>
                </View>
              ) : (
                <Text style={s.emptyModulesText}>No description available.</Text>
              )}
              {course.level && (
                <View style={s.overviewMeta}>
                  <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                  <Text style={s.overviewMetaText}>
                    Level: {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </Text>
                </View>
              )}
              {course.language && (
                <View style={s.overviewMeta}>
                  <Ionicons name="language-outline" size={16} color={colors.primary} />
                  <Text style={s.overviewMetaText}>Language: {course.language}</Text>
                </View>
              )}
              {course.tags.length > 0 && (
                <View style={s.tagsWrap}>
                  {course.tags.map((tag) => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tab: Reviews */}
          {tab === "reviews" && (
            <View style={[s.tabContent, s.reviewsEmpty]}>
              <Ionicons name="star-outline" size={36} color={colors.outlineVariant} />
              <Text style={s.emptyModulesText}>Reviews coming soon</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {course.is_enrolled ? (
          <>
            <View style={s.enrolledPriceCol}>
              <Text style={s.lifetimeLabel}>ENROLLED</Text>
              <View style={s.priceRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[s.priceMain, { color: colors.success }]}>In Progress</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [s.enrollBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => router.push({ pathname: "/(student)/course-learn" as never, params: { courseId: course.id } })}
            >
              <LinearGradient
                colors={["#6c63ff", "#c4c0ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.enrollBtnGrad}
              >
                <Text style={s.enrollBtnText}>Continue Learning</Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.enrolledPriceCol}>
              <Text style={s.lifetimeLabel}>LIFETIME ACCESS</Text>
              <View style={s.priceRow}>
                <Text style={s.priceMain}>
                  {course.is_free ? "Free" : `$${course.price}`}
                </Text>
                {!course.is_free && (
                  <Text style={s.priceStrike}>
                    ${(course.price * 2.6).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [s.enrollBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={handleEnroll}
              disabled={enrolling}
            >
              <LinearGradient
                colors={["#6c63ff", "#c4c0ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.enrollBtnGrad}
              >
                {enrolling
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Text style={s.enrollBtnText}>
                      {course.is_free ? "Enroll Free" : "Enroll Now"}
                    </Text>
                }
              </LinearGradient>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function LessonRow({
  mod, index, enrolled,
}: { mod: Module; index: number; enrolled: boolean }) {
  const accessible = enrolled || mod.is_preview;
  return (
    <Pressable
      style={[s.lessonRow, !accessible && { opacity: 0.6 }]}
      disabled={!accessible}
    >
      <View style={[
        s.lessonIconBox,
        accessible ? s.lessonIconBoxFree : s.lessonIconBoxLocked,
      ]}>
        <Ionicons
          name={accessible ? "play-circle-outline" : "lock-closed-outline"}
          size={16}
          color={accessible ? colors.primaryContainer : colors.outline}
        />
      </View>
      <View style={s.lessonInfo}>
        <Text style={s.lessonTitle} numberOfLines={1}>
          {index + 1}. {mod.title}
        </Text>
        <Text style={s.lessonMeta}>
          {mod.duration_mins ? fmtDuration(mod.duration_mins) : ""}
          {mod.is_preview ? (mod.duration_mins ? " • Free Preview" : "Free Preview") : ""}
        </Text>
      </View>
      {mod.is_preview && (
        <Ionicons name="eye-outline" size={16} color={colors.primary} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  loadingScreen: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             12,
  },
  errorText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    color:      colors.textVariant,
    textAlign:  "center",
  },
  backLink:     { marginTop: 8 },
  backLinkText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   17,
    color:      colors.primary,
  },

  // Fixed nav
  nav: {
    position:          "absolute",
    top: 0, left: 0, right: 0,
    zIndex:            50,
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "rgba(19,18,27,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           2,
  },
  backBtnText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.primary,
  },
  navTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },

  // Hero
  hero: {
    width:          "100%",
    height:         220,
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
  },
  heroWatermark: {
    position: "absolute",
    right:    -24,
    bottom:   -24,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  playWrap: {},
  playBtn: {
    width:          64,
    height:         64,
    borderRadius:   32,
    alignItems:     "center",
    justifyContent: "center",
    // Glow via elevation on Android
    elevation:      12,
    shadowColor:    "#6c63ff",
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.6,
    shadowRadius:   20,
  },

  // Info block
  infoBlock: {
    paddingHorizontal: 16,
    paddingTop:        16,
    gap:               16,
  },
  courseTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },

  // Meta row
  metaRow: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  metaText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },

  // Tutor card
  tutorCard: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    12,
    padding:         8,
  },
  avatarRing: {
    width:           40,
    height:          40,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    backgroundColor: colors.surfaceContainer,
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      16,
    color:         colors.primary,
    letterSpacing: -0.3,
  },
  tutorInfo:       { flex: 1, gap: 2 },
  instructorLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.8,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  tutorName: {
    fontFamily:    "HankenGrotesk_400Regular",
    fontSize:      17,
    lineHeight:    22,
    color:         colors.text,
  },
  profileBtn: {
    paddingHorizontal: 16,
    paddingVertical:   6,
    borderRadius:      999,
    borderWidth:       1,
    borderColor:       "rgba(196,192,255,0.3)",
  },
  profileBtnText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.primary,
  },

  // Tabs
  tabBar: {
    flexDirection:     "row",
    gap:               24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tabItem: {
    paddingBottom: 8,
    position:      "relative",
  },
  tabText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.textVariant,
  },
  tabTextActive: {
    color:      colors.primary,
    fontFamily: "HankenGrotesk_600SemiBold",
  },
  tabUnderline: {
    position:        "absolute",
    bottom:          -1,
    left:            0,
    right:           0,
    height:          2,
    backgroundColor: colors.primary,
    borderRadius:    1,
  },

  // Tab content
  tabContent: { gap: 24 },

  // Curriculum section
  sectionBlock: { gap: 8 },
  sectionHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  sectionTitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.text,
  },
  sectionMeta: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },

  // Lesson rows
  lessonRow: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             12,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    12,
    padding:         12,
  },
  lessonIconBox: {
    width:          32,
    height:         32,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
  },
  lessonIconBoxFree: {
    backgroundColor: "rgba(135,129,255,0.2)",
  },
  lessonIconBoxLocked: {
    backgroundColor: colors.surfaceHighest,
  },
  lessonInfo:  { flex: 1, gap: 2 },
  lessonTitle: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   15,
    lineHeight: 20,
    color:      colors.text,
  },
  lessonMeta: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },

  // Locked section card
  lockedSection: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderStyle:     "dashed",
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    12,
    padding:         16,
  },
  lockedSectionText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },

  emptyModules: {
    alignItems:     "center",
    paddingVertical: 24,
  },
  emptyModulesText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    color:      colors.outline,
    textAlign:  "center",
  },

  // Overview tab
  overviewBlock: { gap: 8 },
  overviewTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  overviewBody: {
    fontFamily:  "HankenGrotesk_400Regular",
    fontSize:    17,
    lineHeight:  26,
    color:       colors.textVariant,
  },
  overviewMeta: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  overviewMetaText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.text,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  tag: {
    backgroundColor:   colors.surfaceContainer,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.08)",
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  tagText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },

  // Reviews placeholder
  reviewsEmpty: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 32,
    gap:             12,
  },

  // Bottom bar
  bottomBar: {
    position:          "absolute",
    bottom:            0, left: 0, right: 0,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingTop:        12,
    minHeight:         BOTTOM_BAR_H,
    backgroundColor:   "rgba(8,8,16,0.92)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.05)",
  },
  enrolledPriceCol: { gap: 2 },
  lifetimeLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems:    "baseline",
    gap:           6,
  },
  priceMain: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  priceStrike: {
    fontFamily:         "HankenGrotesk_400Regular",
    fontSize:           15,
    lineHeight:         22,
    color:              colors.outline,
    textDecorationLine: "line-through",
  },
  enrollBtn:     {},
  enrollBtnGrad: {
    height:         54,
    paddingHorizontal: 32,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    elevation:      8,
    shadowColor:    "#6c63ff",
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.4,
    shadowRadius:   12,
  },
  enrollBtnText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         "#ffffff",
  },
});
