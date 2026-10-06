import {
  StyleSheet,
  Alert,
  Text,
  TextInput,
  Pressable,
  View,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, type ReactNode } from "react";
export const rem = (value: number) => value * 16;
export const colors = {
  ink: "#121212",
  canvas: "#ffffff",
  coral: "#ee585a",
  muted: "#595955",
  line: "#e5e5e0",
};
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function Brand() {
  return (
    <Text accessibilityLabel="Daymark" style={s.brand}>
      daymark<Text style={{ color: colors.coral }}>.</Text>
    </Text>
  );
}
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
      accessibilityRole={compact ? "tab" : "button"}
      accessibilityState={
        compact ? { selected: primary, disabled } : { disabled }
      }
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        compact && s.tab,
        primary && (compact ? s.activeTab : s.primary),
        (pressed || focused) && {
          backgroundColor: primary ? "#e34b4e" : "#efefec",
          borderColor: colors.ink,
        },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          compact && { fontSize: rem(0.75), textAlign: "center" },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: rem(0.5) }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#757570"
        selectionColor={colors.coral}
        style={[
          s.input,
          props.multiline && { minHeight: rem(6), textAlignVertical: "top" },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
export function Sheet({
  title,
  children,
  close,
  footer,
  dirty = false,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  footer?: ReactNode;
  dirty?: boolean;
  busy?: boolean;
}) {
  const requestClose = () => {
    if (!busy) confirmDiscard(dirty, close);
  };
  return (
    <Modal
      visible
      animationType="none"
      onRequestClose={requestClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={s.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.sheetHeader}>
            <Text accessibilityRole="header" style={[s.itemTitle, { flex: 1 }]}>
              {title}
            </Text>
            <Button disabled={busy} onPress={requestClose}>
              Close
            </Button>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
          {footer && <View style={s.sheetFooter}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function Choices({
  label,
  values,
  value,
  onChange,
  labels,
}: {
  label: string;
  values: readonly string[];
  value: string;
  onChange: (v: string) => void;
  labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const text = (v: string) => labels?.[v] ?? (v || "All");
  return (
    <View style={{ gap: rem(0.5) }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text(value)}. Choose an option`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[s.input, s.row]}
      >
        <Text style={[s.body, { flex: 1 }]}>{text(value)}</Text>
        <Text style={s.small}>Change</Text>
      </Pressable>
      {open && (
        <Sheet title={label} close={() => setOpen(false)}>
          {values.map((v) => (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === v }}
              onPress={() => {
                onChange(v);
                setOpen(false);
              }}
              style={[s.option, value === v && s.selected]}
            >
              <Text style={[s.body, { flex: 1 }]}>{text(v)}</Text>
              {v === value && <Text style={s.label}>Selected</Text>}
            </Pressable>
          ))}
        </Sheet>
      )}
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(value + "T12:00:00"));
  const { fontScale } = useWindowDimensions();
  const safeMonth = Number.isNaN(month.getTime()) ? new Date() : month;
  const year = safeMonth.getFullYear(),
    m = safeMonth.getMonth();
  const days = new Date(year, m + 1, 0).getDate(),
    offset = new Date(year, m, 1).getDay();
  const choose = (date: Date) => {
    onChange(localDate(date));
    setOpen(false);
  };
  return (
    <View style={{ gap: rem(0.5) }}>
      <Text style={s.label}>{label}</Text>
      <Button
        onPress={() => {
          setMonth(new Date(value + "T12:00:00"));
          setOpen(true);
        }}
      >
        {value || "Choose date"}
      </Button>
      {open && (
        <Sheet title={label} close={() => setOpen(false)}>
          <View style={s.wrap}>
            {[0, 1, 7].map((n) => (
              <Button
                key={n}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + n);
                  choose(d);
                }}
              >
                {n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In a week"}
              </Button>
            ))}
          </View>
          <View style={s.row}>
            <Button onPress={() => setMonth(new Date(year, m - 1, 1))}>
              Previous
            </Button>
            <Text style={[s.label, { flex: 1, textAlign: "center" }]}>
              {safeMonth.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Button onPress={() => setMonth(new Date(year, m + 1, 1))}>
              Next
            </Button>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text
                key={i}
                style={[
                  s.small,
                  {
                    width: "14.285%",
                    textAlign: "center",
                    paddingVertical: rem(0.75),
                  },
                ]}
              >
                {d}
              </Text>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <View key={`blank${i}`} style={{ width: "14.285%" }} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = new Date(year, m, i + 1),
                selected = localDate(date) === value;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={date.toLocaleDateString(undefined, {
                    dateStyle: "full",
                  })}
                  accessibilityState={{ selected }}
                  onPress={() => choose(date)}
                  style={{
                    width: "14.285%",
                    minHeight: Math.max(rem(2.75), rem(2.75) * fontScale),
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: rem(0.75),
                    backgroundColor: selected ? colors.coral : "white",
                  }}
                >
                  <Text style={s.body}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Or enter YYYY-MM-DD"
            value={value}
            onChangeText={onChange}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={s.small}>Dates are shown in your local timezone.</Text>
        </Sheet>
      )}
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
  content: {
    padding: rem(1.25),
    gap: rem(1.25),
    paddingBottom: rem(2),
    width: "100%",
    maxWidth: rem(44),
    alignSelf: "center",
  },
  brand: {
    fontSize: rem(1.6),
    fontWeight: "700",
    letterSpacing: -rem(0.07),
    color: colors.ink,
  },
  eyebrow: {
    fontSize: rem(0.65),
    letterSpacing: rem(0.09),
    color: colors.muted,
  },
  title: {
    fontSize: rem(2.25),
    fontWeight: "600",
    letterSpacing: -rem(0.1),
    color: colors.ink,
    flexShrink: 1,
  },
  subtitle: { fontSize: rem(0.95), lineHeight: rem(1.4), color: colors.muted },
  body: { fontSize: rem(0.95), color: colors.ink },
  card: {
    backgroundColor: "white",
    borderRadius: rem(2),
    padding: rem(1.5),
    gap: rem(0.85),
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: rem(0.85), fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: "#b9b9b4",
    borderRadius: rem(0.85),
    padding: rem(0.875),
    minHeight: rem(3),
    color: colors.ink,
    fontSize: rem(1),
    backgroundColor: "#fafaf8",
  },
  button: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rem(2),
    paddingHorizontal: rem(1),
    paddingVertical: rem(0.8),
    minHeight: rem(3),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    flexShrink: 1,
  },
  primary: { backgroundColor: colors.coral, borderColor: colors.coral },
  buttonText: { fontWeight: "600", fontSize: rem(0.85), color: colors.ink },
  tab: {
    flex: 1,
    borderRadius: rem(0.9),
    paddingHorizontal: rem(0.15),
    paddingVertical: rem(0.85),
    borderColor: "transparent",
    minHeight: rem(3.25),
  },
  activeTab: {
    backgroundColor: "#fff0ee",
    borderColor: "#f3c6c3",
    borderBottomWidth: 3,
    borderBottomColor: colors.coral,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: rem(0.5) },
  option: {
    minHeight: rem(3.5),
    padding: rem(1),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rem(1),
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.75),
  },
  chip: {
    minHeight: rem(3),
    paddingHorizontal: rem(0.875),
    paddingVertical: rem(0.75),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rem(2),
    justifyContent: "center",
  },
  selected: { backgroundColor: "#fff0ee", borderColor: colors.coral },
  error: {
    fontSize: rem(0.875),
    lineHeight: rem(1.3),
    color: "#792426",
    backgroundColor: "#fff0ee",
    padding: rem(1),
    borderRadius: rem(0.75),
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: rem(0.75),
    alignItems: "center",
  },
  itemTitle: {
    fontSize: rem(1.25),
    fontWeight: "600",
    letterSpacing: -rem(0.025),
    color: colors.ink,
    flexShrink: 1,
  },
  small: { fontSize: rem(0.75), lineHeight: rem(1.1), color: colors.muted },
  divider: { height: 1, backgroundColor: colors.line },
  sheetHeader: {
    padding: rem(1),
    flexDirection: "row",
    alignItems: "center",
    gap: rem(1),
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  sheetFooter: {
    padding: rem(1),
    borderTopWidth: 1,
    borderColor: colors.line,
    width: "100%",
    maxWidth: rem(44),
    alignSelf: "center",
  },
  metric: {
    flexGrow: 1,
    flexBasis: "44%",
    padding: rem(1),
    borderRadius: rem(1.25),
    gap: rem(0.5),
    backgroundColor: "#f5f5f1",
  },
  metricNumber: {
    fontSize: rem(2),
    fontWeight: "600",
    letterSpacing: -rem(0.08),
    color: colors.ink,
  },
  progressTrack: {
    height: rem(0.375),
    backgroundColor: "#e8e8e4",
    borderRadius: rem(1),
    overflow: "hidden",
  },
});

export function confirmDiscard(dirty: boolean, leave: () => void) {
  if (!dirty) {
    leave();
    return;
  }
  Alert.alert(
    "Discard changes?",
    "Your changes have not been saved.",
    [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard changes", style: "destructive", onPress: leave },
    ],
    { cancelable: true },
  );
}
