// One-time local import of the approved Phase 2 USDA mappings.
// Reads every value, including fdc_id, only from docs/phase2-usda-mapping.csv.
// Usage: node scripts/import-phase2-catalog.mjs [--dry-run]
// Needs NEXT_PUBLIC_SUPABASE_URL (local only) and SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const workspace = join(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = join(workspace, 'docs', 'phase2-usda-mapping.csv');
const dryRun = process.argv.includes('--dry-run');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function numberOrFail(value, label) {
  const number = Number(value);
  if (value === '' || !Number.isFinite(number) || number < 0) {
    fail(`${label} is not a valid number: "${value}"`);
  }
  return number;
}

function loadApprovedRows(csvText) {
  const [header, ...body] = parseCsv(csvText).filter((row) => row.length > 1);
  const records = body.map((row) => {
    if (row.length !== header.length) fail(`row has ${row.length} columns, expected ${header.length}`);
    return Object.fromEntries(header.map((name, index) => [name, row[index]]));
  });

  const foods = [];
  const measures = [];
  for (const record of records) {
    if (record.status === 'skip') continue;
    if (record.status !== 'proposed') fail(`${record.candidate}: unexpected status "${record.status}"`);

    const where = record.candidate;
    const fdcId = Number(record.fdc_id);
    if (!Number.isInteger(fdcId) || fdcId <= 0) fail(`${where}: bad fdc_id "${record.fdc_id}"`);

    foods.push({
      fdc_id: fdcId,
      source_type: record.source_type,
      name: record.candidate,
      role: record.role,
      preparation_state: record.preparation_state,
      diet_tags: record.proposed_diet_tags ? record.proposed_diet_tags.split('|') : [],
      kcal_per_100g: numberOrFail(record.kcal_per_100g, `${where} kcal`),
      protein_g_per_100g: numberOrFail(record.protein_g_per_100g, `${where} protein`),
      carbs_g_per_100g: numberOrFail(record.carbs_g_per_100g, `${where} carbs`),
      fat_g_per_100g: numberOrFail(record.fat_g_per_100g, `${where} fat`),
      // Missing fiber must stay null, never 0.
      fiber_g_per_100g:
        record.fiber_g_per_100g === '' ? null : numberOrFail(record.fiber_g_per_100g, `${where} fiber`),
    });

    const labels = new Set();
    for (const part of record.usable_measures ? record.usable_measures.split('; ') : []) {
      const match = /^(.+) \((\d+(?:\.\d+)?) g\)$/.exec(part);
      if (!match) fail(`${where}: cannot read measure "${part}"`);
      if (labels.has(match[1])) fail(`${where}: duplicate measure label "${match[1]}"`);
      labels.add(match[1]);
      measures.push({ fdc_id: fdcId, label: match[1], grams: Number(match[2]) });
    }
  }

  if (new Set(foods.map((food) => food.fdc_id)).size !== foods.length) fail('duplicate fdc_id in CSV');
  return { foods, measures };
}

const { foods, measures } = loadApprovedRows(await readFile(csvPath, 'utf8'));
const expected = {
  foods: foods.length,
  measures: measures.length,
  nullFiber: foods.filter((food) => food.fiber_g_per_100g === null).length,
  zeroFiber: foods.filter((food) => food.fiber_g_per_100g === 0).length,
};
console.log('CSV expects:', expected);

if (dryRun) {
  console.log('Dry run: CSV parsed, nothing written.');
  process.exit(0);
}

process.loadEnvFile(join(workspace, '.env.local'));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
  fail(`refusing to import: ${new URL(url).hostname} is not a local host`);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const fdcIds = foods.map((food) => food.fdc_id);

const { error: foodsError } = await supabase.from('foods').upsert(foods, { onConflict: 'fdc_id' });
if (foodsError) fail(`foods upsert: ${foodsError.message}`);

const { data: idRows, error: idError } = await supabase.from('foods').select('id, fdc_id').in('fdc_id', fdcIds);
if (idError) fail(`foods read-back: ${idError.message}`);
const idByFdc = new Map(idRows.map((row) => [row.fdc_id, row.id]));

const measureRows = measures.map(({ fdc_id: fdcId, label, grams }) => ({
  food_id: idByFdc.get(fdcId),
  label,
  grams,
}));
if (measureRows.length > 0) {
  const { error: measuresError } = await supabase
    .from('food_measures')
    .upsert(measureRows, { onConflict: 'food_id,label' });
  if (measuresError) fail(`measures upsert: ${measuresError.message}`);
}

// Verify what is now in the database against the CSV.
const { data: dbFoods, error: verifyFoodsError } = await supabase
  .from('foods')
  .select('fdc_id, fiber_g_per_100g')
  .in('fdc_id', fdcIds);
if (verifyFoodsError) fail(`verify foods: ${verifyFoodsError.message}`);
const { count: measureCount, error: verifyMeasuresError } = await supabase
  .from('food_measures')
  .select('id', { count: 'exact', head: true })
  .in('food_id', [...idByFdc.values()]);
if (verifyMeasuresError) fail(`verify measures: ${verifyMeasuresError.message}`);
const { count: totalFoods } = await supabase.from('foods').select('id', { count: 'exact', head: true });

const actual = {
  foods: dbFoods.length,
  measures: measureCount,
  nullFiber: dbFoods.filter((row) => row.fiber_g_per_100g === null).length,
  zeroFiber: dbFoods.filter((row) => row.fiber_g_per_100g !== null && Number(row.fiber_g_per_100g) === 0).length,
};
console.log('Database has:', actual, `(total rows in foods: ${totalFoods})`);

const csvFiber = new Map(foods.map((food) => [food.fdc_id, food.fiber_g_per_100g]));
const fiberMismatches = dbFoods.filter((row) => {
  const csv = csvFiber.get(row.fdc_id);
  return csv === null ? row.fiber_g_per_100g !== null : Number(row.fiber_g_per_100g) !== csv;
});
const problems = [
  ...Object.keys(expected)
    .filter((key) => expected[key] !== actual[key])
    .map((key) => `${key}: expected ${expected[key]}, got ${actual[key]}`),
  ...(fiberMismatches.length ? [`${fiberMismatches.length} foods have fiber that differs from the CSV`] : []),
];
if (problems.length) fail(problems.join('; '));
console.log('PASS: counts match the CSV and missing fiber is null.');
