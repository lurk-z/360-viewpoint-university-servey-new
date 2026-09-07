import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillVisitSeries } from './server/admin-repository';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202608070001_cms.sql'),
  'utf8'
);
const linkedContentMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202608070002_linked_faculty_content.sql'),
  'utf8'
);
const adminActions = [
  'app/admin/actions/content.ts',
  'app/admin/actions/tour.ts',
  'app/admin/actions/users.ts',
  'app/admin/actions/media.ts',
  'src/server/admin-action-shared.ts'
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n');
const adminEditor = [
  'components/admin/AdminContentEditor.tsx',
  'components/admin/AdminContentForms.tsx',
  'components/admin/AdminContentFields.tsx'
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n');
const adminSectionPage = readFileSync(resolve(process.cwd(), 'components/admin/AdminSectionPage.tsx'), 'utf8');
const publicContentRepository = readFileSync(resolve(process.cwd(), 'src/server/content-repository.ts'), 'utf8');
const adminRepository = readFileSync(resolve(process.cwd(), 'src/server/admin-repository.ts'), 'utf8');
const adminDashboard = readFileSync(resolve(process.cwd(), 'app/admin/(protected)/page.tsx'), 'utf8');
const mediaGallery = readFileSync(resolve(process.cwd(), 'components/admin/AdminImageGalleryFields.tsx'), 'utf8');
const cmsSeed = readFileSync(resolve(process.cwd(), 'scripts/seed-cms.ts'), 'utf8');
const adminStaticRoutes = Object.fromEntries(
  ['faculties', 'programs', 'activities', 'places', 'hotspots'].map((section) => [
    section,
    readFileSync(resolve(process.cwd(), `app/admin/(protected)/${section}/page.tsx`), 'utf8')
  ])
);

describe('CMS security and aggregate visits', () => {
  it('keeps public tables behind RLS and restricts privileged RPCs to service_role', () => {
    for (const table of ['admin_profiles', 'faculties', 'programs', 'activities', 'hotspot_contents', 'daily_visit_counts']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('grant execute on function public.increment_daily_visit() to service_role');
    expect(migration).toContain('grant execute on function public.consume_ai_quota(integer) to service_role');
    expect(migration).toContain("Editors cannot publish, unpublish, or archive content");
  });

  it('stores only date and aggregate count for visits', () => {
    const tableDefinition = migration.match(/create table if not exists public\.daily_visit_counts \(([\s\S]*?)\);/)?.[1] ?? '';
    expect(tableDefinition).toContain('visit_date date primary key');
    expect(tableDefinition).toContain('view_count bigint');
    expect(tableDefinition).not.toMatch(/\b(ip|user_agent|session_id|email|message)\b/i);
  });

  it('links faculty content to stable scene and hotspot IDs without exposing geometry fields', () => {
    expect(linkedContentMigration).toContain('add column if not exists scene_id text');
    expect(linkedContentMigration).toContain('add column if not exists hotspot_id text');
    expect(linkedContentMigration).toContain('faculties_scene_id_unique_idx');
    expect(linkedContentMigration).not.toMatch(/\b(yaw|pitch|map_position)\b/);
  });

  it('allows a faculty to be hidden without deleting its published programs', () => {
    expect(adminActions).not.toContain('assertNoPublishedPrograms');
    expect(adminActions).toContain("kind === 'faculties'");
    expect(adminActions).toContain('หลักสูตรของคณะถูกซ่อนชั่วคราว');
    expect(adminActions).toContain(".from('programs')");
    expect(adminActions).toContain('ยังลบคณะไม่ได้');
  });

  it('returns inline action feedback and links faculty program counts to the editor', () => {
    expect(adminActions).toContain('Promise<AdminActionState>');
    expect(adminEditor).toContain('useActionState');
    expect(adminEditor).toContain('admin-action-message');
    expect(adminEditor).toContain('หลักสูตรทั้งหมดจะถูกซ่อนจาก Tour และ AI ชั่วคราว');
    expect(adminSectionPage).toContain('facultyProgramStats');
    expect(adminSectionPage).toContain("row.facultyId === facultyFilter.id");
  });

  it('registers fixed admin content routes without relying on a dynamic section route', () => {
    for (const section of ['faculties', 'programs', 'activities', 'places']) {
      expect(adminStaticRoutes[section]).toMatch(new RegExp(`<AdminSectionPage\\s+section="${section}"`));
    }
    expect(adminStaticRoutes.programs).toContain('requestedFacultyId=');
    expect(adminStaticRoutes.hotspots).toContain("redirect('/admin/places')");
  });

  it('keeps tour-place synchronization admin-only and validates structural links before publishing', () => {
    expect(adminActions).toContain('syncTourPlacesAction');
    expect(adminActions).toContain('const session = await requireAdmin()');
    expect(adminActions).toContain('validatePublishData(kind, draftData)');
    expect(adminActions).toContain('isTourPlaceLink(id, data.scene_id)');
    expect(publicContentRepository).toContain('isTourPlaceLink(row.id, row.scene_id)');
    expect(mediaGallery).toContain('เลือกจาก Media Library');
  });

  it('seeds the four digital agro-industry programs as non-destructive drafts', () => {
    for (const slug of [
      'food-technology-supply-chain-management-ftscm',
      'food-and-beauty-product-innovation-fain',
      'food-science-and-nutrition-fsn',
      'food-science-and-industry-mfsi'
    ]) {
      expect(cmsSeed.match(new RegExp(`slug: '${slug}'`, 'g'))).toHaveLength(1);
    }
    expect(cmsSeed).toContain('const digitalAgroProgramSeeds: readonly ProgramSeed[]');
    expect(cmsSeed.match(/publishOnInsert: false/g)).toHaveLength(4);
    expect(cmsSeed).toContain('published_data: seed.publishOnInsert === false ? null : seed.data');
    expect(cmsSeed).toContain('const digitalAgroFacultyId = await ensureFaculty');
    expect(cmsSeed).toContain("slug: 'digital-agro-industry'");
    expect(cmsSeed).toContain("const missing = seeds.filter((seed) => !existingBySlug.has(seed.slug))");
  });

  it('fills missing dates with zero for fixed 7/30-day dashboard series', () => {
    expect(fillVisitSeries([{ date: '2026-08-05', count: 4 }], 3, '2026-08-07')).toEqual([
      { date: '2026-08-05', count: 4 },
      { date: '2026-08-06', count: 0 },
      { date: '2026-08-07', count: 0 }
    ]);
  });

  it('loads dashboard totals through aggregate queries without waiting for Gemini model probing', () => {
    expect(adminRepository).toContain('getAdminDashboardSummary');
    expect(adminRepository.match(/head: true/g)?.length).toBeGreaterThanOrEqual(7);
    expect(adminDashboard).toContain('getAdminDashboardSummary()');
    expect(adminDashboard).toContain('getAiConfigurationStatus()');
    expect(adminDashboard).not.toContain('getAiRuntimeStatus()');
  });
});
