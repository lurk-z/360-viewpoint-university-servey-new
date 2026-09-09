import { createClient } from '@supabase/supabase-js';
import { hotspotDataSchema, type HotspotData } from '../src/content.ts';
import {
  getTourExpansionNavigationIds,
  mergeTourExpansion,
  RETIRED_TOUR_INFO_IDS
} from '../src/tour-expansion.ts';
import { createBootstrapTourStructureData, tourStructureDataSchema } from '../src/tour-structure.ts';
import {
  extractNavigationSnapshot,
  getNavigationSnapshotSignature,
  navigationSnapshotSchema,
  navigationSnapshotsEqual
} from '../src/tour-navigation-sync.ts';
import { retiredPlaceContentBaselines } from './place-seed-data.ts';
import {
  coworkingRetiredContentBaseline,
  dormitoryContentUpdates,
  mergeDormitoryContent
} from './dormitory-content-update.ts';

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

const upperFloorsContent: HotspotData = hotspotDataSchema.parse({
  title: {
    th: 'ข้อมูลชั้น 5–6 อาคารสิรินธร',
    en: 'Sirindhorn Building Floors 5–6'
  },
  description: {
    th: 'ชั้น 5 เป็นพื้นที่หอสมุดออนไลน์ซึ่งนักศึกษาไม่สามารถเข้าใช้งานได้ ส่วนชั้น 6 เป็นห้องคอมพิวเตอร์และพื้นที่บริการด้านเทคโนโลยีสารสนเทศ',
    en: 'Floor 5 houses the online library area, which is not accessible to students. Floor 6 contains computer rooms and information technology service areas.'
  },
  sceneTitle: {
    th: 'บันไดอาคารสิรินธร ชั้น 4',
    en: 'Sirindhorn Building Stairs, Floor 4'
  },
  sceneDescription: {
    th: 'จุดบันไดชั้น 4 สำหรับดูข้อมูลพื้นที่ชั้น 5 และชั้น 6 ซึ่งยังไม่มีภาพพาโนรามาในทัวร์',
    en: 'The fourth-floor stairs with information about floors 5 and 6, which do not yet have panoramas in the tour.'
  },
  reference: {
    label: {
      th: 'ข้อมูลและภาพถ่ายจากการสำรวจโครงการ',
      en: 'Project survey information and photographs'
    }
  },
  images: [{
    src: '/mainimages/temp-library-floor4-1.jpg?v=20260805-redacted',
    alt: {
      th: 'บันไดอาคารสิรินธร ชั้น 4',
      en: 'Sirindhorn Building stairs on the fourth floor'
    },
    caption: {
      th: 'ทางขึ้นชั้นบนของอาคารสิรินธร',
      en: 'Stairs to the upper floors of the Sirindhorn Building'
    }
  }]
});

const retiredStairBaselines: Readonly<Record<string, HotspotData>> = {
  'fitm-stairs-1-to-second-floor-info': hotspotDataSchema.parse({
    title: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' },
    description: {
      th: 'บันไดทางขึ้นไปยังชั้น 2 ของอาคาร โดยจะเพิ่มเส้นทางชั้น 2 ในภายหลัง',
      en: 'The stairs leading to the second floor; the second-floor tour route will be added later.'
    },
    sceneTitle: {
      th: 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 8',
      en: 'Inside FITM Point 8'
    },
    sceneDescription: {
      th: 'จุดที่ 8 ของเส้นทางภายในอาคารคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'Point 8 on the indoor route through the Faculty of Industrial Technology and Management.'
    },
    reference: {
      label: {
        th: 'ข้อมูลและภาพถ่ายจากการสำรวจโครงการ',
        en: 'Project survey data and photographs'
      }
    },
    images: [{
      src: '/mainimages/temp-faculty-8.jpg?v=20260805-redacted',
      alt: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' },
      caption: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' }
    }]
  }),
  'fitm-stairs-2-to-second-floor-info': hotspotDataSchema.parse({
    title: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' },
    description: {
      th: 'บันไดทางขึ้นไปยังชั้น 2 ของอาคาร โดยจะเพิ่มเส้นทางชั้น 2 ในภายหลัง',
      en: 'The stairs leading to the second floor; the second-floor tour route will be added later.'
    },
    sceneTitle: {
      th: 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 13',
      en: 'Inside FITM Point 13'
    },
    sceneDescription: {
      th: 'จุดที่ 13 ของเส้นทางภายในอาคารคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'Point 13 on the indoor route through the Faculty of Industrial Technology and Management.'
    },
    reference: {
      label: {
        th: 'ข้อมูลและภาพถ่ายจากการสำรวจโครงการ',
        en: 'Project survey data and photographs'
      }
    },
    images: [{
      src: '/mainimages/temp-faculty-13.jpg?v=20260805-redacted',
      alt: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' },
      caption: { th: 'ทางไปชั้น 2', en: 'Way to the Second Floor' }
    }]
  })
};

