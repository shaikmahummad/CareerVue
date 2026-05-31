import { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ScrollView, Dimensions, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../../lib/api";
import { colors, TAB_BAR_HEIGHT } from "../../../constants/theme";

const { width } = Dimensions.get("window");

interface Course {
  id:             string;
  title:          string;
  description:    string | null;
  category:       string | null;
  level:          string | null;
  is_free:        boolean;
  price:          number;
  enrolled_count: number;
  avg_rating:     number;
  tutor_name:     string | null;
  thumbnail_url:  string | null;
}

const FILTER_CHIPS = [
  { label: "All",       value: ""             },
  { label: "Web Dev",   value: "Programming"  },
  { label: "DSA",       value: "Data Science" },
  { label: "UX Design", value: "Design"       },
  { label: "Cloud",     value: "DevOps"       },
  { label: "Security",  value: "Cybersecurity"},
  { label: "Business",  value: "Business"     },
];

const PAGE_SIZE = 12;

function thumbGradient(cat: string | null): readonly [string, string] {
  const map: Record<string, [string, string]> = {
    "Programming":   ["rgba(108,99,255,0.45)", "rgba(27,0,145,0.75)"],
    "Data Science":  ["rgba(0,210,253,0.4)",   "rgba(0,78,95,0.75)"],
    "Design":        ["rgba(255,183,133,0.4)",  "rgba(80,37,0,0.75)"],
    "DevOps":        ["rgba(0,229,160,0.35)",   "rgba(0,80,56,0.75)"],
    "Cybersecurity": ["rgba(255,180,171,0.35)", "rgba(147,0,10,0.75)"],
    "Business":      ["rgba(196,192,255,0.35)", "rgba(54,34,202,0.75)"],
  };
  return map[cat ?? ""] ?? ["rgba(108,99,255,0.3)", "rgba(13,13,20,0.9)"];
}

function thumbIcon(cat: string | null): keyof typeof Ionicons.glyphMap {
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

function levelStyle(level: string | null): { bg: string; text: string; border: string } {
  const l = level?.toLowerCase() ?? "";
  if (l === "expert" || l === "advanced") {
    return {
      bg:     "rgba(255,183,133,0.15)",
      text:   colors.tertiary,
      border: "rgba(255,183,133,0.3)",
    };
  }
  return {
    bg:     "rgba(0,210,253,0.12)",
    text:   colors.secondary,
    border: "rgba(162,231,255,0.25)",
  };
}

export default function CoursesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [courses,     setCourses]     = useState<Course[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("");
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [focused,     setFocused]     = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HEADER_H = insets.top + 44;

  function buildUrl(p: number) {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (search.trim()) params.set("search",   search.trim());
    if (category)      params.set("category", category);
    return `/api/v1/courses/?${params}`;
  }

  async function fetchCourses(reset = true) {
    if (reset) { setLoading(true); setPage(1); }
    else         setLoadingMore(true);
    const p = reset ? 1 : page + 1;
    try {
      const data = await apiGet<Course[]>(buildUrl(p));
      if (reset) setCourses(data);
      else { setCourses(prev => [...prev, ...data]); setPage(p); }
      setHasMore(data.length === PAGE_SIZE);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchCourses(true), 350);
  }, [search, category]);

  function renderCourse({ item: c }: { item: Course }) {
    const lvl = levelStyle(c.level);
    const grad = thumbGradient(c.category);
    const icon = thumbIcon(c.category);
    const label = c.level
      ? c.level.charAt(0).toUpperCase() + c.level.slice(1)
      : "Beginner";
    const price = c.is_free ? "Free" : `$${c.price}`;

    return (
      <Pressable
        style={({ pressed }): any => [s.courseCard, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push(`/(student)/courses/${c.id}` as any)}
      >
        {/* Thumbnail */}
        <View style={s.thumb}>
          <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
          <Ionicons name={icon} size={32} color="rgba(255,255,255,0.35)" />
        </View>

        {/* Info */}
        <View style={s.courseInfo}>
          {/* Title row */}
          <View style={s.courseTitleRow}>
            <Text style={s.courseTitle} numberOfLines={1}>{c.title}</Text>
            <Ionicons
              name="bookmark-outline"
              size={18}
              color={colors.outline}
            />
          </View>

          {/* Rating */}
          {c.avg_rating > 0 && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={13} color={colors.tertiary} />
              <Text style={s.ratingText}>
                {c.avg_rating.toFixed(1)}
                {c.enrolled_count > 0 && ` (${formatCount(c.enrolled_count)})`}
              </Text>
            </View>
          )}

          {/* Level + price */}
          <View style={s.courseFooter}>
            <View style={[s.levelBadge, { backgroundColor: lvl.bg, borderColor: lvl.border }]}>
              <Text style={[s.levelText, { color: lvl.text }]}>{label}</Text>
            </View>
            <Text style={s.priceText}>{price}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const ListHeader = (
    <View style={s.listHeader}>
      {/* Large title */}
      <Text style={s.pageTitle}>Explore Courses</Text>

      {/* Search bar */}
      <View style={[s.searchWrap, focused && s.searchFocused]}>
        <Ionicons name="search-outline" size={20} color={colors.outline} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search for skills, topics..."
          placeholderTextColor={colors.outlineVariant}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.outline} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = category === chip.value;
          return (
            <Pressable
              key={chip.value}
              onPress={() => setCategory(chip.value)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Featured banner */}
      <View style={s.featuredBanner}>
        <LinearGradient
          colors={["rgba(196,192,255,0.2)", "rgba(0,0,0,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Background pattern */}
        <View style={s.featuredBg} pointerEvents="none">
          <Ionicons name="hardware-chip-outline" size={160} color="rgba(196,192,255,0.06)" />
        </View>
        {/* Overlay gradient from bottom */}
        <LinearGradient
          colors={["transparent", "#050508"]}
          style={s.featuredOverlay}
          pointerEvents="none"
        />
        <View style={s.featuredContent}>
          <View style={s.featuredBadge}>
            <Text style={s.featuredBadgeText}>FEATURED</Text>
          </View>
          <Text style={s.featuredTitle}>New: AI &amp; Machine Learning</Text>
          <Text style={s.featuredSub}>Master the foundations of the future.</Text>
        </View>
      </View>

      {/* Section label */}
      <Text style={s.sectionLabel}>
        {category
          ? FILTER_CHIPS.find(c => c.value === category)?.label ?? "Courses"
          : "All Courses"}
      </Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>CareerVue</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={[s.centered, { marginTop: HEADER_H }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={renderCourse}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[s.listContent, {
            paddingTop:    HEADER_H + 16,
            paddingBottom: TAB_BAR_HEIGHT + 16,
          }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="book-outline" size={40} color={colors.outlineVariant} />
              <Text style={s.emptyText}>No courses found</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={s.loadMore}
                onPress={() => fetchCourses(false)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={s.loadMoreText}>Load more</Text>}
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  // Fixed header
  header: {
    position:          "absolute",
    top:               0, left: 0, right: 0,
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

  centered: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    gap:               0,
  },

  // List header
  listHeader: {
    gap:          24,
    marginBottom: 16,
  },

  // Page title
  pageTitle: {
    fontFamily:    "HankenGrotesk_700Bold",
    fontSize:      34,
    lineHeight:    41,
    letterSpacing: -0.5,
    color:         colors.text,
  },

  // Search
  searchWrap: {
    flexDirection:   "row",
    alignItems:      "center",
    height:          52,
    backgroundColor: "#13131f",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    12,
    paddingHorizontal: 16,
    gap:             10,
  },
  searchFocused: {
    borderColor: colors.primary,
  },
  searchIcon: {},
  searchInput: {
    flex:       1,
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    lineHeight: 22,
    color:      colors.text,
  },

  // Filter chips
  chipsScroll: {
    gap:        8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical:   8,
    borderRadius:      999,
    backgroundColor:   "#0d0d14",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.08)",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  chipText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      14,
    lineHeight:    20,
    color:         colors.textVariant,
  },
  chipTextActive: {
    color:         "#1b0091",
    fontFamily:    "HankenGrotesk_700Bold",
  },

  // Featured banner
  featuredBanner: {
    height:          180,
    borderRadius:    20,
    overflow:        "hidden",
    backgroundColor: "#0d0d14",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    justifyContent:  "flex-end",
  },
  featuredBg: {
    position:       "absolute",
    top:            -20,
    right:          -20,
    alignItems:     "center",
    justifyContent: "center",
  },
  featuredOverlay: {
    position: "absolute",
    bottom:   0, left: 0, right: 0,
    height:   120,
  },
  featuredContent: {
    padding: 16,
    gap:     4,
    zIndex:  1,
  },
  featuredBadge: {
    alignSelf:         "flex-start",
    backgroundColor:   "rgba(196,192,255,0.15)",
    borderWidth:       1,
    borderColor:       "rgba(196,192,255,0.3)",
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginBottom:      4,
  },
  featuredBadgeText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      10,
    letterSpacing: 1.5,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         "#ffffff",
  },
  featuredSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   14,
    lineHeight: 20,
    color:      colors.textVariant,
  },

  // Section label
  sectionLabel: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.text,
    marginBottom:  -8,
  },

  // Course card
  courseCard: {
    flexDirection:   "row",
    gap:             16,
    backgroundColor: "#0d0d14",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    20,
    padding:         16,
    marginBottom:    12,
  },
  thumb: {
    width:          100,
    height:         100,
    borderRadius:   12,
    flexShrink:     0,
    overflow:       "hidden",
    backgroundColor: colors.surfaceHigh,
    alignItems:     "center",
    justifyContent: "center",
  },
  courseInfo: {
    flex:           1,
    justifyContent: "space-between",
  },
  courseTitleRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           8,
  },
  courseTitle: {
    flex:          1,
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      20,
    lineHeight:    25,
    letterSpacing: -0.2,
    color:         colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    marginTop:     4,
  },
  ratingText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      12,
    letterSpacing: 0.3,
    color:         colors.textVariant,
  },
  courseFooter: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      6,
    borderWidth:       1,
  },
  levelText: {
    fontFamily:    "JetBrainsMono_500Medium",
    fontSize:      11,
    letterSpacing: 0.3,
  },
  priceText: {
    fontFamily:    "HankenGrotesk_600SemiBold",
    fontSize:      22,
    lineHeight:    28,
    letterSpacing: -0.3,
    color:         colors.primary,
  },

  // Empty + load more
  empty: {
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap:            12,
  },
  emptyText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize:   17,
    color:      colors.outline,
  },
  loadMore: {
    paddingVertical: 16,
    alignItems:      "center",
  },
  loadMoreText: {
    fontFamily: "HankenGrotesk_500Medium",
    fontSize:   17,
    color:      colors.primary,
  },
});
