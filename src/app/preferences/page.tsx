import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { PreferencesForm, type AvoidableFood } from "@/components/preferences-form";
import { createClient } from "@/lib/supabase/server";
import { availableAllergyTags, dietTags, equipmentOptions, experiences, trainingDayOptions } from "@/lib/preferences";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: catalog } = await supabase
    .from("foods")
    .select("id, name, role, preparation_state, diet_tags")
    .order("name");
  const foods = catalog ?? [];

  const { data: saved } = await supabase
    .from("user_preferences")
    .select("allergy_tags, experience, equipment, training_days")
    .maybeSingle();
  const { data: avoided } = await supabase.from("user_avoided_foods").select("food_id");

  const experience = experiences.find((value) => value === saved?.experience) ?? "beginner";
  const equipment = equipmentOptions.find((value) => value === saved?.equipment) ?? "bodyweight";
  const trainingDays = trainingDayOptions(experience).includes(saved?.training_days ?? 0) ? saved!.training_days : 3;
  const offeredTags = availableAllergyTags(foods.map((food) => food.diet_tags));

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
      <PreferencesForm
        foods={foods as AvoidableFood[]}
        initial={{
          allergyTags: dietTags.filter((tag) => offeredTags.includes(tag) && saved?.allergy_tags?.includes(tag)),
          avoidedFoodIds: avoided?.map((row) => row.food_id) ?? [],
          experience,
          equipment,
          trainingDays,
        }}
        offeredTags={offeredTags}
      />
    </AuthFrame>
  );
}
