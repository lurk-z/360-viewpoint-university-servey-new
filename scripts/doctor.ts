import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createBootstrapTourStructureData } from '../src/tour-structure.ts';
import {
  TOUR_PANORAMA_BUCKET,
  TOUR_PANORAMA_STORAGE_PREFIX,
  isStoredTourPanoramaUrl,
  tourAssetFileName
} from '../src/tour-panorama-storage.ts';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

interface CheckResult {
  readonly label: string;
  readonly ok: boolean;
  readonly detail: string;
  readonly critical?: boolean;
}

const results: CheckResult[] = [];
const add = (label: string, ok: boolean, detail: string, critical = false): void => {
  results.push({ label, ok, detail, critical });
};

const nodeMajor = Number(process.versions.node.split('.')[0]);
add('Node.js', nodeMajor === 22, process.versions.node, true);
add('.env.local', existsSync('.env.local'), existsSync('.env.local') ? 'พบไฟล์' : 'ยังไม่มีไฟล์', true);

const structure = createBootstrapTourStructureData();
let missingPanoramas = 0;
let storedPanoramas = 0;
for (const scene of structure.scenes) {
  if (isStoredTourPanoramaUrl(scene.panorama)) {
    storedPanoramas += 1;
    continue;
  }
  if (!scene.panorama.startsWith('/')) {
    missingPanoramas += 1;
    continue;
  }
  const pathname = scene.panorama.split('?')[0] ?? '';
  const filePath = fileURLToPath(new URL(`../public${pathname}`, import.meta.url));
  if (!existsSync(filePath)) missingPanoramas += 1;
}
add(
  'Panorama URLs',
  missingPanoramas === 0,
  `${storedPanoramas} Storage, ${structure.scenes.length - storedPanoramas - missingPanoramas} local`,
  true
);

const portAvailable = await new Promise<boolean>((resolve) => {
  const server = createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => server.close(() => resolve(true)));
  server.listen(3000, '0.0.0.0');
});
add('พอร์ต 3000', portAvailable, portAvailable ? 'พร้อมใช้งาน' : 'มี Server ใช้งานอยู่แล้ว');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
add('Supabase environment', Boolean(supabaseUrl && publishableKey && serviceKey), 'ตรวจเฉพาะว่ากำหนดค่าแล้ว', true);

if (supabaseUrl && serviceKey) {
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });
  const [versions, tour, buckets, storedObjects] = await Promise.all([
    client.from('app_schema_versions').select('version'),
    client.from('tour_projects').select('id').eq('id', 'main').maybeSingle(),
    client.storage.listBuckets(),
    client.storage.from(TOUR_PANORAMA_BUCKET).list(
      TOUR_PANORAMA_STORAGE_PREFIX,
      { limit: 1000, sortBy: { column: 'name', order: 'asc' } }
    )
  ]);
  add('Workflow migration', !versions.error, versions.error ? 'ตรวจสอบไม่สำเร็จ' : `${versions.data.length} เวอร์ชัน`);
  add('Tour structure bootstrap', !tour.error && Boolean(tour.data), tour.data ? 'พร้อมใช้งาน' : 'รัน npm run bootstrap:tour');
  const bucketNames = new Set((buckets.data ?? []).map((bucket) => bucket.id));
  add(
    'Storage',
    !buckets.error && bucketNames.has('content-media') && bucketNames.has(TOUR_PANORAMA_BUCKET),
    buckets.error ? 'ตรวจสอบไม่สำเร็จ' : 'ตรวจ Bucket แล้ว'
  );

  const expectedStoredFiles = new Set(
    structure.scenes
      .filter((scene) => isStoredTourPanoramaUrl(scene.panorama))
      .map((scene) => tourAssetFileName(scene.panorama))
  );
  const actualStoredFiles = new Set((storedObjects.data ?? []).map((item) => item.name));
  const missingStoredFiles = [...expectedStoredFiles].filter((fileName) => !actualStoredFiles.has(fileName));
  add(
    'Panorama Storage objects',
    !storedObjects.error && missingStoredFiles.length === 0,
    storedObjects.error ? 'Storage list failed' : `${expectedStoredFiles.size - missingStoredFiles.length}/${expectedStoredFiles.size} files`,
    true
  );
}

add(
  'Gemini',
  Boolean(process.env.GEMINI_API_KEY?.trim()),
  process.env.GEMINI_API_KEY?.trim() ? (process.env.GEMINI_MODEL || 'ใช้โมเดลค่าเริ่มต้น') : 'ยังไม่ได้ตั้ง API key'
);

for (const result of results) {
  console.log(`${result.ok ? '[OK]' : '[! ]'} ${result.label}: ${result.detail}`);
}
if (results.some((result) => result.critical && !result.ok)) process.exitCode = 1;
