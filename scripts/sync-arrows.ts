import { createClient } from '@supabase/supabase-js';
import {
  extractNavigationSnapshot,
  findNewNavigationIssues,
  formatNavigationEntry,
  getNavigationSnapshotSignature,
  mergeNavigationChanges,
  navigationSnapshotSchema,
  navigationSnapshotsEqual,
  type NavigationConflict,
  type NavigationSnapshot
} from '../src/tour-navigation-sync.ts';
import {
  createBootstrapTourStructureData,
  tourStructureDataSchema,
  type TourStructureData
} from '../src/tour-structure.ts';

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
const PROJECT_ID = 'main';
const AUDIT_ACTION = 'sync-navigation-from-code';

interface ProjectRow {
  readonly draft_data: unknown;
  readonly published_data: unknown;
  readonly draft_version: number;
  readonly published_version: number | null;
}

function snapshotDifferences(left: NavigationSnapshot, right: NavigationSnapshot): string[] {
  const leftById = new Map(left.map((entry) => [entry.id, entry]));
  const rightById = new Map(right.map((entry) => [entry.id, entry]));
  return [...new Set([...leftById.keys(), ...rightById.keys()])]
    .sort()
    .filter((id) => JSON.stringify(leftById.get(id)) !== JSON.stringify(rightById.get(id)));
}

function printConflicts(scope: string, conflicts: readonly NavigationConflict[]): void {
  for (const conflict of conflicts) {
    console.error(`\n[${scope}] ${conflict.id}`);
    console.error(`  Baseline : ${formatNavigationEntry(conflict.baseline)}`);
    console.error(`  VS Code  : ${formatNavigationEntry(conflict.code)}`);
    console.error(`  Admin    : ${formatNavigationEntry(conflict.current)}`);
  }
}

async function writeBaseline(input: {
  readonly navigation: NavigationSnapshot;
  readonly draftVersion: number;
  readonly publishedVersion: number;
  readonly reason: 'initialize' | 'sync' | 'already-matched';
  readonly draftChanged?: boolean;
  readonly publishedChanged?: boolean;
  readonly changedIds?: readonly string[];
}): Promise<void> {
  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_id: null,
    action: AUDIT_ACTION,
    entity_kind: 'tour_projects',
    entity_id: PROJECT_ID,
    summary: {
      navigationBaseline: input.navigation,
      navigationSignature: getNavigationSnapshotSignature(input.navigation),
      draftVersion: input.draftVersion,
      publishedVersion: input.publishedVersion,
      reason: input.reason,
      draftChanged: input.draftChanged ?? false,
      publishedChanged: input.publishedChanged ?? false,
      changedIds: input.changedIds ?? []
    }
  });
  if (error) throw new Error(`Could not write navigation baseline: ${error.message}`);
}

const projectResult = await supabase.from('tour_projects')
  .select('draft_data,published_data,draft_version,published_version')
  .eq('id', PROJECT_ID)
  .maybeSingle();
if (projectResult.error) {
  throw new Error(`Tour structure is not ready: ${projectResult.error.message}`);
}
if (!projectResult.data) {
  throw new Error('Tour project main does not exist. Run npm run bootstrap:tour first.');
}

const row = projectResult.data as ProjectRow;
if (row.published_version === null || row.published_data === null) {
  throw new Error('The tour has not been published yet. Publish it from Admin before syncing arrows.');
}
const draft = tourStructureDataSchema.parse(row.draft_data);
const published = tourStructureDataSchema.parse(row.published_data);
const codeStructure = createBootstrapTourStructureData();
const codeNavigation = extractNavigationSnapshot(codeStructure);
const draftNavigation = extractNavigationSnapshot(draft);
const publishedNavigation = extractNavigationSnapshot(published);
const draftVersion = Number(row.draft_version);
const publishedVersion = Number(row.published_version);

const baselineResult = await supabase.from('admin_audit_logs')
  .select('summary,created_at')
  .eq('action', AUDIT_ACTION)
  .eq('entity_kind', 'tour_projects')
  .eq('entity_id', PROJECT_ID)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
if (baselineResult.error) {
  throw new Error(`Could not read navigation baseline: ${baselineResult.error.message}`);
}

const baselineValue = baselineResult.data
  ? (baselineResult.data.summary as Record<string, unknown> | null)?.navigationBaseline
  : undefined;

if (baselineValue === undefined) {
  const draftDifferences = snapshotDifferences(codeNavigation, draftNavigation);
  const publishedDifferences = snapshotDifferences(codeNavigation, publishedNavigation);
  if (draftDifferences.length > 0 || publishedDifferences.length > 0) {
    console.error('Navigation baseline was not created because VS Code and Supabase are not identical.');
    if (draftDifferences.length > 0) {
      console.error(`Draft differs at: ${draftDifferences.slice(0, 30).join(', ')}`);
    }
    if (publishedDifferences.length > 0) {
      console.error(`Published differs at: ${publishedDifferences.slice(0, 30).join(', ')}`);
    }
    throw new Error('Resolve these arrow differences first; no database data was changed.');
  }
  await writeBaseline({
    navigation: codeNavigation,
    draftVersion,
    publishedVersion,
    reason: 'initialize'
  });
  console.log(JSON.stringify({
    baselineCreated: true,
    navigationHotspots: codeNavigation.length,
    added: 0,
    updated: 0,
    moved: 0,
    deleted: 0,
    draftVersion,
    publishedVersion
  }, null, 2));
  process.exit(0);
}

