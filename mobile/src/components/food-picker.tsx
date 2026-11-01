import { Pressable, View } from "react-native";
import { roleLabels, stateLabels, suggestFoods, type FoodRole, type PreparationState } from "@/lib/food-catalog";
import { useTheme } from "~/theme/theme";
import { Field, Txt } from "./ui";

export type PickableFood = { id: string; name: string; role: FoodRole; preparation_state: PreparationState };

// A food search with its matches listed right under the field (web: FoodAutocomplete). On a phone a
// floating dropdown hides behind the keyboard, so matches sit in the page and scroll with it.
// otherFoods are searched only when nothing in foods matches, and are picked with onSelectOther.
export function FoodPicker<T extends PickableFood>({
  foods,
  value,
  onValueChange,
  onSelect,
  otherFoods,
  otherNote,
  onSelectOther,
  label,
  placeholder,
}: {
  foods: T[];
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (food: T) => void;
  otherFoods?: T[];
  otherNote?: string;
  onSelectOther?: (food: T) => void;
  label: string;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const typed = value.trim() !== "";
  const ownMatches = typed ? suggestFoods(foods, value) : [];
  const fromOthers = typed && ownMatches.length === 0 && otherFoods !== undefined && onSelectOther !== undefined;
  const matches = fromOthers ? suggestFoods(otherFoods, value) : ownMatches;

  return (
    <View style={{ gap: 6 }}>
      <Field autoCapitalize="none" label={label} maxLength={60} onChangeText={onValueChange} placeholder={placeholder} returnKeyType="search" value={value} />
      {typed && matches.length === 0 ? (
        <Txt tone="muted" variant="small">{`No foods match “${value.trim()}”. Try a shorter or different word.`}</Txt>
      ) : null}
      {matches.length > 0 ? (
        <View accessibilityLabel={`${label} matches`} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.field, overflow: "hidden" }}>
          {fromOthers && otherNote ? <Txt style={{ paddingHorizontal: 12, paddingTop: 8 }} tone="muted" variant="xs">{otherNote}</Txt> : null}
          {matches.map((food, index) => (
            <Pressable
              accessibilityHint="Adds this food"
              accessibilityRole="button"
              key={food.id}
              onPress={() => (fromOthers ? onSelectOther!(food) : onSelect(food))}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, minHeight: 48, borderTopWidth: index === 0 && !(fromOthers && otherNote) ? 0 : 1, borderTopColor: colors.line, backgroundColor: pressed ? colors.selected : "transparent" })}
            >
              <Txt weight="semibold">{food.name}</Txt>
              <Txt tone="muted" variant="xs">{roleLabels[food.role]} · {stateLabels[food.preparation_state]}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
