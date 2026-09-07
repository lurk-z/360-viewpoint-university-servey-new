'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { TourStructureData, TourStructureScene } from '../../src/tour-structure';
import type { AdminTourAsset } from '../../src/server/tour-structure-repository';
import AdminPanoramaUploader from './AdminPanoramaUploader';

export default function AdminTourSceneForm({ data, scene, assets, role, assetStatus, setAssets, setAssetStatus, updateScene }: {
  readonly data: TourStructureData;
  readonly scene: TourStructureScene;
  readonly assets: readonly AdminTourAsset[];
  readonly role: 'admin' | 'editor';
  readonly assetStatus: string;
  readonly setAssets: Dispatch<SetStateAction<readonly AdminTourAsset[]>>;
  readonly setAssetStatus: (status: string) => void;
  readonly updateScene: (updater: (scene: TourStructureScene) => TourStructureScene) => void;
}) {
  const setLocalized = (key: 'title' | 'description', locale: 'th' | 'en', value: string): void => {
    updateScene((current) => ({ ...current, [key]: { ...current[key], [locale]: value } }));
  };
  const setInitial = (key: 'yaw' | 'pitch' | 'zoom', value: number): void => {
    updateScene((current) => ({ ...current, initialView: { ...current.initialView, [key]: value } }));
  };
  const setMap = (x: number, y: number): void => {
    updateScene((current) => ({ ...current, mapPosition: { x: Math.round(x), y: Math.round(y) } }));
  };

  return (
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
  );
}
