import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { checkMacroMismatch, expectedWeeklyChangeKg, validateMacroEdit, type MacroEdit } from "@/lib/calc/calculate";
import { formatGrams, formatKcal, formatWeeklyRate } from "@/lib/remaining-format";
import { Icon } from "~/components/icon";
import { LegalFooter } from "~/components/legal-footer";
import { Screen } from "~/components/screen";
import { Alert, Button, Card, NumberField, Row, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { saveDraft, useGuestDraft } from "~/lib/guest-draft-store";
import { supabase } from "~/lib/supabase";
import { useTheme } from "~/theme/theme";

type AccountState = "checking" | "guest" | "no-target" | "has-target";

// Who is looking, so the save action fits: a guest creates an account, a signed-in user without
// targets saves straight to the account, and a user with targets is pointed to Me instead.
function useAccountState(): AccountState {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["profile", "has-target", session?.user.id],
    enabled: session !== null,
    queryFn: async () => {
      const { data, error } = await supabase.from("calorie_targets").select("id").limit(1);
      // On a read error, offer the save; Today checks again before saving anything.
      return !error && data && data.length > 0;
    },
  });
  if (!session) return "guest";
  if (query.isPending) return "checking";
  return query.data ? "has-target" : "no-target";
}

const macroNotes: Record<keyof MacroEdit, string> = {
  protein_g: "Helps keep and build muscle.",
  carbs_g: "Main fuel for training and daily energy.",
  fat_g: "Needed for hormones and absorbing vitamins.",
  fiber_g: "Helps fullness and digestion. Counted inside carbs.",
};

const macroLabels: [keyof MacroEdit, string][] = [["protein_g", "Protein"], ["carbs_g", "Carbohydrates"], ["fat_g", "Fat"], ["fiber_g", "Fiber"]];

