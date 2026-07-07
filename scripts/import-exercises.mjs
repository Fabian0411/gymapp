/**
 * Importa el catálogo de ejercicios de free-exercise-db a Supabase.
 *
 * Uso (una sola vez, después de ejecutar supabase/migrations/001_schema.sql):
 *   1. En .env agrega SUPABASE_SERVICE_ROLE_KEY (Supabase > Settings > API).
 *   2. node scripts/import-exercises.mjs
 *   3. Borra o comenta SUPABASE_SERVICE_ROLE_KEY del .env (no se usa en la app).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// Carga .env sin depender de dotenv
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.+?)\s*$/);
    if (match && !line.trim().startsWith('#')) {
      process.env[match[1]] ??= match[2];
    }
  }
} catch {
  // sin .env: se esperan variables de entorno ya definidas
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.\n' +
      'La service key está en supabase.com > Settings > API (solo se usa en este script).'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

console.log('Descargando dataset...');
const response = await fetch(DATASET_URL);
if (!response.ok) {
  console.error(`Error descargando el dataset: HTTP ${response.status}`);
  process.exit(1);
}
const exercises = await response.json();
console.log(`${exercises.length} ejercicios descargados. Subiendo a Supabase...`);

const rows = exercises.map((e) => ({
  id: e.id,
  name: e.name,
  category: e.category ?? null,
  equipment: e.equipment ?? null,
  level: e.level ?? null,
  mechanic: e.mechanic ?? null,
  force: e.force ?? null,
  primary_muscles: e.primaryMuscles ?? [],
  secondary_muscles: e.secondaryMuscles ?? [],
  instructions: e.instructions ?? [],
  images: e.images ?? [],
}));

const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('exercises').upsert(batch);
  if (error) {
    console.error(`Error en el lote ${i / BATCH + 1}:`, error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

console.log('✅ Catálogo importado. Ya puedes verlo en la pestaña Ejercicios de la app.');
