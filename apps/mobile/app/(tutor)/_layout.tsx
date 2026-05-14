import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const TUTOR_TABS: TabConfig[] = [
  { name: "index",     label: "Home",      icon: "bar-chart-outline",   activeIcon: "bar-chart"    },
  { name: "courses",   label: "Courses",   icon: "book-outline",        activeIcon: "book"         },
  { name: "create",    label: "Create",    icon: "add-circle-outline",  activeIcon: "add-circle"   },
  { name: "analytics", label: "Analytics", icon: "trending-up-outline", activeIcon: "trending-up"  },
];

const ROUTE_ORDER = ["index", "courses", "create", "analytics"];

export default function TutorLayout() {
  const segments    = useSegments();
  const router      = useRouter();
  const lastSeg     = segments[segments.length - 1] ?? "index";
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(lastSeg));

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
      <BottomTabBar tabs={TUTOR_TABS} activeIndex={activeIndex} onPress={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
