import { router } from "expo-router";
import { View } from "react-native";
import { DISCLAIMER } from "@/lib/legal";
import { useTheme } from "~/theme/theme";
import { Row, TextLink, Txt } from "./ui";

// The web footer: the health disclaimer (docs/PLAN.md) and the legal and help links.
export function LegalFooter() {
  const { colors } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, gap: 4 }}>
      <Txt center tone="muted" variant="small">{DISCLAIMER}</Txt>
      <Row gap={16} style={{ justifyContent: "center" }}>
        <TextLink onPress={() => router.push("/privacy")} tone="muted">Privacy</TextLink>
        <TextLink onPress={() => router.push("/terms")} tone="muted">Terms</TextLink>
        <TextLink onPress={() => router.push("/glossary")} tone="muted">Glossary</TextLink>
      </Row>
    </View>
  );
}
