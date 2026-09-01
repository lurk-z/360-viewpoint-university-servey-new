'use client';

import dynamic from 'next/dynamic';
import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  publishTourStructureAction,
  restoreTourRevisionAction,
  saveTourStructureAction,
  type AdminActionState
} from '../../app/admin/actions';
import {
  analyzeTourStructure,
  tourStructureDataSchema,
  tourStructureSceneSchema,
  type TourStructureData,
  type TourStructureScene
} from '../../src/tour-structure';
import type {
  AdminTourAsset,
  AdminTourRevision
} from '../../src/server/tour-structure-repository';
import { useAdminActionRefresh } from './useAdminActionRefresh';
import AdminPanoramaUploader from './AdminPanoramaUploader';

const AdminPanoramaPlacement = dynamic(() => import('./AdminPanoramaPlacement'), { ssr: false });
const initialState: AdminActionState = { status: 'idle', message: '' };

export interface AdminTourInfoContentStatus {
  readonly draft: boolean;
  readonly published: boolean;
  readonly archived: boolean;
}

function uniqueId(base: string, used: ReadonlySet<string>): string {
  const clean = base.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'scene';
  if (!used.has(clean)) return clean;
  for (let index = 2; index < 10_000; index += 1) {
    if (!used.has(`${clean}-${index}`)) return `${clean}-${index}`;
  }
  return `${clean}-${Date.now().toString(36)}`;
}

function RestoreTourRevision({ revision }: { readonly revision: AdminTourRevision }) {
  const [state, action, pending] = useActionState(restoreTourRevisionAction, initialState);
  useAdminActionRefresh(state, { scope: 'draft', kind: 'tour', id: 'main' });
  return <form action={action}>
    <input type="hidden" name="revisionId" value={revision.id} />
    <button type="submit" disabled={pending}>{pending ? 'กำลังกู้คืน…' : 'กู้เป็นฉบับร่าง'}</button>
    {state.message ? <span className={`admin-action-message is-${state.status}`}>{state.message}</span> : null}
  </form>;
}

