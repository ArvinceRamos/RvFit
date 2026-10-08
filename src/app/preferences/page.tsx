import { AuthFrame } from "@/components/auth-frame";
import { PreferencesForm, type AvoidableFood } from "@/components/preferences-form";
import { requireUser } from "@/lib/supabase/auth";
import { preferencesPageData } from "@/lib/preferences";

export default async function PreferencesPage() {
  const { supabase } = await requireUser();

  const [catalog, saved, avoided] = await Promise.all([
    supabase.from("foods").select("id, name, role, preparation_state, diet_tags").order("name"),
    supabase.from("user_preferences").select("allergy_tags, experience, equipment, training_days").maybeSingle(),
    supabase.from("user_avoided_foods").select("food_id"),
  ]);
  const data = preferencesPageData(catalog, saved, avoided);

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Preferences</h1>
      {data ? (
        <PreferencesForm
          foods={data.foods as AvoidableFood[]}
          initial={data.initial}
          isSaved={data.isSaved}
          offeredTags={data.offeredTags}
        />
      ) : (
        // No form after a failed read, so Save cannot overwrite real allergy data with blanks.
        <p className="mt-6 text-sm text-danger" role="alert">
          Your preferences could not be loaded. Nothing was changed. Please reload the page to try again.
        </p>
      )}
    </AuthFrame>
  );
}
