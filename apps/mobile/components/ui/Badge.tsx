import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../constants/theme";

type BadgeVariant =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "muted"
  | "outline-primary"
  | "outline-accent"
  | "outline-warning";

interface BadgeProps {
  label:    string;
  variant?: BadgeVariant;
  style?:   ViewStyle;
  dot?:     boolean;
}

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  primary:         { bg: colors.primaryBg,  text: colors.primary },
  accent:          { bg: colors.accentBg,   text: colors.accent  },
  success:         { bg: colors.successBg,  text: colors.success },
  warning:         { bg: colors.warningBg,  text: colors.warning },
  error:           { bg: colors.errorBg,    text: colors.error   },
  muted:           { bg: "rgba(255,255,255,0.06)", text: colors.muted },
  "outline-primary": { bg: "transparent", text: colors.primary, border: colors.primary },
  "outline-accent":  { bg: "transparent", text: colors.accent,  border: colors.accent  },
  "outline-warning": { bg: "transparent", text: colors.warning, border: colors.warning },
};

export function Badge({ label, variant = "primary", style, dot }: BadgeProps) {
  const c = BADGE_COLORS[variant];
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: c.bg },
        c.border && { borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      {dot && <View style={[s.dot, { backgroundColor: c.text }]} />}
      <Text style={[s.label, { color: c.text }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: "approved" | "pending" | "draft" | "rejected" }) {
  const map = {
    approved: { label: "Approved",  variant: "success"  as BadgeVariant },
    pending:  { label: "Pending",   variant: "warning"  as BadgeVariant },
    draft:    { label: "Draft",     variant: "muted"    as BadgeVariant },
    rejected: { label: "Rejected",  variant: "error"    as BadgeVariant },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} dot />;
}

export function SkillBadge({ level }: { level: "Strong" | "Intermediate" | "Weak" }) {
  const map = {
    Strong:       "success"  as BadgeVariant,
    Intermediate: "warning"  as BadgeVariant,
    Weak:         "error"    as BadgeVariant,
  };
  return <Badge label={level} variant={map[level]} dot />;
}

const s = StyleSheet.create({
  badge: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:   20,
    alignSelf:      "flex-start",
    gap:            4,
  },
  label: {
    fontSize:   12,
    fontWeight: "600",
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
});
