import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

const { width } = Dimensions.get("window");
const BTN_W = width - 32;

interface TutorAnalytics {
  total_students: number;
  total_earnings: number;
  avg_rating: number;
  courses_count: number;
}

interface TutorCourse {
  id: string;
  title: string;
  student_count?: number;
  status?: string;
}

interface TutorProfile {
  full_name: string;
  is_verified: boolean;
}


export default function TutorDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [analytics, setAnalytics] = useState<TutorAnalytics | null>(null);
  const [courses,   setCourses]   = useState<TutorCourse[]>([]);
  const [profile,   setProfile]   = useState<TutorProfile | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata;
      if (meta?.full_name) {
        setProfile({ full_name: meta.full_name, is_verified: meta.is_verified ?? false });
      }
      const [a, c] = await Promise.allSettled([
        apiGet<TutorAnalytics>("/api/v1/tutors/analytics"),
        apiGet<TutorCourse[]>("/api/v1/tutors/courses"),
      ]);
      if (a.status === "fulfilled") setAnalytics(a.value);
      if (c.status === "fulfilled") setCourses(c.value);
    }
    load();
  }, []);

  const students  = analytics?.total_students ?? 0;
  const earnings  = analytics?.total_earnings ?? 0;
  const rating    = analytics?.avg_rating     ?? 0;
  const firstName = profile?.full_name?.split(" ")[0] ?? "Tutor";
  const courseList = courses;

  const HEADER_H = insets.top + 44;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}>
        <Text style={s.headerTitle}>CareerVue</Text>
        <View style={s.avatarRing}>
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitial}>{firstName[0]?.toUpperCase() ?? "T"}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    HEADER_H + 16,
          paddingBottom: TAB_BAR_HEIGHT + 16,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large title */}
        <Text style={s.pageTitle}>Dashboard</Text>

        {/* Earnings Card */}
        <LinearGradient
          colors={["#4f44e2", "#c4c0ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.earningsCard}
        >
          {/* Payments watermark */}
          <View style={s.watermark} pointerEvents="none">
            <Ionicons name="card-outline" size={120} color="#ffffff" />
          </View>

          <View style={s.earningsContent}>
            <Text style={s.earningsLabel}>TOTAL EARNINGS</Text>
            <Text style={s.earningsAmount}>₹{earnings.toLocaleString()}</Text>
            <View style={s.earningsTrend}>
              <View style={s.trendIconWrap}>
                <Ionicons name="trending-up" size={14} color="#ffffff" />
              </View>
              <Text style={s.trendText}>+₹3,200 this month</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { flex: 1 }]}>
            <View style={s.statHeader}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
              <Text style={s.statHeaderLabel}>STUDENTS</Text>
            </View>
            <Text style={s.statBigValue}>{students.toLocaleString()}</Text>
          </View>
          <View style={[s.statCard, { flex: 1 }]}>
            <View style={s.statHeader}>
              <Ionicons name="star" size={22} color={colors.tertiary} />
              <Text style={s.statHeaderLabel}>RATING</Text>
            </View>
            <Text style={s.statBigValue}>{rating.toFixed(1)}/5.0</Text>
          </View>
        </View>

        {/* My Courses */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>My Courses</Text>
            <Pressable
              onPress={() => router.push("/(tutor)/courses" as any)}
              hitSlop={8}
            >
              <Text style={s.viewAll}>VIEW ALL</Text>
            </Pressable>
          </View>

          <View style={s.courseList}>
            {courseList.slice(0, 4).map((course, i) => (
              <Pressable
                key={course.id}
                style={({ pressed }) => [s.courseRow, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/(tutor)/courses" as any)}
              >
                {/* Thumbnail */}
                <View style={s.courseThumbnail}>
                  <LinearGradient
                    colors={
                      i % 2 === 0
                        ? ["rgba(108,99,255,0.4)", "rgba(27,0,145,0.6)"]
                        : ["rgba(0,210,253,0.3)", "rgba(0,78,95,0.6)"]
                    }
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons
                    name={i % 2 === 0 ? "logo-react" : "code-slash-outline"}
                    size={28}
                    color={i % 2 === 0 ? colors.primary : colors.secondary}
                  />
                </View>

                <View style={s.courseInfo}>
                  <Text style={s.courseTitle}>{course.title}</Text>
                  <Text style={s.courseStudents}>
                    {course.student_count ?? 0} {(course.student_count ?? 0) === 1 ? "Student" : "Students"}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.outline} />
              </Pressable>
            ))}
          </View>
        </View>


        {/* Create New Course CTA */}
        <Pressable
          onPress={() => router.push("/(tutor)/create" as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={["#4f44e2", "#c4c0ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.createBtn, { width: BTN_W }]}
          >
            <Ionicons name="add-circle-outline" size={22} color="#ffffff" />
            <Text style={s.createBtnText}>Create New Course</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    position:          "absolute",
    top:               0,
    left:              0,
    right:             0,
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
  headerTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
  },
  avatarRing: {
    width:        32,
    height:       32,
    borderRadius: 16,
    borderWidth:  1,
    borderColor:  "rgba(196,192,255,0.2)",
    overflow:     "hidden",
  },
  avatarFallback: {
    flex:            1,
    backgroundColor: colors.surfaceContainer,
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarInitial: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize:   13,
    color:      colors.primary,
  },

  scroll: {
    paddingHorizontal: 16,
    gap:               24,
  },

  // Large title
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         colors.text,
  },

  // Earnings Card
  earningsCard: {
    borderRadius: 20,
    padding:      16,
    overflow:     "hidden",
  },
  watermark: {
    position:  "absolute",
    right:     -16,
    top:       -16,
    opacity:   0.2,
    transform: [{ rotate: "12deg" }],
  },
  earningsContent: {
    zIndex: 1,
    gap:    4,
  },
  earningsLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },
  earningsAmount: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         "#ffffff",
    marginTop:     4,
  },
  earningsTrend: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginTop:     8,
  },
  trendIconWrap: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  trendText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         "#ffffff",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap:           16,
  },
  statCard: {
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             4,
  },
  statHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    marginBottom:  4,
  },
  statHeaderLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  statBigValue: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.text,
  },

  // Section
  section:    { gap: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.text,
  },
  viewAll: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 1,
    color:         colors.primary,
    textTransform: "uppercase",
  },

  // Course list
  courseList: { gap: 8 },
  courseRow: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             16,
    backgroundColor: "rgba(13,13,20,0.8)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         8,
  },
  courseThumbnail: {
    width:          64,
    height:         64,
    borderRadius:   12,
    backgroundColor: colors.surfaceHigh,
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
  },
  courseInfo:    { flex: 1, gap: 4 },
  courseTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  courseStudents: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },

  // Activity
  activityList: { gap: 16 },
  activityItem: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           16,
  },
  dotRing: {
    width:          16,
    height:         16,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
    marginTop:      3,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  activityBody: { flex: 1, gap: 2 },
  activityText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.text,
  },
  activityTime: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.5,
    color:         colors.textVariant,
  },

  // Create button
  createBtn: {
    height:         56,
    borderRadius:   999,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  createBtnText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         "#ffffff",
  },
});
