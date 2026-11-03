import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View, type LayoutChangeEvent } from "react-native";
import { faqAnswer, FAQ_EYEBROW, FAQ_HEADING, FAQ_ITEMS, type FaqItem } from "@/lib/landing-faq";
import { ACCOUNT_DELETED_NOTICE, HERO_HEADLINE, HERO_ITALIC_WORD, HERO_LOG_IN, HERO_OWN_TARGET, HERO_PRIMARY, HERO_ROADMAP, HERO_SUPPORT, HONEST_ESTIMATES_LINE } from "@/lib/landing-content";
import { stopIndex } from "@/lib/ribbon-gate";
import { LegalFooter } from "~/components/legal-footer";
import { Logo } from "~/components/logo";
import { RibbonScreen, SceneTheme } from "~/components/ribbon-screen";
import { Alert, Button, TextLink, Txt } from "~/components/ui";
import { HeroPanel } from "~/features/landing-previews";
import { LandingRoadmap } from "~/features/landing-roadmap";
import { LandingScrollProvider } from "~/features/landing-scroll";
import { useReducedMotion } from "~/lib/use-reduced-motion";
import { ribbonStops } from "~/lib/ribbon-stops";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";

// The signed-out home screen: the web landing page (src/app/page.tsx) on a phone, section for section. A sticky
// bar, the hero with the Today preview, the five-stage roadmap with its App previews, "Before you start", the
// final call to action and the footer, over the light ribbon. The words come from the web's own content files.
export default function Welcome() {
  return (
    <SceneTheme>
      <WelcomeScreen />
    </SceneTheme>
  );
}

function WelcomeScreen() {
  const { account } = useLocalSearchParams<{ account?: string }>();
  const scroll = useWelcomeScroll();
  const scrollRef = useRef<ScrollView>(null);
  const [navHeight, setNavHeight] = useState(0);
  const [heroPanelTop, setHeroPanelTop] = useState<number>();
  const [roadmapTop, setRoadmapTop] = useState<number>();

  const seeRoadmap = () => {
    if (roadmapTop !== undefined) scrollRef.current?.scrollTo({ y: Math.max(roadmapTop - navHeight, 0), animated: true });
  };

  return (
    <LandingScrollProvider value={scroll.context}>
      <RibbonScreen
        contentStyle={{ paddingHorizontal: 0, paddingTop: 0, gap: 0 }}
        getIndex={scroll.getIndex}
        scrollProps={scroll.scrollProps}
        scrollRef={scrollRef}
        topInset
      >
        <StickyNav onLayout={(event) => setNavHeight(event.nativeEvent.layout.height)} />

        <View style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40, gap: 40 }}>
          <View>
            {account === "deleted" ? <Alert style={{ marginBottom: 24 }} tone="success">{ACCOUNT_DELETED_NOTICE}</Alert> : null}
            <Hero />
            <LandingActions onSeeRoadmap={seeRoadmap} />
          </View>
          <View onLayout={(event) => setHeroPanelTop(event.nativeEvent.layout.y)}>
            <HeroPanel at={heroPanelTop} />
          </View>
        </View>

        <View onLayout={(event) => setRoadmapTop(event.nativeEvent.layout.y)}>
          <LandingRoadmap onPreviewCenters={scroll.setPreviewCenters} top={roadmapTop} />
        </View>

        <Faq />

        <FinalCta onSeeRoadmap={seeRoadmap} />

        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <LegalFooter />
        </View>
      </RibbonScreen>
    </LandingScrollProvider>
  );
}

// The web's sticky bar: RvFit, Log in and the primary action. The web's glass is blurred; phones do not blur
// cheaply, so the bar is nearly solid to keep text that scrolls under it from showing through.
function StickyNav({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) {
  const { colors } = useTheme();
  return (
    <View
      onLayout={onLayout}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: "rgba(22,26,24,0.96)" }}
    >
      <View style={{ marginRight: "auto" }}>
        <Logo size={26} />
      </View>
      <Button onPress={() => router.push("/login")} size="sm" variant="ghost">{HERO_LOG_IN.label}</Button>
      <Button onPress={() => router.push("/start")} size="sm">{HERO_PRIMARY.label}</Button>
    </View>
  );
}

function Hero() {
  const { colors } = useTheme();
  const [before, after] = HERO_HEADLINE.split(HERO_ITALIC_WORD);
  return (
    <View>
      <Text style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentText }}>RvFit</Text>
      <Text accessibilityRole="header" style={{ marginTop: 16, fontFamily: fonts.bold, fontSize: 48, lineHeight: 52, letterSpacing: -1.4, color: colors.ink }}>
        {before}
        <Text style={{ fontFamily: fonts.serifItalic, fontSize: 54, letterSpacing: -0.5 }}>{HERO_ITALIC_WORD}</Text>
        {after}
      </Text>
      <Txt style={{ marginTop: 24, fontSize: 18, lineHeight: 32 }} tone="muted">{HERO_SUPPORT}</Txt>
    </View>
  );
}

