import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { foodRoles, roleLabels, stateLabels, type FoodRole, type PreparationState } from "@/lib/food-catalog";
import {
  allergenNotice,
  dietTagLabels,
  equipmentLabels,
  equipmentOptions,
  experienceLabels,
  experiences,
  preferencesPageData,
  trainingDayOptions,
  type DietTag,
  type Equipment,
  type Experience,
} from "@/lib/preferences";
import { Icon } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Alert, Button, Card, Checkbox, Chip, Choice, Row, Segmented, Stack, TextLink, Txt } from "~/components/ui";
import { useAction } from "~/lib/actions";
import { keys } from "~/lib/query";
import { supabase } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";
import { savePreferences } from "~/services/profile";
import { useTheme } from "~/theme/theme";

type AvoidableFood = { id: string; name: string; role: FoodRole; preparation_state: PreparationState; diet_tags: string[] };
type Values = { allergyTags: DietTag[]; avoidedFoodIds: string[]; experience: Experience; equipment: Equipment; trainingDays: number };
const savedMessage = "Preferences saved.";

async function load() {
  const [catalog, saved, avoided] = await Promise.all([
    supabase.from("foods").select("id, name, role, preparation_state, diet_tags").order("name"),
    supabase.from("user_preferences").select("allergy_tags, experience, equipment, training_days").maybeSingle(),
    supabase.from("user_avoided_foods").select("food_id"),
  ]);
  const data = preferencesPageData(catalog, saved, avoided);
  // No form after a failed read, so Save cannot overwrite real allergy data with blanks.
  if (!data) return { ok: false as const, error: "Your preferences could not be loaded. Nothing was changed. Please try again." };
  return { ok: true as const, ...data };
}

// Preferences (web: /preferences): allergies, foods to avoid, and the training plan inputs.
export default function Preferences() {
  const screen = useScreenData([...keys.preferences], load);
  if (screen.loading) return <LoadingView label="Loading preferences…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "Your preferences could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  return <PreferencesForm foods={screen.data.foods as AvoidableFood[]} initial={screen.data.initial} isSaved={screen.data.isSaved} offeredTags={screen.data.offeredTags} />;
}

function toggle<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((existing) => existing !== item) : [...list, item];
}

function PreferencesForm({ initial, isSaved, offeredTags, foods }: { initial: Values; isSaved: boolean; offeredTags: DietTag[]; foods: AvoidableFood[] }) {
  const { colors } = useTheme();
  const [values, setValues] = useState<Values>(initial);
  const [message, setMessage] = useState<string>();
  const [openRole, setOpenRole] = useState<FoodRole | null>(null);
  const save = useAction(savePreferences, "Your preferences could not be saved. Please try again.");
  const dayOptions = trainingDayOptions(values.experience);

  function changeExperience(experience: Experience) {
    const maxDays = Math.max(...trainingDayOptions(experience));
    setValues((current) => ({ ...current, experience, trainingDays: Math.min(current.trainingDays, maxDays) }));
  }

  async function submit() {
    setMessage(undefined);
    const result = await save.run(values);
    setMessage(result.ok ? savedMessage : result.error);
  }

  const footer = (
    <Stack gap={8}>
      {!isSaved && !message ? <Txt tone="warn" variant="small">Not saved yet. These are suggested starting choices. Check them and press Save to unlock your workout plan.</Txt> : null}
      {message === savedMessage ? (
        <Txt tone="muted" variant="small">{savedMessage} <TextLink onPress={() => router.navigate("/train")}>See your workout plan</TextLink></Txt>
      ) : message ? (
        <Alert tone="danger">{message}</Alert>
      ) : null}
      <Button full loading={save.pending} loadingText="Saving…" onPress={submit}>Save preferences</Button>
    </Stack>
  );

  return (
    <Screen footer={footer}>
      <Card>
        <Stack gap={14}>
          <Txt variant="section">Training</Txt>
          <Stack gap={6}>
            <Txt variant="label">Experience</Txt>
            <Segmented label="Experience" onChange={changeExperience} options={experiences.map((value) => ({ value, label: experienceLabels[value] }))} value={values.experience} />
          </Stack>
          <Stack gap={8}>
            <Txt variant="label">Equipment</Txt>
            {equipmentOptions.map((equipment) => (
              <Choice
                detail={equipment === "bodyweight" ? "Needs a pull-up bar and a sturdy chair or table." : equipment === "dumbbell_only" ? "Needs dumbbells, a pull-up bar, and a sturdy chair or table." : undefined}
                key={equipment}
                onPress={() => setValues((current) => ({ ...current, equipment }))}
                selected={values.equipment === equipment}
                title={equipmentLabels[equipment]}
              />
            ))}
          </Stack>
          <Stack gap={6}>
            <Txt variant="label">Training days per week</Txt>
            <Row gap={8} wrap>
              {dayOptions.map((days) => <Chip key={days} label={String(days)} onPress={() => setValues((current) => ({ ...current, trainingDays: days }))} selected={values.trainingDays === days} />)}
            </Row>
            {values.experience === "beginner" && values.trainingDays >= 5 ? <Txt tone="danger" variant="small">Risk: a beginner on 5–6 days a week has little recovery time.</Txt> : null}
          </Stack>
        </Stack>
      </Card>

      <Card>
        <Stack gap={10}>
          <Txt variant="section">Allergies</Txt>
          <Txt tone="muted" variant="small">{allergenNotice}</Txt>
          {offeredTags.length === 0 ? (
            <Txt tone="muted" variant="small">No allergy options are available yet.</Txt>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {offeredTags.map((tag) => (
                <View key={tag} style={{ flexBasis: "47%", flexGrow: 1 }}>
                  <Checkbox checked={values.allergyTags.includes(tag)} label={dietTagLabels[tag]} onChange={() => setValues((current) => ({ ...current, allergyTags: toggle(current.allergyTags, tag) }))} />
                </View>
              ))}
            </View>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap={10}>
          <Txt variant="section">Foods to avoid</Txt>
          <Txt tone="muted" variant="small">These foods will not be suggested. This is separate from allergies.</Txt>
          {foodRoles.map((role) => {
            const roleFoods = foods.filter((food) => food.role === role);
            if (roleFoods.length === 0) return null;
            const selectedCount = roleFoods.filter((food) => values.avoidedFoodIds.includes(food.id)).length;
            const open = openRole === role;
            return (
              <View key={role} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.tile }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenRole(open ? null : role)} style={{ flexDirection: "row", alignItems: "center", padding: 12, minHeight: 46 }}>
                  <Txt style={{ flex: 1 }} variant="label">{roleLabels[role]} ({selectedCount} selected)</Txt>
                  <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon color={colors.muted} name="chevron-down" /></View>
                </Pressable>
                {open ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.line, padding: 8, gap: 6 }}>
                    {roleFoods.map((food) => (
                      <Checkbox
                        checked={values.avoidedFoodIds.includes(food.id)}
                        key={food.id}
                        label={`${food.name} (${stateLabels[food.preparation_state]})`}
                        onChange={() => setValues((current) => ({ ...current, avoidedFoodIds: toggle(current.avoidedFoodIds, food.id) }))}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Stack>
      </Card>
    </Screen>
  );
}
