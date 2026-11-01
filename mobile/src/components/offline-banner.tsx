import { useNetInfo } from "@react-native-community/netinfo";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/theme/theme";
import { Icon } from "./icon";
import { Txt } from "./ui";

// A slim notice at the top while the phone has no connection. Saves fail with their own message,
// and screens keep showing the last loaded data.
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (isConnected !== false) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{ position: "absolute", top: insets.top + 4, left: 16, right: 16, zIndex: 50, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card, boxShadow: colors.shadowFloat, borderWidth: 1, borderColor: colors.warn }}
      pointerEvents="none"
    >
      <Icon color={colors.warn} name="wifi-off" size={14} />
      <Txt tone="warn" variant="xs" weight="semibold">Offline. Changes cannot be saved until you reconnect.</Txt>
    </View>
  );
}
