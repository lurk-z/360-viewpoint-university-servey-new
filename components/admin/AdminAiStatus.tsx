'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AiRuntimeStatus } from '../../src/server/ai-status';

interface AdminAiStatusProps {
  readonly status: AiRuntimeStatus;
  readonly publishedFaculties: number;
  readonly publishedPrograms: number;
}

const STATUS_LABELS: Record<AiRuntimeStatus['providerStatus'], string> = {
  checking: 'กำลังตรวจสอบ',
  ready: 'พร้อมใช้งาน',
  'not-configured': 'ตั้งค่าไม่ครบ',
  'invalid-key': 'API key ถูกปฏิเสธ',
  'quota-exceeded': 'โควตาเต็ม',
  'rate-limited': 'คำขอต่อนาทีเต็ม',
  'model-unavailable': 'เชื่อมต่อโมเดลไม่ได้',
  timeout: 'ตรวจสอบหมดเวลา',
  'invalid-response': 'คำตอบไม่ถูกต้อง',
  'no-content': 'ไม่มีข้อมูลเผยแพร่'
};

export default function AdminAiStatus({ status, publishedFaculties, publishedPrograms }: AdminAiStatusProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, setPending] = useState(false);
  const ready = currentStatus.configured && currentStatus.providerStatus === 'ready';
  const statusLabel = currentStatus.providerStatus === 'ready' && !currentStatus.configured
    ? 'ตั้งค่าระบบไม่ครบ'
    : STATUS_LABELS[currentStatus.providerStatus];
  const checkedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(currentStatus.checkedAt));

  const checkStatus = useCallback(async (force = false): Promise<void> => {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/ai-status${force ? '?refresh=1' : ''}`, {
        cache: 'no-store'
      });
      if (!response.ok) return;
      const nextStatus = await response.json() as AiRuntimeStatus;
      setCurrentStatus(nextStatus);
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!status.configured) return;
    void checkStatus();
  }, [checkStatus, status.configured]);

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
        <div><dt>Gemini</dt><dd>{currentStatus.geminiConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'}</dd></div>
        <div><dt>Supabase</dt><dd>{currentStatus.supabaseConfigured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า'}</dd></div>
        <div><dt>โมเดล</dt><dd><code>{currentStatus.model}</code></dd></div>
        <div><dt>การเข้าถึงโมเดล</dt><dd>{STATUS_LABELS[currentStatus.providerStatus]}</dd></div>
        <div><dt>โควตาวันนี้</dt><dd>{currentStatus.quotaUsed === null ? 'ตรวจสอบไม่ได้' : `${currentStatus.quotaUsed.toLocaleString()} / ${currentStatus.quotaLimit.toLocaleString()}`}</dd></div>
        <div><dt>โควตานาทีนี้</dt><dd>{currentStatus.minuteUsed === null ? 'รอรัน Migration' : `${currentStatus.minuteUsed.toLocaleString()} / ${currentStatus.minuteLimit.toLocaleString()}`}</dd></div>
        <div><dt>ข้อมูลเผยแพร่</dt><dd>{publishedFaculties} คณะ · {publishedPrograms} หลักสูตร</dd></div>
        <div><dt>หลักสูตรมีแท็กครบ</dt><dd>{currentStatus.taggedPrograms === null ? 'รอรัน Migration' : `${currentStatus.taggedPrograms} รายการ`}</dd></div>
        <div><dt>วุฒิ/ระดับแบบโครงสร้าง</dt><dd>{currentStatus.structuredPrograms === null ? 'รอรัน Migration' : `${currentStatus.structuredPrograms} รายการ`}</dd></div>
        <div><dt>รอตรวจสอบข้อมูล AI</dt><dd>{currentStatus.pendingPrograms === null ? 'รอรัน Migration' : `${currentStatus.pendingPrograms} รายการ`}</dd></div>
      </dl>
      {currentStatus.metrics.length ? (
        <details className="admin-ai-status__metrics">
          <summary>สถิติ AI วันนี้ (ยอดรวม ไม่เก็บข้อความหรือผู้ใช้)</summary>
          <ul>
            {currentStatus.metrics.map((metric) => (
              <li key={`${metric.intent}-${metric.outcome}`}>
                <strong>{metric.intent}</strong> · {metric.outcome}: {metric.count} ครั้ง · เฉลี่ย {metric.averageLatencyMs.toLocaleString()} ms
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {!ready ? (
        <p className="admin-ai-status__help">
          {currentStatus.providerStatus === 'invalid-key'
            ? 'สร้าง API key ใหม่ใน Google AI Studio แล้วใส่ใน GEMINI_API_KEY จากนั้น Restart Server'
            : !currentStatus.configured
              ? 'ตรวจ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY และ GEMINI_API_KEY ใน .env.local'
              : currentStatus.providerStatus === 'checking'
                ? 'Dashboard พร้อมใช้งานแล้ว ระบบกำลังตรวจการเชื่อมต่อ Gemini เบื้องหลัง'
              : 'ตรวจการเชื่อมต่อ โมเดล และโควตา แล้วลองตรวจสอบอีกครั้ง'}
          {' '}<a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer">คู่มือ Gemini API key ↗</a>
        </p>
      ) : <p className="admin-ai-status__help">ระบบตรวจพบโมเดลโดยไม่สร้างคำตอบและไม่เพิ่มยอดใช้งาน AI ภายในโปรเจกต์</p>}
      <footer>
        <small>ตรวจล่าสุด {checkedAt}</small>
        <button type="button" disabled={pending} onClick={() => void checkStatus(true)}>
          {pending ? 'กำลังตรวจสอบ…' : 'ตรวจสอบอีกครั้ง'}
        </button>
      </footer>
    </section>
  );
}
