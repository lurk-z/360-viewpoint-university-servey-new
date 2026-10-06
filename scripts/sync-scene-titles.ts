import { createClient } from '@supabase/supabase-js';
import {
  mergeSceneTitleRenames,
  SceneTitleSyncConflictError
} from '../src/tour-scene-titles.ts';
import { tourStructureDataSchema } from '../src/tour-structure.ts';

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

try {
  const projectResult = await supabase.from('tour_projects')
    .select('id,draft_data,published_data,draft_version,published_version')
    .eq('id', 'main')
    .maybeSingle();
  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) throw new Error('Tour project main does not exist. Run npm run bootstrap:tour first.');
  if (!projectResult.data.published_data || projectResult.data.published_version === null) {
    throw new Error('Published tour structure is missing. Publish the current tour structure before syncing titles.');
  }

  const draft = tourStructureDataSchema.parse(projectResult.data.draft_data);
  const published = tourStructureDataSchema.parse(projectResult.data.published_data);
  const draftMerge = mergeSceneTitleRenames(draft);
  const publishedMerge = mergeSceneTitleRenames(published);
  const draftVersion = Number(projectResult.data.draft_version);
  const publishedVersion = Number(projectResult.data.published_version);

  if (!draftMerge.changed && !publishedMerge.changed) {
    console.log(JSON.stringify({
      changed: false,
      draftVersion,
      publishedVersion,
      preservedDraftTitles: draftMerge.preservedSceneIds,
      preservedPublishedTitles: publishedMerge.preservedSceneIds
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
    .eq('id', 'main')
    .eq('draft_version', draftVersion)
    .eq('published_version', publishedVersion)
    .select('id')
    .maybeSingle();
  if (updateResult.error) throw updateResult.error;
  if (!updateResult.data) {
    throw new Error('Tour structure changed while syncing. No titles were written; reload Admin data and try again.');
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

  const auditResult = await supabase.from('admin_audit_logs').insert({
    action: 'sync-scene-titles',
    entity_kind: 'tour_projects',
    entity_id: 'main',
    summary: {
      draftVersion: nextDraftVersion,
      publishedVersion: nextPublishedVersion,
      updatedDraftSceneIds: draftMerge.updatedSceneIds,
      updatedPublishedSceneIds: publishedMerge.updatedSceneIds,
      preservedDraftSceneIds: draftMerge.preservedSceneIds,
      preservedPublishedSceneIds: publishedMerge.preservedSceneIds
    }
  });
  if (auditResult.error) throw auditResult.error;

  console.log(JSON.stringify({
    changed: true,
    draftVersion: nextDraftVersion,
    publishedVersion: nextPublishedVersion,
    updatedDraftTitles: draftMerge.updatedSceneIds.length,
    updatedPublishedTitles: publishedMerge.updatedSceneIds.length,
    preservedDraftTitles: draftMerge.preservedSceneIds,
    preservedPublishedTitles: publishedMerge.preservedSceneIds
  }, null, 2));
} catch (error) {
  if (error instanceof SceneTitleSyncConflictError) {
    console.error(error.message);
    process.exitCode = 2;
  } else {
    throw error;
  }
}
