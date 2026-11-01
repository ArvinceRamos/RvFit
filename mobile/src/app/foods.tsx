import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { escapeLikePattern, foodPageSize, foodRoles, formatFiber, formatMeasures, preparationStates, roleLabels, searchStem, stateLabels, type FoodRole, type PreparationState } from "@/lib/food-catalog";
import { Alert, Button, Card, Chip, Field, Row, Stack, Txt } from "~/components/ui";
import { supabase } from "~/lib/supabase";
import { useTheme } from "~/theme/theme";

type FoodRow = {
  id: string;
  name: string;
  role: FoodRole;
  preparation_state: PreparationState;
  kcal_per_100g: number | string;
  protein_g_per_100g: number | string;
  carbs_g_per_100g: number | string;
  fat_g_per_100g: number | string;
  fiber_g_per_100g: number | string | null;
  food_measures: { label: string; grams: number | string }[];
};

// The same query as the web page, with the same plural handling, so "eggs" finds "Egg".
async function loadFoods(q: string, role: FoodRole | null, state: PreparationState | null, limit: number) {
  let query = supabase
    .from("foods")
    .select("id, name, role, preparation_state, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g, food_measures(label, grams)", { count: "exact" })
    .order("name")
    .range(0, limit - 1);
  if (q) query = query.ilike("name", `%${escapeLikePattern(searchStem(q))}%`);
  if (role) query = query.eq("role", role);
  if (state) query = query.eq("preparation_state", state);
  const { data, error, count } = await query;
  if (error) throw error;
  return { foods: (data ?? []) as FoodRow[], total: count ?? data?.length ?? 0 };
}

// Browse foods (web: /foods). The list filters as you type; nutrition is per 100 g.
export default function Foods() {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<FoodRole | null>(null);
  const [state, setState] = useState<PreparationState | null>(null);
  const [limit, setLimit] = useState(foodPageSize);

  // Search a moment after typing stops, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(text.trim().slice(0, 60));
      setLimit(foodPageSize);
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useQuery({ queryKey: ["foods", q, role, state, limit], queryFn: () => loadFoods(q, role, state, limit), placeholderData: keepPreviousData, staleTime: 5 * 60_000 });
  const foods = query.data?.foods ?? [];
  const total = query.data?.total ?? 0;

  const header = (
    <Stack gap={14} style={{ paddingBottom: 12 }}>
      <Txt tone="muted" variant="small">Nutrition values are per 100 g, from USDA FoodData Central.</Txt>
      <Field label="Search by name" maxLength={60} onChangeText={setText} placeholder="For example, chicken" returnKeyType="search" value={text} />
      <Stack gap={6}>
        <Txt variant="label">Role</Txt>
        <Row gap={8} wrap>
          <Chip label="All roles" onPress={() => { setRole(null); setLimit(foodPageSize); }} selected={role === null} />
          {foodRoles.map((value) => <Chip key={value} label={roleLabels[value]} onPress={() => { setRole(value); setLimit(foodPageSize); }} selected={role === value} />)}
        </Row>
      </Stack>
      <Stack gap={6}>
        <Txt variant="label">Raw or cooked</Txt>
        <Row gap={8} wrap>
          <Chip label="All" onPress={() => { setState(null); setLimit(foodPageSize); }} selected={state === null} />
          {preparationStates.map((value) => <Chip key={value} label={stateLabels[value]} onPress={() => { setState(value); setLimit(foodPageSize); }} selected={state === value} />)}
        </Row>
      </Stack>
      {query.isError ? <Alert tone="danger">The food library could not be loaded. Please try again.</Alert> : null}
      {query.data && foods.length === 0 ? <Txt tone="muted" variant="small">No foods match your search.</Txt> : null}
      {foods.length > 0 ? <Txt accessibilityRole="summary" tone="muted" variant="small">Showing {foods.length} of {total} {total === 1 ? "food" : "foods"}</Txt> : null}
      {query.isPending ? <Txt tone="muted" variant="small">Loading foods…</Txt> : null}
    </Stack>
  );

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" }}
      data={foods}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(food) => food.id}
      ListFooterComponent={total > foods.length ? <Button loading={query.isFetching} onPress={() => setLimit((current) => current + foodPageSize)} variant="secondary">Show more</Button> : null}
      ListHeaderComponent={header}
      renderItem={({ item: food }) => {
        const measures = formatMeasures(food.food_measures.map((measure) => ({ label: measure.label, grams: Number(measure.grams) })));
        const facts = [
          ["Calories", `${Math.round(Number(food.kcal_per_100g))} kcal`],
          ["Protein", `${Number(food.protein_g_per_100g).toFixed(1)} g`],
          ["Carbs", `${Number(food.carbs_g_per_100g).toFixed(1)} g`],
          ["Fat", `${Number(food.fat_g_per_100g).toFixed(1)} g`],
          ["Fiber", formatFiber(food.fiber_g_per_100g === null ? null : Number(food.fiber_g_per_100g))],
        ];
        return (
          <Card compact>
            <Stack gap={8}>
              <Stack gap={2}>
                <Txt weight="medium">{food.name}</Txt>
                <Txt tone="muted" variant="small">{roleLabels[food.role]} · {stateLabels[food.preparation_state]}</Txt>
              </Stack>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {facts.map(([name, value]) => (
                  <View key={name} style={{ width: "33.3%" }}>
                    <Txt tone="muted" variant="xs">{name}</Txt>
                    <Txt variant="small" weight="bold">{value}</Txt>
                  </View>
                ))}
              </View>
              <Txt tone="muted" variant="small">{measures ? `Common measures: ${measures}` : "No common measures listed. Use grams."}</Txt>
            </Stack>
          </Card>
        );
      }}
      style={{ flex: 1, backgroundColor: colors.page }}
    />
  );
}
