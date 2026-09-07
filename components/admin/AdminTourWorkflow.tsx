'use client';

import { useActionState } from 'react';
import { restoreTourRevisionAction } from '../../app/admin/actions/tour';
import type { AdminActionState } from '../../src/server/admin-action-shared';
import type { AdminTourRevision } from '../../src/server/tour-structure-repository';
import type { TourStructureData, TourStructureIssue } from '../../src/tour-structure';
import { useAdminActionRefresh } from './useAdminActionRefresh';

const initialState: AdminActionState = { status: 'idle', message: '' };

function RestoreTourRevision({ revision }: { readonly revision: AdminTourRevision }) {
  const [state, action, pending] = useActionState(restoreTourRevisionAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind: 'tour', id: 'main' });
  return <form action={action}>
    <input type="hidden" name="revisionId" value={revision.id} />
    <button type="submit" disabled={pending}>{pending ? 'กำลังกู้คืน…' : 'กู้เป็นฉบับร่าง'}</button>
    {state.message ? <span className={`admin-action-message is-${state.status}`}>{state.message}</span> : null}
  </form>;
}

export function AdminTourValidation({ issues }: { readonly issues: readonly TourStructureIssue[] }) {
  return (
    <section className="admin-tour-validation">
      <header><strong>ผลตรวจโครงสร้าง</strong><span>{issues.filter((issue) => issue.severity === 'error').length} ข้อผิดพลาด · {issues.filter((issue) => issue.severity === 'warning').length} คำเตือน</span></header>
      {issues.length ? <ul>{issues.slice(0, 30).map((issue, index) => <li className={`is-${issue.severity}`} key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : <p>โครงสร้างผ่านการตรวจสอบ</p>}
    </section>
  );
}

export function AdminTourActions({
  data,
  parsed,
  issues,
  draftVersion,
  publishedVersion,
  role,
  saveAction,
  saveState,
  saving,
  publishAction,
  publishState,
  publishing
}: {
  readonly data: TourStructureData;
  readonly parsed: boolean;
  readonly issues: readonly TourStructureIssue[];
  readonly draftVersion: number;
  readonly publishedVersion: number | null;
  readonly role: 'admin' | 'editor';
  readonly saveAction: (payload: FormData) => void;
  readonly saveState: AdminActionState;
  readonly saving: boolean;
  readonly publishAction: (payload: FormData) => void;
  readonly publishState: AdminActionState;
  readonly publishing: boolean;
}) {
  return (
    <div className="admin-tour-actions">
      <form action={saveAction}><input type="hidden" name="structure" value={JSON.stringify(data)} /><input type="hidden" name="draftVersion" value={draftVersion} /><button className="admin-button" type="submit" disabled={saving || !parsed}>{saving ? 'กำลังบันทึก…' : 'บันทึกฉบับร่าง'}</button>{saveState.message ? <p className={`admin-action-message is-${saveState.status}`}>{saveState.message}</p> : null}</form>
      {role === 'admin' ? <form action={publishAction}><input type="hidden" name="draftVersion" value={draftVersion} /><button className="admin-button admin-button--publish" type="submit" disabled={publishing || issues.some((issue) => issue.severity === 'error')}>{publishing ? 'กำลังเผยแพร่…' : 'เผยแพร่โครงสร้างทัวร์'}</button>{publishState.message ? <p className={`admin-action-message is-${publishState.status}`}>{publishState.message}</p> : null}</form> : null}
      <a className="admin-button admin-button--secondary" href="/tour-preview" target="_blank">ดูตัวอย่างฉบับร่าง ↗</a>
      <span>ฉบับร่าง v{draftVersion} · เผยแพร่ v{publishedVersion ?? 'ยังไม่มี'}</span>
    </div>
  );
}

export function AdminTourRevisions({ revisions, role }: {
  readonly revisions: readonly AdminTourRevision[];
  readonly role: 'admin' | 'editor';
}) {
  return (
    <details className="admin-tour-revisions"><summary>ประวัติโครงสร้างทัวร์</summary><div>{revisions.map((revision) => <article key={revision.id}><div><strong>v{revision.version} · {revision.action}</strong><time>{new Date(revision.createdAt).toLocaleString('th-TH')}</time></div>{role === 'admin' ? <RestoreTourRevision revision={revision} /> : null}</article>)}</div></details>
  );
}
