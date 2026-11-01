import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";
import { Card, Row, Stack, Txt } from "./ui";

// The web AuthCard: a title with a small mono label chip ("Welcome back", "Free account").
export function AuthCard({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Stack gap={20}>
        <Row align="flex-start" style={{ justifyContent: "space-between" }}>
          <Txt style={{ flex: 1 }} variant="h1">{title}</Txt>
          <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 2, marginTop: 6 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted }}>{label}</Text>
          </View>
        </Row>
        {children}
      </Stack>
    </Card>
  );
}
