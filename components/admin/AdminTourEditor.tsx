'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import {
  publishTourStructureAction,
  saveTourStructureAction
} from '../../app/admin/actions/tour';
import type { AdminActionState } from '../../src/server/admin-action-shared';
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
import AdminTourSceneList from './AdminTourSceneList';
import AdminTourSceneForm from './AdminTourSceneForm';
import AdminTourHotspotPanel from './AdminTourHotspotPanel';
import { AdminTourActions, AdminTourRevisions, AdminTourValidation } from './AdminTourWorkflow';
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
  const savedDraftInfoIds = useMemo(() => new Set(initialData.scenes.flatMap((item) => (
    item.hotspots.filter((hotspot) => hotspot.type === 'info').map((hotspot) => hotspot.id)
  ))), [initialData]);
  const publishedInfoIds = useMemo(() => new Set((initialPublishedData?.scenes ?? []).flatMap((item) => (
    item.hotspots.filter((hotspot) => hotspot.type === 'info').map((hotspot) => hotspot.id)
  ))), [initialPublishedData]);

  const updateScene = (updater: (scene: TourStructureScene) => TourStructureScene): void => {
    setData((current) => ({
      ...current,
      scenes: current.scenes.map((item) => item.id === scene.id ? updater(item) : item)
    }));
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
  const importScene = (file: File): void => {
    void file.text().then((text) => {
      const parsedScene = tourStructureSceneSchema.safeParse(JSON.parse(text));
      if (!parsedScene.success) { alert('ไฟล์ Scene JSON ไม่ผ่านการตรวจสอบ'); return; }
      if (data.scenes.some((item) => item.id === parsedScene.data.id)) { alert('Scene ID นี้มีอยู่แล้ว'); return; }
      setData((current) => ({ ...current, scenes: [...current.scenes, parsedScene.data] }));
      setSelectedId(parsedScene.data.id);
    }).catch(() => alert('อ่านไฟล์ Scene JSON ไม่สำเร็จ'));
  };
  const deleteInfoHotspot = (id: string): void => {
    updateScene((current) => ({ ...current, hotspots: current.hotspots.filter((item) => item.id !== id) }));
    setSelectedInfoHotspotId(undefined);
    setDirtyInfoHotspotIds((current) => new Set(current).add(id));
  };

  return <div className="admin-tour-editor">
    <AdminTourSceneList
      scenes={data.scenes}
      selectedId={scene.id}
      query={query}
      onQueryChange={setQuery}
      onSelect={setSelectedId}
      onAdd={addScene}
      onImport={importScene}
    />

    <section className="admin-tour-workspace">
      <header className="admin-tour-workspace__header">
        <div><p>VISUAL TOUR EDITOR</p><h1>{scene.title.th}</h1><code>{scene.id}</code><nav className="admin-tour-scene-links" aria-label="ตรวจฉากปัจจุบัน"><a href={`/tour-preview?scene=${encodeURIComponent(scene.id)}`} target="_blank" rel="noreferrer">ดูฉบับร่าง ↗</a><a href={`/?scene=${encodeURIComponent(scene.id)}`} target="_blank" rel="noreferrer">ดูหน้าเว็บจริง ↗</a></nav></div>
        <div><button type="button" onClick={duplicateScene}>คัดลอกฉาก</button><button type="button" onClick={toggleArchive} disabled={scene.id === data.startSceneId}>{scene.archived ? 'คืนจากคลัง' : 'เก็บเข้าคลัง'}</button></div>
      </header>

      <div className="admin-tour-grid">
        <AdminTourSceneForm
          data={data}
          scene={scene}
          assets={assets}
          role={role}
          assetStatus={assetStatus}
          setAssets={setAssets}
          setAssetStatus={setAssetStatus}
          updateScene={updateScene}
        />
        <AdminTourHotspotPanel
          scene={scene}
          infoContentStatuses={infoContentStatuses}
          savedDraftInfoIds={savedDraftInfoIds}
          publishedInfoIds={publishedInfoIds}
          dirtyInfoHotspotIds={dirtyInfoHotspotIds}
          selectedInfoHotspotId={selectedInfoHotspotId}
          onSelectInfo={setSelectedInfoHotspotId}
          onPlaceInfo={placeHotspot}
          onUpdateInfo={updateInfoHotspot}
          onDeleteInfo={deleteInfoHotspot}
        />
      </div>

      <AdminTourValidation issues={issues} />
      <AdminTourActions
        data={data}
        parsed={parsed.success}
        issues={issues}
        draftVersion={draftVersion}
        publishedVersion={publishedVersion}
        role={role}
        saveAction={saveAction}
        saveState={saveState}
        saving={saving}
        publishAction={publishAction}
        publishState={publishState}
        publishing={publishing}
      />
      <AdminTourRevisions revisions={revisions} role={role} />
    </section>
  </div>;
}
