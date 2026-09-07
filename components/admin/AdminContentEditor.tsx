'use client';

import { useMemo, useState } from 'react';
import type { AdminRole, ContentKind } from '../../src/content';
import type { AdminContentRow } from '../../src/server/admin-repository';
import type { AdminMediaOption } from './AdminImageGalleryFields';
import AdminRevisionHistory from './AdminRevisionHistory';
import AdminContentDiff from './AdminContentDiff';
import {
  archiveContentAction,
  deleteContentAction,
  publishContentAction,
  restoreContentAction,
  unpublishContentAction
} from '../../app/admin/actions/content';
import AdminContentFields, { type FacultyOption } from './AdminContentFields';
import AdminContentPreview from './AdminContentPreview';
import AdminLazyDetails from './AdminLazyDetails';
import { AdminContentActionForm, AdminContentSaveForm } from './AdminContentForms';
import { localizedField } from './admin-content-values';

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
        <AdminLazyDetails className="admin-editor admin-editor--new" summary="+ เพิ่มรายการใหม่" confirmDirtyClose>
          <AdminContentSaveForm kind={kind} label="บันทึกเป็นฉบับร่าง">
            <AdminContentFields kind={kind} faculties={faculties} media={media} />
          </AdminContentSaveForm>
        </AdminLazyDetails>
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
          const label = localizedField(row.draftData, nameKey, 'th') || row.slug || row.id;
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
              <AdminLazyDetails summary="แก้ไขฉบับร่าง" confirmDirtyClose>
                <AdminContentSaveForm kind={kind} id={row.id} label="บันทึกการแก้ไขเป็นฉบับร่าง">
                  <AdminContentFields kind={kind} row={row} faculties={faculties} media={media} />
                </AdminContentSaveForm>
              </AdminLazyDetails>
              <AdminContentPreview kind={kind} data={row.draftData} />
              <AdminLazyDetails className="admin-revisions" summary="ประวัติและกู้คืนเวอร์ชัน">
                <AdminRevisionHistory kind={kind} id={row.id} currentDraft={row.draftData} />
              </AdminLazyDetails>
              {row.publishedData ? (
                <AdminLazyDetails className="admin-preview" summary="เปรียบเทียบฉบับร่างกับข้อมูลที่เผยแพร่">
                  <AdminContentDiff draft={row.draftData} published={row.publishedData} />
                </AdminLazyDetails>
              ) : null}
              {kind === 'faculties' && !published && programStats.published > 0 ? (
                <p className="admin-dependency-note">
                  หลักสูตรเผยแพร่ {programStats.published} รายการกำลังถูกซ่อนจาก Tour และ AI เมื่อเผยแพร่คณะนี้อีกครั้ง หลักสูตรจะกลับมาแสดงโดยอัตโนมัติ
                </p>
              ) : null}
              {role === 'admin' ? (
                <AdminLazyDetails className="admin-workflow-actions" summary="จัดการการเผยแพร่และรายการ">
                  <div className="admin-record-actions">
                  <AdminContentActionForm
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
                  <AdminContentActionForm
                    action={unpublishContentAction}
                    kind={kind}
                    id={row.id}
                    label="นำออกจากหน้าเว็บ"
                    pendingLabel="กำลังนำออก…"
                    available={published}
                    confirmMessage={affectedProgramsMessage}
                  />
                  <AdminContentActionForm
                    action={archiveContentAction}
                    kind={kind}
                    id={row.id}
                    label="เก็บเข้าคลัง"
                    pendingLabel="กำลังเก็บ…"
                    danger
                    available={!row.archivedAt}
                    confirmMessage={affectedProgramsMessage}
                  />
                  <AdminContentActionForm
                    action={restoreContentAction}
                    scope="draft"
                    kind={kind}
                    id={row.id}
                    label="คืนข้อมูลจากคลัง"
                    pendingLabel="กำลังคืนข้อมูล…"
                    available={Boolean(row.archivedAt)}
                  />
                  <AdminContentActionForm
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
                </AdminLazyDetails>
              ) : <p className="admin-editor-note">Editor บันทึกฉบับร่างได้ การเผยแพร่ต้องให้ Admin ตรวจสอบ</p>}
            </article>
          );
        })}
        {filteredRows.length === 0 ? <div className="admin-empty">{rows.length ? 'ไม่พบข้อมูลตามตัวกรอง' : 'ยังไม่มีข้อมูลในหมวดนี้'}</div> : null}
      </div>
    </section>
  );
}
