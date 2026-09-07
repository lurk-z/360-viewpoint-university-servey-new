'use client';

import { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import type { ContentKind } from '../../src/content';
import type { ContentUpdateScope } from '../../src/content-updates';
import type { AdminActionState } from '../../src/server/admin-action-shared';
import { saveContentAction } from '../../app/admin/actions/content';
import AdminDraftRecovery from './AdminDraftRecovery';
import { useAdminActionRefresh } from './useAdminActionRefresh';

export type ContentAction = (previousState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
const INITIAL_ACTION_STATE: AdminActionState = { status: 'idle', message: '' };

function ActionMessage({ state }: { readonly state: AdminActionState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <p className={`admin-action-message is-${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p>;
}

export function AdminContentSaveForm({ kind, id, children, label }: {
  readonly kind: ContentKind;
  readonly id?: string;
  readonly children: ReactNode;
  readonly label: string;
}) {
  const [state, action, pending] = useActionState(saveContentAction, INITIAL_ACTION_STATE);
  const [validationMessage, setValidationMessage] = useState('');
  useAdminActionRefresh(state, { scope: 'draft', kind, id });
  const validate = (event: FormEvent<HTMLFormElement>): void => {
    const form = event.currentTarget;
    const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]')];
    const invalid = fields.find((field) => !field.validity.valid || !field.value.trim());
    if (!invalid) { setValidationMessage(''); return; }
    event.preventDefault();
    const section = invalid.closest<HTMLElement>('.admin-form-step');
    const sections = [...form.querySelectorAll<HTMLElement>('.admin-form-step')];
    const stepIndex = section ? sections.indexOf(section) : -1;
    if (stepIndex >= 0) form.querySelectorAll<HTMLButtonElement>('.admin-form-stepper > nav button')[stepIndex]?.click();
    setValidationMessage(`กรุณากรอกช่อง “${invalid.closest('label')?.querySelector('span')?.textContent ?? invalid.name}” ให้ถูกต้อง`);
    window.requestAnimationFrame(() => { invalid.focus(); invalid.reportValidity(); });
  };
  return (
    <form action={action} className="admin-form" noValidate onSubmit={validate}>
      <input type="hidden" name="kind" value={kind} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <AdminDraftRecovery storageKey={`fitm-admin-draft:${kind}:${id ?? 'new'}`} state={state} />
      {children}
      <div className="admin-form__actions">
        <button className="admin-button" type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : label}</button>
        {validationMessage ? <p className="admin-action-message is-error" role="alert">{validationMessage}</p> : null}
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function AdminContentActionForm({
  action,
  kind,
  id,
  label,
  pendingLabel,
  danger = false,
  available = true,
  disabled = false,
  disabledMessage,
  helpHref,
  confirmMessage,
  scope = 'public'
}: {
  readonly action: ContentAction;
  readonly kind: ContentKind;
  readonly id: string;
  readonly label: string;
  readonly pendingLabel: string;
  readonly danger?: boolean;
  readonly available?: boolean;
  readonly disabled?: boolean;
  readonly disabledMessage?: string;
  readonly helpHref?: string;
  readonly confirmMessage?: string;
  readonly scope?: ContentUpdateScope;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ACTION_STATE);
  useAdminActionRefresh(state, { scope, kind, id });
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
  };
  return (
    <form action={formAction} className={`admin-action-form${available ? '' : ' is-unavailable'}`} onSubmit={handleSubmit}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      {available ? (
        <button
          className={danger ? 'admin-button admin-button--danger' : 'admin-button admin-button--secondary'}
          type="submit"
          disabled={pending || disabled}
        >
          {pending ? pendingLabel : label}
        </button>
      ) : null}
      {disabled && disabledMessage ? (
        <p className="admin-action-message is-warning">
          {disabledMessage} {helpHref ? <a href={helpHref}>ไปจัดการหลักสูตร</a> : null}
        </p>
      ) : null}
      <ActionMessage state={state} />
    </form>
  );
}
