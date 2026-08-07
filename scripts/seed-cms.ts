import { createClient } from '@supabase/supabase-js';
import { getInfoHotspots, tourScenes } from '../src/tour-data.ts';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rows = tourScenes.flatMap((scene) => getInfoHotspots(scene).map((hotspot) => ({
  id: hotspot.id,
  scene_id: scene.id,
  draft_data: {
    title: hotspot.title,
    description: hotspot.description,
    reference: hotspot.reference,
    images: hotspot.images ?? []
  },
  published_data: {
    title: hotspot.title,
    description: hotspot.description,
    reference: hotspot.reference,
    images: hotspot.images ?? []
  }
})));

const { error } = await supabase.from('hotspot_contents').upsert(rows, { onConflict: 'id' });
if (error) throw error;
process.stdout.write(`Seeded ${rows.length} hotspot content records.\n`);
