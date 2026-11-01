import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "~/theme/theme";
import { fonts, radius } from "~/theme/tokens";
import { Icon, type IconName } from "./icon";

// The web design system (src/app/globals.css, "Design system (AU-9)") as React Native pieces.
// Touch targets are at least 44 points high, as on the web (2.75rem) and in Apple's guidelines.

type Tone = "ink" | "muted" | "accent" | "danger" | "warn" | "onAccent";
type Variant = "title" | "h1" | "h2" | "section" | "body" | "small" | "xs" | "metric" | "eyebrow" | "label";

const variants: Record<Variant, TextStyle> = {
  // .page-title
  title: { fontSize: 34, lineHeight: 40, fontFamily: fonts.medium, letterSpacing: -0.85 },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.7 },
  h2: { fontSize: 18, lineHeight: 26, fontFamily: fonts.bold },
  // .section-title
  section: { fontSize: 20, lineHeight: 28, fontFamily: fonts.medium },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  small: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  xs: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  // .metric
  metric: { fontSize: 30, lineHeight: 36, fontFamily: fonts.medium, letterSpacing: -0.75, fontVariant: ["tabular-nums"] },
  eyebrow: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold, letterSpacing: 0.6, textTransform: "uppercase" },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold },
};

export function Txt({
  children,
  variant = "body",
  tone = "ink",
  weight,
  center,
  style,
  numberOfLines,
  accessibilityRole,
  selectable,
}: {
  children: ReactNode;
  variant?: Variant;
  tone?: Tone;
  weight?: "regular" | "medium" | "semibold" | "bold";
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: "header" | "text" | "alert" | "summary";
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  const color = {
    ink: colors.ink,
    muted: colors.muted,
    accent: colors.accentText,
    danger: colors.danger,
    warn: colors.warn,
    onAccent: colors.onAccent,
  }[tone];
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (variant === "title" || variant === "h1" || variant === "section" || variant === "h2" ? "header" : undefined)}
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[variants[variant], { color }, variant === "eyebrow" && tone === "ink" ? { color: colors.accentText } : null, weight ? { fontFamily: fonts[weight] } : null, center ? { textAlign: "center" } : null, style]}
    >
      {children}
    </Text>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerOutline";

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  loadingText,
  icon,
  full,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: IconName;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const look: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.btn2Bg, fg: colors.ink, border: colors.btn2Edge },
    ghost: { bg: "transparent", fg: colors.muted },
    danger: { bg: colors.dangerFill, fg: colors.onDanger },
    dangerOutline: { bg: "transparent", fg: colors.danger, border: colors.dangerEdge },
  };
  const { bg, fg, border } = look[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      hitSlop={size === "sm" ? 4 : 0}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: size === "sm" ? 36 : 46,
          borderRadius: size === "sm" ? radius.buttonSm : radius.button,
          paddingHorizontal: size === "sm" ? 12 : 16,
          paddingVertical: size === "sm" ? 6 : 10,
          backgroundColor: variant === "primary" && pressed ? colors.accentSoft : bg,
          borderWidth: border ? 1 : 0,
          borderColor: pressed && border ? (variant === "secondary" ? colors.accent : border) : border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: inactive ? 0.6 : pressed && variant !== "primary" ? 0.85 : 1,
          alignSelf: full ? "stretch" : "flex-start",
        },
        variant === "ghost" && pressed ? { backgroundColor: colors.line } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon color={fg} name={icon} size={size === "sm" ? 16 : 18} /> : null}
      <Text style={{ color: fg, fontFamily: variant === "ghost" ? fonts.semibold : fonts.bold, fontSize: 14, textAlign: "center" }}>
        {loading && loadingText ? loadingText : children}
      </Text>
    </Pressable>
  );
}