export default function AdminTourEditor({
  initialData,
  initialPublishedData,
  infoContentStatuses,
  draftVersion,
  publishedVersion,
  role,
  revisions,
  initialAssets
}: {
  readonly initialData: TourStructureData;
  readonly initialPublishedData: TourStructureData | null;
  readonly infoContentStatuses: Readonly<Record<string, AdminTourInfoContentStatus>>;
  readonly draftVersion: number;
  readonly publishedVersion: number | null;
  readonly role: 'admin' | 'editor';
  readonly revisions: readonly AdminTourRevision[];
  readonly initialAssets: readonly AdminTourAsset[];
}) {
  const [data, setData] = useState<TourStructureData>(() => structuredClone(initialData));
  const [selectedId, setSelectedId] = useState(initialData.startSceneId);
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<readonly AdminTourAsset[]>(initialAssets);
  const [assetStatus, setAssetStatus] = useState('');
  const [selectedInfoHotspotId, setSelectedInfoHotspotId] = useState<string>();
  const [dirtyInfoHotspotIds, setDirtyInfoHotspotIds] = useState<ReadonlySet<string>>(() => new Set());
  const [saveState, saveAction, saving] = useActionState(saveTourStructureAction, initialState);
  const [publishState, publishAction, publishing] = useActionState(publishTourStructureAction, initialState);
  useAdminActionRefresh(saveState, { scope: 'draft', kind: 'tour', id: 'main' });
  useAdminActionRefresh(publishState, { scope: 'public', kind: 'tour', id: 'main' });

  useEffect(() => {
    if (saveState.status === 'success') setDirtyInfoHotspotIds(new Set());
  }, [saveState]);

  const parsed = useMemo(() => tourStructureDataSchema.safeParse(data), [data]);
  const issues = useMemo(() => parsed.success ? analyzeTourStructure(parsed.data) : parsed.error.issues.map((issue) => ({
    severity: 'error' as const,
    code: 'invalid-structure' as const,
    message: `${issue.path.join('.')}: ${issue.message}`
  })), [parsed]);
  const selectedIndex = data.scenes.findIndex((scene) => scene.id === selectedId);
  const scene = data.scenes[selectedIndex] ?? data.scenes[0]!;
  const infoHotspots = scene.hotspots.filter((hotspot) => hotspot.type === 'info');
  const savedDraftInfoIds = useMemo(() => new Set(initialData.scenes.flatMap((item) => (
    item.hotspots.filter((hotspot) => hotspot.type === 'info').map((hotspot) => hotspot.id)
  ))), [initialData]);
  const publishedInfoIds = useMemo(() => new Set((initialPublishedData?.scenes ?? []).flatMap((item) => (
    item.hotspots.filter((hotspot) => hotspot.type === 'info').map((hotspot) => hotspot.id)
  ))), [initialPublishedData]);
  const filteredScenes = data.scenes.filter((item) => {
    const needle = query.trim().toLowerCase();
    return !needle || `${item.id} ${item.title.th} ${item.title.en}`.toLowerCase().includes(needle);
  });

  const updateScene = (updater: (scene: TourStructureScene) => TourStructureScene): void => {
    setData((current) => ({
      ...current,
      scenes: current.scenes.map((item) => item.id === scene.id ? updater(item) : item)
    }));
  };
  const setLocalized = (key: 'title' | 'description', locale: 'th' | 'en', value: string): void => {
    updateScene((current) => ({ ...current, [key]: { ...current[key], [locale]: value } }));
  };
  const setInitial = (key: 'yaw' | 'pitch' | 'zoom', value: number): void => {
    updateScene((current) => ({ ...current, initialView: { ...current.initialView, [key]: value } }));
  };
  const setMap = (x: number, y: number): void => {
    updateScene((current) => ({ ...current, mapPosition: { x: Math.round(x), y: Math.round(y) } }));
  };
  const addScene = (): void => {
    const ids = new Set(data.scenes.map((item) => item.id));
    const id = uniqueId('newScene', ids);
    const next: TourStructureScene = {
      id,
      panorama: scene.panorama,
      title: { th: 'ฉากใหม่', en: 'New scene' },
      description: { th: 'กรุณากรอกรายละเอียดฉาก', en: 'Please complete the scene description.' },
      tags: { th: ['ฉากใหม่'], en: ['new scene'] },
      initialView: { yaw: 0, pitch: 0, zoom: 22 },
      mapPosition: { ...scene.mapPosition },
      hotspots: []
    };
    setData((current) => ({ ...current, scenes: [...current.scenes, next] }));
    setSelectedId(id);
  };
  const duplicateScene = (): void => {
    const id = uniqueId(`${scene.id}-copy`, new Set(data.scenes.map((item) => item.id)));
    const next = structuredClone(scene);
    next.id = id;
    next.title = { th: `${scene.title.th} (สำเนา)`, en: `${scene.title.en} (copy)` };
    next.hotspots = [];
    setData((current) => ({ ...current, scenes: [...current.scenes, next] }));
    setSelectedId(id);
  };
  const toggleArchive = (): void => {
    if (scene.id === data.startSceneId && !scene.archived) return;
    updateScene((current) => ({ ...current, archived: !current.archived || undefined }));
  };
  const placeHotspot = ({ yaw, pitch }: { yaw: number; pitch: number }): void => {
    const used = new Set(data.scenes.flatMap((item) => item.hotspots.map((hotspot) => hotspot.id)));
    const base = `${scene.id}-info`;
    const id = uniqueId(base, used);
    updateScene((current) => ({
      ...current,
      hotspots: [...current.hotspots, { id, type: 'info' as const, yaw, pitch }]
    }));
    setSelectedInfoHotspotId(id);
    setDirtyInfoHotspotIds((current) => new Set(current).add(id));
  };
  const updateInfoHotspot = (id: string, field: 'yaw' | 'pitch', value: number): void => {
    updateScene((current) => ({
      ...current,
      hotspots: current.hotspots.map((hotspot) => (
        hotspot.type === 'info' && hotspot.id === id ? { ...hotspot, [field]: value } : hotspot
      ))
    }));
    setSelectedInfoHotspotId(id);
    setDirtyInfoHotspotIds((current) => new Set(current).add(id));
  };

  return <div className="admin-tour-editor">
    <aside className="admin-tour-scenes">
      <header><strong>ฉากทั้งหมด {data.scenes.length}</strong><button type="button" onClick={addScene}>+ เพิ่มฉาก</button></header>
      <label className="admin-tour-scene-import">นำเข้า Scene JSON<input hidden type="file" accept="application/json,.json" onChange={(event) => {
        const file = event.target.files?.[0]; if (!file) return;
        void file.text().then((text) => {
          const parsedScene = tourStructureSceneSchema.safeParse(JSON.parse(text));
          if (!parsedScene.success) { alert('ไฟล์ Scene JSON ไม่ผ่านการตรวจสอบ'); return; }
          if (data.scenes.some((item) => item.id === parsedScene.data.id)) { alert('Scene ID นี้มีอยู่แล้ว'); return; }
          setData((current) => ({ ...current, scenes: [...current.scenes, parsedScene.data] }));
          setSelectedId(parsedScene.data.id);
        }).catch(() => alert('อ่านไฟล์ Scene JSON ไม่สำเร็จ'));
      }} /></label>
      <input type="search" placeholder="ค้นหาชื่อหรือ Scene ID" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div>{filteredScenes.map((item) => <button type="button" key={item.id}
        className={item.id === scene.id ? 'is-active' : ''} onClick={() => setSelectedId(item.id)}>
        <span>{item.title.th}</span><small>{item.id}{item.archived ? ' · ในคลัง' : ''}</small>
      </button>)}</div>
    </aside>

    <section className="admin-tour-workspace">
      <header className="admin-tour-workspace__header">
        <div><p>VISUAL TOUR EDITOR</p><h1>{scene.title.th}</h1><code>{scene.id}</code><nav className="admin-tour-scene-links" aria-label="ตรวจฉากปัจจุบัน"><a href={`/tour-preview?scene=${encodeURIComponent(scene.id)}`} target="_blank" rel="noreferrer">ดูฉบับร่าง ↗</a><a href={`/?scene=${encodeURIComponent(scene.id)}`} target="_blank" rel="noreferrer">ดูหน้าเว็บจริง ↗</a></nav></div>
        <div><button type="button" onClick={duplicateScene}>คัดลอกฉาก</button><button type="button" onClick={toggleArchive} disabled={scene.id === data.startSceneId}>{scene.archived ? 'คืนจากคลัง' : 'เก็บเข้าคลัง'}</button></div>
      </header>

      <div className="admin-tour-grid">
        <div className="admin-tour-form">
          <fieldset><legend>1. ข้อมูลฉาก</legend>
            <label><span>ชื่อภาษาไทย</span><input value={scene.title.th} onChange={(event) => setLocalized('title', 'th', event.target.value)} /></label>
            <label><span>ชื่อภาษาอังกฤษ</span><input value={scene.title.en} onChange={(event) => setLocalized('title', 'en', event.target.value)} /></label>
            <label><span>คำอธิบายภาษาไทย</span><textarea value={scene.description.th} onChange={(event) => setLocalized('description', 'th', event.target.value)} /></label>
            <label><span>คำอธิบายภาษาอังกฤษ</span><textarea value={scene.description.en} onChange={(event) => setLocalized('description', 'en', event.target.value)} /></label>
            <label><span>Panorama URL</span><input value={scene.panorama} onChange={(event) => updateScene((current) => ({ ...current, panorama: event.target.value }))} /></label>
            {assets.length ? <label><span>เลือกรูปที่อัปโหลด</span><select value="" onChange={(event) => {
              const asset = assets.find((item) => item.id === event.target.value);
              if (asset) updateScene((current) => ({ ...current, panorama: asset.publicUrl }));
            }}><option value="">-- เลือก --</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName}</option>)}</select></label> : null}
            <AdminPanoramaUploader onUploaded={(asset) => { setAssets((current) => [asset, ...current]); updateScene((current) => ({ ...current, panorama: asset.publicUrl })); }} />
            {assets.length ? <details className="admin-tour-assets"><summary>จัดการ Panorama ที่อัปโหลด ({assets.length})</summary>{assets.map((asset) => {
              const usage = data.scenes.filter((item) => item.panorama === asset.publicUrl).length;
              return <article key={asset.id}><div><strong>{asset.fileName}</strong><small>{asset.width}×{asset.height} · {(asset.byteSize / 1024 / 1024).toFixed(1)} MB · ใช้ {usage} ฉาก</small></div>{role === 'admin' ? <button type="button" disabled={usage > 0} onClick={() => {
                if (!confirm(`ลบ ${asset.fileName} ถาวรหรือไม่?`)) return;
                setAssetStatus('กำลังลบ…');
                void fetch(`/api/admin/tour-assets?id=${encodeURIComponent(asset.id)}`, { method: 'DELETE' })
                  .then(async (response) => { const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error); setAssets((current) => current.filter((item) => item.id !== asset.id)); setAssetStatus('ลบ Panorama แล้ว'); })
                  .catch((error) => setAssetStatus(error instanceof Error ? error.message : 'ลบไม่สำเร็จ'));
              }}>ลบ</button> : null}</article>;
            })}{assetStatus ? <p role="status">{assetStatus}</p> : null}</details> : null}
          </fieldset>
          <fieldset><legend>2. มุมเริ่มต้น</legend><div className="admin-inline-grid">
            {(['yaw', 'pitch', 'zoom'] as const).map((key) => <label key={key}><span>{key}</span><input type="number" value={scene.initialView[key]} onChange={(event) => setInitial(key, Number(event.target.value))} /></label>)}
          </div></fieldset>
          <fieldset><legend>3. แผนที่</legend>
            <label className="admin-checkbox"><input type="checkbox" checked={Boolean(scene.mapLandmark)} onChange={(event) => updateScene((current) => ({ ...current, mapLandmark: event.target.checked || undefined }))} /> แสดงเป็นสถานที่หลัก</label>
            <div className="admin-inline-grid"><label><span>X</span><input type="number" value={scene.mapPosition.x} onChange={(event) => setMap(Number(event.target.value), scene.mapPosition.y)} /></label><label><span>Y</span><input type="number" value={scene.mapPosition.y} onChange={(event) => setMap(scene.mapPosition.x, Number(event.target.value))} /></label></div>
            <div className="admin-tour-map-editor" onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setMap((event.clientX - rect.left) / rect.width * data.map.width, (event.clientY - rect.top) / rect.height * data.map.height);
            }}><img src={data.map.image} alt="แผนที่สำหรับวางฉาก" /><span style={{ left: `${scene.mapPosition.x / data.map.width * 100}%`, top: `${scene.mapPosition.y / data.map.height * 100}%` }} /></div>
            <small>คลิกบนแผนที่เพื่อย้ายตำแหน่งฉาก</small>
          </fieldset>
        </div>

        <div className="admin-tour-placement">
          <section className="admin-tour-placement__tools">
            <strong>4. หมุนภาพแล้วคลิกเพื่อวางปุ่ม Info</strong>
            <p>ลูกศรนำทางแก้จาก <code>src/tour-data.ts</code> เท่านั้น ส่วนการคลิกบนภาพนี้จะสร้างปุ่ม Info และรายการ “รอกรอกข้อมูล” ในสถานที่สำคัญเมื่อบันทึก</p>
          </section>
          <AdminPanoramaPlacement
            panorama={scene.panorama}
            hotspots={infoHotspots}
            selectedHotspotId={selectedInfoHotspotId}
            onPosition={placeHotspot}
            onSelect={setSelectedInfoHotspotId}
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
                <label><span>yaw</span><input type="number" step="0.1" value={hotspot.yaw} onChange={(event) => updateInfoHotspot(hotspot.id, 'yaw', Number(event.target.value))} /></label>
                <label><span>pitch</span><input type="number" step="0.1" value={hotspot.pitch} onChange={(event) => updateInfoHotspot(hotspot.id, 'pitch', Number(event.target.value))} /></label>
                <a className="admin-info-content-link" href={`/admin/places?q=${encodeURIComponent(hotspot.id)}`}>เปิดข้อมูลสถานที่ →</a>
                <button type="button" onClick={() => { updateScene((current) => ({ ...current, hotspots: current.hotspots.filter((item) => item.id !== hotspot.id) })); setSelectedInfoHotspotId(undefined); setDirtyInfoHotspotIds((current) => new Set(current).add(hotspot.id)); }}>ลบปุ่ม Info</button>
              </>}
            </article>)}
          </section>
        </div>
      </div>

      <section className="admin-tour-validation">
        <header><strong>ผลตรวจโครงสร้าง</strong><span>{issues.filter((issue) => issue.severity === 'error').length} ข้อผิดพลาด · {issues.filter((issue) => issue.severity === 'warning').length} คำเตือน</span></header>
        {issues.length ? <ul>{issues.slice(0, 30).map((issue, index) => <li className={`is-${issue.severity}`} key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : <p>โครงสร้างผ่านการตรวจสอบ</p>}
      </section>

      <div className="admin-tour-actions">
        <form action={saveAction}><input type="hidden" name="structure" value={JSON.stringify(data)} /><input type="hidden" name="draftVersion" value={draftVersion} /><button className="admin-button" type="submit" disabled={saving || !parsed.success}>{saving ? 'กำลังบันทึก…' : 'บันทึกฉบับร่าง'}</button>{saveState.message ? <p className={`admin-action-message is-${saveState.status}`}>{saveState.message}</p> : null}</form>
        {role === 'admin' ? <form action={publishAction}><input type="hidden" name="draftVersion" value={draftVersion} /><button className="admin-button admin-button--publish" type="submit" disabled={publishing || issues.some((issue) => issue.severity === 'error')}>{publishing ? 'กำลังเผยแพร่…' : 'เผยแพร่โครงสร้างทัวร์'}</button>{publishState.message ? <p className={`admin-action-message is-${publishState.status}`}>{publishState.message}</p> : null}</form> : null}
        <a className="admin-button admin-button--secondary" href="/tour-preview" target="_blank">ดูตัวอย่างฉบับร่าง ↗</a>
        <span>ฉบับร่าง v{draftVersion} · เผยแพร่ v{publishedVersion ?? 'ยังไม่มี'}</span>
      </div>

      <details className="admin-tour-revisions"><summary>ประวัติโครงสร้างทัวร์</summary><div>{revisions.map((revision) => <article key={revision.id}><div><strong>v{revision.version} · {revision.action}</strong><time>{new Date(revision.createdAt).toLocaleString('th-TH')}</time></div>{role === 'admin' ? <RestoreTourRevision revision={revision} /> : null}</article>)}</div></details>
    </section>
  </div>;
}
