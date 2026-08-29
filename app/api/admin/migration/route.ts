import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

const files: Readonly<Record<string, string>> = {
  '202608070001': '202608070001_cms.sql',
  '202608070002': '202608070002_linked_faculty_content.sql',
  '202608240001': '202608240001_ai_rate_limits_and_metrics.sql',
  '202608290001': '202608290001_admin_workflow_and_tour_structure.sql'
};

export async function GET(request: Request) {
  await requireAdmin();
  const version = new URL(request.url).searchParams.get('version') ?? '';
  const fileName = files[version];
  if (!fileName) return Response.json({ error: 'Unknown migration' }, { status: 404 });
  const sql = await readFile(path.join(process.cwd(), 'supabase', 'migrations', fileName), 'utf8');
  return new Response(sql, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="${fileName}"`
    }
  });
}

