import { View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { BottomTabBar, TabConfig } from "../../components/ui/BottomTabBar";
import { colors } from "../../constants/theme";

const ADMIN_TABS: TabConfig[] = [
  { name: "index",         label: "Home",    icon: "home-outline",        activeIcon: "home"        },
  { name: "approvals",     label: "Goals",   icon: "trending-up-outline", activeIcon: "trending-up", badge: 5 },
  { name: "users",         label: "Network", icon: "people-outline",      activeIcon: "people"      },
  { name: "admin-courses", label: "Courses", icon: "book-outline",        activeIcon: "book"        },
];

const ROUTE_ORDER = ["index", "approvals", "users", "admin-courses"];

export default function AdminLayout() {
  const segments    = useSegments();
  const router      = useRouter();
  const lastSeg     = segments[segments.length - 1] ?? "index";
  const activeIndex = Math.max(0, ROUTE_ORDER.indexOf(lastSeg));

  function navigate(i: number) {
    const name = ROUTE_ORDER[i];
    if (name === "index") router.replace("/(admin)/");
    else router.replace(`/(admin)/${name}` as never);
  }

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <BottomTabBar tabs={ADMIN_TABS} activeIndex={activeIndex} onPress={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