export default function Results() {
  const draft = useGuestDraft();
  const account = useAccountState();
  const { colors } = useTheme();
  const [macros, setMacros] = useState<MacroEdit>();
  // Typed text per macro, so a half-typed number is not rejected on every keystroke.
  const [typed, setTyped] = useState<Partial<Record<keyof MacroEdit, string>>>({});
  const [error, setError] = useState<string>();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const displayedMacros = macros ?? draft.target?.macros;

  function editMacro(name: keyof MacroEdit, value: string) {
    setTyped((current) => ({ ...current, [name]: value }));
    if (!draft.target || !displayedMacros) return;
    const next = { ...displayedMacros, [name]: Number(value) };
    const validation = validateMacroEdit(next, draft.target.target_kcal);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    setMacros(validation.data);
    saveDraft((current) => (current.target ? { ...current, target: { ...current.target, macros: validation.data } } : current));
  }

  if (!draft.target || !displayedMacros) {
    const signedIn = account === "has-target" || account === "no-target";
    return (
      <Screen>
        <Card>
          <Stack gap={12}>
            <Txt variant="h1">No target yet</Txt>
            <Txt tone="muted">{signedIn ? "Nothing is waiting to be saved here. If you already saved your targets, find them on Today." : "Start by choosing a target method."}</Txt>
            <Button full onPress={() => router.replace("/start")}>Start setup</Button>
            {signedIn ? <Button full onPress={() => router.replace("/today")} variant="secondary">Go to Today</Button> : null}
          </Stack>
        </Card>
      </Screen>
    );
  }

  const target = draft.target;
  const mismatch = checkMacroMismatch(displayedMacros, target.target_kcal);
  const units = draft.profile?.preferred_units ?? "metric";
  const rate = target.maintenance_kcal !== undefined ? formatWeeklyRate(expectedWeeklyChangeKg(target.target_kcal, target.maintenance_kcal), units) : null;

  return (
    <Screen>
      <Card>
        <Stack gap={12}>
          <Txt variant="eyebrow">Your starting estimate</Txt>
          <Txt style={{ fontSize: 40, lineHeight: 46, letterSpacing: -1 }} variant="h1">{formatKcal(target.target_kcal)}</Txt>
          <Txt tone="muted">This is a starting estimate, not an exact number. Compare it with your weight trend over time, then decide whether to edit your target.</Txt>
          {target.floor_explanation ? <Alert tone="warn">{target.floor_explanation}</Alert> : null}
          {target.maintenance_kcal !== undefined && rate ? (
            <Row align="stretch" gap={10}>
              <Tile style={{ flex: 1, gap: 4 }}>
                <Txt tone="muted" variant="small">Maintenance estimate</Txt>
                <Txt variant="h2">{formatKcal(target.maintenance_kcal)}</Txt>
                <Txt tone="muted" variant="xs">About what keeps your weight the same.</Txt>
              </Tile>
              <Tile style={{ flex: 1, gap: 4 }}>
                <Txt tone="muted" variant="small">Expected change</Txt>
                <Txt variant="h2">{/^[+−]/.test(rate) ? `About ${rate}` : "About the same weight"}</Txt>
                <Txt tone="muted" variant="xs">A rough guide. Real change varies and slows over time.</Txt>
              </Tile>
            </Row>
          ) : null}
        </Stack>
      </Card>

      <Card>
        <Stack gap={12}>
          <Txt variant="section">Daily macros</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {macroLabels.map(([name, label]) => (
              <Tile key={name} style={{ flexBasis: "47%", flexGrow: 1, gap: 4 }}>
                <Txt tone="muted" variant="small">{label}</Txt>
                <Txt variant="h2">{formatGrams(displayedMacros[name])}</Txt>
                <Txt tone="muted" variant="xs">{macroNotes[name]}</Txt>
              </Tile>
            ))}
          </View>
          {mismatch.ok && mismatch.data.warning ? (
            <Alert tone="warn">Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.</Alert>
          ) : null}
          {/* Most people keep the suggested grams, so editing stays folded away. */}
          <Tile style={{ padding: 0 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: adjustOpen }} onPress={() => setAdjustOpen((open) => !open)} style={{ flexDirection: "row", alignItems: "center", padding: 14, minHeight: 46 }}>
              <Txt style={{ flex: 1 }} variant="label">Adjust (optional)</Txt>
              <View style={{ transform: [{ rotate: adjustOpen ? "180deg" : "0deg" }] }}>
                <Icon color={colors.muted} name="chevron-down" />
              </View>
            </Pressable>
            {adjustOpen ? (
              <Stack gap={12} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <Txt tone="muted" variant="small">Edit grams if you like. Your calorie target stays at {formatKcal(target.target_kcal)}.</Txt>
                {macroLabels.map(([name, label]) => (
                  <NumberField decimal={false} key={name} label={`${label} (g)`} onChangeText={(value) => editMacro(name, value)} value={typed[name] ?? displayedMacros[name].toString()} />
                ))}
                {error ? <Alert tone="danger">{error}</Alert> : null}
              </Stack>
            ) : null}
          </Tile>
        </Stack>
      </Card>

      <SaveTargets state={account} />
      <TextLink onPress={() => router.replace("/start")} tone="muted">Start over</TextLink>
      <LegalFooter />
    </Screen>
  );
}

function SaveTargets({ state }: { state: AccountState }) {
  if (state === "checking") return <View style={{ height: 120 }} />;
  if (state === "has-target") {
    return (
      <Card>
        <Stack gap={10}>
          <Txt variant="h2">You already have saved targets</Txt>
          <Txt tone="muted" variant="small">These new numbers are not saved. To change your target, recalculate it in Me (Profile and targets).</Txt>
          <Button full onPress={() => router.replace("/me")}>Go to Profile and targets</Button>
          <Button full onPress={() => router.replace("/today")} variant="secondary">Back to Today</Button>
        </Stack>
      </Card>
    );
  }
  if (state === "no-target") {
    return (
      <Card>
        <Stack gap={10}>
          <Txt variant="h2">Save these targets</Txt>
          <Txt tone="muted" variant="small">They will be used for your meals, suggestions, and progress.</Txt>
          {/* Today saves the draft from this phone and confirms it. */}
          <Button full onPress={() => router.replace("/today")}>Save to my account</Button>
        </Stack>
      </Card>
    );
  }
  return (
    <Card>
      <Stack gap={10}>
        <Txt variant="h2">Keep these numbers</Txt>
        <Txt tone="muted" variant="small">
          A free account saves your targets and unlocks meal plans, beginner workouts, and progress tracking. Until then, they stay only on this phone.
        </Txt>
        <Button full onPress={() => router.push("/signup")}>Save my targets (free account)</Button>
        <Txt tone="muted" variant="small">
          Already have an account? <TextLink onPress={() => router.push("/login")}>Log in to save them</TextLink>
        </Txt>
      </Stack>
    </Card>
  );
}
