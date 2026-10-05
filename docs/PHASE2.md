# Phase 2 — Food library, preferences, and meals

## Readiness and review gates

- This document is the Phase 2 behavior and data outline. Phase 2 remains local-only; do not deploy.
- The list below contains 180 candidate food names grouped by RvFit role. It contains no USDA IDs and is not an import mapping.
- During P2-3, search the downloaded USDA Foundation Foods and SR Legacy files by candidate name. Derive every `fdc_id` from the selected downloaded record. Never type an `fdc_id` from memory.
- Before any catalog import, present the USDA match, source, nutrient values, proposed role/tags/preparation state, and measures for the first 20 mapped foods, plus the complete skip report. Wait for the user to review and approve the mapping before importing it.
- Qualified review of clinical/nutrition values and copy remains pending until before public launch. Keep existing values marked as placeholders until reviewed.
- Prepare workout files immediately before Phase 3, not as a Phase 2 prerequisite. The Phase 3 requirements remain in `docs/PLAN.md`.

## Screen flow

1. A signed-in user opens the food library and searches or filters foods by role and raw/cooked state.
2. The user saves preferences: available allergy filters, specific foods to avoid, experience, equipment, and training days.
3. The user starts a meal for a calendar date and gives it a label. They add protein, carb, and fat foods and portions in grams, using a common measure when one is available.
4. The user sees the meal nutrition totals and food suggestions based on the current day's remaining targets. They save the meal and can return to edit it.

Saved meals are food entries the user logs. V1 has no planned-versus-logged distinction, AI meal plans, or full recipes. Experience, equipment, and training days are stored for Phase 3; this phase does not show workout templates.

## Catalog and nutrition data

Use only USDA FoodData Central Foundation Foods and SR Legacy. Obtain the files from USDA's downloadable dataset page and import them locally once. Do not import Branded Foods. The live site reads the seeded catalog and never calls USDA. No USDA API key is needed for the downloadable files; API keys belong only to API requests. See [USDA downloadable datasets](https://fdc.nal.usda.gov/download-datasets/) and the [USDA API guide](https://fdc.nal.usda.gov/api-guide/).

Keep a reviewable mapping file between candidate names and the actual downloaded USDA record. The P2-3 search step discovers IDs from the files; the user reviews the resulting first 20 mappings and skip report before import. Do not treat a name search or allergen keyword as proof that a match or tag is correct.

Resolve nutrient IDs from each downloaded release's nutrient lookup file by nutrient name; do not assume nutrient rows are ordered or hard-code an ID without checking that file. Use USDA's `Protein`, `Carbohydrate, by difference`, `Total lipid (fat)`, `Fiber, total dietary`, and `Energy` definitions where available. Store nutrition per 100 g:

- Kcal, protein, carbohydrates, and fat are required for a food to be imported for meal calculations and suggestions.
- Fiber may be missing. Preserve missing fiber as `null`; never convert it to zero. If any item in a meal/day has missing fiber, report the fiber total or remaining fiber target as incomplete rather than presenting a false total.
- For calories, use the standard Energy value (USDA nutrient ID 1008) when present. If it is missing, check the downloaded data for USDA Atwater energy: prefer Metabolizable Energy (Atwater General Factor, nutrient ID 2047), then Metabolizable Energy (Atwater Specific Factor, nutrient ID 2048). If no usable energy value exists, skip the record and explain why in the skip report. USDA documents these energy fields in [Foundation Foods documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/).
- Use USDA common measures only when a measure has a usable gram weight. Grams remain the storage and calculation base.
- Keep raw and cooked records distinct and label the state clearly. Store the USDA source type and source ID with each catalog food for traceability.

RvFit assigns these roles because USDA does not provide them:

- `protein`, `carb`, `fat`, `vegetable`, `fruit`, `other`.

Use only these diet tags:

- `meat`, `fish`, `shellfish`, `dairy`, `egg`, `gluten`, `peanuts`, `tree_nuts`, `soy`, `sesame`.

Allergen keywords are curation search aids, not a runtime safety classifier. Review each proposed tag against the downloaded record and its food description. Examples to search include fish names (salmon, tuna, cod), shellfish names (shrimp, crab, oyster), dairy terms (milk, cheese, yogurt, whey), egg, wheat/barley/rye/gluten, peanut, tree-nut names (almond, cashew, walnut), soy, and sesame/tahini. A keyword match may identify a candidate; it must not automatically add or remove a tag.

