import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const STUDENT_TABS: TabConfig[] = [
  { name: "index",   label: "Home",    icon: "home-outline",         activeIcon: "home"         },
  { name: "roadmap", label: "Goals",   icon: "trending-up-outline",  activeIcon: "trending-up"  },
  { name: "courses", label: "Network", icon: "people-outline",       activeIcon: "people"       },
  { name: "profile", label: "Profile", icon: "person-outline",       activeIcon: "person"       },
];

const ROUTE_ORDER = ["index", "roadmap", "courses", "profile"];

export default function StudentLayout() {
  const segments = useSegments();
  const router   = useRouter();
  const lastSeg  = segments[segments.length - 1] ?? "index";
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(lastSeg));

  const hideTabBar =
    lastSeg === "course-detail" ||
    lastSeg === "quiz"          ||
    lastSeg === "quiz-results"  ||
    lastSeg === "quiz-history"  ||
    lastSeg === "settings";

  function navigate(i: number) {
    const name = ROUTE_ORDER[i];
    if (name === "index") router.replace("/(student)/");
    else router.replace(`/(student)/${name}` as never);
  }

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {!hideTabBar && (
        <BottomTabBar
          tabs={STUDENT_TABS}
          activeIndex={activeIndex}
          onPress={navigate}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
