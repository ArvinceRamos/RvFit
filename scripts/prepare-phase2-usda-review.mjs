import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = join(dirname(fileURLToPath(import.meta.url)), '..');
const docsPath = join(workspace, 'docs', 'PHASE2.md');
const foundationPath = join(
  workspace,
  'data',
  'usda',
  'foundation-2026-04',
  'FoodData_Central_foundation_food_csv_2026-04-30',
);
const srLegacyPath = join(
  workspace,
  'data',
  'usda',
  'sr-legacy-2018-04',
  'FoodData_Central_sr_legacy_food_csv_2018-04',
);

const requiredNutrientNames = [
  'Protein',
  'Carbohydrate, by difference',
  'Total lipid (fat)',
  'Fiber, total dietary',
  'Energy',
  'Energy (Atwater General Factors)',
  'Energy (Atwater Specific Factors)',
];

const tagRules = [
  { tag: 'shellfish', terms: ['shrimp', 'crab', 'oyster'] },
  { tag: 'fish', terms: ['salmon', 'tuna', 'cod'] },
  { tag: 'meat', terms: ['chicken', 'turkey', 'beef', 'pork'] },
  { tag: 'dairy', terms: ['yogurt', 'cottage cheese', 'butter', 'sour cream', 'cream cheese'] },
  { tag: 'egg', terms: ['egg'] },
  { tag: 'gluten', terms: ['whole-wheat', 'whole wheat', 'pasta', 'spaghetti', 'couscous', 'bulgur', 'barley', 'bread', 'pita', 'flour tortilla'] },
  { tag: 'peanuts', terms: ['peanut'] },
  { tag: 'tree_nuts', terms: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio'] },
  { tag: 'soy', terms: ['tofu', 'tempeh', 'soy sauce', 'tamari'] },
  { tag: 'sesame', terms: ['sesame', 'tahini'] },
];

// These selections were checked against the downloaded USDA descriptions when
// a strict candidate-name comparison was too narrow or chose an ingredient row.
// They remain proposed until the user approves the review artifacts.
const curatedSelections = new Map([
  ['Tuna, light, canned in water', '334194'],
  ['Cod, baked', '171956'],
  ['Egg, whole, raw', '171287'],
  ['Egg white, raw', '172183'],
  ['Cottage cheese, low-fat', '172182'],
  ['Lentils, cooked', '172421'],
  ['Oatmeal, cooked', '171675'],
  ['Rice, brown, long-grain, dry', '169703'],
  ['Quinoa, dry', '168874'],
  ['Couscous, dry', '169699'],
  ['Couscous, cooked', '169700'],
  ['Barley, pearled, dry', '170284'],
  ['Tortilla, flour', '167535'],
  ['Potato, raw', '170026'],
  ['Potato, baked', '170093'],
  ['Olive oil', '171413'],
  ['Canola oil', '172336'],
  ['Sunflower oil', '171017'],
  ['Coconut milk, canned', '170173'],
  ['Sour cream, regular', '2346387'],
  ['Tomato, red, raw', '170457'],
  ['Tomato, red, cooked', '170050'],
  ['Zucchini, raw', '169291'],
  ['Zucchini, cooked', '169292'],
  ['Mushroom, white, cooked', '169252'],
  ['Orange, raw', '169097'],
  ['Peach, raw', '169928'],
  ['Watermelon, raw', '167765'],
  ['Pomegranate arils, raw', '169134'],
  ['Lemon, raw', '167746'],
  ['Dates, dried', '168191'],
  ['Chicken broth', '174536'],
  ['Beef broth', '171538'],
  ['Vegetable broth', '171583'],
  ['Tamari', '174278'],
  ['Vinegar, apple cider', '173469'],
  ['Salsa, prepared', '174524'],
  ['Kimchi', '170392'],
  ['Cilantro, raw', '169997'],
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values.filter((value) => value.length === headers.length).map((value) =>
    Object.fromEntries(headers.map((header, index) => [header, value[index]])),
  );
}

async function readCsv(path) {
  return parseCsv(await readFile(path, 'utf8'));
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedWords(value) {
  return new Set(
    normalize(value)
      .split(' ')
      .filter(Boolean)
      .map(stemWord),
  );
}

function stemWord(word) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes') && word.length > 4) return `${word.slice(0, -2)}`;
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

function parseCandidates(phase2) {
  const roles = ['Protein', 'Carb', 'Fat', 'Vegetable', 'Fruit', 'Other'];
  const candidates = [];
  for (const role of roles) {
    const heading = `### ${role} (30)`;
    const start = phase2.indexOf(heading);
    const next = phase2.indexOf('\n### ', start + heading.length);
    const section = phase2.slice(start, next === -1 ? undefined : next);
    for (const match of section.matchAll(/^\d+\. (.+)$/gm)) {
      candidates.push({ candidate: match[1], role: role.toLowerCase() });
    }
  }
  return candidates;
}

function proposedPreparationState(candidate) {
  const value = normalize(candidate);
  if (value.includes('raw')) return 'raw';
  if (/(cooked|roasted|grilled|baked|boiled|hard boiled)/.test(value)) return 'cooked';
  return 'other';
}

const riskFlagRules = [
  { flag: 'with skin', pattern: /\b(and|with|in) skin\b/ },
  { flag: 'blade', pattern: /\bblade\b/ },
  { flag: 'wild', pattern: /\bwild\b/ },
  { flag: 'farmed', pattern: /\b(farmed|farm raised)\b/ },
  { flag: 'bone-in', pattern: /\bbone in\b/ },
  { flag: 'cap', pattern: /\bcap\b/ },
  { flag: 'lean and fat', pattern: /\blean and fat\b/ },
  { flag: 'added solution', pattern: /\badded solution\b/ },
];

function riskFlags(description) {
  const text = normalize(description);
  return riskFlagRules.filter(({ pattern }) => pattern.test(text)).map(({ flag }) => flag);
}

function proposedTags(candidate, description) {
  const reviewedText = `${normalize(candidate)} ${normalize(description)}`;
  return tagRules
    .filter((rule) => rule.terms.some((term) => reviewedText.includes(normalize(term))))
    .map((rule) => rule.tag);
}

// USDA words these differently from the common names used in the candidate list.
const searchSynonyms = [
  [/\bkiwi\b/g, 'kiwifruit'],
  [/\bunsalted\b/g, 'without salt'],
  [/\bunsweetened\b/g, 'not sweetened'],
];

function applySynonyms(candidate) {
  return searchSynonyms.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), candidate.toLowerCase());
}

// Words that make a record a different cut or source than the plain common name.
// A candidate that does not ask for them ranks records without them first.
const unrequestedWordPenalties = [
  { words: ['blade'], penalty: 1 },
  { words: ['cap'], penalty: 1 },
  { words: ['solution'], penalty: 1 },
  { words: ['light'], penalty: 0.5 },
  { words: ['remaining'], penalty: 1 },
  { words: ['choice', 'select'], penalty: 0.5 },
];
const dryHeatWords = ['broiled', 'roasted', 'baked', 'grilled'];

function scoreCandidate(candidate, food) {
  const original = candidate.toLowerCase();
  const synonym = applySynonyms(candidate);
  const variants = synonym === original ? [original] : [original, synonym];
  return Math.max(...variants.map((searchText) => scoreSearchText(searchText, food)));
}

function scoreSearchText(searchText, food) {
  const candidateText = normalize(searchText);
  const descriptionText = normalize(food.description);
  const descriptionWords = normalizedWords(food.description);
  const modifiers = new Set([
    'raw', 'cooked', 'dry', 'plain', 'prepared', 'regular', 'roasted', 'grilled', 'baked',
    'boiled', 'hard', 'light', 'canned', 'in', 'water', 'with', 'skin', 'boneless', 'fresh',
  ]);
  const tokens = [...normalizedWords(searchText)].filter((token) => !modifiers.has(token));
  const matched = tokens.filter((token) => descriptionWords.has(token));
  if (tokens.length === 0 || matched.length !== tokens.length) return 0;
  const descriptionWordList = normalize(food.description)
    .split(' ')
    .filter(Boolean)
    .map(stemWord);
  const descriptionLead = descriptionWordList[0];
  const categoryLeads = new Set(['fish', 'crustacean', 'cereal', 'bean', 'nut', 'seed', 'spice', 'beverage', 'melon', 'squash', 'coriander']);
  if (!tokens.includes(descriptionLead) && !categoryLeads.has(descriptionLead)) return 0;
  if (!tokens.every((token) => descriptionWordList.slice(0, 7).includes(token))) return 0;
  if (candidateText.includes('raw') && !descriptionWords.has('raw')) return 0;
  if (candidateText.includes('roasted') && !descriptionWords.has('roasted')) return 0;
  if (candidateText.includes('grilled') && !descriptionWords.has('grilled')) return 0;
  if (candidateText.includes('baked') && !descriptionWords.has('baked')) return 0;
  if (candidateText.includes('boiled') && !descriptionWords.has('boiled')) return 0;
  if (candidateText.includes('cooked') && !descriptionWords.has('cooked')) return 0;
  if (candidateText.includes('dry') && !descriptionWords.has('dry')) return 0;
  const disallowedProductWords = ['juice', 'nectar', 'rind', 'peel', 'babyfood', 'cookie', 'candy', 'wedge', 'imitation', 'breaded', 'pudding', 'coffee', 'tea'];
  if (disallowedProductWords.some((word) => descriptionWords.has(word) && !tokens.includes(word))) return 0;
  let score = matched.length;

  const primaryCandidateWord = candidateText.split(' ')[0];
  if (descriptionText.startsWith(`${primaryCandidateWord} `) || descriptionText === primaryCandidateWord) score += 2;
  if (candidateText.includes('raw')) score += 2;
  if (candidateText.includes('roasted')) score += 2;
  if (candidateText.includes('grilled')) score += 2;
  if (candidateText.includes('baked')) score += 2;
  if (candidateText.includes('boiled')) score += 2;
  if (candidateText.includes('hard boiled') && descriptionWords.has('hard') && descriptionWords.has('boiled')) score += 2;
  if (candidateText.includes('cooked')) score += 0.5;
  if (candidateText.includes('dry')) score += 2;
  if (food.sourceType === 'foundation') score += 0.01;

  const candidateWords = normalizedWords(searchText);
  for (const { words, penalty } of unrequestedWordPenalties) {
    const present = words.some((word) => descriptionWords.has(word));
    const requested = words.some((word) => candidateWords.has(word));
    if (present && !requested) score -= penalty;
  }
  // "with skin" and wild-versus-farmed records differ from the plain common name.
  if (/\b(and|with) skin\b/.test(descriptionText) && !candidateWords.has('skin')) score -= 1;
  if (descriptionWords.has('wild') && !descriptionText.includes('wild caught') && !candidateWords.has('wild')) score -= 1;
  // A plain "cooked" candidate prefers a dry-heat method over braised or fried.
  if (candidateText.includes('cooked') && dryHeatWords.some((word) => descriptionWords.has(word))) score += 0.5;
  // "Pork loin chop" is a center-loin chop, not a blade chop.
  if (candidateWords.has('chop') && descriptionText.includes('center loin')) score += 1;
  if (candidateWords.has('chop') && descriptionText.includes('separable lean and fat')) score += 0.5;
  return score;
}

function escapeCsv(value) {
  const string = String(value ?? '');
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function round(value) {
  return value === null || value === undefined ? '' : Number(value).toFixed(2);
}

function nutritionFor(food, nutrients, nutrientIds) {
  const values = nutrients.get(food.fdc_id) ?? new Map();
  const amount = (name) => {
    const value = values.get(nutrientIds.get(name));
    return value === undefined ? null : Number(value);
  };
  return {
    kcal: amount('Energy') ?? amount('Energy (Atwater General Factors)') ?? amount('Energy (Atwater Specific Factors)'),
    protein: amount('Protein'),
    carbs: amount('Carbohydrate, by difference'),
    fat: amount('Total lipid (fat)'),
    fiber: amount('Fiber, total dietary'),
  };
}

async function loadSource(basePath, sourceType, foundationIds = null) {
  const [foods, nutrients, foodNutrients, portions, units] = await Promise.all([
    readCsv(join(basePath, 'food.csv')),
    readCsv(join(basePath, 'nutrient.csv')),
    readCsv(join(basePath, 'food_nutrient.csv')),
    readCsv(join(basePath, 'food_portion.csv')),
    readCsv(join(basePath, 'measure_unit.csv')),
  ]);
  const nutrientIds = new Map();
  for (const name of requiredNutrientNames) {
    const nutrient = nutrients.find(
      (row) => row.name === name && (name !== 'Energy' || row.unit_name === 'KCAL'),
    );
    if (nutrient) nutrientIds.set(name, nutrient.id);
  }
  const selectedNutrientIds = new Set(nutrientIds.values());
  const usableFoods = foods
    .filter((food) => foundationIds === null || foundationIds.has(food.fdc_id))
    .map((food) => ({ ...food, sourceType }));
  const usableIds = new Set(usableFoods.map((food) => food.fdc_id));
  const nutrientsByFood = new Map();
  for (const row of foodNutrients) {
    if (!usableIds.has(row.fdc_id) || !Number.isFinite(Number(row.amount))) continue;
    if (!selectedNutrientIds.has(row.nutrient_id)) continue;
    if (!nutrientsByFood.has(row.fdc_id)) nutrientsByFood.set(row.fdc_id, new Map());
    nutrientsByFood.get(row.fdc_id).set(row.nutrient_id, row.amount);
  }
  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
  const measuresByFood = new Map();
  for (const portion of portions) {
    if (!usableIds.has(portion.fdc_id) || !Number.isFinite(Number(portion.gram_weight)) || Number(portion.gram_weight) <= 0) continue;
    // Drop zero-quantity rows and recipe-yield rows; they are not usable serving measures.
    if (!(Number(portion.amount) > 0) || /yield/i.test(`${portion.modifier} ${portion.portion_description}`)) continue;
    const unitName = unitNames.get(portion.measure_unit_id);
    const label = [portion.amount, unitName === 'undetermined' ? '' : unitName, portion.modifier, portion.portion_description]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!label) continue;
    if (!measuresByFood.has(portion.fdc_id)) measuresByFood.set(portion.fdc_id, []);
    measuresByFood.get(portion.fdc_id).push(`${label} (${Number(portion.gram_weight)} g)`);
  }
  return { foods: usableFoods, nutrientsByFood, nutrientIds, measuresByFood };
}

const phase2 = await readFile(docsPath, 'utf8');
const candidates = parseCandidates(phase2);
if (candidates.length !== 180) throw new Error(`Expected 180 candidates, found ${candidates.length}.`);

const foundationRows = await readCsv(join(foundationPath, 'foundation_food.csv'));
const foundationIds = new Set(foundationRows.map((row) => row.fdc_id));
const [foundation, srLegacy] = await Promise.all([
  loadSource(foundationPath, 'foundation', foundationIds),
  loadSource(srLegacyPath, 'sr_legacy'),
]);
const foods = [...foundation.foods, ...srLegacy.foods];
const foodsByFdcId = new Map(foods.map((food) => [food.fdc_id, food]));

const mappings = candidates.map(({ candidate, role }) => {
  const ranked = foods
    .map((food) => ({ food, score: scoreCandidate(candidate, food) }))
    .filter(({ score }) => score >= 0.6)
    .sort((left, right) => right.score - left.score);
  const curatedFood = foodsByFdcId.get(curatedSelections.get(candidate));
  const selected = curatedFood ? { food: curatedFood, score: null, curated: true } : ranked.find(({ food }) => {
    const source = food.sourceType === 'foundation' ? foundation : srLegacy;
    const nutrition = nutritionFor(food, source.nutrientsByFood, source.nutrientIds);
    return nutrition.kcal !== null && nutrition.protein !== null && nutrition.carbs !== null && nutrition.fat !== null;
  });

  if (!selected) {
    return { candidate, role, status: 'skip', reason: ranked.length ? 'No candidate match has all required energy and macro nutrients.' : 'No sufficiently specific match found in the permitted releases.' };
  }

  const source = selected.food.sourceType === 'foundation' ? foundation : srLegacy;
  const nutrition = nutritionFor(selected.food, source.nutrientsByFood, source.nutrientIds);
  if (nutrition.kcal === null || nutrition.protein === null || nutrition.carbs === null || nutrition.fat === null) {
    return {
      candidate,
      role,
      status: 'skip',
      reason: 'The selected candidate record is missing one or more required energy or macro nutrients.',
    };
  }
  return {
    candidate,
    role,
    status: 'proposed',
    sourceType: selected.food.sourceType,
    fdcId: selected.food.fdc_id,
    description: selected.food.description,
    preparationState: proposedPreparationState(candidate),
    tags: proposedTags(candidate, selected.food.description),
    riskFlags: riskFlags(selected.food.description),
    nutrition,
    measures: [...new Set(source.measuresByFood.get(selected.food.fdc_id) ?? [])].slice(0, 5),
    score: selected.score,
    curated: selected.curated ?? false,
  };
});

const header = [
  'candidate', 'role', 'status', 'source_type', 'fdc_id', 'usda_description', 'preparation_state',
  'proposed_diet_tags', 'kcal_per_100g', 'protein_g_per_100g', 'carbs_g_per_100g',
  'fat_g_per_100g', 'fiber_g_per_100g', 'usable_measures', 'match_score', 'risk_flag', 'review_note',
];
const csvRows = mappings.map((mapping) => [
  mapping.candidate,
  mapping.role,
  mapping.status,
  mapping.sourceType ?? '',
  mapping.fdcId ?? '',
  mapping.description ?? '',
  mapping.preparationState ?? '',
  mapping.tags?.join('|') ?? '',
  round(mapping.nutrition?.kcal),
  round(mapping.nutrition?.protein),
  round(mapping.nutrition?.carbs),
  round(mapping.nutrition?.fat),
  round(mapping.nutrition?.fiber),
  mapping.measures?.join('; ') ?? '',
  mapping.score?.toFixed(2) ?? '',
  mapping.riskFlags?.join('|') ?? '',
  mapping.status === 'proposed'
    ? `${mapping.curated ? 'Manually selected from the downloaded description. ' : ''}Pending user review; tags are curation proposals, not an allergen classifier.`
    : mapping.reason,
]);
await writeFile(join(workspace, 'docs', 'phase2-usda-mapping.csv'), [header, ...csvRows].map((row) => row.map(escapeCsv).join(',')).join('\n') + '\n');

const skips = mappings.filter((mapping) => mapping.status === 'skip');
const proposed = mappings.filter((mapping) => mapping.status === 'proposed');
const skipReport = [
  '# Phase 2 USDA skip report',
  '',
  'Sources searched: USDA Foundation Foods April 2026 and USDA SR Legacy April 2018 CSV downloads only. Branded Foods were not searched.',
  '',
  `Candidates: ${mappings.length}. Proposed mappings: ${proposed.length}. Skipped: ${skips.length}.`,
  '',
  'A skipped candidate has no sufficiently specific permitted-record match with all required energy, protein, carbohydrate, and fat values. Fiber is allowed to remain blank.',
  '',
  '## Skipped candidates',
  '',
  ...(skips.length ? skips.map((skip) => `- **${skip.candidate}** (${skip.role}): ${skip.reason}`) : ['- None.']),
  '',
  '## Review gate',
  '',
  'No food has been imported. The mapping file is a review artifact. Proposed diet tags require human review of each selected USDA description before any catalog import.',
  '',
];
await writeFile(join(workspace, 'docs', 'phase2-usda-skip-report.md'), skipReport.join('\n'));

const firstTwenty = proposed.slice(0, 20);
const preview = [
  '# Phase 2 USDA review: first 20 proposed foods',
  '',
  'All values are per 100 g. Fiber is blank when the selected record has no fiber value. No data has been imported.',
  '',
  '| Candidate | USDA source / FDC ID | Selected USDA description | Role / state | Proposed tags | kcal | Protein | Carbs | Fat | Fiber | Measures |',
  '| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ...firstTwenty.map((food) => `| ${food.candidate} | ${food.sourceType} / ${food.fdcId} | ${food.description.replaceAll('|', '\\|')} | ${food.role} / ${food.preparationState} | ${food.tags.join(', ') || '—'} | ${round(food.nutrition.kcal)} | ${round(food.nutrition.protein)} | ${round(food.nutrition.carbs)} | ${round(food.nutrition.fat)} | ${round(food.nutrition.fiber) || '—'} | ${food.measures.join('; ').replaceAll('|', '\\|') || '—'} |`),
  '',
  'Approval is required before a later import job uses any proposed record.',
  '',
];
await writeFile(join(workspace, 'docs', 'phase2-usda-first-20.md'), preview.join('\n'));

console.log(`Prepared ${proposed.length} proposed mappings and ${skips.length} skips from ${mappings.length} candidates.`);