/** A pressable line of underlined text, like the web's text links. */
export function TextLink({ children, onPress, tone = "ink", accessibilityHint }: { children: ReactNode; onPress: () => void; tone?: Tone; accessibilityHint?: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityHint={accessibilityHint}
      accessibilityRole="link"
      onPress={onPress}
      style={{ color: tone === "muted" ? colors.muted : tone === "accent" ? colors.accentText : tone === "danger" ? colors.danger : colors.ink, fontFamily: fonts.semibold, fontSize: 14, textDecorationLine: "underline", paddingVertical: 6 }}
      suppressHighlighting
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, danger, compact }: { children: ReactNode; style?: StyleProp<ViewStyle>; danger?: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: danger ? colors.dangerEdge : colors.glassEdge,
          backgroundColor: colors.card,
          padding: compact ? 16 : 20,
          boxShadow: colors.shadowCard,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A block inside a card (stat tiles, option rows). */
export function Tile({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.tile, padding: 12 }, style]}>{children}</View>;
}

export function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  hint,
  error,
  suffix,
  autoComplete,
  textContentType,
  autoCapitalize = "none",
  secureTextEntry,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  maxLength,
  multiline,
  style,
  inputRef,
  right,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  hint?: string;
  error?: string;
  suffix?: string;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  secureTextEntry?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  editable?: boolean;
  maxLength?: number;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  inputRef?: React.Ref<TextInput>;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radius.control,
          borderWidth: focused ? 2 : 1,
          borderColor: error ? colors.danger : focused ? colors.focus : colors.edge,
          backgroundColor: colors.field,
          paddingHorizontal: focused ? 11 : 12,
          minHeight: 46,
          opacity: editable ? 1 : 0.6,
        }}
      >
        <TextInput
          accessibilityHint={hint}
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 10 }}
          textContentType={textContentType}
          value={value}
        />
        {suffix ? <Txt tone="muted" variant="small">{suffix}</Txt> : null}
        {right}
      </View>
      {hint ? <Txt tone="muted" variant="xs">{hint}</Txt> : null}
      {error ? <Txt accessibilityRole="alert" tone="danger" variant="xs" weight="semibold">{error}</Txt> : null}
    </View>
  );
}

/** A number field. Decimal pad on phones; the value stays a string, like the web form inputs. */
export function NumberField(props: Omit<Parameters<typeof Field>[0], "keyboardType"> & { decimal?: boolean }) {
  return <Field {...props} keyboardType={props.decimal === false ? "number-pad" : "decimal-pad"} />;
}

export function PasswordField(props: Omit<Parameters<typeof Field>[0], "secureTextEntry" | "right"> & { newPassword?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      autoComplete={props.newPassword ? "new-password" : "current-password"}
      right={
        <Button accessibilityLabel={visible ? "Hide password" : "Show password"} onPress={() => setVisible((value) => !value)} size="sm" variant="ghost">
          {visible ? "Hide" : "Show"}
        </Button>
      }
      secureTextEntry={!visible}
      textContentType={props.newPassword ? "newPassword" : "password"}
    />
  );
}