The preferences screen must show this exact notice beside allergy selections:

> Only these allergens are filtered. Other allergens are not filtered, so always check food labels.

Offer only allergy-tag options that occur on at least one food in the seeded catalog. Keep the user's explicit avoid-food selections separate from their allergy tags. A suggested food is excluded if its tags intersect selected allergy tags or its catalog ID appears in that user's avoid list.

## Preferences and allowed values

Store one preference record per user. Use constrained values:

- Experience: `beginner` or `intermediate`.
- Equipment: `bodyweight`, `dumbbell_only`, or `gym`.
- Training days: 2–4 for a beginner; 2–6 for an intermediate user.
- Allergy selections: a subset of the allowed diet tags, but offer only tags present in the current catalog.
- Food preferences: explicit catalog foods to avoid, stored as user-owned food references.

The same equipment and training-day values will be consumed by Phase 3 template selection. Do not add advanced levels or equipment categories in this phase.

## Meals and nutrition calculations

Store each meal with its user, calendar date, and label. Store each meal item with its food reference and a positive gram amount. A common measure is a UI convenience converted to grams before saving. Use a configurable `maxMealItemGrams` guard; the initial placeholder is 2,000 g per item and must remain clearly marked as a placeholder.

Calculate each nutrient as `per_100g_value × grams / 100`, then sum items. Use the USDA kcal field for food energy; calculate macros from the corresponding per-100 g fields. Keep fiber included within carbohydrate grams, consistent with the Phase 1 rules. Preserve precision in calculations and round only for display. Reject amounts above the configured maximum; do not silently clamp them.

For a date, daily consumed values are the sum of that date's saved meal items. While a meal is being edited, include its current unsaved items in the suggestion context. For each target, remaining grams are target grams minus consumed grams. Keep negative remaining values visible as over-target; suggestions for that macro are omitted when remaining grams are zero or less.

## Plain-language suggestion rules

1. Read the signed-in user's latest saved calorie and macro targets and the nutrition totals for the selected date, including the current meal draft.
2. Build separate candidate lists for protein, carb, and fat roles. A food can appear only in its assigned role list.
3. Exclude foods matching any selected allergy tag or explicit avoided-food ID. Never infer safety from a food name.
4. Omit suggestions for a role when its remaining target is zero or negative. For a positive remainder, rank eligible foods by the matching macro grams per kcal, highest first, and show their per-100 g nutrition and available measures.
5. Suggestions recommend foods, not a portion size. The user chooses grams or a listed measure in the meal builder.
6. If no eligible food remains for a role, say that no matching suggestion is available. Do not add an AI plan or recipe fallback.

## Candidate food names

These are common-name search candidates, grouped by the RvFit role to assign after USDA matching. The same food may have separate raw and cooked USDA records; retain those as distinct entries. Candidate names are not guaranteed to exist in the selected USDA releases or to have all required nutrients. P2-3 reports unmatched and incomplete records for review. Total: 180 candidate names.

### Protein (30)

1. Chicken breast, raw
2. Chicken breast, roasted
3. Chicken thigh, raw
4. Chicken thigh, roasted
5. Turkey breast, raw
6. Turkey breast, roasted
7. Ground turkey, cooked
8. Beef top sirloin, raw
9. Beef top sirloin, grilled
10. Ground beef, 90% lean, raw
11. Ground beef, 90% lean, cooked
12. Pork tenderloin, raw
13. Pork tenderloin, roasted
14. Pork loin chop, raw
15. Pork loin chop, cooked
16. Salmon, Atlantic, raw
17. Salmon, Atlantic, cooked
18. Tuna, light, canned in water
19. Cod, raw
20. Cod, baked
21. Shrimp, raw
22. Shrimp, cooked
23. Egg, whole, raw
24. Egg, whole, hard-boiled
25. Egg white, raw
26. Greek yogurt, plain, nonfat
27. Cottage cheese, low-fat
28. Tofu, firm
29. Tempeh
30. Lentils, cooked

### Carb (30)

