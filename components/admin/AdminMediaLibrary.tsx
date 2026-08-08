'use client';

import { useMemo, useState } from 'react';
import type { MediaUsage } from '../../src/media-usage';
import AdminMediaDeleteForm from './AdminMediaDeleteForm';

export interface AdminMediaItem {
  readonly path: string;
  readonly publicUrl: string;
  readonly usage: readonly MediaUsage[];
}

const kindLabels: Record<MediaUsage['kind'], string> = {
  faculties: 'คณะ',
  programs: 'หลักสูตร',
  activities: 'กิจกรรม',
  hotspot_contents: 'สถานที่สำคัญ'
};

export default function AdminMediaLibrary({ items, canDelete }: {
  readonly items: readonly AdminMediaItem[];
  readonly canDelete: boolean;
}) {
  const [query, setQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('th');
    return items.filter((item) => {
      if (usageFilter === 'used' && !item.usage.length) return false;
      if (usageFilter === 'unused' && item.usage.length) return false;
      return !keyword || item.path.toLocaleLowerCase('th').includes(keyword)
        || item.usage.some((usage) => usage.label.toLocaleLowerCase('th').includes(keyword));
    });
  }, [items, query, usageFilter]);

  return <>
    <div className="admin-search-tools">
      <label><span>ค้นหารูปหรือข้อมูลที่ใช้งาน</span><input type="search" value={query} placeholder="ชื่อไฟล์หรือชื่อเนื้อหา" onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span>สถานะการใช้งาน</span><select value={usageFilter} onChange={(event) => setUsageFilter(event.target.value as typeof usageFilter)}><option value="all">ทั้งหมด</option><option value="used">กำลังใช้งาน</option><option value="unused">ไม่ได้ใช้งาน</option></select></label>
      <span>แสดง {filtered.length} จาก {items.length} รูป</span>
      {(query || usageFilter !== 'all') ? <button type="button" onClick={() => { setQuery(''); setUsageFilter('all'); }}>ล้างตัวกรอง</button> : null}
    </div>
    <div className="admin-media-grid">
      {filtered.map((item) => (
        <article key={item.path}>
          <img src={item.publicUrl} alt={item.path} loading="lazy" />
          <strong>{item.path}</strong>
          <input aria-label={`URL ${item.path}`} value={item.publicUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          <div className={`admin-media-usage${item.usage.length ? ' is-used' : ''}`}>
            <strong>{item.usage.length ? `กำลังใช้ใน ${item.usage.length} รายการ` : 'ยังไม่มีข้อมูลอ้างอิงรูปนี้'}</strong>
            {item.usage.map((usage) => (
              <a href={usage.href} key={`${usage.kind}-${usage.id}`}>
                {kindLabels[usage.kind]}: {usage.label} · {usage.scopes.map((scope) => scope === 'draft' ? 'ฉบับร่าง' : 'เผยแพร่').join('/')} {usage.archived ? '(เก็บในคลัง)' : ''}
              </a>
            ))}
          </div>
          {canDelete ? <AdminMediaDeleteForm path={item.path} usageCount={item.usage.length} /> : null}
        </article>
      ))}
      {!filtered.length ? <div className="admin-empty">ไม่พบรูปตามตัวกรอง</div> : null}
    </div>
  </>;
}
