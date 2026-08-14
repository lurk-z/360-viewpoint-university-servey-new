'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { AiRuntimeStatus } from '../../src/server/ai-status';

interface AdminAiStatusProps {
  readonly status: AiRuntimeStatus;
  readonly publishedFaculties: number;
  readonly publishedPrograms: number;
}

const STATUS_LABELS: Record<AiRuntimeStatus['providerStatus'], string> = {
  ready: 'พร้อมใช้งาน',
  'not-configured': 'ตั้งค่าไม่ครบ',
  'invalid-key': 'API key ถูกปฏิเสธ',
  'quota-exceeded': 'โควตาเต็ม',
  'model-unavailable': 'เชื่อมต่อโมเดลไม่ได้',
  timeout: 'ตรวจสอบหมดเวลา',
  'invalid-response': 'คำตอบไม่ถูกต้อง',
  'no-content': 'ไม่มีข้อมูลเผยแพร่'
};

export default function AdminAiStatus({ status, publishedFaculties, publishedPrograms }: AdminAiStatusProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ready = status.configured && status.providerStatus === 'ready';
  const statusLabel = status.providerStatus === 'ready' && !status.configured
    ? 'ตั้งค่าระบบไม่ครบ'
    : STATUS_LABELS[status.providerStatus];
  const checkedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(status.checkedAt));

  return (
    <section className={`admin-ai-status${ready ? ' is-ready' : ' is-warning'}`} aria-labelledby="admin-ai-status-title">
      <header>
        <div>
          <p>AI SERVICE</p>
          <h2 id="admin-ai-status-title">สถานะผู้ช่วย AI</h2>
        </div>
        <span>{statusLabel}</span>
      </header>
      <dl>
        <div><dt>Gemini</dt><dd>{status.geminiConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'}</dd></div>
        <div><dt>Supabase</dt><dd>{status.supabaseConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'}</dd></div>
        <div><dt>โมเดล</dt><dd><code>{status.model}</code></dd></div>
        <div><dt>การเข้าถึงโมเดล</dt><dd>{STATUS_LABELS[status.providerStatus]}</dd></div>
        <div><dt>โควตาวันนี้</dt><dd>{status.quotaUsed === null ? 'ตรวจสอบไม่ได้' : `${status.quotaUsed.toLocaleString()} / ${status.quotaLimit.toLocaleString()}`}</dd></div>
        <div><dt>ข้อมูลเผยแพร่</dt><dd>{publishedFaculties} คณะ · {publishedPrograms} หลักสูตร</dd></div>
      </dl>
      {!ready ? (
        <p className="admin-ai-status__help">
          {status.providerStatus === 'invalid-key'
            ? 'สร้าง API key ใหม่ใน Google AI Studio แล้วใส่ใน GEMINI_API_KEY จากนั้น Restart Server'
            : !status.configured
              ? 'ตรวจ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY และ GEMINI_API_KEY ใน .env.local'
              : 'ตรวจการเชื่อมต่อ โมเดล และโควตา แล้วลองตรวจสอบอีกครั้ง'}
          {' '}<a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer">คู่มือ Gemini API key ↗</a>
        </p>
      ) : <p className="admin-ai-status__help">ระบบตรวจพบโมเดลโดยไม่สร้างคำตอบและไม่เพิ่มยอดใช้งาน AI ภายในโปรเจกต์</p>}
      <footer>
        <small>ตรวจล่าสุด {checkedAt}</small>
        <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
          {pending ? 'กำลังตรวจสอบ…' : 'ตรวจสอบอีกครั้ง'}
        </button>
      </footer>
    </section>
  );
}
