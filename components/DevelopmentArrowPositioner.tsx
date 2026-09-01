'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../src/tour-data';
import type { NavigationPositionPreview } from './TourViewer';

export interface DevelopmentArrowOption {
  readonly id: string;
  readonly target: string;
  readonly targetLabel: string;
  readonly yaw: number;
  readonly pitch: number;
}

interface DevelopmentArrowPositionerProps {
  readonly locale: Locale;
  readonly compact: boolean;
  readonly sceneLabel: string;
  readonly options: readonly DevelopmentArrowOption[];
  readonly selectedHotspotId?: string;
  readonly preview?: NavigationPositionPreview | null;
  readonly validationError?: string;
  readonly onSelect: (hotspotId: string) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

function numberLiteral(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function DevelopmentArrowPositioner({
  locale,
  compact,
  sceneLabel,
  options,
  selectedHotspotId,
  preview,
  validationError,
  onSelect,
  onReset,
  onClose
}: DevelopmentArrowPositionerProps) {
  const [copyStatus, setCopyStatus] = useState('');
  const selected = options.find((option) => option.id === selectedHotspotId) ?? options[0];
  const position = selected && preview?.hotspotId === selected.id
    ? preview
    : selected;
  const snippet = useMemo(() => selected && position
    ? `{ id: '${selected.id}', type: 'scene', target: '${selected.target}', yaw: ${numberLiteral(position.yaw)}, pitch: ${numberLiteral(position.pitch)} }`
    : '', [position, selected]);

  useEffect(() => {
    setCopyStatus('');
  }, [snippet]);

  const copySnippet = async (): Promise<void> => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyStatus(locale === 'th' ? 'คัดลอกแล้ว นำไปวางแทน object เดิมใน tour-data.ts ได้เลย' : 'Copied. Paste it over the existing object in tour-data.ts.');
    } catch {
      setCopyStatus(locale === 'th' ? 'เบราว์เซอร์บล็อก Clipboard ให้เลือกข้อความด้านล่างแล้วคัดลอกเอง' : 'Clipboard was blocked. Select and copy the text below.');
    }
  };

  return (
    <section
      className={`development-arrow-positioner${compact ? ' is-compact' : ''}`}
      aria-labelledby="development-arrow-positioner-title"
    >
      <header>
        <div>
          <span>DEVELOPMENT</span>
          <h2 id="development-arrow-positioner-title">
            {locale === 'th' ? 'จัดตำแหน่งลูกศรจาก VS Code' : 'Position VS Code arrows'}
          </h2>
        </div>
        <button type="button" className="development-arrow-positioner__close" onClick={onClose} aria-label={locale === 'th' ? 'ปิดเครื่องมือ' : 'Close tool'}>×</button>
      </header>

      <p className="development-arrow-positioner__scene">{sceneLabel}</p>
      {validationError ? <p className="development-arrow-positioner__error" role="alert">{validationError}</p> : null}

      {selected ? (
        <>
          <label>
            <span>{locale === 'th' ? 'เลือกลูกศรของฉากนี้' : 'Select an arrow in this scene'}</span>
            <select value={selected.id} onChange={(event) => onSelect(event.target.value)}>
              {options.map((option) => (
                <option value={option.id} key={option.id}>{option.id} → {option.targetLabel}</option>
              ))}
            </select>
          </label>
          <p className="development-arrow-positioner__hint">
            {locale === 'th'
              ? 'คลิกพื้นในภาพ 360 เพื่อย้ายลูกศรเป็น Preview จากนั้นคัดลอก object ไปวางใน tour-data.ts'
              : 'Click the panorama floor to preview the new position, then copy the object into tour-data.ts.'}
          </p>
          <dl>
            <div><dt>Target</dt><dd>{selected.target}</dd></div>
            <div><dt>yaw</dt><dd>{position ? numberLiteral(position.yaw) : '—'}</dd></div>
            <div><dt>pitch</dt><dd>{position ? numberLiteral(position.pitch) : '—'}</dd></div>
          </dl>
          <textarea
            value={snippet}
            readOnly
            rows={3}
            aria-label={locale === 'th' ? 'โค้ดลูกศรสำหรับคัดลอก' : 'Arrow code to copy'}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="development-arrow-positioner__actions">
            <button type="button" onClick={() => void copySnippet()}>{locale === 'th' ? 'คัดลอก object' : 'Copy object'}</button>
            <button type="button" className="is-secondary" onClick={onReset} disabled={!preview}>{locale === 'th' ? 'คืนค่าจากโค้ด' : 'Reset to code'}</button>
          </div>
          <p className="development-arrow-positioner__status" aria-live="polite">{copyStatus}</p>
        </>
      ) : (
        <p className="development-arrow-positioner__empty">
          {locale === 'th' ? 'ฉากนี้ยังไม่มีลูกศร ให้เพิ่ม object ใน tour-data.ts ก่อน' : 'This scene has no arrows. Add one in tour-data.ts first.'}
        </p>
      )}
    </section>
  );
}
