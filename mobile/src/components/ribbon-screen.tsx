import { Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps, ReactNode } from "react";
import { ThemeOverride, useTheme } from "~/theme/theme";
import { fonts, palettes, type Palette } from "~/theme/tokens";
import { RibbonBackground } from "./ribbon-background";
import { Screen } from "./screen";

// The welcome and log-in screens: always dark with the light ribbon behind them, like the web's landing and
// auth pages (AuthScene). Cards are slightly see-through so the ribbon glows behind them. The web blurs what
// is behind its cards; phones do not blur cheaply, so the cards stay at 90% to keep grey text readable
// where a bright line crosses.
const scenePalette: Palette = { ...palettes.dark, card: "rgba(34,38,36,0.9)" };

// The dark scene palette for a whole route. A screen that reads useTheme() itself (welcome) wraps its
// export in this, so its own colours are dark too, not just the parts inside RibbonScreen.
export function SceneTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeOverride colors={scenePalette} name="dark">
      {children}
    </ThemeOverride>
  );
}

export function RibbonScreen({ getIndex, ...props }: ComponentProps<typeof Screen> & { getIndex?: () => number }) {
  return (
    <SceneTheme>
      <SceneChrome />
      <Screen {...props} background={<RibbonBackground getIndex={getIndex} />} />
    </SceneTheme>
  );
}

// A dark header and light status bar for this screen, whatever the saved theme. The status bar is set only
// while the screen is on top, so the screen under the next one does not keep it.
function SceneChrome() {
  const { colors } = useTheme();
  const focused = useIsFocused();
  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
          contentStyle: { backgroundColor: colors.page },
        }}
      />
      {focused ? <StatusBar style="light" /> : null}
    </>
  );
}
