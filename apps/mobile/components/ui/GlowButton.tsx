import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, gradients, shadows, radius } from "../../constants/theme";

type Variant = "primary" | "ghost" | "outline" | "success";
type Size    = "sm" | "md" | "lg";

interface GlowButtonProps {
  label:         string;
  onPress?:      () => void;
  variant?:      Variant;
  size?:         Size;
  disabled?:     boolean;
  loading?:      boolean;
  style?:        ViewStyle;
  labelStyle?:   TextStyle;
  fullWidth?:    boolean;
  leftIcon?:     React.ReactNode;
  rightIcon?:    React.ReactNode;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const HEIGHT:    Record<Size, number> = { sm: 36, md: 48, lg: 56 };
const FONT_SIZE: Record<Size, number> = { sm: 14, md: 15, lg: 17 };
const BR:        Record<Size, number> = { sm: 10, md: 14, lg: 16 };

export function GlowButton({
  label,
  onPress,
  variant    = "primary",
  size       = "lg",
  disabled   = false,
  loading    = false,
  style,
  labelStyle,
  fullWidth  = true,
  leftIcon,
  rightIcon,
}: GlowButtonProps) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale]);

  const pressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [scale]);

  const h  = HEIGHT[size];
  const fs = FONT_SIZE[size];
  const br = BR[size];

  const inner = (
    <View style={[s.row, { height: h, borderRadius: br }]}>
      {leftIcon && <View style={s.iconL}>{leftIcon}</View>}
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={[s.labelBase, { fontSize: fs }, getLabelStyle(variant), labelStyle]}>
          {label}
        </Text>
      )}
      {rightIcon && <View style={s.iconR}>{rightIcon}</View>}
    </View>
  );

  return (
    <AnimatedView style={[anim, fullWidth && s.full, style]}>
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={[s.pressable, disabled && s.disabled]}
      >
        {variant === "primary" && (
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.gradient, { height: h, borderRadius: br }, shadows.glow]}
          >
            {inner}
          </LinearGradient>
        )}
        {variant === "success" && (
          <LinearGradient
            colors={gradients.success}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.gradient, { height: h, borderRadius: br }, shadows.glowSuccess]}
          >
            {inner}
          </LinearGradient>
        )}
        {variant === "ghost" && (
          <View style={[s.ghost, { height: h, borderRadius: br }]}>{inner}</View>
        )}
        {variant === "outline" && (
          <View style={[s.outline, { height: h, borderRadius: br }]}>{inner}</View>
        )}
      </Pressable>
    </AnimatedView>
  );
}

function getLabelStyle(variant: Variant): TextStyle {
  if (variant === "outline") return { color: colors.primary };
  return { color: "#ffffff" };
}

const s = StyleSheet.create({
  full:      { width: "100%" },
  pressable: { overflow: "hidden" },
  disabled:  { opacity: 0.45 },
  gradient:  { overflow: "hidden" },
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  labelBase: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  ghost: {
    borderWidth:  1,
    borderColor:  "rgba(255,255,255,0.25)",
    overflow:     "hidden",
  },
  outline: {
    borderWidth:  1.5,
    borderColor:  colors.primary,
    overflow:     "hidden",
  },
  iconL: { marginRight: 8 },
  iconR: { marginLeft:  8 },
});
