import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const ADMIN_TABS: TabConfig[] = [
  { name: "index",         label: "Home",      icon: "home-outline",             activeIcon: "home"             },
  { name: "approvals",     label: "Approvals", icon: "checkmark-circle-outline", activeIcon: "checkmark-circle", badge: 5 },
  { name: "users",         label: "Users",     icon: "people-outline",           activeIcon: "people"           },
  { name: "analytics",     label: "Analytics", icon: "bar-chart-outline",        activeIcon: "bar-chart"        },
  { name: "settings",      label: "Settings",  icon: "settings-outline",         activeIcon: "settings"         },
];

const ROUTE_ORDER = ["index", "approvals", "users", "analytics", "settings"];

export default function AdminLayout() {
  const segments    = useSegments();
  const currentSegments = segments as readonly string[];
  const router      = useRouter();

  const tabSeg      = currentSegments[1];
  const activeSeg   = !tabSeg || tabSeg === "index" ? "index" : tabSeg;
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(activeSeg));
  const hideTabBar  = !ROUTE_ORDER.includes(activeSeg) || currentSegments.length > 2;

  function navigate(i: number) {
    const name = ROUTE_ORDER[i];
    if (name === "index") router.replace("/(admin)/" as never);
    else router.replace(`/(admin)/${name}` as never);
  }

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {!hideTabBar && (
        <BottomTabBar tabs={ADMIN_TABS} activeIndex={activeIndex} onPress={navigate} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
