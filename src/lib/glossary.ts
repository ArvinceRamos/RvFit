import { calculationConfig } from "@/lib/calc/config";

const { kcal_per_gram } = calculationConfig.macros;
const { trend_window_days, trend_min_weigh_ins } = calculationConfig.progress;

// Plain meanings of the words the app uses. It explains what RvFit shows; it gives no new advice.
export const GLOSSARY: { group: string; terms: { term: string; meaning: string }[] }[] = [
  {
    group: "Food",
    terms: [
      { term: "Calories (kcal)", meaning: "The energy in food. RvFit counts kilocalories and shows them as kcal." },
      { term: "Maintenance", meaning: "An estimate of the calories a day that would keep your weight about the same. It comes from a formula, so it is a starting point, not a measurement." },
      { term: "Calorie target", meaning: "The calories a day RvFit suggests for your goal. To lose weight it is below maintenance, to gain weight it is above it." },
      { term: "Macros", meaning: "Protein, carbs and fat: the three parts of food that give calories. RvFit shows them in grams." },
      { term: "Protein", meaning: `Found in meat, fish, eggs, dairy, beans and tofu. ${kcal_per_gram.protein} kcal per gram.` },
      { term: "Carbs", meaning: `Short for carbohydrates. Found in rice, bread, pasta, potatoes and fruit. ${kcal_per_gram.carbohydrate} kcal per gram.` },
      { term: "Fat", meaning: `Found in oils, butter, nuts and cheese. ${kcal_per_gram.fat} kcal per gram.` },
      { term: "Fiber", meaning: "The part of plant foods your body does not fully digest. On the meal form, the Fiber slot is for vegetables or fruit." },
    ],
  },
  {
    group: "Training",
    terms: [
      { term: "Rep", meaning: "One repetition: lifting and lowering the weight once." },
      { term: "Set", meaning: "A group of reps done in a row before you rest. \"3 sets × 8–12 reps\" means three groups of 8 to 12 reps." },
      { term: "Rep range", meaning: "The planned number of reps, such as 8–12. Holds, like a plank, use seconds instead." },
      { term: "Rest", meaning: "The break between sets, shown in seconds on the plan." },
      { term: "Progression", meaning: "When you finish every planned set at the top of the rep range, RvFit may suggest a little more weight or reps next time. It is only a suggestion." },
      { term: "Swap", meaning: "Choosing a different exercise for the same movement. RvFit keeps your swap for future workouts until you reset it." },
      { term: "Plates each side", meaning: "For barbell lifts, the plates to put on each end of the bar for the weight you typed, assuming a 20 kg (45 lb) bar." },
    ],
  },
  {
    group: "Progress",
    terms: [
      { term: "Weigh-in", meaning: "A weight you log. Waist, chest and hips are optional." },
      { term: "Weight trend", meaning: `The average of your weigh-ins from the last ${trend_window_days} days. It needs at least ${trend_min_weigh_ins} weigh-ins, because daily weight goes up and down with water and food.` },
      { term: "Check-in", meaning: "RvFit compares your weight trend with what your target expected and may suggest a new calorie target. Nothing changes unless you accept it." },
      { term: "BMI", meaning: "Body mass index: your weight in kg divided by your height in metres, squared. RvFit uses it only in a few calculator rules." },
    ],
  },
];
