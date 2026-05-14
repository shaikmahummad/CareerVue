import React, { useCallback } from "react";
import { Pressable, View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, shadows, radius } from "../../constants/theme";

interface PressableCardProps {
  children:     React.ReactNode;
  onPress?:     () => void;
  style?:       ViewStyle;
  innerStyle?:  ViewStyle;
  glow?:        boolean;
  selected?:    boolean;
  disabled?:    boolean;
  haptic?:      boolean;
  borderRadius?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function PressableCard({
  children,
  onPress,
  style,
  innerStyle,
  glow     = false,
  selected = false,
  disabled = false,
  haptic   = true,
  borderRadius = radius.xl,
}: PressableCardProps) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onPress, haptic, scale]);

  const pressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [scale]);

  return (
    <AnimatedView
      style={[
        anim,
        s.card,
        { borderRadius },
        selected && s.selected,
        glow     && shadows.glow,
        selected && shadows.glow,
        shadows.card,
        style,
      ]}
    >
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={[s.inner, { borderRadius }, innerStyle]}
      >
        {children}
      </Pressable>
    </AnimatedView>
  );
}

export function StaticCard({
  children,
  style,
  borderRadius = radius.xl,
}: {
  children:      React.ReactNode;
  style?:        ViewStyle;
  borderRadius?: number;
}) {
  return (
    <View style={[s.card, { borderRadius }, shadows.card, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        "hidden",
  },
  selected: {
    borderWidth:  2,
    borderColor:  colors.primary,
  },
  inner: {
    padding: 16,
  },
});
