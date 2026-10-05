import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import { apiGet } from "../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CHART_W   = width - 32 - 32;

interface AnalyticsData {
  revenue_by_month:       { month: string; revenue: number }[];
  enrollments_by_category: { category: string; count: number }[];
  top_courses: {
    course_id:      string;
    title:          string;
    enrolled_count: number;
    total_revenue:  number;
    avg_rating:     number;
  }[];
}

interface DashboardStats {
  total_users:       number;
  total_students:    number;
  total_tutors:      number;
  total_courses:     number;
  total_revenue:     number;
  total_enrollments: number;
}

export default function AdminAnalytics() {
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  function loadAnalytics() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      apiGet<AnalyticsData>("/api/v1/admin/analytics"),
      apiGet<DashboardStats>("/api/v1/admin/dashboard"),
    ]).then(([a, s]) => {
      setAnalytics(a);
      setStats(s);
    }).catch((error) => {
      setLoadError(error instanceof Error ? error.message : "Failed to load analytics.");
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
        <Text style={s.emptyTitle}>Analytics unavailable</Text>
        <Text style={s.emptySub}>{loadError}</Text>
        <Pressable style={s.retryButton} onPress={loadAnalytics}>
          <Text style={s.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const months  = analytics?.revenue_by_month ?? [];
  const cats    = analytics?.enrollments_by_category ?? [];
  const courses = analytics?.top_courses ?? [];
  const maxRev  = months.length ? Math.max(...months.map((m) => m.revenue), 1) : 1;
  const maxCat  = cats.length   ? Math.max(...cats.map((c) => c.count), 1)    : 1;

  const totalRevenue = stats?.total_revenue ?? 0;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop:    insets.top + 16,
          paddingBottom: TAB_BAR_HEIGHT + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Analytics</Text>

        {/* ── Platform Stats ────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard label="Users"       value={fmt(stats?.total_users ?? 0)}       color={colors.primary}   />
          <StatCard label="Students"    value={fmt(stats?.total_students ?? 0)}    color={colors.secondary} />
          <StatCard label="Tutors"      value={fmt(stats?.total_tutors ?? 0)}      color={colors.tertiary}   />
          <StatCard label="Enrollments" value={fmt(stats?.total_enrollments ?? 0)} color={colors.success}   />
        </View>

        {/* Revenue highlight */}
        <View style={s.revenueCard}>
          <View>
            <Text style={s.revenueLabel}>TOTAL REVENUE</Text>
            <Text style={s.revenueValue}>₹{totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={s.revenueIcon}>
            <Ionicons name="trending-up" size={28} color={colors.primary} />
          </View>
        </View>

        {/* ── Monthly Revenue Chart ─────────────────────────────────── */}
        {months.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Monthly Revenue</Text>
            <View style={s.card}>
              <Svg width={CHART_W} height={120}>
                <G>
                  {months.slice(-8).map((m, i, arr) => {
                    const barW = Math.floor((CHART_W - 8) / arr.length) - 4;
                    const barH = Math.max(4, Math.round((m.revenue / maxRev) * 96));
                    const x    = i * (barW + 4);
                    const y    = 100 - barH;
                    return (
                      <G key={m.month}>
                        <Rect x={x} y={y} width={barW} height={barH} rx={4}
                          fill={colors.primary} fillOpacity={0.7} />
                        <SvgText x={x + barW / 2} y={118} textAnchor="middle"
                          fontSize={8} fill={colors.textVariant} opacity={0.5}>
                          {m.month.slice(0, 3)}
                        </SvgText>
                      </G>
                    );
                  })}
                </G>
              </Svg>
            </View>
          </>
        )}

        {/* ── Enrollments by Category ───────────────────────────────── */}
        {cats.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Enrollments by Category</Text>
            <View style={s.card}>
              {cats.slice(0, 6).map((cat, i) => (
                <View key={cat.category} style={[s.catRow, i > 0 && s.catRowBorder]}>
                  <Text style={s.catName} numberOfLines={1}>{cat.category}</Text>
                  <View style={s.catBarTrack}>
                    <View style={[s.catBarFill, { width: `${Math.round((cat.count / maxCat) * 100)}%` }]} />
                  </View>
                  <Text style={s.catCount}>{cat.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Top Courses ───────────────────────────────────────────── */}
        {courses.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Top Performing Courses</Text>
            <View style={s.tableCard}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 3 }]}>Course</Text>
                <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Enrolled</Text>
                <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Revenue</Text>
                <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Rating</Text>
              </View>
              {courses.slice(0, 8).map((c, i) => (
                <View key={c.course_id} style={[s.tableRow, i > 0 && s.tableRowBorder]}>
                  <View style={{ flex: 3 }}>
                    <Text style={s.tableTitle} numberOfLines={2}>{c.title}</Text>
                  </View>
                  <Text style={[s.tableCell, { flex: 1 }]}>{c.enrolled_count}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>₹{fmt(c.total_revenue)}</Text>
                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
                    <Ionicons name="star" size={10} color={colors.tertiary} />
                    <Text style={s.tableCell}>{c.avg_rating.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {!analytics && (
          <View style={s.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textVariant} style={{ opacity: 0.3 }} />
            <Text style={s.emptyTitle}>No analytics data</Text>
            <Text style={s.emptySub}>Data will appear once users enroll in courses</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[ss.statCard, { borderTopColor: color }]}>
      <Text style={ss.statValue}>{value}</Text>
      <Text style={ss.statLabel}>{label}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  statCard: {
    flex:            1,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderTopWidth:  2,
    borderRadius:    16,
    padding:         12,
    gap:             2,
  },
  statValue: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      18,
    color:         colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      9,
    letterSpacing: 0.4,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: 16, gap: 12 },

  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      28,
    lineHeight:    34,
    letterSpacing: -0.4,
    color:         colors.text,
    marginBottom:  4,
  },
  statsRow: { flexDirection: "row", gap: 8 },

  revenueCard: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    backgroundColor: "rgba(196,192,255,0.07)",
    borderWidth:     1,
    borderColor:     "rgba(196,192,255,0.15)",
    borderRadius:    20,
    padding:         20,
  },
  revenueLabel: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  revenueValue: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      32,
    lineHeight:    38,
    letterSpacing: -0.5,
    color:         colors.text,
    marginTop:     2,
  },
  revenueIcon: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: "rgba(196,192,255,0.1)",
    alignItems:      "center",
    justifyContent:  "center",
  },

  sectionTitle: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.5,
    color:         colors.primary,
    textTransform: "uppercase",
    marginTop:     8,
    marginLeft:    4,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    padding:         16,
  },

  catRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  catRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  catName:      { width: 88, fontFamily: "HankenGrotesk_500Medium", fontSize: 12, color: colors.text },
  catBarTrack:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceContainer, overflow: "hidden" },
  catBarFill:   { height: 6, borderRadius: 3, backgroundColor: colors.primary, opacity: 0.8 },
  catCount:     { width: 32, fontFamily: "JetBrainsMono_500Medium", fontSize: 11, color: colors.textVariant, textAlign: "right" },

  tableCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    20,
    overflow:        "hidden",
  },
  tableHeader: {
    flexDirection:     "row",
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:   colors.card,
  },
  tableHeaderCell: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      9,
    letterSpacing: 0.4,
    color:         colors.textVariant,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 14,
    paddingVertical:   12,
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  tableTitle: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   12,
    lineHeight: 17,
    color:      colors.text,
  },
  tableCell: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    color:         colors.textVariant,
    textAlign:     "right",
  },

  empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyTitle: { fontFamily: "HankenGrotesk_600SemiBold", fontSize: 16, color: colors.text },
  emptySub:   { fontFamily: "HankenGrotesk_400Regular", fontSize: 13, color: colors.textVariant, textAlign: "center" },
  retryButton: { marginTop: 16, borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { fontFamily: "HankenGrotesk_600SemiBold", color: colors.onPrimary },
});
