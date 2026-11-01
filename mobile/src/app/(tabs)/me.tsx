import { router } from "expo-router";
import { useRef } from "react";
import type { ScrollView } from "react-native";
import type { ActivityLevel, FormulaBranch } from "@/lib/calc/config";
import { loadCheckInData } from "@/lib/check-in-data";
import { savedDisplayName } from "@/lib/display-name";
import { DISCLAIMER } from "@/lib/legal";
import { Icon } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Alert, Button, Card, Row, Stack, TextLink, Txt } from "~/components/ui";
import { AccountCard, AppearanceCard, DeleteAccountSection, HelpLinks, LogoutButton } from "~/features/account-cards";
import { CheckInCard } from "~/features/check-in-card";
import { ProfileForm, type CurrentTarget, type SavedProfile } from "~/features/profile-form";
import { useUser } from "~/lib/auth";
import { keys } from "~/lib/query";
import { sharedClient, supabase } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";
import { useTheme } from "~/theme/theme";

// The same reads as the web Profile page.
async function loadMe() {
  const [{ data: profile, error: profileError }, { data: targets, error: targetError }, { data: weighIns, error: weightError }, checkInData] = await Promise.all([
    supabase.from("profiles").select("age_years, sex_formula_branch, height_cm, activity_level, preferred_units").maybeSingle(),
    supabase.from("calorie_targets").select("source, target_kcal, goal, pace, protein_g, carbs_g, fat_g, fiber_g, calculation_inputs, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("body_logs").select("weight_kg").not("weight_kg", "is", null).order("logged_at", { ascending: false }).limit(1),
    loadCheckInData(sharedClient, Date.now()),
  ]);
  if (profileError || targetError || weightError || checkInData === "error") return { ok: false as const, error: "Your profile could not be loaded. Please try again." };
  const saved: SavedProfile | null = profile
    ? {
        age_years: profile.age_years === null ? null : Number(profile.age_years),
        sex: (profile.sex_formula_branch as FormulaBranch | null) ?? null,
        height_cm: profile.height_cm === null ? null : Number(profile.height_cm),
        activity: (profile.activity_level as ActivityLevel | null) ?? null,
        units: profile.preferred_units === "imperial" ? "imperial" : "metric",
      }
    : null;
  const row = targets?.[0];
  const inputs = row?.calculation_inputs as Record<string, unknown> | null | undefined;
  const current: CurrentTarget | null = row
    ? {
        source: row.source as "calculated" | "manual",
        fromCheckIn: Boolean(inputs && typeof inputs === "object" && "check_in" in inputs),
        kcal: Number(row.target_kcal),
        goal: (row.goal as CurrentTarget["goal"]) ?? null,
        pace: (row.pace as CurrentTarget["pace"]) ?? null,
        macros: { protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) },
        created_at: row.created_at as string,
      }
    : null;
  return { ok: true as const, profile: saved, current, latestWeightKg: weighIns?.[0] ? Number(weighIns[0].weight_kg) : null, checkIn: checkInData };
}

// Me (web: /profile): Profile and targets, then account settings, Preferences, help and deletion.
export default function Me() {
  const user = useUser();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const screen = useScreenData([...keys.profile, "me"], loadMe);
  if (screen.loading) return <LoadingView label="Loading your profile…" />;
  if (!screen.data && screen.offline) return <ErrorView message="" offline onRetry={screen.retry} />;
  const data = screen.data;

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} scrollRef={scrollRef} topInset>
      <Txt variant="title">Profile and targets</Txt>
      <Card compact>
        <Row gap={12}>
          <Icon color={colors.accentText} name="preferences" size={22} />
          <Stack gap={2} style={{ flex: 1 }}>
            <Txt weight="semibold">Preferences</Txt>
            <Txt tone="muted" variant="small">Allergies, avoided foods and your training plan.</Txt>
          </Stack>
          <Button onPress={() => router.push("/preferences")} size="sm" variant="secondary">Open</Button>
        </Row>
      </Card>

      {!data ? (
        <Alert tone="danger">{screen.error ?? "Your profile could not be loaded. Please try again."}</Alert>
      ) : !data.profile ? (
        // The profile and its age confirmation are created when the first target is saved.
        <Txt tone="muted" variant="small">You do not have a saved target yet. <TextLink onPress={() => router.push("/start")}>Set up a target</TextLink>, then press Save to my account.</Txt>
      ) : (
        <>
          {data.checkIn ? <CheckInCard checkIn={data.checkIn.checkIn} units={data.profile.units} /> : null}
          <ProfileForm current={data.current} latestWeightKg={data.latestWeightKg} profile={data.profile} scrollRef={scrollRef} />
        </>
      )}

      <AccountCard email={user.email ?? ""} name={savedDisplayName(user.user_metadata)} />
      <AppearanceCard />
      <LogoutButton />
      <HelpLinks />
      <DeleteAccountSection />
      <Txt center tone="muted" variant="xs">{DISCLAIMER}</Txt>
    </Screen>
  );
}
