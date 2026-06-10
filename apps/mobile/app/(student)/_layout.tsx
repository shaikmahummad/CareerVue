import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const STUDENT_TABS: TabConfig[] = [
  { name: "index",    label: "Home",     icon: "home-outline",        activeIcon: "home"         },
  { name: "roadmap",  label: "Goals",    icon: "trending-up-outline", activeIcon: "trending-up"  },
  { name: "courses",  label: "Network",  icon: "people-outline",      activeIcon: "people"       },
  { name: "profile",  label: "Profile",  icon: "person-outline",      activeIcon: "person"       },
  { name: "settings", label: "Settings", icon: "settings-outline",    activeIcon: "settings"     },
];

const ROUTE_ORDER = ["index", "roadmap", "courses", "profile", "settings"];

export default function StudentLayout() {
  const segments = useSegments();
  const router   = useRouter();

  // segments[1] is the tab-level segment; missing/undefined means home (index)
  const tabSeg      = segments[1];
  const activeSeg   = !tabSeg || tabSeg === "index" ? "index" : tabSeg;
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(activeSeg));
  // Hide tab bar on non-tab routes (e.g. course-learn, quiz) or nested sub-routes (courses/[id])
  const hideTabBar  = !ROUTE_ORDER.includes(activeSeg) || segments.length > 2;

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
