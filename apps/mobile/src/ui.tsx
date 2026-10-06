import {
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useState, type ReactNode } from "react";
export const rem = (value: number) => value * 16;
export const colors = {
  ink: "#121212",
  canvas: "#ffffff",
  coral: "#ee585a",
  muted: "#595955",
  line: "#dededb",
};
export function Button({
  children,
  onPress,
  primary = false,
  disabled = false,
  compact = false,
}: {
  children: ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole={compact ? "tab" : "button"}
      accessibilityState={compact ? { selected: primary } : { disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        compact && { flex: 1, paddingHorizontal: 4 },
        primary && s.primary,
        (pressed || focused) && { borderColor: colors.ink, borderWidth: 2 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, compact && { fontSize: 12 }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#73736d"
        style={s.input}
        {...props}
      />
    </View>
  );
}
export function Choices({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.wrap}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === v }}
            onPress={() => onChange(v)}
            style={[s.chip, value === v && s.selected]}
          >
            <Text style={{ color: colors.ink, fontSize: 13 }}>
              {v || "All"}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: rem(1.5), gap: rem(1.5), paddingBottom: rem(3) },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: colors.muted },
  title: {
    fontSize: 40,
    fontWeight: "500",
    letterSpacing: -2,
    color: colors.ink,
  },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: {
    backgroundColor: "white",
    borderRadius: rem(2),
    padding: rem(1.5),
    gap: rem(1),
    borderWidth: 1,
    borderColor: "#ecece7",
  },
  label: { fontSize: 14, fontWeight: "500", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: "#b9b9b4",
    borderRadius: rem(0.75),
    padding: rem(0.875),
    minHeight: 48,
    color: colors.ink,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 99,
    padding: 16,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  primary: { backgroundColor: colors.coral, borderColor: colors.coral },
  buttonText: { fontWeight: "500", fontSize: 15, color: colors.ink },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 99,
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.coral, borderColor: colors.ink },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: "#792426",
    backgroundColor: "#fff0ee",
    padding: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  small: { fontSize: 12, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.line },
});
