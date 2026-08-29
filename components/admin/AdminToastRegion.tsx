'use client';

import { useEffect, useState } from 'react';
import type { AdminActionState } from '../../app/admin/actions';
import { ADMIN_ACTION_SETTLED_EVENT } from './useAdminActionRefresh';

interface Toast extends AdminActionState { readonly id: number }

export default function AdminToastRegion() {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  useEffect(() => {
    const receive = (event: Event): void => {
      const state = (event as CustomEvent<AdminActionState>).detail;
      if (!state?.message || state.status === 'idle') return;
      const toast = { ...state, id: Date.now() + Math.random() };
      setToasts((current) => [...current.slice(-2), toast]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 6000);
    };
    window.addEventListener(ADMIN_ACTION_SETTLED_EVENT, receive);
    return () => window.removeEventListener(ADMIN_ACTION_SETTLED_EVENT, receive);
  }, []);
  return <div className="admin-toast-region" aria-live="polite" aria-atomic="false">
    {toasts.map((toast) => <div className={`admin-toast is-${toast.status}`} key={toast.id}>
      <span>{toast.status === 'success' ? '✓' : '!'}</span><p>{toast.message}</p>
      <button type="button" aria-label="ปิดข้อความ" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</button>
    </div>)}
  </div>;
}
