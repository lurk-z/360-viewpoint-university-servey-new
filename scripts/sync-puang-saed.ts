import { createClient } from '@supabase/supabase-js';
import { createBootstrapTourStructureData, tourStructureDataSchema } from '../src/tour-structure.ts';
import { mergePuangSaedBaseline, mergePuangSaedExpansion } from '../src/tour-puang-saed-expansion.ts';
import { getNavigationSnapshotSignature, navigationSnapshotSchema } from '../src/tour-navigation-sync.ts';

export async function syncPuangSaed(): Promise<void> {
  try { process.loadEnvFile('.env.local'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase URL and server-side service role key are required.');
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });
  const projectId = 'main';
  const baselineAction = 'sync-navigation-from-code';
  const [projectResult, baselineResult] = await Promise.all([
    supabase.from('tour_projects').select('draft_data,published_data,draft_version,published_version')
      .eq('id', projectId).single(),
    supabase.from('admin_audit_logs').select('summary').eq('action', baselineAction)
      .eq('entity_kind', 'tour_projects').eq('entity_id', projectId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  if (projectResult.error) throw new Error(`Cannot read tour: ${projectResult.error.message}`);
  if (baselineResult.error) throw new Error(`Cannot read baseline: ${baselineResult.error.message}`);
  const row = projectResult.data;
  if (!row.published_data || !row.published_version) throw new Error('Publish the initial tour before adding this room.');
  const originalDraft = tourStructureDataSchema.parse(row.draft_data);
  const originalPublished = tourStructureDataSchema.parse(row.published_data);
  const code = createBootstrapTourStructureData();
  // Compute and validate both sides before making any database writes.
  const draft = mergePuangSaedExpansion(originalDraft, code);
  const published = mergePuangSaedExpansion(originalPublished, code);
  const baseline = baselineResult.data?.summary?.navigationBaseline;
  const nextBaseline = baseline === undefined
    ? undefined
    : mergePuangSaedBaseline(navigationSnapshotSchema.parse(baseline), code);
  const draftVersion = Number(row.draft_version) + Number(draft.changed);
  const publishedVersion = Number(row.published_version) + Number(published.changed);
  const summary = {
    scope: 'puang-saed-only', dryRun: process.argv.includes('--dry-run'),
    draft: { addedScenes: draft.addedSceneIds, addedArrows: draft.addedHotspotIds, version: draftVersion },
    published: { addedScenes: published.addedSceneIds, addedArrows: published.addedHotspotIds, version: publishedVersion },
    baselineAvailable: nextBaseline !== undefined
  };
  if (summary.dryRun || (!draft.changed && !published.changed)) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  // Save recoverable snapshots before updating; a version conflict may leave only these harmless backups.
  const backups = [];
  if (draft.changed) backups.push({ project_id: projectId, action: 'save', snapshot: originalDraft, version: Number(row.draft_version) });
  if (published.changed) backups.push({ project_id: projectId, action: 'publish', snapshot: originalPublished, version: Number(row.published_version) });
  const backupResult = await supabase.from('tour_revisions').insert(backups);
  if (backupResult.error) throw new Error(`Backup failed; tour not changed: ${backupResult.error.message}`);
  const update = await supabase.from('tour_projects').update({
    draft_data: draft.data, published_data: published.data,
    draft_version: draftVersion, published_version: publishedVersion
  }).eq('id', projectId).eq('draft_version', row.draft_version).eq('published_version', row.published_version)
    .select('id').maybeSingle();
  if (update.error) throw new Error(`Tour update failed: ${update.error.message}`);
  if (!update.data) throw new Error('Admin changed the tour during sync. No tour changes applied; run the dry-run again.');
  const audit = [{
    actor_id: null, action: 'sync-puang-saed-room', entity_kind: 'tour_projects', entity_id: projectId, summary
  }];
  if (nextBaseline) audit.push({
    actor_id: null, action: baselineAction, entity_kind: 'tour_projects', entity_id: projectId,
    summary: { ...summary, ...{
      navigationBaseline: nextBaseline,
      navigationSignature: getNavigationSnapshotSignature(nextBaseline),
      draftVersion, publishedVersion, reason: 'puang-saed-expansion'
    } }
  });
  const auditResult = await supabase.from('admin_audit_logs').insert(audit);
  if (auditResult.error) {
    throw new Error(`Room was saved, but audit/baseline recording failed: ${auditResult.error.message}. Existing revision backups are retained.`);
  }
  // The existing HEAD/signature endpoint bypasses cache; open tours discover this version within 15 seconds.
  console.log(JSON.stringify(summary, null, 2));
}
