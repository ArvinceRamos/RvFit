import "~/lib/polyfills";
import "expo-sqlite/localStorage/install";

import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OfflineBanner } from "~/components/offline-banner";
import { ErrorView } from "~/components/screen";
import { AuthProvider, useAuth } from "~/lib/auth";
import { missingEnv } from "~/lib/env";
import { queryClient } from "~/lib/query";
import { ThemeProvider, useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: Geist_400Regular,
    [fonts.medium]: Geist_500Medium,
    [fonts.semibold]: Geist_600SemiBold,
    [fonts.bold]: Geist_700Bold,
    [fonts.serifItalic]: InstrumentSerif_400Regular_Italic,
    [fonts.mono]: GeistMono_500Medium,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              {/* Without the fonts the app still works, in the system font. */}
              {fontsLoaded || fontError ? <Navigation /> : null}
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  const { colors, name } = useTheme();
  const { session, loading } = useAuth();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.page);
  }, [colors.page]);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  const configError = missingEnv();
  if (configError) return <ErrorView message={configError} />;
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.page }} />;

  const signedIn = session !== null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <StatusBar style={name === "dark" ? "light" : "dark"} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Signed out only. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Log in" }} />
          <Stack.Screen name="signup" options={{ title: "Create account" }} />
          <Stack.Screen name="forgot-password" options={{ title: "Reset password" }} />
        </Stack.Protected>

        {/* Signed in only. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="week" options={{ title: "This week" }} />
          <Stack.Screen name="meal/new" options={{ title: "New meal" }} />
          <Stack.Screen name="meal/[id]" options={{ title: "Edit meal" }} />
          <Stack.Screen name="meal/plan" options={{ title: "Meal planner" }} />
          <Stack.Screen name="foods" options={{ title: "Browse foods" }} />
          <Stack.Screen name="workout/new" options={{ title: "Log workout" }} />
          <Stack.Screen name="workout/[id]" options={{ title: "Edit workout" }} />
          <Stack.Screen name="preferences" options={{ title: "Preferences" }} />
        </Stack.Protected>

        {/* Both: the guest setup works signed in too (Results then saves straight to the account). */}
        <Stack.Screen name="start" options={{ title: "Start setup" }} />
        <Stack.Screen name="calculate" options={{ title: "Calculate my estimate" }} />
        <Stack.Screen name="manual" options={{ title: "Enter my own target" }} />
        <Stack.Screen name="results" options={{ title: "Your estimate" }} />
        <Stack.Screen name="reset-password" options={{ title: "Choose a new password" }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="terms" options={{ title: "Terms" }} />
        <Stack.Screen name="glossary" options={{ title: "Glossary" }} />
      </Stack>
    </View>
  );
}
