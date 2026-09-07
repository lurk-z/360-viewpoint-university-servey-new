'use client';

import { useActionState, useEffect, useState } from 'react';
import { restoreContentRevisionAction } from '../../app/admin/actions/content';
import type { AdminActionState } from '../../src/server/admin-action-shared';
import type { ContentKind } from '../../src/content';
import type { AdminContentRevision } from '../../src/server/admin-repository';
import { useAdminActionRefresh } from './useAdminActionRefresh';

const initialState: AdminActionState = { status: 'idle', message: '' };
const actionLabels: Readonly<Record<string, string>> = {
  create: 'สร้างรายการ',
  save: 'บันทึกฉบับร่าง',
  publish: 'เผยแพร่',
  unpublish: 'นำออกจากหน้าเว็บ',
  archive: 'เก็บเข้าคลัง',
  restore: 'คืนจากคลัง',
  delete: 'ลบถาวร'
};

function RestoreRevisionForm({ kind, id, revisionId }: {
  readonly kind: ContentKind;
  readonly id: string;
  readonly revisionId: string;
}) {
  const [state, action, pending] = useActionState(restoreContentRevisionAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind, id });
  return <form action={action} className="admin-revision-restore">
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="revisionId" value={revisionId} />
    <button type="submit" disabled={pending}>{pending ? 'กำลังกู้คืน…' : 'กู้เป็นฉบับร่าง'}</button>
    {state.message ? <span className={`is-${state.status}`}>{state.message}</span> : null}
  </form>;
}

export default function AdminRevisionHistory({ kind, id, currentDraft }: {
  readonly kind: ContentKind;
  readonly id: string;
  readonly currentDraft: Record<string, unknown>;
}) {
  const [revisions, setRevisions] = useState<readonly AdminContentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/revisions?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`, {
      cache: 'no-store', signal: controller.signal
    }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load revisions');
      const body = await response.json() as { revisions: AdminContentRevision[] };
      setRevisions(body.revisions);
    }).catch(() => setRevisions([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, kind]);

  if (loading) return <p className="admin-editor-note">กำลังโหลดประวัติ…</p>;
  if (!revisions.length) return <p className="admin-editor-note">ยังไม่มีประวัติ หรือยังไม่ได้รัน Migration ล่าสุด</p>;
  return <div className="admin-revision-list">
    {revisions.map((revision) => {
      const oldDraft = revision.snapshot.draft_data;
      const changed = JSON.stringify(oldDraft) !== JSON.stringify(currentDraft);
      return <article key={revision.id}>
        <header><strong>{actionLabels[revision.action] ?? revision.action}</strong><time>{new Date(revision.createdAt).toLocaleString('th-TH')}</time></header>
        <p>{changed ? 'ข้อมูลเวอร์ชันนี้แตกต่างจากฉบับร่างปัจจุบัน' : 'ข้อมูลตรงกับฉบับร่างปัจจุบัน'}</p>
        <details><summary>ดูข้อมูลเวอร์ชันนี้</summary><pre>{JSON.stringify(oldDraft, null, 2)}</pre></details>
        {changed ? <RestoreRevisionForm kind={kind} id={id} revisionId={revision.id} /> : null}
      </article>;
    })}
  </div>;
}
