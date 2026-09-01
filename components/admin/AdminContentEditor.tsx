'use client';

import { useActionState, useMemo, useRef, useState, type FormEvent, type ReactNode, type SyntheticEvent } from 'react';
import type { AdminRole, ContentImage, ContentKind } from '../../src/content';
import type { AdminContentRow } from '../../src/server/admin-repository';
import AdminImageGalleryFields, { type AdminMediaOption } from './AdminImageGalleryFields';
import AdminDraftRecovery from './AdminDraftRecovery';
import AdminRevisionHistory from './AdminRevisionHistory';
import AdminContentDiff from './AdminContentDiff';
import { ADMIN_DIRTY_STATE_CHANGED_EVENT, useAdminActionRefresh } from './useAdminActionRefresh';
import type { ContentUpdateScope } from '../../src/content-updates';
import {
  archiveContentAction,
  deleteContentAction,
  publishContentAction,
  restoreContentAction,
  saveContentAction,
  unpublishContentAction,
  type AdminActionState
} from '../../app/admin/actions';

interface FacultyOption {
  readonly id: string;
  readonly label: string;
}

interface AdminContentEditorProps {
  readonly kind: ContentKind;
  readonly title: string;
  readonly description: string;
  readonly initialStatusFilter?: string;
  readonly initialQuery?: string;
  readonly rows: readonly AdminContentRow[];
  readonly role: AdminRole;
  readonly faculties?: readonly FacultyOption[];
  readonly facultyProgramStats?: Readonly<Record<string, { readonly total: number; readonly published: number }>>;
  readonly facultyFilter?: FacultyOption;
  readonly media?: readonly AdminMediaOption[];
  readonly placeStatuses?: Readonly<Record<string, { readonly orphaned: boolean; readonly draftReady: boolean }>>;
}