const retiredContentBaselines: Readonly<Record<string, unknown>> = {
  ...retiredStairBaselines,
  'Sirindhorn Building-info': retiredPlaceContentBaselines['Sirindhorn Building-info'],
  'fitm-coworking-space-info': coworkingRetiredContentBaseline
};

function normalizedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizedJson(item)])
    );
  }
  return value;
}

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizedJson(left)) === JSON.stringify(normalizedJson(right));
}

function isPlaceholder(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true;
  const record = value as Record<string, unknown>;
  const images = Array.isArray(record.images) ? record.images : [];
  const reference = record.reference as { label?: { th?: string; en?: string } } | undefined;
  return images.length === 0
    && !reference?.label?.th?.trim()
    && !reference?.label?.en?.trim();
}

const projectResult = await supabase.from('tour_projects')
  .select('id,draft_data,published_data,draft_version,published_version')
  .eq('id', 'main')
  .maybeSingle();
if (projectResult.error) {
  throw new Error(`Tour structure migration is not ready: ${projectResult.error.message}`);
}
if (!projectResult.data) {
  throw new Error('Tour project main does not exist. Run npm run bootstrap:tour first.');
}

const target = createBootstrapTourStructureData();
const currentDraft = tourStructureDataSchema.parse(projectResult.data.draft_data);
const currentPublished = tourStructureDataSchema.parse(projectResult.data.published_data);
const draftMerge = mergeTourExpansion(currentDraft, target);
const publishedMerge = mergeTourExpansion(currentPublished, target);
const currentDraftVersion = Number(projectResult.data.draft_version);
const currentPublishedVersion = Number(projectResult.data.published_version);
const nextDraftVersion = draftMerge.changed ? currentDraftVersion + 1 : currentDraftVersion;
const nextPublishedVersion = publishedMerge.changed ? currentPublishedVersion + 1 : currentPublishedVersion;

if (draftMerge.changed || publishedMerge.changed) {
  const updateResult = await supabase.from('tour_projects').update({
    draft_data: draftMerge.data,
    published_data: publishedMerge.data,
    draft_version: nextDraftVersion,
    published_version: nextPublishedVersion
  })
    .eq('id', 'main')
    .eq('draft_version', currentDraftVersion)
    .eq('published_version', currentPublishedVersion)
    .select('id')
    .maybeSingle();
  if (updateResult.error) throw updateResult.error;
  if (!updateResult.data) {
    throw new Error('โครงสร้างทัวร์ถูกแก้ระหว่างซิงก์ โปรดลองใหม่หลังตรวจข้อมูลใน Admin');
  }

  const revisions = [];
  if (draftMerge.changed) {
    revisions.push({
      project_id: 'main',
      action: 'save',
      snapshot: draftMerge.data,
      version: nextDraftVersion
    });
  }
  if (publishedMerge.changed) {
    revisions.push({
      project_id: 'main',
      action: 'publish',
      snapshot: publishedMerge.data,
      version: nextPublishedVersion
    });
  }
  const revisionResult = await supabase.from('tour_revisions').insert(revisions);
  if (revisionResult.error) throw revisionResult.error;
}

const upperFloorResult = await supabase.from('hotspot_contents')
  .select('id,scene_id,draft_data,published_data,archived_at')
  .eq('id', 'sirindhorn-upper-floors-info')
  .maybeSingle();
