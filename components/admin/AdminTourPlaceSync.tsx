'use client';

import { useActionState } from 'react';
import { syncTourPlacesAction } from '../../app/admin/actions/content';
import type { AdminActionState } from '../../src/server/admin-action-shared';
import type { AdminRole } from '../../src/content';
import type { TourPlaceSyncStatus } from '../../src/tour-places';
import { useAdminActionRefresh } from './useAdminActionRefresh';

const initialState: AdminActionState = { status: 'idle', message: '' };

export default function AdminTourPlaceSync({
  status,
  role
}: {
  readonly status: TourPlaceSyncStatus;
  readonly role: AdminRole;
}) {
  const [state, action, pending] = useActionState(syncTourPlacesAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind: 'tour' });
  const needsSync = status.missing.length > 0 || status.moved.length > 0;
  const hasDuplicates = status.duplicates.length > 0;

  return (
    <section className="admin-tour-sync">
      <header>
        <div>
          <p>TOUR CONTENT SYNC</p>
          <h2>ซิงก์สถานที่จากโครงสร้างทัวร์</h2>
          <span>เพิ่มเฉพาะรายการใหม่และ Scene ID โดยไม่เขียนทับเนื้อหา รูป หรือสถานะเผยแพร่</span>
        </div>
        {role === 'admin' ? (
          <form action={action}>
            <button className="admin-button" type="submit" disabled={pending || !needsSync || hasDuplicates}>
              {pending ? 'กำลังซิงก์…' : hasDuplicates ? 'กรุณาแก้ Hotspot ID ซ้ำ' : needsSync ? 'ซิงก์สถานที่ใหม่จากทัวร์' : 'ข้อมูลตรงกันแล้ว'}
            </button>
          </form>
        ) : <small>เฉพาะ Admin เท่านั้นที่กดซิงก์ได้</small>}
      </header>
      <div className="admin-tour-sync__stats">
        <div><strong>{status.total}</strong><span>จุดในทัวร์</span></div>
        <div><strong>{status.synced}</strong><span>ซิงก์แล้ว</span></div>
        <div><strong>{status.missing.length}</strong><span>รายการใหม่</span></div>
        <div><strong>{status.orphaned.length}</strong><span>ไม่พบในทัวร์</span></div>
      </div>
      {state.status !== 'idle' ? (
        <p className={`admin-action-message is-${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
          {state.message}
        </p>
      ) : null}
      {hasDuplicates ? (
        <p className="admin-action-message is-error" role="alert">
          พบ Hotspot ID ซ้ำ: {status.duplicates.map((item) => `${item.id} (${item.sceneIds.join(', ')})`).join('; ')}
        </p>
      ) : null}
      {status.missing.length || status.moved.length || status.orphaned.length || hasDuplicates ? (
        <details>
          <summary>ดูรายละเอียดการซิงก์</summary>
          {hasDuplicates ? <p><strong>Hotspot ID ซ้ำ:</strong> {status.duplicates.map((item) => `${item.id} → ${item.sceneIds.join(', ')}`).join('; ')}</p> : null}
          {status.missing.length ? <p><strong>รายการใหม่:</strong> {status.missing.map((item) => item.id).join(', ')}</p> : null}
          {status.moved.length ? <p><strong>Scene ID เปลี่ยน:</strong> {status.moved.map((item) => `${item.id} → ${item.sceneId}`).join(', ')}</p> : null}
          {status.orphaned.length ? <p><strong>ไม่พบในทัวร์:</strong> {status.orphaned.map((item) => item.id).join(', ')}</p> : null}
        </details>
      ) : null}
    </section>
  );
}
