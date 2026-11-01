import { Pressable, View } from "react-native";
import { addDays } from "@/lib/week";
import { formatDay } from "~/lib/format";
import { useTheme } from "~/theme/theme";
import { Icon } from "./icon";
import { TextLink, Txt } from "./ui";

// A date picked one day at a step, with a jump back to today. Meals and workouts are almost always
// logged for today or a day or two either side, so this is quicker on a phone than a calendar.
export function DateStepper({ label, value, onChange, today, min, max }: { label: string; value: string; onChange: (value: string) => void; today: string; min?: string; max?: string }) {
  const { colors } = useTheme();
  const canBack = !min || value > min;
  const canForward = !max || value < max;
  const arrow = (direction: -1 | 1, enabled: boolean) => (
    <Pressable
      accessibilityLabel={direction < 0 ? "Previous day" : "Next day"}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={6}
      onPress={() => onChange(addDays(value, direction))}
      style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", opacity: enabled ? 1 : 0.35 }}
    >
      <Icon color={colors.ink} name={direction < 0 ? "chevron-left" : "chevron-right"} size={20} />
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.edge, backgroundColor: colors.field }}>
        {arrow(-1, canBack)}
        <View accessibilityLabel={`${label}: ${formatDay(value)}`} accessibilityRole="text" style={{ flex: 1, alignItems: "center" }}>
          <Txt weight="semibold">{formatDay(value)}</Txt>
          <Txt tone="muted" variant="xs">{value === today ? "Today" : value === addDays(today, -1) ? "Yesterday" : value === addDays(today, 1) ? "Tomorrow" : value}</Txt>
        </View>
        {arrow(1, canForward)}
      </View>
      {value !== today ? (
        <TextLink onPress={() => onChange(today)} tone="muted">Back to today</TextLink>
      ) : null}
    </View>
  );
}
