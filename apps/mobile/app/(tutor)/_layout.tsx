import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const TUTOR_TABS: TabConfig[] = [
  { name: "index",     label: "Home",     icon: "home-outline",          activeIcon: "home"          },
  { name: "analytics", label: "Stats",    icon: "trending-up-outline",   activeIcon: "trending-up"   },
  { name: "courses",   label: "Courses",  icon: "library-outline",       activeIcon: "library"       },
  { name: "create",    label: "Create",   icon: "add-circle-outline",    activeIcon: "add-circle"    },
  { name: "profile",   label: "Profile",  icon: "person-circle-outline", activeIcon: "person-circle" },
  { name: "settings",  label: "Settings", icon: "settings-outline",      activeIcon: "settings"      },
];

const ROUTE_ORDER = ["index", "analytics", "courses", "create", "profile", "settings"];

export default function TutorLayout() {
  const segments    = useSegments();
  const router      = useRouter();

  const tabSeg      = segments[1];
  const activeSeg   = !tabSeg || tabSeg === "index" ? "index" : tabSeg;
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(activeSeg));
  // Hide tab bar in non-tab routes (module-editor, course detail) or nested sub-routes
  const hideTabBar  = !ROUTE_ORDER.includes(activeSeg) || segments.length > 2;

  function navigate(i: number) {
    const name = ROUTE_ORDER[i];
    if (name === "index") router.replace("/(tutor)/");
    else router.replace(`/(tutor)/${name}` as never);
  }

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {!hideTabBar && (
        <BottomTabBar tabs={TUTOR_TABS} activeIndex={activeIndex} onPress={navigate} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
