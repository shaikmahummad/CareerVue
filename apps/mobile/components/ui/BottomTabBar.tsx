import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { MotiView } from "moti";
import { colors } from "../../constants/theme";

export interface TabConfig {
  name:         string;
  label:        string;
  icon:         keyof typeof Ionicons.glyphMap;
  activeIcon:   keyof typeof Ionicons.glyphMap;
  badge?:       number;
}

interface BottomTabBarProps {
  tabs:         TabConfig[];
  activeIndex:  number;
  onPress:      (index: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab:      TabConfig;
  isActive: boolean;
  onPress:  () => void;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 500 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 500 });
    }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, scale]);

  return (
    <AnimatedPressable onPress={handlePress} style={[s.tab, anim]}>
      <View style={s.iconWrap}>
        {isActive && (
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              opacity: { type: "spring", damping: 18, stiffness: 300 },
              scale: { type: "spring", damping: 18, stiffness: 300 },
            }}
            style={s.glow}
          />
        )}
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={26}
          color={isActive ? colors.primary : colors.outline}
        />
        {!!tab.badge && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{tab.badge > 9 ? "9+" : tab.badge}</Text>
          </View>
        )}
      </View>
      {isActive && (
        <MotiView
          from={{ opacity: 0, translateY: 4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            opacity: { type: "timing", duration: 180 },
            translateY: { type: "timing", duration: 180 },
          }}
        >
          <Text style={s.label}>{tab.label}</Text>
        </MotiView>
      )}
    </AnimatedPressable>
  );
}

export function BottomTabBar({ tabs, activeIndex, onPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab, i) => (
        <TabItem
          key={tab.name}
          tab={tab}
          isActive={i === activeIndex}
          onPress={() => onPress(i)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection:   "row",
    backgroundColor: "rgba(8,8,16,0.9)",
    borderTopWidth:  1,
    borderTopColor:  "rgba(255,255,255,0.05)",
    paddingTop:      10,
    minHeight:       54,
  },
  tab: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "flex-start",
    gap:            3,
    minHeight:      44,
  },
  iconWrap: {
    position: "relative",
    alignItems:  "center",
    justifyContent: "center",
  },
  glow: {
    position:        "absolute",
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "rgba(196,192,255,0.12)",
  },
  label: {
    fontSize:      12,
    fontFamily:    "JetBrainsMono_500Medium",
    letterSpacing: 0.3,
    color:         colors.primary,
  },
  badge: {
    position:        "absolute",
    top:             -4,
    right:           -8,
    backgroundColor: colors.error,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color:      "#fff",
    fontSize:   10,
    fontWeight: "700",
  },
});