1. Oats, dry
2. Oatmeal, cooked
3. Rice, white, long-grain, dry
4. Rice, white, long-grain, cooked
5. Rice, brown, long-grain, dry
6. Rice, brown, long-grain, cooked
7. Quinoa, dry
8. Quinoa, cooked
9. Pasta, enriched, dry
10. Pasta, enriched, cooked
11. Pasta, whole-wheat, dry
12. Pasta, whole-wheat, cooked
13. Couscous, dry
14. Couscous, cooked
15. Bulgur, dry
16. Bulgur, cooked
17. Barley, pearled, dry
18. Barley, pearled, cooked
19. Bread, whole-wheat
20. Bread, white
21. Pita bread, whole-wheat
22. Tortilla, corn
23. Tortilla, flour
24. Potato, raw
25. Potato, baked
26. Sweet potato, raw
27. Sweet potato, baked
28. Corn, sweet, raw
29. Corn, sweet, cooked
30. Black beans, cooked

### Fat (30)

1. Olive oil
2. Canola oil
3. Sunflower oil
4. Sesame oil
5. Avocado oil
6. Butter, salted
7. Butter, unsalted
8. Avocado, raw
9. Almonds, raw
10. Almonds, dry-roasted
11. Cashews, raw
12. Cashews, dry-roasted
13. Walnuts, raw
14. Pecans, raw
15. Pistachios, raw
16. Peanuts, raw
17. Peanut butter, smooth
18. Tahini
19. Chia seeds, dried
20. Flaxseed, ground
21. Sunflower seed kernels, dried
22. Pumpkin seed kernels, dried
23. Sesame seeds, dried
24. Coconut, dried, unsweetened
25. Coconut milk, canned
26. Mayonnaise
27. Sour cream, regular
28. Cream cheese, regular
29. Dark chocolate, 70–85% cacao
30. Olives, ripe, canned

### Vegetable (30)

1. Broccoli, raw
2. Broccoli, cooked
3. Cauliflower, raw
4. Cauliflower, cooked
5. Spinach, raw
6. Spinach, cooked
7. Kale, raw
8. Kale, cooked
9. Romaine lettuce, raw
10. Iceberg lettuce, raw
11. Tomato, red, raw
12. Tomato, red, cooked
13. Cucumber, raw
14. Bell pepper, red, raw
15. Bell pepper, green, raw
16. Carrot, raw
17. Carrot, cooked
18. Green beans, raw
19. Green beans, cooked
20. Zucchini, raw
21. Zucchini, cooked
22. Mushroom, white, raw
23. Mushroom, white, cooked
24. Onion, raw
25. Onion, cooked
26. Cabbage, raw
27. Brussels sprouts, raw
28. Brussels sprouts, cooked
29. Asparagus, raw
30. Asparagus, cooked

### Fruit (30)

1. Apple, with skin, raw
2. Banana, raw
3. Orange, raw
4. Grapefruit, raw
5. Strawberries, raw
6. Blueberries, raw
7. Raspberries, raw
8. Blackberries, raw
9. Grapes, red, raw
10. Grapes, green, raw
11. Pear, raw
12. Peach, raw
13. Plum, raw
14. Mango, raw
15. Pineapple, raw
16. Watermelon, raw
17. Cantaloupe, raw
18. Kiwi, raw
19. Cherries, sweet, raw
20. Pomegranate arils, raw
21. Papaya, raw
22. Guava, raw
23. Lemon, raw
24. Lime, raw
25. Jackfruit, raw
26. Dates, dried
27. Raisins, seedless
28. Cranberries, raw
29. Apricots, dried
30. Figs, raw

### Other (30)

1. Water, tap
2. Coffee, brewed
3. Tea, brewed
4. Green tea, brewed
5. Cocoa powder, unsweetened
6. Chicken broth
7. Beef broth
8. Vegetable broth
9. Soy sauce
10. Tamari
11. Vinegar, apple cider
12. Vinegar, balsamic
13. Mustard, yellow
14. Ketchup
15. Salsa, prepared
16. Tomato paste, canned
17. Tomato sauce, canned
18. Pickles, cucumber
19. Sauerkraut
20. Kimchi
21. Garlic, raw
22. Ginger root, raw
23. Basil, fresh
24. Cilantro, raw
25. Parsley, fresh
26. Black pepper
27. Cinnamon, ground
28. Chili powder
29. Nutritional yeast
30. Honey

