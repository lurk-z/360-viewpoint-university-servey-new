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

  it('fills missing dates with zero for fixed 7/30-day dashboard series', () => {
    expect(fillVisitSeries([{ date: '2026-08-05', count: 4 }], 3, '2026-08-07')).toEqual([
      { date: '2026-08-05', count: 4 },
      { date: '2026-08-06', count: 0 },
      { date: '2026-08-07', count: 0 }
    ]);
  });
});
