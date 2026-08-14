'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeContentUpdates } from '../../src/content-updates';
import {
  ADMIN_ACTION_SETTLED_EVENT,
  ADMIN_DIRTY_STATE_CHANGED_EVENT
} from './useAdminActionRefresh';

function isEditableTarget(event: SyntheticEvent<HTMLElement>): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('.admin-form'));
}

export default function AdminLiveRefresh({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);

  useEffect(() => {
    const syncDirtyState = (): void => {
      const nextDirty = Boolean(rootRef.current?.querySelector('.admin-form[data-admin-dirty="true"]'));
      dirtyRef.current = nextDirty;
      setDirty(nextDirty);
    };
    const settled = (): void => {
      rootRef.current?.querySelectorAll<HTMLElement>('.admin-form[data-admin-dirty="true"]')
        .forEach((form) => form.removeAttribute('data-admin-dirty'));
      dirtyRef.current = false;
      setDirty(false);
      setUpdateWaiting(false);
    };
    window.addEventListener(ADMIN_ACTION_SETTLED_EVENT, settled);
    window.addEventListener(ADMIN_DIRTY_STATE_CHANGED_EVENT, syncDirtyState);
    const unsubscribe = subscribeContentUpdates(() => {
      if (dirtyRef.current) {
        setUpdateWaiting(true);
      } else {
        router.refresh();
      }
    });
    return () => {
      window.removeEventListener(ADMIN_ACTION_SETTLED_EVENT, settled);
      window.removeEventListener(ADMIN_DIRTY_STATE_CHANGED_EVENT, syncDirtyState);
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    const warnBrowserNavigation = (): void => {
      if (!dirtyRef.current) return;
      if (!window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากหน้านี้และละทิ้งการแก้ไขหรือไม่?')) {
        window.history.forward();
      } else {
        dirtyRef.current = false;
        setDirty(false);
      }
    };
    window.addEventListener('popstate', warnBrowserNavigation);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.removeEventListener('popstate', warnBrowserNavigation);
    };
  }, []);

  const markDirty = (event: SyntheticEvent<HTMLElement>): void => {
    if (isEditableTarget(event)) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        target.closest<HTMLFormElement>('.admin-form')?.setAttribute('data-admin-dirty', 'true');
      }
      dirtyRef.current = true;
      setDirty(true);
    }
  };
  const markButtonEdit = (event: SyntheticEvent<HTMLElement>): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.admin-form button[type="button"]')) {
      target.closest<HTMLFormElement>('.admin-form')?.setAttribute('data-admin-dirty', 'true');
      dirtyRef.current = true;
      setDirty(true);
    }
  };

  const confirmNavigation = (event: MouseEvent<HTMLElement>): void => {
    if (!dirtyRef.current) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target === '_blank' || anchor.href === window.location.href) return;
    if (!window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากหน้านี้และละทิ้งการแก้ไขหรือไม่?')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    dirtyRef.current = false;
    setDirty(false);
  };

  const confirmOtherAction = (event: FormEvent<HTMLElement>): void => {
    if (!dirtyRef.current) return;
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.classList.contains('admin-action-form')) return;
    if (!window.confirm('ฟอร์มแก้ไขมีข้อมูลที่ยังไม่บันทึก การดำเนินการนี้จะละทิ้งข้อมูลดังกล่าว ต้องการดำเนินการต่อหรือไม่?')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      ref={rootRef}
      className="admin-live-refresh"
      onInputCapture={markDirty}
      onChangeCapture={markDirty}
      onClickCapture={(event) => { markButtonEdit(event); confirmNavigation(event); }}
      onSubmitCapture={confirmOtherAction}
    >
      {dirty ? <div className="admin-unsaved-warning" role="status">มีข้อมูลที่ยังไม่บันทึก</div> : null}
      {updateWaiting ? (
        <div className="admin-update-waiting" role="status">
          <span>มีข้อมูลใหม่จากอีกแท็บ แต่หน้านี้มีข้อมูลที่ยังไม่บันทึก</span>
          <button type="button" onClick={() => {
            dirtyRef.current = false;
            setDirty(false);
            setUpdateWaiting(false);
            router.refresh();
          }}>โหลดข้อมูลล่าสุด</button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