// The four landing actions, in the hero and again in the final call to action.
// Both target actions go to Start setup, so the age checkbox is never skipped.
function LandingActions({ onSeeRoadmap }: { onSeeRoadmap: () => void }) {
  return (
    <View style={{ marginTop: 36 }}>
      <View style={{ gap: 12 }}>
        <Button full onPress={() => router.push("/start")}>{HERO_PRIMARY.label}</Button>
        <Button full onPress={onSeeRoadmap} variant="secondary">{HERO_ROADMAP.label}</Button>
      </View>
      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TextLink onPress={() => router.push("/start")} tone="muted">{HERO_OWN_TARGET.label}</TextLink>
        <Txt tone="muted">·</Txt>
        <TextLink onPress={() => router.push("/login")} tone="muted">{HERO_LOG_IN.label}</TextLink>
      </View>
    </View>
  );
}

// "Before you start": the honest-estimates line as a large quote, then the FAQ. Tap a question to open it;
// the plus turns into a cross, as on the web.
function Faq() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingVertical: 64, gap: 40 }}>
      <View>
        <Text style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentText }}>{FAQ_EYEBROW}</Text>
        <Text accessibilityRole="header" style={{ marginTop: 12, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink }}>{FAQ_HEADING}</Text>
        {/* The plan's honest-estimates line, word for word. */}
        <View style={{ marginTop: 32, borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 20 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.4, color: colors.ink }}>{HONEST_ESTIMATES_LINE}</Text>
        </View>
      </View>
      <View style={{ borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 20 }}>
        {FAQ_ITEMS.map((item, index) => (
          <FaqRow expanded={open === index} first={index === 0} item={item} key={item.question} onToggle={() => setOpen(open === index ? null : index)} />
        ))}
      </View>
    </View>
  );
}

function FaqRow({ item, expanded, first, onToggle }: { item: FaqItem; expanded: boolean; first: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  const [turn] = useState(() => new Animated.Value(0));
  const toggle = () => {
    Animated.timing(turn, { toValue: expanded ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    onToggle();
  };
  const link = item.link;
  // The web answer says "your browser's local storage"; in the app it is this phone.
  const sentences = item.sentences.join(" ").replace("your browser's local storage", "this app on your phone");
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>
      <Pressable accessibilityLabel={item.question} accessibilityRole="button" accessibilityState={{ expanded }} onPress={toggle} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 20 }}>
        {({ pressed }) => (
          <>
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: pressed ? colors.accentText : colors.ink }}>{item.question}</Text>
            <Animated.View style={{ width: 16, height: 16, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }] }}>
              <View style={{ position: "absolute", left: 0, right: 0, top: 7, height: 2, borderRadius: 1, backgroundColor: colors.accentText }} />
              <View style={{ position: "absolute", top: 0, bottom: 0, left: 7, width: 2, borderRadius: 1, backgroundColor: colors.accentText }} />
            </Animated.View>
          </>
        )}
      </Pressable>
      {expanded ? (
        <View accessibilityLabel={faqAnswer(item)} style={{ paddingBottom: 20, paddingRight: 32 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 28, color: colors.muted }}>
            {item.lead ? <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>{item.lead} </Text> : null}
            {sentences}
          </Text>
          {link ? <TextLink onPress={() => router.push(link.href === "/start" ? "/start" : "/privacy")}>{link.label}</TextLink> : null}
        </View>
      ) : null}
    </View>
  );
}

function FinalCta({ onSeeRoadmap }: { onSeeRoadmap: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingVertical: 64 }}>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink }}>Start with a number you can use.</Text>
      <LandingActions onSeeRoadmap={onSeeRoadmap} />
    </View>
  );
}

// The scroll position for the ribbon and the roadmap. It is driven on the native side (so the roadmap line follows
// the finger), and copied to a ref for the ribbon, whose camera moves one stop per stage preview like the web's.
function useWelcomeScroll() {
  const reducedMotion = useReducedMotion();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [viewport, setViewport] = useState(0);
  const offset = useRef(0);
  const content = useRef(0);
  const centers = useRef<number[]>([]);
  const stops = useRef<number[]>([0]);
  const viewportRef = useRef(0);

  const measure = useCallback(() => {
    stops.current = ribbonStops(centers.current, viewportRef.current, content.current);
  }, []);
  const setPreviewCenters = useCallback(
    (next: number[]) => {
      centers.current = next;
      measure();
    },
    [measure],
  );
  const getIndex = useCallback(() => stopIndex(offset.current, stops.current), []);
  const getScrollY = useCallback(() => offset.current, []);
  // A listener also makes the native side send each scroll position back to JavaScript, for the ribbon.
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      offset.current = value;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const scrollProps = useMemo(
    () => ({
      scrollEventThrottle: 16,
      stickyHeaderIndices: [0],
      onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
      onLayout: (event: LayoutChangeEvent) => {
        viewportRef.current = event.nativeEvent.layout.height;
        setViewport(event.nativeEvent.layout.height);
        measure();
      },
      onContentSizeChange: (_width: number, height: number) => {
        content.current = height;
        measure();
      },
    }),
    [scrollY, measure],
  );

  const context = useMemo(() => ({ scrollY, getScrollY, viewport, reducedMotion }), [scrollY, getScrollY, viewport, reducedMotion]);
  return { context, getIndex, scrollProps, setPreviewCenters };
}
