'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMediaAction } from '../../app/admin/actions';
import { broadcastContentUpdate } from '../../src/content-updates';
import { ADMIN_ACTION_SETTLED_EVENT } from './useAdminActionRefresh';

export default function AdminMediaDeleteForm({ path, usageCount }: { readonly path: string; readonly usageCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!window.confirm('ต้องการลบรูปนี้ถาวรหรือไม่?')) return;
    setError('');
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await deleteMediaAction(formData);
        if (result.status === 'error') {
          setError(result.message);
          return;
        }
        window.dispatchEvent(new Event(ADMIN_ACTION_SETTLED_EVENT));
        broadcastContentUpdate({ scope: 'draft', kind: 'media', id: path });
        router.refresh();
      } catch {
        setError('ไม่สามารถลบรูปได้ กรุณาลองอีกครั้ง');
      }
    });
  };

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="path" value={path} />
        <button className="admin-button admin-button--danger" type="submit" disabled={pending || usageCount > 0}>
          {pending ? 'กำลังลบ…' : 'ลบรูป'}
        </button>
        {usageCount > 0 ? <p className="admin-action-message is-warning">ต้องนำรูปออกจากข้อมูล {usageCount} รายการก่อนจึงจะลบได้</p> : null}
      {error ? <p className="admin-action-message is-error" role="alert">{error}</p> : null}
    </form>
  );
}
