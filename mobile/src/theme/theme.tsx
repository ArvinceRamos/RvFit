import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { palettes, type Palette, type ThemeName } from "./tokens";

// Like the web header toggle: follow the device until the user picks a theme, then remember it.
export type ThemeChoice = ThemeName | "system";

const THEME_KEY = "theme";

function readChoice(): ThemeChoice {
  try {
    const saved = globalThis.localStorage?.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

type ThemeContextValue = { name: ThemeName; colors: Palette; choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  // The web app is dark unless the device asks for light, so an unknown device setting is dark.
  const name: ThemeName = choice === "system" ? (device === "light" ? "light" : "dark") : choice;

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      if (next === "system") globalThis.localStorage?.removeItem(THEME_KEY);
      else globalThis.localStorage?.setItem(THEME_KEY, next);
    } catch {
      // Storage can fail; the choice still applies until the app closes.
    }
  }, []);

  const value = useMemo(() => ({ name, colors: palettes[name], choice, setChoice }), [name, choice, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// A part of the app that always uses one palette, whatever the saved theme (the welcome and log-in screens
// are always dark, like the web's landing and auth pages).
export function ThemeOverride({ name, colors, children }: { name: ThemeName; colors: Palette; children: ReactNode }) {
  const parent = useTheme();
  const value = useMemo(() => ({ ...parent, name, colors }), [parent, name, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
