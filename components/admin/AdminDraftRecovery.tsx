'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminActionState } from '../../src/server/admin-action-shared';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

interface SavedDraft {
  readonly expiresAt: number;
  readonly values: Readonly<Record<string, readonly string[]>>;
}

export default function AdminDraftRecovery({ storageKey, state }: {
  readonly storageKey: string;
  readonly state: AdminActionState;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (state.status !== 'success') return;
    localStorage.removeItem(storageKey);
    setMessage('');
  }, [state.status, storageKey]);

  useEffect(() => {
    const form = markerRef.current?.closest('form');
    if (!form) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedDraft;
        if (saved.expiresAt <= Date.now()) localStorage.removeItem(storageKey);
        else {
          Object.entries(saved.values).forEach(([name, values]) => {
            const controls = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${CSS.escape(name)}"]`)];
            controls.forEach((control, index) => {
              if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
                control.checked = values.includes(control.value);
              } else if (values[index] !== undefined) {
                control.value = values[index]!;
              }
            });
          });
          setMessage('กู้ข้อมูลที่ยังไม่ได้บันทึกจาก Browser แล้ว');
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    let timer = 0;
    const save = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const values: Record<string, string[]> = {};
        for (const [name, value] of new FormData(form).entries()) {
          if (typeof value !== 'string' || name === 'kind' || name === 'id') continue;
          (values[name] ??= []).push(value);
        }
        localStorage.setItem(storageKey, JSON.stringify({ expiresAt: Date.now() + MAX_AGE_MS, values } satisfies SavedDraft));
      }, 450);
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener('input', save);
      form.removeEventListener('change', save);
    };
  }, [storageKey]);

  return <span ref={markerRef} className="admin-draft-recovery" role="status">{message}</span>;
}