if (upperFloorResult.error) throw upperFloorResult.error;
let newInfoStatus = 'preserved';
if (!upperFloorResult.data) {
  const insertResult = await supabase.from('hotspot_contents').insert({
    id: 'sirindhorn-upper-floors-info',
    scene_id: 'sirindhornLibraryFloor4Point1',
    draft_data: upperFloorsContent,
    published_data: upperFloorsContent
  });
  if (insertResult.error) throw insertResult.error;
  newInfoStatus = 'inserted-and-published';
} else if (isPlaceholder(upperFloorResult.data.draft_data)
  && (upperFloorResult.data.published_data === null || isPlaceholder(upperFloorResult.data.published_data))) {
  const updateResult = await supabase.from('hotspot_contents').update({
    scene_id: 'sirindhornLibraryFloor4Point1',
    draft_data: upperFloorsContent,
    published_data: upperFloorsContent,
    archived_at: null
  }).eq('id', 'sirindhorn-upper-floors-info');
  if (updateResult.error) throw updateResult.error;
  newInfoStatus = 'placeholder-filled-and-published';
} else if (upperFloorResult.data.scene_id !== 'sirindhornLibraryFloor4Point1') {
  throw new Error(
    'sirindhorn-upper-floors-info มีข้อมูล Admin อยู่แล้วแต่เชื่อมกับฉากอื่น จึงหยุดเพื่อไม่เขียนทับข้อมูล'
  );
}

const retiredResult = await supabase.from('hotspot_contents')
  .select('id,scene_id,draft_data,published_data,archived_at')
  .in('id', [...RETIRED_TOUR_INFO_IDS]);
if (retiredResult.error) throw retiredResult.error;
const archived: string[] = [];
const preserved: string[] = [];
for (const row of retiredResult.data ?? []) {
  if (row.archived_at) continue;
  const baseline = retiredContentBaselines[String(row.id)];
  const unchanged = baseline !== undefined
    && equalJson(row.draft_data, baseline)
    && equalJson(row.published_data, baseline);
  if (!unchanged) {
    preserved.push(String(row.id));
    continue;
  }
  const archiveResult = await supabase.from('hotspot_contents')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('archived_at', null);
  if (archiveResult.error) throw archiveResult.error;
  archived.push(String(row.id));
}

const dormitoryResult = await supabase.from('hotspot_contents')
  .select('id,draft_data,published_data,updated_at')
  .in('id', dormitoryContentUpdates.map((item) => item.id));
if (dormitoryResult.error) throw dormitoryResult.error;
const dormitoryContentResults: Array<{
  readonly id: string;
  readonly draftFields: readonly string[];
  readonly publishedFields: readonly string[];
}> = [];
for (const row of dormitoryResult.data ?? []) {
  const draftContent = mergeDormitoryContent(String(row.id), row.draft_data);
  const publishedContent = row.published_data === null
    ? undefined
    : mergeDormitoryContent(String(row.id), row.published_data);
  if (!draftContent.changed && !publishedContent?.changed) continue;

  const updatePayload: Record<string, unknown> = {};
  if (draftContent.changed) updatePayload.draft_data = draftContent.data;
  if (publishedContent?.changed) updatePayload.published_data = publishedContent.data;
  const updateResult = await supabase.from('hotspot_contents')
    .update(updatePayload)
    .eq('id', row.id)
    .eq('updated_at', row.updated_at)
    .select('id')
    .maybeSingle();
  if (updateResult.error) throw updateResult.error;
  if (!updateResult.data) {
    throw new Error(`Hotspot ${row.id} was edited while syncing. No newer Admin content was overwritten.`);
  }
  dormitoryContentResults.push({
    id: String(row.id),
    draftFields: draftContent.changedFields,
    publishedFields: publishedContent?.changedFields ?? []
  });
}

const codeNavigation = extractNavigationSnapshot(target);
const mergedDraftNavigation = extractNavigationSnapshot(draftMerge.data);
const mergedPublishedNavigation = extractNavigationSnapshot(publishedMerge.data);
let navigationBaselineAdvanced = false;
const baselineResult = await supabase.from('admin_audit_logs')
  .select('summary')
  .eq('action', 'sync-navigation-from-code')
  .eq('entity_kind', 'tour_projects')
  .eq('entity_id', 'main')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
