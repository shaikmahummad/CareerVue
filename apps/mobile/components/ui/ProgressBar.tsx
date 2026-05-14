import React, { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../../constants/theme";

interface ProgressBarProps {
  progress:    number;          // 0–100
  height?:     number;
  color?:      string;
  gradient?:   boolean;
  showLabel?:  boolean;
  style?:      ViewStyle;
  animate?:    boolean;
}

export function ProgressBar({
  progress,
  height   = 6,
  gradient = true,
  showLabel= false,
  style,
  animate  = true,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 100);
    if (animate) {
      width.value = withTiming(target, {
        duration: 800,
        easing:   Easing.out(Easing.cubic),
      });
    } else {
      width.value = target;
    }
  }, [progress, animate, width]);

  const anim = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  return (
    <View style={style}>
      <View style={[s.track, { height, borderRadius: height / 2 }]}>
        <Animated.View style={[s.fill, anim, { height, borderRadius: height / 2 }]}>
          {gradient ? (
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary }]} />
          )}
        </Animated.View>
      </View>
      {showLabel && (
        <Text style={s.label}>{Math.round(progress)}% complete</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow:        "hidden",
  },
  fill: {
    overflow: "hidden",
  },
  label: {
    marginTop:  4,
    fontSize:   12,
    color:      colors.muted,
  },
});
