'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { broadcastContentUpdate } from '../../src/content-updates';

export default function AdminProgramTagDrafting({ missingCount }: { readonly missingCount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  const generate = async (): Promise<void> => {
    if (document.querySelector('.admin-form[data-admin-dirty="true"]')) {
      setMessage('กรุณาบันทึกหรือละทิ้งแบบฟอร์มที่กำลังแก้ก่อนสร้างแท็ก เพื่อป้องกันข้อมูลทับกัน');
      return;
    }
    if (!window.confirm('AI จะเติมเฉพาะแท็ก วุฒิ และระดับที่ยังว่าง แล้วอัปเดตข้อมูลที่เผยแพร่ของหลักสูตรเดิมทันที โดยไม่เขียนทับข้อมูลที่มีอยู่ ต้องการดำเนินการหรือไม่?')) return;
    setPending(true);
    setMessage('กำลังเตรียมข้อมูลหลักสูตร…');
    try {
      let totalUpdated = 0;
      let remaining = missingCount;
      for (let batch = 1; batch <= 10 && remaining > 0; batch += 1) {
        setMessage(`กำลังสร้างและเผยแพร่ชุดที่ ${batch} · เหลือประมาณ ${remaining} หลักสูตร`);
        const response = await fetch('/api/admin/program-tags', { method: 'POST' });
        const result = await response.json() as { updated?: number; remaining?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'สร้างและเผยแพร่แท็กไม่สำเร็จ');
        const updated = result.updated ?? 0;
        totalUpdated += updated;
        remaining = result.remaining ?? 0;
        if (updated === 0 && remaining > 0) {
          throw new Error('ข้อมูลบางรายการถูกแก้ไขพร้อมกัน ระบบจึงหยุดเพื่อป้องกันข้อมูลทับกัน กรุณาลองใหม่');
        }
      }
      if (totalUpdated > 0) broadcastContentUpdate({ scope: 'public', kind: 'programs' });
      setMessage(`สร้างแท็กและอัปเดตข้อมูลที่เผยแพร่แล้ว ${totalUpdated} หลักสูตร${remaining ? ` · ยังเหลือ ${remaining} หลักสูตร` : ''}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'สร้างแท็กไม่สำเร็จ');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="admin-tag-drafting" aria-labelledby="admin-tag-drafting-title">
      <div>
        <h2 id="admin-tag-drafting-title">AI สร้างแท็กและเผยแพร่</h2>
        <p>เติมเฉพาะแท็กความสนใจ แท็กแนวทางอาชีพ วุฒิ และระดับที่ยังว่างจากข้อมูลหลักสูตรเดิม แล้วอัปเดตข้อมูลสาธารณะทันที โดยไม่แก้ชื่อหรือรายละเอียดอื่น</p>
      </div>
      <strong>{missingCount} หลักสูตรรอตรวจสอบ</strong>
      <button type="button" disabled={pending || missingCount === 0} onClick={() => void generate()}>
        {pending ? 'กำลังสร้างและเผยแพร่…' : missingCount ? 'สร้างแท็กและเผยแพร่' : 'ข้อมูลแนะนำครบแล้ว'}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
