'use client';

import { useState } from 'react';

interface PreviewResult {
  readonly result: Record<string, { ready: number; conflicts: number; invalid: number; inserted: number }>;
  readonly tourResult: string;
}

export default function AdminBackupManager() {
  const [backup, setBackup] = useState<unknown>();
  const [preview, setPreview] = useState<PreviewResult>();
  const [status, setStatus] = useState('');
  const [replaceTourDraft, setReplaceTourDraft] = useState(false);
  const [busy, setBusy] = useState(false);

  const request = async (commit: boolean): Promise<void> => {
    if (!backup) return;
    setBusy(true);
    setStatus(commit ? 'กำลังนำเข้าเป็นฉบับร่าง…' : 'กำลังตรวจไฟล์…');
    try {
      const response = await fetch(`/api/admin/backup/import?commit=${commit ? '1' : '0'}&replaceTourDraft=${replaceTourDraft ? '1' : '0'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(backup)
      });
      const body = await response.json() as PreviewResult & { error?: string };
      if (!response.ok) throw new Error(body.error || 'ดำเนินการไม่สำเร็จ');
      setPreview(body);
      setStatus(commit ? 'นำเข้ารายการที่ไม่ชนกันเป็นฉบับร่างแล้ว' : 'ตรวจไฟล์เสร็จแล้ว กรุณาดูผลก่อนนำเข้า');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  return <div className="admin-backup-manager">
    <section><h2>ส่งออกข้อมูลสำรอง</h2><p>JSON ใช้กู้ข้อมูลกลับเข้าระบบ ส่วน CSV ใช้เปิดดูหรือทำรายงาน</p><div><a className="admin-button" href="/api/admin/backup">ดาวน์โหลด JSON</a><a className="admin-button admin-button--secondary" href="/api/admin/backup?format=csv">ดาวน์โหลด CSV</a></div></section>
    <section><h2>นำเข้าข้อมูลอย่างปลอดภัย</h2><p>ระบบตรวจไฟล์ก่อนเสมอ รายการที่ ID หรือ Slug ชนจะถูกข้าม และข้อมูลเข้าเป็นฉบับร่างเท่านั้น</p>
      <input type="file" accept="application/json,.json" onChange={(event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void file.text().then((value) => { setBackup(JSON.parse(value)); setPreview(undefined); setStatus('เลือกไฟล์แล้ว กดตรวจไฟล์ก่อนนำเข้า'); }).catch(() => setStatus('อ่านไฟล์ JSON ไม่สำเร็จ'));
      }} />
      <label className="admin-checkbox"><input type="checkbox" checked={replaceTourDraft} onChange={(event) => setReplaceTourDraft(event.target.checked)} /> แทนที่เฉพาะโครงสร้างทัวร์ฉบับร่าง (ข้อมูลที่เผยแพร่ไม่เปลี่ยน)</label>
      <div><button className="admin-button admin-button--secondary" disabled={!backup || busy} type="button" onClick={() => void request(false)}>ตรวจตัวอย่าง</button><button className="admin-button" disabled={!preview || busy} type="button" onClick={() => { if (confirm('นำเข้ารายการที่ไม่ชนเป็นฉบับร่างใช่หรือไม่?')) void request(true); }}>ยืนยันนำเข้า</button></div>
      {preview ? <div className="admin-import-preview">{Object.entries(preview.result).map(([kind, value]) => <article key={kind}><strong>{kind}</strong><span>พร้อม {value.ready}</span><span>ชน {value.conflicts}</span><span>ไม่ผ่าน {value.invalid}</span></article>)}<p>โครงสร้างทัวร์: {preview.tourResult}</p></div> : null}
      {status ? <p role="status">{status}</p> : null}
    </section>
  </div>;
}
