'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminActionState } from '../../app/admin/actions';
import {
  broadcastContentUpdate,
  type ContentUpdateKind,
  type ContentUpdateScope
} from '../../src/content-updates';

export const ADMIN_ACTION_SETTLED_EVENT = 'fitm-admin-action-settled';

export function useAdminActionRefresh(
  state: AdminActionState,
  update: {
    readonly scope: ContentUpdateScope;
    readonly kind: ContentUpdateKind;
    readonly id?: string;
  }
): void {
  const router = useRouter();
  const handledStateRef = useRef<AdminActionState | null>(null);

  useEffect(() => {
    if (state.status !== 'success' || handledStateRef.current === state) return;
    handledStateRef.current = state;
    window.dispatchEvent(new Event(ADMIN_ACTION_SETTLED_EVENT));
    broadcastContentUpdate(update);
    router.refresh();
  }, [router, state, update.id, update.kind, update.scope]);
}
