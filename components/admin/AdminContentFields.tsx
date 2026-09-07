'use client';

import { useState } from 'react';
import type { ContentKind } from '../../src/content';
import type { AdminContentRow } from '../../src/server/admin-repository';
import AdminImageGalleryFields, { type AdminMediaOption } from './AdminImageGalleryFields';
import {
  contentField,
  contentImages,
  contentInputId,
  contentSource,
  localizedField,
  localizedListField,
  stringListField
} from './admin-content-values';

export interface FacultyOption {
  readonly id: string;
  readonly label: string;
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
  const id = contentInputId(prefix, name);
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
  const id = contentInputId(prefix, name);
  return <label className="admin-field--wide" htmlFor={id}><span>{label}</span><textarea id={id} name={name} defaultValue={value} required={required} rows={rows} /></label>;
}

export default function AdminContentFields({ kind, row, faculties = [], media = [] }: {
  readonly kind: ContentKind;
  readonly row?: AdminContentRow;
  readonly faculties?: readonly FacultyOption[];
  readonly media?: readonly AdminMediaOption[];
}) {
  const data = row?.draftData ?? {};
  const sourceData = contentSource(data, kind);
  const prefix = row?.id ?? `new-${kind}`;
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
  const [step, setStep] = useState(0);
  const steps = ['ข้อมูลทั่วไป', 'ภาษาไทย', 'English', 'รูปและอ้างอิง', 'ตรวจสอบ'] as const;
  const existingImages = contentImages(data);
  const legacyImageUrl = contentField(data, 'imageUrl');
  const galleryImages = existingImages.length || !legacyImageUrl ? existingImages : [{
    src: legacyImageUrl,
    alt: {
      th: localizedField(data, nameKey, 'th') || 'รูปประกอบ',
      en: localizedField(data, nameKey, 'en') || 'Content image'
    }
  }];
  const requiredValues = [
    localizedField(data, nameKey, 'th'),
    localizedField(data, nameKey, 'en'),
    localizedField(data, 'description', 'th'),
    localizedField(data, 'description', 'en'),
    localizedField(sourceData, 'label', 'th'),
    localizedField(sourceData, 'label', 'en')
  ];
  if (kind !== 'hotspot_contents') requiredValues.push(localizedField(data, 'summary', 'th'), localizedField(data, 'summary', 'en'));
  if (kind === 'programs') requiredValues.push(localizedField(data, 'level', 'th'), localizedField(data, 'level', 'en'), localizedField(data, 'admission', 'th'), localizedField(data, 'admission', 'en'), row?.facultyId ?? '');
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
        <label htmlFor={contentInputId(prefix, 'facultyId')}><span>คณะที่สังกัด</span><select id={contentInputId(prefix, 'facultyId')} name="facultyId" defaultValue={row?.facultyId} required><option value="">เลือกคณะ</option>{faculties.map((faculty) => <option value={faculty.id} key={faculty.id}>{faculty.label}</option>)}</select></label>
      ) : null}
      {kind === 'programs' ? <>
        <label htmlFor={contentInputId(prefix, 'studyLevel')}><span>ระดับการศึกษาแบบโครงสร้าง (ช่วยให้ AI แนะนำแม่นขึ้น)</span><select id={contentInputId(prefix, 'studyLevel')} name="studyLevel" defaultValue={contentField(data, 'studyLevel')}><option value="">ให้ระบบอ่านจากข้อความเดิม</option><option value="vocational">อาชีวศึกษา/โรงเรียน–โรงงาน</option><option value="bachelor">ปริญญาตรี</option><option value="transfer">ปริญญาตรีเทียบโอน</option><option value="master">ปริญญาโท</option></select></label>
        <fieldset className="admin-field--wide admin-checkbox-group"><legend>วุฒิที่รับสมัคร (เลือกได้หลายข้อ)</legend>{([['m3', 'ม.3'], ['m6-pvoc', 'ม.6 / ปวช.'], ['high-vocational', 'ปวส.'], ['bachelor', 'ปริญญาตรี'], ['other', 'วุฒิอื่น']] as const).map(([value, label]) => <label key={value}><input type="checkbox" name="eligibleQualifications" value={value} defaultChecked={stringListField(data, 'eligibleQualifications').includes(value)} /><span>{label}</span></label>)}</fieldset>
      </> : null}
      {kind === 'activities' ? <><TextField prefix={prefix} name="startDate" label="วันเริ่มต้น" type="date" value={contentField(data, 'startDate')} /><TextField prefix={prefix} name="endDate" label="วันสิ้นสุด" type="date" value={contentField(data, 'endDate')} /></> : null}
      {kind === 'hotspot_contents' ? (
        <p className="admin-workflow-note admin-field--wide">
          ชื่อ คำอธิบาย และแท็กบนการ์ดฉากจัดการแยกจากข้อมูลปุ่ม Info ที่ <a href="/admin/tour" target="_blank" rel="noreferrer">Visual Tour Editor ↗</a>
        </p>
      ) : null}
      <details className="admin-advanced-settings"><summary>ตั้งค่าขั้นสูง (ผู้ใช้ทั่วไปไม่ต้องแก้)</summary><div>
        {kind !== 'hotspot_contents' ? <TextField prefix={prefix} name="slug" label="Slug · เว้นว่างเพื่อให้ระบบสร้างอัตโนมัติ" value={row?.slug} readOnly={Boolean(row)} /> : <><TextField prefix={prefix} name="hotspotId" label="Hotspot ID" value={row?.id} readOnly /><TextField prefix={prefix} name="sceneId" label="Scene ID" value={row?.sceneId} readOnly /></>}
        {kind === 'faculties' && row?.sceneId ? <TextField prefix={prefix} name="linkedSceneId" label="Scene ID ที่เชื่อมอยู่" value={row.sceneId} readOnly /> : null}
        {kind === 'faculties' && row?.hotspotId ? <TextField prefix={prefix} name="linkedHotspotId" label="Info hotspot ที่เชื่อมอยู่" value={row.hotspotId} readOnly /> : null}
        {kind === 'activities' ? <TextField prefix={prefix} name="sceneId" label="Scene ID ที่เกี่ยวข้อง (ไม่บังคับ)" value={contentField(data, 'sceneId')} /> : null}
      </div></details>
    </section>

    <section className="admin-form-step" hidden={step !== 1} lang="th">
      <header><h3>ข้อมูลภาษาไทย</h3><p>เขียนให้อ่านง่ายและตรวจสอบชื่อเฉพาะให้ถูกต้อง</p></header>
      <TextField prefix={prefix} name="nameTh" label={kind === 'activities' ? 'ชื่อกิจกรรม' : kind === 'hotspot_contents' ? 'ชื่อในปุ่ม Info' : 'ชื่อ'} value={localizedField(data, nameKey, 'th')} required />
      {kind === 'programs' ? <><TextField prefix={prefix} name="departmentTh" label="ภาควิชา/หน่วยงาน (ไม่บังคับ)" value={localizedField(data, 'department', 'th')} /><TextField prefix={prefix} name="levelTh" label="ระดับการศึกษา" value={localizedField(data, 'level', 'th')} required /></> : null}
      {kind !== 'hotspot_contents' ? <TextArea prefix={prefix} name="summaryTh" label="สรุปย่อ" value={localizedField(data, 'summary', 'th')} required rows={2} /> : null}
      <TextArea prefix={prefix} name="descriptionTh" label="รายละเอียด" value={localizedField(data, 'description', 'th')} required rows={5} />
      {kind === 'programs' ? <><TextArea prefix={prefix} name="admissionTh" label="ข้อมูลการรับสมัคร" value={localizedField(data, 'admission', 'th')} required /><TextArea prefix={prefix} name="interestTagsTh" label="แท็กความสนใจ (หนึ่งรายการต่อบรรทัด)" value={localizedListField(data, 'interestTags', 'th')} rows={4} /><TextArea prefix={prefix} name="careerTagsTh" label="แท็กแนวทางอาชีพ (หนึ่งรายการต่อบรรทัด)" value={localizedListField(data, 'careerTags', 'th')} rows={4} /></> : null}
    </section>

    <section className="admin-form-step" hidden={step !== 2} lang="en">
      <header><h3>English information</h3><p>English fields are required before publishing.</p></header>
      <TextField prefix={prefix} name="nameEn" label={kind === 'activities' ? 'Activity name' : kind === 'hotspot_contents' ? 'Info title' : 'Name'} value={localizedField(data, nameKey, 'en')} required />
      {kind === 'programs' ? <><TextField prefix={prefix} name="departmentEn" label="Department (optional)" value={localizedField(data, 'department', 'en')} /><TextField prefix={prefix} name="levelEn" label="Degree level" value={localizedField(data, 'level', 'en')} required /></> : null}
      {kind !== 'hotspot_contents' ? <TextArea prefix={prefix} name="summaryEn" label="Summary" value={localizedField(data, 'summary', 'en')} required rows={2} /> : null}
      <TextArea prefix={prefix} name="descriptionEn" label="Description" value={localizedField(data, 'description', 'en')} required rows={5} />
      {kind === 'programs' ? <><TextArea prefix={prefix} name="admissionEn" label="Admission information" value={localizedField(data, 'admission', 'en')} required /><TextArea prefix={prefix} name="interestTagsEn" label="Interest tags (one per line)" value={localizedListField(data, 'interestTags', 'en')} rows={4} /><TextArea prefix={prefix} name="careerTagsEn" label="Career tags (one per line)" value={localizedListField(data, 'careerTags', 'en')} rows={4} /></> : null}
    </section>

    <section className="admin-form-step" hidden={step !== 3}>
      <header><h3>รูปภาพและแหล่งข้อมูล</h3><p>เลือกรูปจาก Media Library แล้วใส่คำอธิบายรูปเพื่อการเข้าถึง</p></header>
      <AdminImageGalleryFields images={galleryImages} media={media} required={kind === 'faculties' || kind === 'hotspot_contents'} />
      <TextField prefix={prefix} name="sourceLabelTh" label="ชื่อแหล่งข้อมูล (ไทย)" value={localizedField(sourceData, 'label', 'th')} required />
      <TextField prefix={prefix} name="sourceLabelEn" label="Source name (English)" value={localizedField(sourceData, 'label', 'en')} required />
      <TextField prefix={prefix} name="sourceUrl" label="URL แหล่งข้อมูล (ถ้ามี)" type="url" value={contentField(sourceData, 'url')} />
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
