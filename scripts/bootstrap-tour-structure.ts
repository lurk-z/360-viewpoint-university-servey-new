import { createClient } from '@supabase/supabase-js';
import { createBootstrapTourStructureData } from '../src/tour-structure.ts';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
});
const existing = await supabase.from('tour_projects').select('id').eq('id', 'main').maybeSingle();
if (existing.error) {
  throw new Error(`Tour structure migration is not ready: ${existing.error.message}`);
}
if (existing.data) {
  console.log('Tour structure already exists. Existing Admin data was not changed.');
  process.exit(0);
}

const structure = createBootstrapTourStructureData();
const { error } = await supabase.from('tour_projects').insert({
  id: 'main',
  draft_data: structure,
  published_data: structure,
  draft_version: 1,
  published_version: 1
});
if (error) throw error;
await supabase.from('tour_revisions').insert({
  project_id: 'main',
  action: 'create',
  snapshot: structure,
  version: 1
});

const navigationCount = structure.scenes.reduce(
  (count, scene) => count + scene.hotspots.filter((hotspot) => hotspot.type === 'scene').length,
  0
);
const infoCount = structure.scenes.reduce(
  (count, scene) => count + scene.hotspots.filter((hotspot) => hotspot.type === 'info').length,
  0
);
console.log(`Bootstrapped ${structure.scenes.length} scenes, ${navigationCount} navigation hotspots, and ${infoCount} Info hotspots.`);

