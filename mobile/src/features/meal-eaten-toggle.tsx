import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "~/components/icon";
import { Txt } from "~/components/ui";
import { refreshAll } from "~/lib/query";
import { setMealEaten } from "~/services/meals";
import { useTheme } from "~/theme/theme";

// "I ate this" for a saved meal (web: MealEatenToggle). Future days cannot be ticked. The tick shows
// at once and is undone with a message if the save fails.
export function MealEatenToggle({ mealId, label, eaten, future }: { mealId: string; label: string; eaten: boolean; future: boolean }) {
  const { colors } = useTheme();
  const [checked, setChecked] = useState(eaten);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // A reload that brings a different saved tick (for example from another screen) replaces the shown one.
  const [savedEaten, setSavedEaten] = useState(eaten);
  if (eaten !== savedEaten) {
    setSavedEaten(eaten);
    setChecked(eaten);
  }

  async function toggle() {
    const next = !checked;
    setBusy(true);
    setError(undefined);
    setChecked(next);
    void Haptics.selectionAsync().catch(() => {});
    const result = await setMealEaten(mealId, next).catch(() => ({ ok: false as const, error: "The meal could not be updated. Please try again." }));
    setBusy(false);
    if (!result.ok) {
      setChecked(!next);
      setError(result.error);
      return;
    }
    await refreshAll();
  }

  return (
    <View style={{ gap: 2 }}>
      <Pressable
        accessibilityHint={future ? "You can tick this on the day." : undefined}
        accessibilityLabel={`Ate ${label}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: busy || future }}
        disabled={busy || future}
        hitSlop={10}
        onPress={toggle}
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? colors.selectedEdge : colors.edge,
          backgroundColor: checked ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
          opacity: busy || future ? 0.5 : 1,
        }}
      >
        {checked ? <Icon color={colors.onAccent} name="check" size={16} strokeWidth={3} /> : null}
      </Pressable>
      {error ? <Txt tone="danger" variant="xs">{error}</Txt> : null}
    </View>
  );
}
