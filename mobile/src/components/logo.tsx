import { Image } from "expo-image";
import { Text, View } from "react-native";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";

// The RvFit mark and wordmark: "Rv" in the accent colour, "Fit" in the text colour.
export function Logo({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="RvFit" accessibilityRole="image" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image accessibilityIgnoresInvertColors source={require("../../assets/images/logo-mark.png")} style={{ width: size, height: size }} />
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.68, color: colors.ink }}>
        <Text style={{ color: colors.accentText }}>Rv</Text>Fit
      </Text>
    </View>
  );
}
