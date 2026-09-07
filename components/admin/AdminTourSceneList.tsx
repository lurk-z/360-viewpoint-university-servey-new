'use client';

import type { ChangeEvent } from 'react';
import type { TourStructureScene } from '../../src/tour-structure';

export default function AdminTourSceneList({ scenes, selectedId, query, onQueryChange, onSelect, onAdd, onImport }: {
  readonly scenes: readonly TourStructureScene[];
  readonly selectedId: string;
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onSelect: (sceneId: string) => void;
  readonly onAdd: () => void;
  readonly onImport: (file: File) => void;
}) {
  const needle = query.trim().toLowerCase();
  const filteredScenes = scenes.filter((scene) => !needle || `${scene.id} ${scene.title.th} ${scene.title.en}`.toLowerCase().includes(needle));
  const handleImport = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = '';
  };

  return (
    <aside className="admin-tour-scenes">
      <header><strong>ฉากทั้งหมด {scenes.length}</strong><button type="button" onClick={onAdd}>+ เพิ่มฉาก</button></header>
      <label className="admin-tour-scene-import">นำเข้า Scene JSON<input hidden type="file" accept="application/json,.json" onChange={handleImport} /></label>
      <input type="search" placeholder="ค้นหาชื่อหรือ Scene ID" value={query} onChange={(event) => onQueryChange(event.target.value)} />
      <div>{filteredScenes.map((scene) => <button type="button" key={scene.id}
        className={scene.id === selectedId ? 'is-active' : ''} onClick={() => onSelect(scene.id)}>
        <span>{scene.title.th}</span><small>{scene.id}{scene.archived ? ' · ในคลัง' : ''}</small>
      </button>)}</div>
    </aside>
  );
}
