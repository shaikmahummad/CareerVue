import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Line } from "react-native-svg";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_W   = width - 32 - 32; // screen - horizontal padding - card padding
const CARD_W    = (width - 16 * 2 - 16) / 2;

interface DashboardStats {
  total_users:       number;
  total_students:    number;
  total_tutors:      number;
  total_courses:     number;
  total_revenue:     number;
  total_enrollments: number;
  pending_approvals?: number;
}

const PENDING_COURSES = [
  { id: "1", title: "Advanced UI Systems",      tutor: "Marcus Thorne",  color: ["rgba(108,99,255,0.4)", "rgba(27,0,145,0.6)"] as const },
  { id: "2", title: "Ethical Hacking 101",      tutor: "Sarah Chen",     color: ["rgba(0,210,253,0.3)", "rgba(0,78,95,0.6)"]  as const },
  { id: "3", title: "React Native Architecture", tutor: "Alex Rivera",   color: ["rgba(255,183,133,0.3)", "rgba(80,37,0,0.6)"] as const },
];

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    apiGet<DashboardStats>("/api/v1/admin/dashboard")
      .then(setStats)
      .catch(() => {});
  }, []);

  const totalUsers    = stats?.total_users       ?? 12400;
  const totalStudents = stats?.total_students    ?? 8200;
  const totalTutors   = stats?.total_tutors      ?? 412;
  const totalCourses  = stats?.total_courses     ?? 1204;
  const totalRevenue  = stats?.total_revenue     ?? 42800;
  const totalEnrolled = stats?.total_enrollments ?? 3100;
  const pendingCount  = stats?.pending_approvals ?? 5;

  const HEADER_H = insets.top + 44;

  const STAT_CELLS: { label: string; value: string; color: string }[] = [
    { label: "Total Users",     value: formatNum(totalUsers),    color: colors.primary   },
    { label: "Students",        value: formatNum(totalStudents), color: colors.secondary },
    { label: "Tutors",          value: formatNum(totalTutors),   color: colors.tertiary  },
    { label: "Active Courses",  value: totalCourses.toLocaleString(), color: colors.primary   },
    { label: "Revenue",         value: `$${formatNum(totalRevenue)}`, color: colors.primary   },
    { label: "Enrolled",        value: formatNum(totalEnrolled), color: colors.secondary },
  ];

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>CareerVue</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="notifications-outline" size={24} color={colors.textVariant} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    HEADER_H + 16,
          paddingBottom: TAB_BAR_HEIGHT + 16,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large title */}
        <Text style={s.pageTitle}>Overview</Text>

        {/* Alert card */}
        <Pressable
          style={s.alertCard}
          onPress={() => router.push("/(admin)/approvals" as any)}
        >
          <Ionicons name="warning-outline" size={24} color={colors.tertiary} />
          <View style={s.alertBody}>
            <Text style={s.alertTitle}>{pendingCount} Courses Awaiting Approval</Text>
            <Text style={s.alertSub}>Requires immediate administrative review</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
        </Pressable>

        {/* Stats grid 2×3 */}
        <View style={s.statsGrid}>
          {STAT_CELLS.map(({ label, value, color }) => (
            <View key={label} style={[s.statCard, { width: CARD_W }]}>
              <Text style={s.statLabel}>{label}</Text>
              <Text style={[s.statValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Signup Activity Chart */}
        <View style={s.chartCard}>
          {/* Chart header */}
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Signup Activity</Text>
            <View style={s.chartLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={s.legendLabel}>STUDENTS</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.secondaryContainer }]} />
                <Text style={s.legendLabel}>TUTORS</Text>
              </View>
            </View>
          </View>

          {/* SVG chart */}
          <View style={s.chartArea}>
            <Svg
              width={CHART_W}
              height={160}
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 75, 150, 225].map((x) => (
                <Line
                  key={x}
                  x1={x} y1="0" x2={x} y2="100"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}
              {/* Students curve */}
              <Path
                d="M0,80 Q50,40 100,60 T200,20 T300,30"
                stroke={colors.primary}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Tutors curve */}
              <Path
                d="M0,90 Q50,85 100,88 T200,75 T300,70"
                stroke={colors.secondaryContainer}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Day labels */}
          <View style={s.chartDays}>
            {["MON", "WED", "FRI", "SUN"].map((d) => (
              <Text key={d} style={s.dayLabel}>{d}</Text>
            ))}
          </View>
        </View>

        {/* Pending Approvals */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Pending Approvals</Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push("/(admin)/approvals" as any)}
            >
              <Text style={s.viewAll}>VIEW ALL</Text>
            </Pressable>
          </View>

          <View style={s.approvalList}>
            {PENDING_COURSES.map((item) => (
              <View key={item.id} style={s.approvalRow}>
                {/* Thumbnail */}
                <View style={s.approvalThumb}>
                  <LinearGradient
                    colors={item.color}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="play-circle-outline" size={22} color="rgba(255,255,255,0.5)" />
                </View>

                <View style={s.approvalInfo}>
                  <Text style={s.approvalTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.approvalTutor}>by {item.tutor}</Text>
                </View>

                <Pressable
                  onPress={() => router.push("/(admin)/approvals" as any)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <LinearGradient
                    colors={["#c4c0ff", "#8781ff"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.reviewBtn}
                  >
                    <Text style={s.reviewBtnText}>Review</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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

  scroll: {
    paddingHorizontal: 16,
    gap:               24,
  },

  // Page title
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         colors.text,
  },

  // Alert card
  alertCard: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             16,
    backgroundColor: "rgba(219,118,31,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(219,118,31,0.3)",
    borderRadius:    20,
    padding:         16,
  },
  alertBody: { flex: 1, gap: 2 },
  alertTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.tertiary,
  },
  alertSub: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
    color:         colors.tertiary,
    opacity:       0.8,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           16,
  },
  statCard: {
    backgroundColor: "#0d0d14",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             4,
  },
  statLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    marginBottom:  4,
  },
  statValue: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
  },

  // Chart
  chartCard: {
    backgroundColor: "#0d0d14",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    gap:             12,
  },
  chartHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  chartTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  chartLegend: {
    flexDirection: "row",
    gap:           12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  legendDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    opacity:       0.6,
    textTransform: "uppercase",
  },
  chartArea: {
    height:   160,
    width:    CHART_W,
    position: "relative",
  },
  chartDays: {
    flexDirection:  "row",
    justifyContent: "space-between",
  },
  dayLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    opacity:       0.5,
    textTransform: "uppercase",
  },

  // Pending approvals
  section:    { gap: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  viewAll: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 1,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  approvalList: { gap: 8 },
  approvalRow: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             16,
    backgroundColor: "#0d0d14",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
  },
  approvalThumb: {
    width:          48,
    height:         48,
    borderRadius:   12,
    backgroundColor: colors.surfaceHighest,
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
  },
  approvalInfo:  { flex: 1, gap: 2 },
  approvalTitle: {
    fontFamily:    "HankenGrotesk_400Regular",
    fontSize:      17,
    lineHeight:    22,
    color:         colors.text,
  },
  approvalTutor: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },
  reviewBtn: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      8,
  },
  reviewBtnText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    letterSpacing: -0.1,
    color:         "#1b0091",
  },
});