const baselineParse = navigationSnapshotSchema.safeParse(baselineValue);
if (!baselineParse.success) {
  throw new Error('The latest navigation baseline is invalid. No database data was changed.');
}
const baseline = baselineParse.data;
const draftMerge = mergeNavigationChanges({ baseline, code: codeNavigation, current: draft });
const publishedMerge = mergeNavigationChanges({ baseline, code: codeNavigation, current: published });

if (draftMerge.conflicts.length > 0 || publishedMerge.conflicts.length > 0) {
  console.error('Arrow sync stopped because the same hotspot was edited differently in VS Code and Admin.');
  printConflicts('Draft', draftMerge.conflicts);
  printConflicts('Published', publishedMerge.conflicts);
  throw new Error('No Draft, Published, version, revision, or baseline data was changed.');
}

const draftIssues = findNewNavigationIssues(draft, draftMerge.data);
const publishedIssues = findNewNavigationIssues(published, publishedMerge.data);
if (draftIssues.length > 0 || publishedIssues.length > 0) {
  console.error('Arrow sync stopped because the edit introduced a broken or one-way route.');
  draftIssues.forEach((issue) => console.error(`[Draft] ${issue}`));
  publishedIssues.forEach((issue) => console.error(`[Published] ${issue}`));
  throw new Error('Add the return arrow or reconnect the route, then run sync:arrows again.');
}

const baselineChanged = !navigationSnapshotsEqual(baseline, codeNavigation);
if (!draftMerge.changed && !publishedMerge.changed) {
  if (baselineChanged) {
    await writeBaseline({
      navigation: codeNavigation,
      draftVersion,
      publishedVersion,
      reason: 'already-matched',
      changedIds: draftMerge.codeChangedIds
    });
  }
  console.log(JSON.stringify({
    baselineAdvanced: baselineChanged,
    navigationHotspots: codeNavigation.length,
    added: 0,
    updated: 0,
    moved: 0,
    deleted: 0,
    draftVersion,
    publishedVersion
  }, null, 2));
  process.exit(0);
}

const nextDraftVersion = draftMerge.changed ? draftVersion + 1 : draftVersion;
const nextPublishedVersion = publishedMerge.changed ? publishedVersion + 1 : publishedVersion;
const updateResult = await supabase.from('tour_projects').update({
  draft_data: draftMerge.data,
  published_data: publishedMerge.data,
  draft_version: nextDraftVersion,
  published_version: nextPublishedVersion
})
  .eq('id', PROJECT_ID)
  .eq('draft_version', draftVersion)
  .eq('published_version', publishedVersion)
  .select('id')
  .maybeSingle();
if (updateResult.error) throw new Error(`Arrow sync failed: ${updateResult.error.message}`);
if (!updateResult.data) {
  throw new Error('The tour changed during sync. Nothing was partially written; review Admin and run again.');
}

const revisions: Array<{
  project_id: string;
  action: 'save' | 'publish';
  snapshot: TourStructureData;
  version: number;
}> = [];
if (draftMerge.changed) {
  revisions.push({ project_id: PROJECT_ID, action: 'save', snapshot: draftMerge.data, version: nextDraftVersion });
}
if (publishedMerge.changed) {
  revisions.push({ project_id: PROJECT_ID, action: 'publish', snapshot: publishedMerge.data, version: nextPublishedVersion });
}
const revisionResult = await supabase.from('tour_revisions').insert(revisions);
if (revisionResult.error) {
  throw new Error(`Arrows were updated, but revision history could not be written: ${revisionResult.error.message}. Run sync:arrows again.`);
}

const changedIds = [...new Set([
  ...draftMerge.changes.added,
  ...draftMerge.changes.updated,
  ...draftMerge.changes.moved,
  ...draftMerge.changes.deleted,
  ...publishedMerge.changes.added,
  ...publishedMerge.changes.updated,
  ...publishedMerge.changes.moved,
  ...publishedMerge.changes.deleted
])].sort();
await writeBaseline({
  navigation: codeNavigation,
  draftVersion: nextDraftVersion,
  publishedVersion: nextPublishedVersion,
  reason: 'sync',
  draftChanged: draftMerge.changed,
  publishedChanged: publishedMerge.changed,
  changedIds
});

function total(kind: keyof typeof draftMerge.changes): number {
  return new Set([...draftMerge.changes[kind], ...publishedMerge.changes[kind]]).size;
}

console.log(JSON.stringify({
  baselineAdvanced: true,
  navigationHotspots: codeNavigation.length,
  added: total('added'),
  updated: total('updated'),
  moved: total('moved'),
  deleted: total('deleted'),
  draftVersion: nextDraftVersion,
  publishedVersion: nextPublishedVersion,
  changedHotspotIds: changedIds
}, null, 2));
