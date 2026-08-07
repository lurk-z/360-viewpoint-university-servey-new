import type { AdminRole, ContentImage, ContentKind } from '../../src/content';
import type { AdminContentRow } from '../../src/server/admin-repository';
import AdminImageGalleryFields from './AdminImageGalleryFields';
import {
  archiveContentAction,
  deleteContentAction,
  publishContentAction,
  restoreContentAction,
  saveContentAction,
  unpublishContentAction
} from '../../app/admin/actions';

interface FacultyOption {
  readonly id: string;
  readonly label: string;
}

interface AdminContentEditorProps {
  readonly kind: ContentKind;
  readonly title: string;
  readonly description: string;
  readonly rows: readonly AdminContentRow[];
  readonly role: AdminRole;
  readonly faculties?: readonly FacultyOption[];
}

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

function DraftPreview({ kind, data }: { readonly kind: ContentKind; readonly data: Record<string, unknown> }) {
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
  const images = contentImages(data);
  const imageUrl = kind === 'hotspot_contents' || kind === 'faculties'
    ? images[0]?.src ?? ''
    : field(data, 'imageUrl');
  const sourceData = source(data, kind);
  return (
    <details className="admin-preview">
      <summary>ดูตัวอย่างฉบับร่าง</summary>
      <article className="admin-preview__card">
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
        <div lang="th"><small>ภาษาไทย</small><h3>{localized(data, nameKey, 'th')}</h3><p>{localized(data, 'description', 'th')}</p></div>
        <div lang="en"><small>ENGLISH</small><h3>{localized(data, nameKey, 'en')}</h3><p>{localized(data, 'description', 'en')}</p></div>
        <footer>แหล่งอ้างอิง: {localized(sourceData, 'label', 'th') || '-'}</footer>
      </article>
    </details>
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

function ContentFields({ kind, row, faculties = [] }: {
  readonly kind: ContentKind;
  readonly row?: AdminContentRow;
  readonly faculties?: readonly FacultyOption[];
}) {
  const data = row?.draftData ?? {};
  const sourceData = source(data, kind);
  const prefix = row?.id ?? `new-${kind}`;
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';

  return <>
    {kind !== 'hotspot_contents' ? <>
      <TextField prefix={prefix} name="slug" label="Slug (อังกฤษ ตัวเล็ก และขีดกลาง)" value={row?.slug} required readOnly={Boolean(row)} />
      {kind === 'faculties' && row?.sceneId ? <TextField prefix={prefix} name="linkedSceneId" label="Scene ID ที่เชื่อมอยู่" value={row.sceneId} readOnly /> : null}
      {kind === 'faculties' && row?.hotspotId ? <TextField prefix={prefix} name="linkedHotspotId" label="Info hotspot ที่เชื่อมอยู่" value={row.hotspotId} readOnly /> : null}
    </> : <>
      <TextField prefix={prefix} name="hotspotId" label="Hotspot ID" value={row?.id} readOnly />
      <TextField prefix={prefix} name="sceneId" label="Scene ID" value={row?.sceneId} readOnly />
      <h3 className="admin-form-section">ข้อมูลบนการ์ดฉาก</h3>
      <TextField prefix={prefix} name="sceneTitleTh" label="ชื่อฉาก (ไทย)" value={localized(data, 'sceneTitle', 'th')} required />
      <TextField prefix={prefix} name="sceneTitleEn" label="Scene title (English)" value={localized(data, 'sceneTitle', 'en')} required />
      <TextArea prefix={prefix} name="sceneDescriptionTh" label="คำอธิบายฉาก (ไทย)" value={localized(data, 'sceneDescription', 'th')} required rows={3} />
      <TextArea prefix={prefix} name="sceneDescriptionEn" label="Scene description (English)" value={localized(data, 'sceneDescription', 'en')} required rows={3} />
      <h3 className="admin-form-section">ข้อมูลในปุ่ม Info</h3>
    </>}
    {kind === 'programs' ? (
      <label htmlFor={inputId(prefix, 'facultyId')}>
        <span>คณะ</span>
        <select id={inputId(prefix, 'facultyId')} name="facultyId" defaultValue={row?.facultyId} required>
          <option value="">เลือกคณะ</option>
          {faculties.map((faculty) => <option value={faculty.id} key={faculty.id}>{faculty.label}</option>)}
        </select>
      </label>
    ) : null}
    <TextField prefix={prefix} name="nameTh" label={kind === 'activities' ? 'ชื่อกิจกรรม (ไทย)' : kind === 'hotspot_contents' ? 'ชื่อ Info (ไทย)' : 'ชื่อ (ไทย)'} value={localized(data, nameKey, 'th')} required />
    <TextField prefix={prefix} name="nameEn" label={kind === 'activities' ? 'Activity name (English)' : 'Name (English)'} value={localized(data, nameKey, 'en')} required />
    {kind === 'programs' ? <>
      <TextField prefix={prefix} name="levelTh" label="ระดับการศึกษา (ไทย)" value={localized(data, 'level', 'th')} required />
      <TextField prefix={prefix} name="levelEn" label="Degree level (English)" value={localized(data, 'level', 'en')} required />
    </> : null}
    {kind !== 'hotspot_contents' ? <>
      <TextArea prefix={prefix} name="summaryTh" label="สรุปย่อ (ไทย)" value={localized(data, 'summary', 'th')} required rows={2} />
      <TextArea prefix={prefix} name="summaryEn" label="Summary (English)" value={localized(data, 'summary', 'en')} required rows={2} />
    </> : null}
    <TextArea prefix={prefix} name="descriptionTh" label="รายละเอียด (ไทย)" value={localized(data, 'description', 'th')} required rows={5} />
    <TextArea prefix={prefix} name="descriptionEn" label="Description (English)" value={localized(data, 'description', 'en')} required rows={5} />
    {kind === 'programs' ? <>
      <TextArea prefix={prefix} name="admissionTh" label="ข้อมูลการรับสมัคร (ไทย)" value={localized(data, 'admission', 'th')} required />
      <TextArea prefix={prefix} name="admissionEn" label="Admission information (English)" value={localized(data, 'admission', 'en')} required />
    </> : null}
    {kind === 'activities' ? <>
      <TextField prefix={prefix} name="startDate" label="วันเริ่มต้น" type="date" value={field(data, 'startDate')} />
      <TextField prefix={prefix} name="endDate" label="วันสิ้นสุด" type="date" value={field(data, 'endDate')} />
      <TextField prefix={prefix} name="sceneId" label="Scene ID ที่เกี่ยวข้อง" value={field(data, 'sceneId')} />
    </> : null}
    {kind === 'hotspot_contents' || kind === 'faculties' ? (
      <AdminImageGalleryFields images={contentImages(data)} />
    ) : (
      <TextField prefix={prefix} name="imageUrl" label="URL รูปภาพ" value={field(data, 'imageUrl')} />
    )}
    <TextField prefix={prefix} name="sourceLabelTh" label="ชื่อแหล่งอ้างอิง (ไทย)" value={localized(sourceData, 'label', 'th')} required />
    <TextField prefix={prefix} name="sourceLabelEn" label="Source label (English)" value={localized(sourceData, 'label', 'en')} required />
    <TextField prefix={prefix} name="sourceUrl" label="URL แหล่งอ้างอิง (ถ้ามี)" type="url" value={field(sourceData, 'url')} />
  </>;
}

function ActionForm({ action, kind, id, label, danger = false }: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly kind: ContentKind;
  readonly id: string;
  readonly label: string;
  readonly danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className={danger ? 'admin-button admin-button--danger' : 'admin-button admin-button--secondary'} type="submit">{label}</button>
    </form>
  );
}

export default function AdminContentEditor({ kind, title, description, rows, role, faculties = [] }: AdminContentEditorProps) {
  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>CONTENT MANAGEMENT</p><h1>{title}</h1><span>{description}</span></div></header>

      {kind !== 'hotspot_contents' ? (
        <details className="admin-editor admin-editor--new">
          <summary>+ เพิ่มรายการใหม่</summary>
          <form action={saveContentAction} className="admin-form">
            <input type="hidden" name="kind" value={kind} />
            <ContentFields kind={kind} faculties={faculties} />
            <div className="admin-form__actions"><button className="admin-button" type="submit">บันทึกเป็นฉบับร่าง</button></div>
          </form>
        </details>
      ) : null}

      <div className="admin-editor-list">
        {rows.map((row) => {
          const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
          const label = localized(row.draftData, nameKey, 'th') || row.slug || row.id;
          const published = Boolean(row.publishedData) && !row.archivedAt;
          return (
            <article className={`admin-editor${row.archivedAt ? ' is-archived' : ''}`} key={row.id}>
              <header>
                <div><h2>{label}</h2><code>{row.slug ?? row.id}</code></div>
                <span className={`admin-status ${row.archivedAt ? 'is-archived' : published ? 'is-published' : 'is-draft'}`}>
                  {row.archivedAt ? 'เก็บในคลัง' : published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                </span>
              </header>
              <details>
                <summary>แก้ไขฉบับร่าง</summary>
                <form action={saveContentAction} className="admin-form">
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={row.id} />
                  <ContentFields kind={kind} row={row} faculties={faculties} />
                  <div className="admin-form__actions"><button className="admin-button" type="submit">บันทึกฉบับร่าง</button></div>
                </form>
              </details>
              <DraftPreview kind={kind} data={row.draftData} />
              {row.publishedData ? (
                <details className="admin-preview">
                  <summary>ดูข้อมูลที่เผยแพร่อยู่</summary>
                  <pre>{JSON.stringify(row.publishedData, null, 2)}</pre>
                </details>
              ) : null}
              {role === 'admin' ? (
                <div className="admin-record-actions">
                  {!row.archivedAt ? <ActionForm action={publishContentAction} kind={kind} id={row.id} label="เผยแพร่ฉบับร่าง" /> : null}
                  {published ? <ActionForm action={unpublishContentAction} kind={kind} id={row.id} label="ยกเลิกเผยแพร่" /> : null}
                  {!row.archivedAt ? <ActionForm action={archiveContentAction} kind={kind} id={row.id} label="เก็บเข้าคลัง" danger /> : <>
                    <ActionForm action={restoreContentAction} kind={kind} id={row.id} label="คืนข้อมูล" />
                    <ActionForm action={deleteContentAction} kind={kind} id={row.id} label="ลบถาวร" danger />
                  </>}
                </div>
              ) : <p className="admin-editor-note">Editor บันทึกฉบับร่างได้ การเผยแพร่ต้องให้ Admin ตรวจสอบ</p>}
            </article>
          );
        })}
        {rows.length === 0 ? <div className="admin-empty">ยังไม่มีข้อมูลในหมวดนี้</div> : null}
      </div>
    </section>
  );
}
