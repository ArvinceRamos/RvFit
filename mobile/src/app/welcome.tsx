import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { faqAnswer, FAQ_HEADING, FAQ_ITEMS } from "@/lib/landing-faq";
import { ACCOUNT_DELETED_NOTICE, HERO_HEADLINE, HERO_ITALIC_WORD, HERO_SUPPORT, HONEST_ESTIMATES_LINE, STAGES } from "@/lib/landing-content";
import { Icon } from "~/components/icon";
import { LegalFooter } from "~/components/legal-footer";
import { Logo } from "~/components/logo";
import { Screen } from "~/components/screen";
import { Alert, Button, Card, Row, Stack, TextLink, Txt } from "~/components/ui";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";

// The signed-out home screen, adapted from the web landing page (docs/PHASE5.md): the same hero words
// and actions, then the five stages as a short list. The web's 3D hero and screenshot previews are
// desktop enhancements and are left out on phones.
export default function Welcome() {
  const { colors } = useTheme();
  const { account } = useLocalSearchParams<{ account?: string }>();
  const [before, after] = HERO_HEADLINE.split(HERO_ITALIC_WORD);

  return (
    <Screen topInset>
      <Row style={{ justifyContent: "space-between" }}>
        <Logo />
        <Button onPress={() => router.push("/login")} size="sm" variant="ghost">Log in</Button>
      </Row>

      {account === "deleted" ? <Alert tone="success">{ACCOUNT_DELETED_NOTICE}</Alert> : null}

      <Stack gap={16} style={{ paddingTop: 24 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.8, color: colors.accentText, textTransform: "uppercase" }}>RvFit</Text>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 46, lineHeight: 50, letterSpacing: -1.4, color: colors.ink }}>
          {before}
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 52, letterSpacing: -0.5 }}>{HERO_ITALIC_WORD}</Text>
          {after}
        </Text>
        <Txt style={{ fontSize: 18, lineHeight: 28 }} tone="muted">{HERO_SUPPORT}</Txt>
      </Stack>

      <Stack gap={12}>
        {/* Both target actions go to Start setup, so the age checkbox is never skipped. */}
        <Button full onPress={() => router.push("/start")}>Get my starting estimate</Button>
        <Button full onPress={() => router.push("/signup")} variant="secondary">Create a free account</Button>
        <Row gap={6} style={{ justifyContent: "center" }}>
          <TextLink onPress={() => router.push("/start")} tone="muted">Enter my own target</TextLink>
          <Txt tone="muted">·</Txt>
          <TextLink onPress={() => router.push("/login")} tone="muted">Log in</TextLink>
        </Row>
      </Stack>

      <Stack gap={12} style={{ paddingTop: 16 }}>
        <Txt variant="eyebrow">How it works</Txt>
        {STAGES.map((stage) => (
          <Card compact key={stage.number}>
            <Row align="flex-start" gap={14}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.onAccent }}>{stage.number}</Text>
              </View>
              <Stack gap={6} style={{ flex: 1 }}>
                <Txt variant="h2">{stage.title}</Txt>
                <Txt tone="muted" variant="small">{stage.sentence}</Txt>
                {stage.features.map((feature) => (
                  <Row align="flex-start" gap={8} key={feature}>
                    <View style={{ paddingTop: 2 }}><Icon color={colors.accentText} name="check" size={14} /></View>
                    <Txt style={{ flex: 1 }} variant="small">{feature}</Txt>
                  </Row>
                ))}
              </Stack>
            </Row>
          </Card>
        ))}
        <Alert tone="info">{HONEST_ESTIMATES_LINE}</Alert>
      </Stack>

      <Faq />

      <Card>
        <Stack gap={12}>
          <Txt variant="h1">Start with a number you can use.</Txt>
          <Button full onPress={() => router.push("/start")}>Get my starting estimate</Button>
        </Stack>
      </Card>

      <LegalFooter />
    </Screen>
  );
}

// "Before you start": tap a question to open its answer.
function Faq() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Stack gap={8}>
      <Txt variant="eyebrow">Questions</Txt>
      <Txt variant="h1">{FAQ_HEADING}</Txt>
      <Card compact style={{ paddingVertical: 4 }}>
        {FAQ_ITEMS.map((item, index) => {
          const expanded = open === index;
          const link = item.link;
          return (
            <View key={item.question} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : index)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}
              >
                <Txt style={{ flex: 1 }} weight="semibold">{item.question}</Txt>
                <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
                  <Icon color={colors.muted} name="chevron-down" />
                </View>
              </Pressable>
              {expanded ? (
                <Stack gap={4} style={{ paddingBottom: 14 }}>
                  {/* The web answer says "your browser's local storage"; in the app it is this phone. */}
                  <Txt tone="muted" variant="small">{faqAnswer(item).replace("your browser's local storage", "this app on your phone")}</Txt>
                  {link ? <TextLink onPress={() => router.push(link.href === "/start" ? "/start" : "/privacy")} tone="accent">{link.label}</TextLink> : null}
                </Stack>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Stack>
  );
}