/** A row of buttons where one is chosen (web .segmented). */
export function Segmented<T extends string>({ options, value, onChange, label, style }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={[{ flexDirection: "row", gap: 4, borderRadius: radius.control, borderWidth: 1, borderColor: colors.edge, backgroundColor: colors.field, padding: 4 }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{ flex: 1, minHeight: 38, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, backgroundColor: selected ? colors.accent : "transparent" }}
          >
            <Text style={{ color: selected ? colors.onAccent : colors.muted, fontFamily: fonts.semibold, fontSize: 14 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small round toggle for foods, days and filters (web .chip). */
export function Chip({ label, selected, onPress, accessibilityHint, disabled }: { label: string; selected?: boolean; onPress?: () => void; accessibilityHint?: string; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole={onPress ? "checkbox" : "text"}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.selectedEdge : colors.edge,
        backgroundColor: selected ? colors.selected : colors.field,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 38,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {selected ? <Icon color={colors.ink} name="check" size={14} /> : null}
      <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

/** A larger option with a title and a line of detail (web .choice). */
export function Choice({ title, detail, selected, onPress, kind = "radio", style, children }: { title: string; detail?: string; selected: boolean; onPress: () => void; kind?: "radio" | "checkbox"; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}
      style={[{ flexDirection: "row", gap: 12, borderRadius: radius.control, borderWidth: 1, borderColor: selected ? colors.selectedEdge : colors.edge, backgroundColor: selected ? colors.selected : colors.field, padding: 12, minHeight: 46 }, style]}
    >
      <Mark kind={kind} selected={selected} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="semibold">{title}</Txt>
        {detail ? <Txt tone="muted" variant="small">{detail}</Txt> : null}
        {children}
      </View>
    </Pressable>
  );
}

function Mark({ kind, selected }: { kind: "radio" | "checkbox"; selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginTop: 2,
        width: 20,
        height: 20,
        borderRadius: kind === "radio" ? 10 : 5,
        borderWidth: 2,
        borderColor: selected ? colors.selectedEdge : colors.edge,
        backgroundColor: selected && kind === "checkbox" ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected && kind === "radio" ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.selectedEdge }} /> : null}
      {selected && kind === "checkbox" ? <Icon color={colors.onAccent} name="check" size={14} strokeWidth={3} /> : null}
    </View>
  );
}

export function Checkbox({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: (checked: boolean) => void; detail?: string }) {
  return <Choice detail={detail} kind="checkbox" onPress={() => onChange(!checked)} selected={checked} title={label} />;
}

/** Messages always carry words, so colour is never the only signal. */
export function Alert({ tone, children, style }: { tone: "danger" | "warn" | "success" | "info"; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const look = {
    danger: { bg: colors.dangerBg, fg: colors.danger, border: "transparent" },
    warn: { bg: colors.warnBg, fg: colors.warn, border: "transparent" },
    success: { bg: colors.successBg, fg: colors.ink, border: colors.successEdge },
    info: { bg: colors.tile, fg: colors.ink, border: colors.line },
  }[tone];
  return (
    <View
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      style={[{ borderRadius: radius.control, padding: 12, backgroundColor: look.bg, borderWidth: 1, borderColor: look.border }, style]}
    >
      {typeof children === "string" ? <Text style={{ color: look.fg, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}
    </View>
  );
}

export function FormError({ message, style }: { message?: string | null; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  return <Alert style={style} tone="danger">{message}</Alert>;
}

/** A thin bar, filled to `value` (0 to 1). */
export function ProgressBar({ value, color, height = 8, label }: { value: number; color?: string; height?: number; label?: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height, backgroundColor: colors.track, overflow: "hidden" }}
    >
      <View style={{ width: `${clamped * 100}%`, height: "100%", borderRadius: height, backgroundColor: color ?? colors.accent }} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.line }, style]} />;
}

/** A label and a value in a tile, like the web stat tiles. */
export function Stat({ label, value, note, style }: { label: string; value: ReactNode; note?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Tile style={[{ gap: 2, padding: 14 }, style]}>
      <Txt tone="muted" variant="small">{label}</Txt>
      {typeof value === "string" || typeof value === "number" ? <Txt style={{ fontVariant: ["tabular-nums"] }} variant="h2">{value}</Txt> : value}
      {note ? <Txt tone="muted" variant="xs">{note}</Txt> : null}
    </Tile>
  );
}

export function Row({ children, gap = 12, style, wrap, align = "center" }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; align?: ViewStyle["alignItems"] }) {
  return <View style={[{ flexDirection: "row", alignItems: align, gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style, onLayout }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; onLayout?: ViewProps["onLayout"] }) {
  return <View onLayout={onLayout} style={[{ gap }, style]}>{children}</View>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  const { colors } = useTheme();
  return <ActivityIndicator accessibilityLabel={label} color={colors.accentText} size="large" />;
}
