'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalDialogProps {
  readonly open: boolean;
  readonly titleId: string;
  readonly wide?: boolean;
  readonly media?: boolean;
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function ModalDialog({
  open,
  titleId,
  wide = false,
  media = false,
  closeLabel = 'Close',
  onClose,
  children
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`app-dialog${wide ? ' app-dialog--wide' : ''}${media ? ' app-dialog--media' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`dialog-card${media ? ' dialog-card--media' : ''}`}>
        <button className="dialog-close close-icon" type="button" aria-label={closeLabel} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
