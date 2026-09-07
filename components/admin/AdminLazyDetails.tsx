'use client';

import { useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ADMIN_DIRTY_STATE_CHANGED_EVENT } from './useAdminActionRefresh';

export default function AdminLazyDetails({ className, summary, children, confirmDirtyClose = false }: {
  readonly className?: string;
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly confirmDirtyClose?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>): void => {
    const details = event.currentTarget;
    if (details.open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const dirtyForm = details.querySelector<HTMLFormElement>('.admin-form[data-admin-dirty="true"]');
    if (confirmDirtyClose && dirtyForm) {
      const discard = window.confirm('ฟอร์มนี้มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดและละทิ้งการแก้ไขหรือไม่?');
      if (!discard) {
        details.open = true;
        return;
      }
      dirtyForm.removeAttribute('data-admin-dirty');
      window.dispatchEvent(new Event(ADMIN_DIRTY_STATE_CHANGED_EVENT));
    }
    setMounted(false);
  };

  return (
    <details ref={detailsRef} className={className} onToggle={handleToggle}>
      <summary>{summary}</summary>
      {mounted ? children : null}
    </details>
  );
}
