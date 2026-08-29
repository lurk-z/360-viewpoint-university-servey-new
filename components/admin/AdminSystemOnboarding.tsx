'use client';

import { useActionState, useState } from 'react';
import { bootstrapTourStructureAction, type AdminActionState } from '../../app/admin/actions';
import type { AdminRole } from '../../src/content';
import type { AdminSystemStatus, AdminTaskSummary } from '../../src/server/admin-repository';
import { useAdminActionRefresh } from './useAdminActionRefresh';

const initialState: AdminActionState = { status: 'idle', message: '' };

const migrationNames: Readonly<Record<string, string>> = {
  '202608070001': 'CMS และบัญชีผู้ดูแล',
  '202608070002': 'การเชื่อมคณะกับฉาก',
  '202608240001': 'โควตาและสถิติ AI',
  '202608290001': 'Revision และ Visual Tour Editor'
};

export default function AdminSystemOnboarding({
  status,
  tasks,
  role,
  compact = false
}: {
  readonly status: AdminSystemStatus;
  readonly tasks?: AdminTaskSummary;
  readonly role: AdminRole;
  readonly compact?: boolean;
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const [actionState, action, pending] = useActionState(bootstrapTourStructureAction, initialState);
  useAdminActionRefresh(actionState, { scope: 'draft', kind: 'tour' });
  const checks = [
    ['Supabase', status.supabaseConfigured, 'ตั้งค่า Environment แล้ว'],
    ['Migration', status.missingMigrations.length === 0, status.missingMigrations.length ? `ขาด ${status.missingMigrations.length} รายการ` : 'ครบแล้ว'],
    ['Media', status.contentMediaReady, 'คลังรูปเนื้อหา'],
    ['Panorama', status.panoramaStorageReady, 'คลังภาพ 360 ใหม่'],
    ['โครงสร้างทัวร์', status.dynamicTourReady, status.dynamicTourReady ? 'พร้อมแก้ใน Admin' : 'ยังไม่ได้นำเข้า']
    ,['เทียบโครงสร้างเริ่มต้น', status.dynamicTourReady, status.tourStructureMatchesBootstrap ? 'ข้อมูลเริ่มต้นตรงกับ 93 ฉากในโค้ด' : status.dynamicTourReady ? 'มีการแก้และเผยแพร่จาก Admin แล้ว' : 'รอนำเข้าโครงสร้าง']
  ] as const;

  const copyMigration = async (version: string): Promise<void> => {
    setCopyMessage('กำลังเตรียม SQL…');
    try {
      const response = await fetch(`/api/admin/migration?version=${encodeURIComponent(version)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load migration');
      await navigator.clipboard.writeText(await response.text());
      setCopyMessage(`คัดลอก Migration ${version} แล้ว ให้วางใน Supabase SQL Editor และกด Run`);
    } catch {
      setCopyMessage('คัดลอกไม่สำเร็จ กรุณาเปิดไฟล์ในโฟลเดอร์ supabase/migrations');
    }
  };

  return (
    <section className={`admin-onboarding${compact ? ' is-compact' : ''}`} aria-labelledby="admin-onboarding-title">
      <header>
        <div><p>GETTING STARTED</p><h2 id="admin-onboarding-title">เริ่มต้นใช้งานระบบ</h2></div>
        <span>{checks.filter(([, ok]) => ok).length}/{checks.length} พร้อม</span>
      </header>
      <div className="admin-onboarding__checks">
        {checks.map(([label, ok, detail]) => (
          <article className={ok ? 'is-ready' : 'is-pending'} key={label}>
            <b aria-hidden="true">{ok ? '✓' : '!'}</b><div><strong>{label}</strong><span>{detail}</span></div>
          </article>
        ))}
      </div>
      {!compact && status.missingMigrations.length ? (
        <div className="admin-onboarding__migrations">
          <h3>Migration ที่ต้องรัน</h3>
          {status.missingMigrations.map((version) => (
            <button type="button" key={version} onClick={() => void copyMigration(version)}>
              คัดลอก {version} · {migrationNames[version] ?? 'Database update'}
            </button>
          ))}
          <p>{copyMessage || 'กดคัดลอก แล้วเปิด Supabase → SQL Editor → New query → วาง → Run'}</p>
        </div>
      ) : null}
      {!compact && role === 'admin' && status.missingMigrations.length === 0 && !status.dynamicTourReady ? (
        <form action={action}>
          <button className="admin-button" type="submit" disabled={pending}>
            {pending ? 'กำลังนำเข้า 93 ฉาก…' : 'นำ 93 ฉากเข้า Visual Tour Editor'}
          </button>
          {actionState.message ? <p className={`admin-action-message is-${actionState.status}`}>{actionState.message}</p> : null}
        </form>
      ) : null}
      {!compact && tasks ? (
        <div className="admin-onboarding__tasks">
          <a href="/admin/places?status=pending"><strong>{tasks.incomplete}</strong><span>ข้อมูลไม่ครบ</span></a>
          <a href="/admin/programs?status=draft"><strong>{tasks.draftOnly}</strong><span>ฉบับร่าง</span></a>
          <a href="/admin/media"><strong>{tasks.missingImages}</strong><span>ยังไม่มีรูป</span></a>
          <a href="/admin"><strong>{tasks.missingSources}</strong><span>อ้างอิงไม่ครบ</span></a>
        </div>
      ) : null}
      {!compact ? <footer><a href="/admin/help">เปิดคู่มือสำหรับผู้เริ่มต้น →</a><a href="/admin/backup">สำรองและนำเข้าข้อมูล →</a></footer> : null}
    </section>
  );
}