type ContentAction = (previousState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
const INITIAL_ACTION_STATE: AdminActionState = { status: 'idle', message: '' };

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function field(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function localized(data: Record<string, unknown>, key: string, locale: 'th' | 'en'): string {
  return field(object(data[key]), locale);
}

function localizedList(data: Record<string, unknown>, key: string, locale: 'th' | 'en'): string {
  const value = object(data[key])[locale];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').join('\n') : '';
}

function stringList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function source(data: Record<string, unknown>, kind: ContentKind): Record<string, unknown> {
  return object(data[kind === 'hotspot_contents' ? 'reference' : 'source']);
}

function contentImages(data: Record<string, unknown>): ContentImage[] {
  if (!Array.isArray(data.images)) return [];
  return data.images.flatMap((value) => {
    const image = object(value);
    const src = field(image, 'src');
    const alt = object(image.alt);
    if (!src || !field(alt, 'th') || !field(alt, 'en')) return [];
    const caption = object(image.caption);
    return [{
      src,
      alt: { th: field(alt, 'th'), en: field(alt, 'en') },
      ...((field(caption, 'th') || field(caption, 'en')) ? {
        caption: { th: field(caption, 'th'), en: field(caption, 'en') }
      } : {})
    }];
  });
}

function LazyDetails({ className, summary, children, confirmDirtyClose = false }: {
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

function DraftPreview({ kind, data }: { readonly kind: ContentKind; readonly data: Record<string, unknown> }) {
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
  const images = contentImages(data);
  const imageUrl = images[0]?.src ?? field(data, 'imageUrl');
  const sourceData = source(data, kind);
  return (
    <LazyDetails className="admin-preview" summary="ดูตัวอย่างฉบับร่าง">
      <article className="admin-preview__card">
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
        <div lang="th"><small>ภาษาไทย</small><h3>{localized(data, nameKey, 'th')}</h3><p>{localized(data, 'description', 'th')}</p></div>
        <div lang="en"><small>ENGLISH</small><h3>{localized(data, nameKey, 'en')}</h3><p>{localized(data, 'description', 'en')}</p></div>
        <footer>แหล่งอ้างอิง: {localized(sourceData, 'label', 'th') || '-'}</footer>
      </article>
    </LazyDetails>
  );
}

function inputId(prefix: string, name: string): string {
  return `${prefix}-${name}`.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function TextField({ prefix, name, label, value = '', required = false, type = 'text', readOnly = false }: {
  readonly prefix: string;
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly required?: boolean;
  readonly type?: string;
  readonly readOnly?: boolean;
}) {
  const id = inputId(prefix, name);
  return <label htmlFor={id}><span>{label}</span><input id={id} name={name} type={type} defaultValue={value} required={required} readOnly={readOnly} /></label>;
}

function TextArea({ prefix, name, label, value = '', required = false, rows = 3 }: {
  readonly prefix: string;
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly required?: boolean;
  readonly rows?: number;
}) {
  const id = inputId(prefix, name);
  return <label className="admin-field--wide" htmlFor={id}><span>{label}</span><textarea id={id} name={name} defaultValue={value} required={required} rows={rows} /></label>;
}

function ContentFields({ kind, row, faculties = [], media = [] }: {
  readonly kind: ContentKind;
  readonly row?: AdminContentRow;
  readonly faculties?: readonly FacultyOption[];
  readonly media?: readonly AdminMediaOption[];
}) {
  const data = row?.draftData ?? {};
  const sourceData = source(data, kind);
  const prefix = row?.id ?? `new-${kind}`;
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
  const [step, setStep] = useState(0);
  const steps = ['ข้อมูลทั่วไป', 'ภาษาไทย', 'English', 'รูปและอ้างอิง', 'ตรวจสอบ'] as const;
  const existingImages = contentImages(data);
  const legacyImageUrl = field(data, 'imageUrl');
  const galleryImages = existingImages.length || !legacyImageUrl ? existingImages : [{
    src: legacyImageUrl,
    alt: {
      th: localized(data, nameKey, 'th') || 'รูปประกอบ',
      en: localized(data, nameKey, 'en') || 'Content image'
    }
  }];
  const requiredValues = [
    localized(data, nameKey, 'th'),
    localized(data, nameKey, 'en'),
    localized(data, 'description', 'th'),
    localized(data, 'description', 'en'),
    localized(sourceData, 'label', 'th'),
    localized(sourceData, 'label', 'en')
  ];
  if (kind !== 'hotspot_contents') requiredValues.push(localized(data, 'summary', 'th'), localized(data, 'summary', 'en'));
  if (kind === 'programs') requiredValues.push(localized(data, 'level', 'th'), localized(data, 'level', 'en'), localized(data, 'admission', 'th'), localized(data, 'admission', 'en'), row?.facultyId ?? '');
  if (kind === 'hotspot_contents') requiredValues.push(galleryImages[0]?.src ?? '');
  if (kind === 'faculties') requiredValues.push(galleryImages[0]?.src ?? '');
  const completeCount = requiredValues.filter((value) => value.trim()).length;

  return <div className="admin-form-stepper">
    <nav aria-label="ขั้นตอนกรอกข้อมูล">
      {steps.map((label, index) => (
        <button type="button" className={step === index ? 'is-active' : ''} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)} key={label}>
          <b>{index + 1}</b><span>{label}</span>
        </button>
      ))}
    </nav>
    <p className="admin-form-progress">ข้อมูลบังคับที่มีอยู่ {completeCount}/{requiredValues.length} ช่อง · ระบบจะตรวจอีกครั้งตอนบันทึก</p>

    <section className="admin-form-step" hidden={step !== 0}>
      <header><h3>ข้อมูลทั่วไป</h3><p>เลือกประเภทและความสัมพันธ์ก่อน ส่วนรหัสทางเทคนิคอยู่ด้านล่าง</p></header>
      {kind === 'programs' ? (
        <label htmlFor={inputId(prefix, 'facultyId')}><span>คณะที่สังกัด</span><select id={inputId(prefix, 'facultyId')} name="facultyId" defaultValue={row?.facultyId} required><option value="">เลือกคณะ</option>{faculties.map((faculty) => <option value={faculty.id} key={faculty.id}>{faculty.label}</option>)}</select></label>
      ) : null}
      {kind === 'programs' ? <>
        <label htmlFor={inputId(prefix, 'studyLevel')}><span>ระดับการศึกษาแบบโครงสร้าง (ช่วยให้ AI แนะนำแม่นขึ้น)</span><select id={inputId(prefix, 'studyLevel')} name="studyLevel" defaultValue={field(data, 'studyLevel')}><option value="">ให้ระบบอ่านจากข้อความเดิม</option><option value="vocational">อาชีวศึกษา/โรงเรียน–โรงงาน</option><option value="bachelor">ปริญญาตรี</option><option value="transfer">ปริญญาตรีเทียบโอน</option><option value="master">ปริญญาโท</option></select></label>
        <fieldset className="admin-field--wide admin-checkbox-group"><legend>วุฒิที่รับสมัคร (เลือกได้หลายข้อ)</legend>{([['m3', 'ม.3'], ['m6-pvoc', 'ม.6 / ปวช.'], ['high-vocational', 'ปวส.'], ['bachelor', 'ปริญญาตรี'], ['other', 'วุฒิอื่น']] as const).map(([value, label]) => <label key={value}><input type="checkbox" name="eligibleQualifications" value={value} defaultChecked={stringList(data, 'eligibleQualifications').includes(value)} /><span>{label}</span></label>)}</fieldset>
      </> : null}
      {kind === 'activities' ? <><TextField prefix={prefix} name="startDate" label="วันเริ่มต้น" type="date" value={field(data, 'startDate')} /><TextField prefix={prefix} name="endDate" label="วันสิ้นสุด" type="date" value={field(data, 'endDate')} /></> : null}
      {kind === 'hotspot_contents' ? (
        <p className="admin-workflow-note admin-field--wide">
          ชื่อ คำอธิบาย และแท็กบนการ์ดฉากจัดการแยกจากข้อมูลปุ่ม Info ที่ <a href="/admin/tour" target="_blank" rel="noreferrer">Visual Tour Editor ↗</a>
        </p>
      ) : null}
      <details className="admin-advanced-settings"><summary>ตั้งค่าขั้นสูง (ผู้ใช้ทั่วไปไม่ต้องแก้)</summary><div>
        {kind !== 'hotspot_contents' ? <TextField prefix={prefix} name="slug" label="Slug · เว้นว่างเพื่อให้ระบบสร้างอัตโนมัติ" value={row?.slug} readOnly={Boolean(row)} /> : <><TextField prefix={prefix} name="hotspotId" label="Hotspot ID" value={row?.id} readOnly /><TextField prefix={prefix} name="sceneId" label="Scene ID" value={row?.sceneId} readOnly /></>}
        {kind === 'faculties' && row?.sceneId ? <TextField prefix={prefix} name="linkedSceneId" label="Scene ID ที่เชื่อมอยู่" value={row.sceneId} readOnly /> : null}
        {kind === 'faculties' && row?.hotspotId ? <TextField prefix={prefix} name="linkedHotspotId" label="Info hotspot ที่เชื่อมอยู่" value={row.hotspotId} readOnly /> : null}
        {kind === 'activities' ? <TextField prefix={prefix} name="sceneId" label="Scene ID ที่เกี่ยวข้อง (ไม่บังคับ)" value={field(data, 'sceneId')} /> : null}
      </div></details>
    </section>

    <section className="admin-form-step" hidden={step !== 1} lang="th">
      <header><h3>ข้อมูลภาษาไทย</h3><p>เขียนให้อ่านง่ายและตรวจสอบชื่อเฉพาะให้ถูกต้อง</p></header>
      <TextField prefix={prefix} name="nameTh" label={kind === 'activities' ? 'ชื่อกิจกรรม' : kind === 'hotspot_contents' ? 'ชื่อในปุ่ม Info' : 'ชื่อ'} value={localized(data, nameKey, 'th')} required />
      {kind === 'programs' ? <><TextField prefix={prefix} name="departmentTh" label="ภาควิชา/หน่วยงาน (ไม่บังคับ)" value={localized(data, 'department', 'th')} /><TextField prefix={prefix} name="levelTh" label="ระดับการศึกษา" value={localized(data, 'level', 'th')} required /></> : null}
      {kind !== 'hotspot_contents' ? <TextArea prefix={prefix} name="summaryTh" label="สรุปย่อ" value={localized(data, 'summary', 'th')} required rows={2} /> : null}
      <TextArea prefix={prefix} name="descriptionTh" label="รายละเอียด" value={localized(data, 'description', 'th')} required rows={5} />
      {kind === 'programs' ? <><TextArea prefix={prefix} name="admissionTh" label="ข้อมูลการรับสมัคร" value={localized(data, 'admission', 'th')} required /><TextArea prefix={prefix} name="interestTagsTh" label="แท็กความสนใจ (หนึ่งรายการต่อบรรทัด)" value={localizedList(data, 'interestTags', 'th')} rows={4} /><TextArea prefix={prefix} name="careerTagsTh" label="แท็กแนวทางอาชีพ (หนึ่งรายการต่อบรรทัด)" value={localizedList(data, 'careerTags', 'th')} rows={4} /></> : null}
    </section>

    <section className="admin-form-step" hidden={step !== 2} lang="en">
      <header><h3>English information</h3><p>English fields are required before publishing.</p></header>
      <TextField prefix={prefix} name="nameEn" label={kind === 'activities' ? 'Activity name' : kind === 'hotspot_contents' ? 'Info title' : 'Name'} value={localized(data, nameKey, 'en')} required />
      {kind === 'programs' ? <><TextField prefix={prefix} name="departmentEn" label="Department (optional)" value={localized(data, 'department', 'en')} /><TextField prefix={prefix} name="levelEn" label="Degree level" value={localized(data, 'level', 'en')} required /></> : null}
      {kind !== 'hotspot_contents' ? <TextArea prefix={prefix} name="summaryEn" label="Summary" value={localized(data, 'summary', 'en')} required rows={2} /> : null}
      <TextArea prefix={prefix} name="descriptionEn" label="Description" value={localized(data, 'description', 'en')} required rows={5} />
      {kind === 'programs' ? <><TextArea prefix={prefix} name="admissionEn" label="Admission information" value={localized(data, 'admission', 'en')} required /><TextArea prefix={prefix} name="interestTagsEn" label="Interest tags (one per line)" value={localizedList(data, 'interestTags', 'en')} rows={4} /><TextArea prefix={prefix} name="careerTagsEn" label="Career tags (one per line)" value={localizedList(data, 'careerTags', 'en')} rows={4} /></> : null}
    </section>

    <section className="admin-form-step" hidden={step !== 3}>
      <header><h3>รูปภาพและแหล่งข้อมูล</h3><p>เลือกรูปจาก Media Library แล้วใส่คำอธิบายรูปเพื่อการเข้าถึง</p></header>
      <AdminImageGalleryFields images={galleryImages} media={media} required={kind === 'faculties' || kind === 'hotspot_contents'} />
      <TextField prefix={prefix} name="sourceLabelTh" label="ชื่อแหล่งข้อมูล (ไทย)" value={localized(sourceData, 'label', 'th')} required />
      <TextField prefix={prefix} name="sourceLabelEn" label="Source name (English)" value={localized(sourceData, 'label', 'en')} required />
      <TextField prefix={prefix} name="sourceUrl" label="URL แหล่งข้อมูล (ถ้ามี)" type="url" value={field(sourceData, 'url')} />
    </section>

    <section className="admin-form-step admin-form-review" hidden={step !== 4}>
      <header><h3>ตรวจสอบก่อนบันทึก</h3><p>บันทึกครั้งนี้เป็นฉบับร่าง หน้า Tour จะยังไม่เปลี่ยนจนกว่า Admin จะกดเผยแพร่</p></header>
      <div><strong>{completeCount === requiredValues.length ? 'ข้อมูลหลักครบแล้ว' : `ยังควรตรวจอีก ${requiredValues.length - completeCount} ช่อง`}</strong><span>สามารถย้อนกลับไปแต่ละขั้นจากแถบด้านบน</span></div>
    </section>

    <footer className="admin-form-stepper__controls">
      <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>← ย้อนกลับ</button>
      <span>ขั้นที่ {step + 1} จาก {steps.length}</span>
      <button type="button" disabled={step === steps.length - 1} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>ถัดไป →</button>
    </footer>
  </div>;
}

function ActionMessage({ state }: { readonly state: AdminActionState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <p className={`admin-action-message is-${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p>;
}

function SaveForm({ kind, id, children, label }: {
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

function ActionForm({
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

export default function AdminContentEditor({
  kind,
  title,
  description,
  rows,
  role,
  faculties = [],
  facultyProgramStats = {},
  facultyFilter,
  media = [],
  placeStatuses = {},
  initialStatusFilter,
  initialQuery = ''
}: AdminContentEditorProps) {
  const [query, setQuery] = useState(initialQuery);
  const validInitialStatus = ['all', 'published', 'draft', 'archived', 'pending', 'orphaned'].includes(initialStatusFilter ?? '')
    ? initialStatusFilter as 'all' | 'published' | 'draft' | 'archived' | 'pending' | 'orphaned'
    : 'all';
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived' | 'pending' | 'orphaned'>(validInitialStatus);
  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('th');
    return rows.filter((row) => {
      const placeStatus = kind === 'hotspot_contents' ? placeStatuses[row.id] : undefined;
      const published = Boolean(row.publishedData) && !row.archivedAt;
      const status = row.archivedAt
        ? 'archived'
        : placeStatus?.orphaned
          ? 'orphaned'
          : kind === 'hotspot_contents' && !placeStatus?.draftReady
            ? 'pending'
            : published ? 'published' : 'draft';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!keyword) return true;
      const searchable = [
        row.id,
        row.slug,
        row.sceneId,
        row.hotspotId,
        JSON.stringify(row.draftData),
        JSON.stringify(row.publishedData)
      ].filter(Boolean).join(' ').toLocaleLowerCase('th');
      return searchable.includes(keyword);
    });
  }, [kind, placeStatuses, query, rows, statusFilter]);

  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>CONTENT MANAGEMENT</p><h1>{title}</h1><span>{description}</span></div></header>

      {kind !== 'hotspot_contents' ? (
        <LazyDetails className="admin-editor admin-editor--new" summary="+ เพิ่มรายการใหม่" confirmDirtyClose>
          <SaveForm kind={kind} label="บันทึกเป็นฉบับร่าง">
            <ContentFields kind={kind} faculties={faculties} media={media} />
          </SaveForm>
        </LazyDetails>
      ) : null}

      {facultyFilter ? (
        <div className="admin-filter-note">
          <span>กำลังแสดงหลักสูตรของ <strong>{facultyFilter.label}</strong></span>
          <a href="/admin/programs">แสดงหลักสูตรทั้งหมด</a>
        </div>
      ) : null}

      <div className="admin-search-tools">
        <label><span>ค้นหาข้อมูล</span><input type="search" value={query} placeholder="ชื่อไทย อังกฤษ Slug, ID หรือ Scene ID" onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span>สถานะ</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="all">ทั้งหมด</option>
          <option value="published">เผยแพร่แล้ว</option>
          <option value="draft">ฉบับร่าง</option>
          <option value="archived">เก็บในคลัง</option>
          {kind === 'hotspot_contents' ? <><option value="pending">รอกรอกข้อมูล</option><option value="orphaned">ไม่พบในทัวร์</option></> : null}
        </select></label>
        <span>แสดง {filteredRows.length} จาก {rows.length} รายการ</span>
        {(query || statusFilter !== 'all') ? <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); }}>ล้างตัวกรอง</button> : null}
      </div>

      <p className="admin-workflow-note">
        แก้ไขและบันทึกฉบับร่างได้โดยไม่ต้องนำรายการออกจากหน้าเว็บ เมื่อพร้อมแล้วจึงกด “อัปเดตข้อมูลที่เผยแพร่”
      </p>

      <div className="admin-editor-list">
        {filteredRows.map((row) => {
          const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
          const label = localized(row.draftData, nameKey, 'th') || row.slug || row.id;
          const published = Boolean(row.publishedData) && !row.archivedAt;
          const placeStatus = kind === 'hotspot_contents' ? placeStatuses[row.id] : undefined;
          const programStats = kind === 'faculties'
            ? facultyProgramStats[row.id] ?? { total: 0, published: 0 }
            : { total: 0, published: 0 };
          const affectedProgramsMessage = kind === 'faculties' && programStats.published > 0
            ? `คณะนี้มีหลักสูตรเผยแพร่ ${programStats.published} รายการ หลักสูตรทั้งหมดจะถูกซ่อนจาก Tour และ AI ชั่วคราว ต้องการดำเนินการต่อหรือไม่?`
            : undefined;
          return (
            <article className={`admin-editor${row.archivedAt ? ' is-archived' : ''}`} key={row.id}>
              <header>
                <div><h2>{label}</h2><code>{row.slug ?? row.id}</code></div>
                <span className={`admin-status ${row.archivedAt ? 'is-archived' : placeStatus?.orphaned ? 'is-warning' : !placeStatus?.draftReady && kind === 'hotspot_contents' ? 'is-pending' : published ? 'is-published' : 'is-draft'}`}>
                  {row.archivedAt ? 'เก็บในคลัง' : placeStatus?.orphaned ? 'ไม่พบในทัวร์' : !placeStatus?.draftReady && kind === 'hotspot_contents' ? 'รอกรอกข้อมูล' : published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                </span>
              </header>
              <LazyDetails summary="แก้ไขฉบับร่าง" confirmDirtyClose>
                <SaveForm kind={kind} id={row.id} label="บันทึกการแก้ไขเป็นฉบับร่าง">
                  <ContentFields kind={kind} row={row} faculties={faculties} media={media} />
                </SaveForm>
              </LazyDetails>
              <DraftPreview kind={kind} data={row.draftData} />
              <LazyDetails className="admin-revisions" summary="ประวัติและกู้คืนเวอร์ชัน">
                <AdminRevisionHistory kind={kind} id={row.id} currentDraft={row.draftData} />
              </LazyDetails>
              {row.publishedData ? (
                <LazyDetails className="admin-preview" summary="เปรียบเทียบฉบับร่างกับข้อมูลที่เผยแพร่">
                  <AdminContentDiff draft={row.draftData} published={row.publishedData} />
                </LazyDetails>
              ) : null}
              {kind === 'faculties' && !published && programStats.published > 0 ? (
                <p className="admin-dependency-note">
                  หลักสูตรเผยแพร่ {programStats.published} รายการกำลังถูกซ่อนจาก Tour และ AI เมื่อเผยแพร่คณะนี้อีกครั้ง หลักสูตรจะกลับมาแสดงโดยอัตโนมัติ
                </p>
              ) : null}
              {role === 'admin' ? (
                <LazyDetails className="admin-workflow-actions" summary="จัดการการเผยแพร่และรายการ">
                  <div className="admin-record-actions">
                  <ActionForm
                    action={publishContentAction}
                    kind={kind}
                    id={row.id}
                    label={published ? 'อัปเดตข้อมูลที่เผยแพร่' : 'เผยแพร่ครั้งแรก'}
                    pendingLabel="กำลังเผยแพร่…"
                    available={!row.archivedAt}
                    disabled={Boolean(placeStatus?.orphaned || (kind === 'hotspot_contents' && !placeStatus?.draftReady))}
                    disabledMessage={placeStatus?.orphaned
                      ? 'เผยแพร่ไม่ได้ เพราะไม่พบ Scene ID และ Hotspot ID คู่นี้ในโครงสร้างทัวร์'
                      : kind === 'hotspot_contents' && !placeStatus?.draftReady
                        ? 'กรุณากรอกข้อมูลไทย–อังกฤษ รูปอย่างน้อยหนึ่งรูป และแหล่งอ้างอิงให้ครบก่อนเผยแพร่'
                        : undefined}
                  />
                  <ActionForm
                    action={unpublishContentAction}
                    kind={kind}
                    id={row.id}
                    label="นำออกจากหน้าเว็บ"
                    pendingLabel="กำลังนำออก…"
                    available={published}
                    confirmMessage={affectedProgramsMessage}
                  />
                  <ActionForm
                    action={archiveContentAction}
                    kind={kind}
                    id={row.id}
                    label="เก็บเข้าคลัง"
                    pendingLabel="กำลังเก็บ…"
                    danger
                    available={!row.archivedAt}
                    confirmMessage={affectedProgramsMessage}
                  />
                  <ActionForm
                    action={restoreContentAction}
                    scope="draft"
                    kind={kind}
                    id={row.id}
                    label="คืนข้อมูลจากคลัง"
                    pendingLabel="กำลังคืนข้อมูล…"
                    available={Boolean(row.archivedAt)}
                  />
                  <ActionForm
                    action={deleteContentAction}
                    kind={kind}
                    id={row.id}
                    label="ลบถาวร"
                    pendingLabel="กำลังลบ…"
                    danger
                    available={Boolean(row.archivedAt) || (kind === 'faculties' && programStats.total > 0)}
                    disabled={kind === 'faculties' && programStats.total > 0}
                    disabledMessage={kind === 'faculties' && programStats.total > 0
                      ? `ยังลบคณะไม่ได้ เพราะมีหลักสูตรอ้างอิง ${programStats.total} รายการ`
                      : undefined}
                    helpHref={kind === 'faculties' && programStats.total > 0
                      ? `/admin/programs?faculty=${encodeURIComponent(row.id)}`
                      : undefined}
                    confirmMessage="การลบถาวรไม่สามารถย้อนกลับได้ ต้องการดำเนินการต่อหรือไม่?"
                  />
                  </div>
                </LazyDetails>
              ) : <p className="admin-editor-note">Editor บันทึกฉบับร่างได้ การเผยแพร่ต้องให้ Admin ตรวจสอบ</p>}
            </article>
          );
        })}
        {filteredRows.length === 0 ? <div className="admin-empty">{rows.length ? 'ไม่พบข้อมูลตามตัวกรอง' : 'ยังไม่มีข้อมูลในหมวดนี้'}</div> : null}
      </div>
    </section>
  );
}
