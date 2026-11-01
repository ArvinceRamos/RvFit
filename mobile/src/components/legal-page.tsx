import * as Linking from "expo-linking";
import type { ReactNode } from "react";
import { View } from "react-native";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";
import { useTheme } from "~/theme/theme";
import { Screen } from "./screen";
import { Alert, Stack, TextLink, Txt } from "./ui";

// The web LegalPage: the date, the draft note, then sections.
export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <Txt tone="muted" variant="small">Last updated {LEGAL_UPDATED}</Txt>
      <Alert tone="warn">Draft, not yet reviewed. RvFit is a private test for friends and family, and this text has not been checked by a lawyer.</Alert>
      <Stack gap={20}>{children}</Stack>
    </Screen>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={6}>
      <Txt variant="section">{title}</Txt>
      {children}
    </Stack>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Txt style={{ lineHeight: 26 }}>{children}</Txt>;
}

export function Bullets({ items }: { items: string[] }) {
  const { colors } = useTheme();
  return (
    <Stack gap={6}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted, marginTop: 10 }} />
          <Txt style={{ flex: 1, lineHeight: 26 }}>{item}</Txt>
        </View>
      ))}
    </Stack>
  );
}

export function ContactLink() {
  return <TextLink onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>{CONTACT_EMAIL}</TextLink>;
}
