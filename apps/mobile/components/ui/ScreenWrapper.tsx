import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";

interface ScreenWrapperProps {
  children:  React.ReactNode;
  safeTop?:  boolean;
  style?:    ViewStyle;
}

export function ScreenWrapper({ children, safeTop = true, style }: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, safeTop && { paddingTop: insets.top }, style]}>
      <StatusBar style="light" />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
});