if (baselineResult.error) throw baselineResult.error;
const baselineValue = (baselineResult.data?.summary as Record<string, unknown> | null)?.navigationBaseline;
const baselineParse = navigationSnapshotSchema.safeParse(baselineValue);
let nextNavigationBaseline = navigationSnapshotsEqual(codeNavigation, mergedDraftNavigation)
  && navigationSnapshotsEqual(codeNavigation, mergedPublishedNavigation)
  ? codeNavigation
  : undefined;

if (!nextNavigationBaseline && baselineParse.success) {
  const controlledIds = getTourExpansionNavigationIds(target);
  const baselineById = new Map(baselineParse.data.map((entry) => [entry.id, entry]));
  const codeById = new Map(codeNavigation.map((entry) => [entry.id, entry]));
  const draftById = new Map(mergedDraftNavigation.map((entry) => [entry.id, entry]));
  const publishedById = new Map(mergedPublishedNavigation.map((entry) => [entry.id, entry]));
  for (const id of controlledIds) {
    const codeEntry = codeById.get(id);
    if (JSON.stringify(draftById.get(id)) !== JSON.stringify(codeEntry)
      || JSON.stringify(publishedById.get(id)) !== JSON.stringify(codeEntry)) {
      throw new Error(`Navigation baseline was not advanced because expansion hotspot ${id} is inconsistent.`);
    }
    if (codeEntry) baselineById.set(id, codeEntry);
    else baselineById.delete(id);
  }
  nextNavigationBaseline = navigationSnapshotSchema.parse(
    [...baselineById.values()].sort((left, right) => left.id.localeCompare(right.id))
  );
}

if (nextNavigationBaseline) {
  const previousNavigationBaseline = baselineParse.success ? baselineParse.data : undefined;
  if (!previousNavigationBaseline
    || !navigationSnapshotsEqual(previousNavigationBaseline, nextNavigationBaseline)) {
    const navigationSignature = getNavigationSnapshotSignature(nextNavigationBaseline);
    const baselineWrite = await supabase.from('admin_audit_logs').insert({
      actor_id: null,
      action: 'sync-navigation-from-code',
      entity_kind: 'tour_projects',
      entity_id: 'main',
      summary: {
        navigationBaseline: nextNavigationBaseline,
        navigationSignature,
        draftVersion: nextDraftVersion,
        publishedVersion: nextPublishedVersion,
        reason: 'sync-tour-expansion',
        draftChanged: draftMerge.changed,
        publishedChanged: publishedMerge.changed
      }
    });
    if (baselineWrite.error) throw baselineWrite.error;
    navigationBaselineAdvanced = true;
  }
}

if (draftMerge.changed || publishedMerge.changed || newInfoStatus !== 'preserved'
  || archived.length > 0 || dormitoryContentResults.length > 0) {
  const expansionAuditWrite = await supabase.from('admin_audit_logs').insert({
    actor_id: null,
    action: 'sync-tour-expansion',
    entity_kind: 'tour_projects',
    entity_id: 'main',
    summary: {
      draftChanged: draftMerge.changed,
      publishedChanged: publishedMerge.changed,
      draftVersion: nextDraftVersion,
      publishedVersion: nextPublishedVersion,
      newInfoStatus,
      archivedInfoIds: archived,
      preservedEditedInfoIds: preserved,
      dormitoryContentUpdates: dormitoryContentResults
    }
  });
  if (expansionAuditWrite.error) throw expansionAuditWrite.error;
}

const navigationCount = publishedMerge.data.scenes.reduce(
  (count, scene) => count + scene.hotspots.filter((hotspot) => hotspot.type === 'scene').length,
  0
);
const infoCount = publishedMerge.data.scenes.reduce(
  (count, scene) => count + scene.hotspots.filter((hotspot) => hotspot.type === 'info').length,
  0
);
console.log(JSON.stringify({
  scenes: publishedMerge.data.scenes.length,
  navigationHotspots: navigationCount,
  infoHotspots: infoCount,
  draftVersion: nextDraftVersion,
  publishedVersion: nextPublishedVersion,
  structureChanged: draftMerge.changed || publishedMerge.changed,
  navigationBaselineAdvanced,
  newInfoStatus,
  archivedInfoIds: archived,
  preservedEditedInfoIds: preserved,
  dormitoryContentUpdates: dormitoryContentResults
}, null, 2));
