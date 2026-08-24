import React, { useCallback, useRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { colors, radius } from "../../constants/theme";

interface FormInputProps extends Omit<TextInputProps, "style"> {
  label:         string;
  error?:        string;
  rightIcon?:    React.ReactNode;
  onRightPress?: () => void;
  style?:        ViewStyle;
  valid?:        boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function FormInput({
  label,
  error,
  rightIcon,
  onRightPress,
  style,
  valid,
  ...props
}: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const focus  = useSharedValue(0);

  const borderAnim = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focus.value,
      [0, 1],
      [colors.border, colors.primary],
    );
    return { borderColor };
  });

  const onFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>((event) => {
    setFocused(true);
    focus.value = withTiming(1, { duration: 200 });
    props.onFocus?.(event);
  }, [focus, props]);

  const onBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>((event) => {
    setFocused(false);
    focus.value = withTiming(0, { duration: 200 });
    props.onBlur?.(event);
  }, [focus, props]);

  return (
    <View style={[s.wrapper, style]}>
      <Text style={s.label}>{label}</Text>
      <AnimatedView
        style={[
          s.inputRow,
          borderAnim,
          focused && s.focused,
          !!error && s.errored,
          valid  && s.valid,
        ]}
      >
        <TextInput
          {...props}
          onFocus={onFocus}
          onBlur={onBlur}
          style={s.input}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />
        {rightIcon && (
          <Pressable onPress={onRightPress} style={s.iconBtn} hitSlop={8}>
            {rightIcon}
          </Pressable>
        )}
      </AnimatedView>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize:   13,
    fontWeight: "500",
    color:      colors.muted,
  },
  inputRow: {
    flexDirection:    "row",
    alignItems:       "center",
    backgroundColor:  colors.elevated,
    borderRadius:     radius.md,
    borderWidth:      1,
    borderColor:      colors.border,
    height:           56,
    paddingHorizontal: 16,
  },
  focused: {
    borderColor:  colors.primary,
    shadowColor:  colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius:  8,
    elevation:     4,
  },
  errored: {
    borderColor: colors.error,
  },
  valid: {
    borderColor: colors.success,
  },
  input: {
    flex:       1,
    fontSize:   17,
    color:      colors.text,
    paddingVertical: 0,
  },
  iconBtn: {
    marginLeft: 8,
  },
  error: {
    fontSize:  12,
    color:     colors.error,
    marginTop: 2,
  },
});
