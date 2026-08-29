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
export const ADMIN_DIRTY_STATE_CHANGED_EVENT = 'fitm-admin-dirty-state-changed';

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
    if (state.status === 'idle' || handledStateRef.current === state) return;
    handledStateRef.current = state;
    window.dispatchEvent(new CustomEvent(ADMIN_ACTION_SETTLED_EVENT, { detail: state }));
    if (state.status !== 'success') return;
    broadcastContentUpdate(update);
    router.refresh();
  }, [router, state, update.id, update.kind, update.scope]);
}
