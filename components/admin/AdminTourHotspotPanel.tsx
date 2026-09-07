'use client';

import dynamic from 'next/dynamic';
import type { TourStructureScene } from '../../src/tour-structure';
import type { AdminTourInfoContentStatus } from './AdminTourEditor';

const AdminPanoramaPlacement = dynamic(() => import('./AdminPanoramaPlacement'), { ssr: false });

export default function AdminTourHotspotPanel({
  scene,
  infoContentStatuses,
  savedDraftInfoIds,
  publishedInfoIds,
  dirtyInfoHotspotIds,
  selectedInfoHotspotId,
  onSelectInfo,
  onPlaceInfo,
  onUpdateInfo,
  onDeleteInfo
}: {
  readonly scene: TourStructureScene;
  readonly infoContentStatuses: Readonly<Record<string, AdminTourInfoContentStatus>>;
  readonly savedDraftInfoIds: ReadonlySet<string>;
  readonly publishedInfoIds: ReadonlySet<string>;
  readonly dirtyInfoHotspotIds: ReadonlySet<string>;
  readonly selectedInfoHotspotId?: string;
  readonly onSelectInfo: (hotspotId: string | undefined) => void;
  readonly onPlaceInfo: (position: { yaw: number; pitch: number }) => void;
  readonly onUpdateInfo: (id: string, field: 'yaw' | 'pitch', value: number) => void;
  readonly onDeleteInfo: (id: string) => void;
}) {
  const infoHotspots = scene.hotspots.filter((hotspot) => hotspot.type === 'info');
  return (
    <div className="admin-tour-placement">
      <section className="admin-tour-placement__tools">
        <strong>4. หมุนภาพแล้วคลิกเพื่อวางปุ่ม Info</strong>
        <p>ลูกศรนำทางแก้จาก <code>src/tour-data.ts</code> เท่านั้น ส่วนการคลิกบนภาพนี้จะสร้างปุ่ม Info และรายการ “รอกรอกข้อมูล” ในสถานที่สำคัญเมื่อบันทึก</p>
      </section>
      <AdminPanoramaPlacement
        panorama={scene.panorama}
        hotspots={infoHotspots}
        selectedHotspotId={selectedInfoHotspotId}
        onPosition={onPlaceInfo}
        onSelect={onSelectInfo}
      />
      <section className="admin-tour-hotspots"><header><strong>ปุ่มในฉาก {scene.hotspots.length}</strong></header>
        {scene.hotspots.map((hotspot) => <article className={hotspot.type === 'scene'
          ? 'is-navigation-readonly'
          : hotspot.id === selectedInfoHotspotId ? 'is-info-selected' : ''} key={hotspot.id}>
          <div><b>{hotspot.type === 'scene' ? 'ลูกศร' : 'Info'}</b><code>{hotspot.id}</code></div>
          {hotspot.type === 'scene' ? <>
            <dl><div><dt>ปลายทาง</dt><dd><code>{hotspot.target}</code></dd></div><div><dt>ตำแหน่ง</dt><dd>yaw {hotspot.yaw} · pitch {hotspot.pitch}</dd></div><div><dt>ประเภท</dt><dd>{hotspot.direction === 'down' ? 'ลงชั้น' : hotspot.direction === 'up' ? 'ขึ้นชั้น' : 'ทั่วไป'}</dd></div></dl>
            <small>อ่านอย่างเดียว · แก้ลูกศรใน VS Code แล้วรัน npm run sync:arrows</small>
          </> : <>
            <div className="admin-info-workflow-status" aria-label={`สถานะ ${hotspot.id}`}>
              <span className={dirtyInfoHotspotIds.has(hotspot.id) || !savedDraftInfoIds.has(hotspot.id) ? 'is-pending' : 'is-ready'}>{dirtyInfoHotspotIds.has(hotspot.id) || !savedDraftInfoIds.has(hotspot.id) ? 'ยังไม่บันทึก' : 'บันทึกฉบับร่างแล้ว'}</span>
              <span className={publishedInfoIds.has(hotspot.id) ? 'is-ready' : 'is-pending'}>{publishedInfoIds.has(hotspot.id) ? 'เผยแพร่โครงสร้างแล้ว' : 'รอเผยแพร่โครงสร้าง'}</span>
              <span className={infoContentStatuses[hotspot.id]?.published && !infoContentStatuses[hotspot.id]?.archived ? 'is-ready' : 'is-pending'}>{infoContentStatuses[hotspot.id]?.published && !infoContentStatuses[hotspot.id]?.archived ? 'เนื้อหาสถานที่เผยแพร่แล้ว' : infoContentStatuses[hotspot.id]?.draft ? 'เนื้อหาเป็นฉบับร่าง' : 'รอกรอกเนื้อหาสถานที่'}</span>
            </div>
            <label><span>yaw</span><input type="number" step="0.1" value={hotspot.yaw} onChange={(event) => onUpdateInfo(hotspot.id, 'yaw', Number(event.target.value))} /></label>
            <label><span>pitch</span><input type="number" step="0.1" value={hotspot.pitch} onChange={(event) => onUpdateInfo(hotspot.id, 'pitch', Number(event.target.value))} /></label>
            <a className="admin-info-content-link" href={`/admin/places?q=${encodeURIComponent(hotspot.id)}`}>เปิดข้อมูลสถานที่ →</a>
            <button type="button" onClick={() => onDeleteInfo(hotspot.id)}>ลบปุ่ม Info</button>
          </>}
        </article>)}
      </section>
    </div>
  );
}
