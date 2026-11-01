import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/theme/theme";
import { Button, Spinner, Stack, Txt } from "./ui";
import { Icon } from "./icon";

// One page: the theme's background, safe areas, a scroll view that stays clear of the keyboard,
// and pull to refresh when the page loads data. Content is capped at 640 points wide so tablets
// and landscape phones keep a readable column, like the web's centred pages.
export function Screen({
  children,
  refreshing,
  onRefresh,
  topInset = false,
  contentStyle,
  footer,
  scroll = true,
  scrollRef,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  // Screens without a navigation header (tab roots, the welcome screen) pad below the status bar.
  topInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  // Pinned under the scroll view, above the keyboard (for example a Save button).
  footer?: ReactNode;
  scroll?: boolean;
  scrollRef?: React.Ref<ScrollView>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: footer ? 16 : 32 + (topInset ? 0 : insets.bottom),
    gap: 16,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  };
  return (
    // Screens without a header start below the status bar, so scrolled text never runs under it.
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.page, paddingTop: topInset ? insets.top : 0 }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          refreshControl={onRefresh ? <RefreshControl colors={[colors.onAccent]} onRefresh={onRefresh} progressBackgroundColor={colors.accent} refreshing={!!refreshing} tintColor={colors.accentText} /> : undefined}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[padding, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.page }}>
          <View style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function LoadingView({ label = "Loading…" }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={label} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.page }}>
      <Spinner label={label} />
      <Txt tone="muted" variant="small">{label}</Txt>
    </View>
  );
}

/** A load that failed: the message and a Retry button. Offline gets its own words. */
export function ErrorView({ message, onRetry, offline }: { message: string; onRetry?: () => void; offline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.page }}>
      <Stack gap={12} style={{ alignItems: "center", maxWidth: 360 }}>
        {offline ? <Icon color={colors.muted} name="wifi-off" size={32} /> : null}
        <Txt center variant="h2">{offline ? "You are offline" : "Something went wrong"}</Txt>
        <Txt center tone="muted">{offline ? "Check your connection, then try again." : message}</Txt>
        {onRetry ? <Button onPress={onRetry}>Try again</Button> : null}
      </Stack>
    </View>
  );
}
