import { z } from 'zod';
import {
  fallbackTourMap,
  fallbackTourScenes,
  type TourScene
} from './tour-data.ts';

const localizedTextSchema = z.object({
  th: z.string().trim().min(1).max(12_000),
  en: z.string().trim().min(1).max(12_000)
});

const sceneIdSchema = z.string().trim().min(2).max(80)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, 'Scene ID must start with a letter and contain only letters, numbers, _ or -');
const hotspotIdSchema = z.string().trim().min(2).max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/, 'Hotspot ID may contain only letters, numbers, spaces, _ or -');
const panoramaUrlSchema = z.string().trim().refine(
  (value) => value.startsWith('/') || value.startsWith('https://') || value.startsWith('http://'),
  'Panorama must use a local path or an HTTP(S) URL'
);

const sceneHotspotSchema = z.object({
  id: hotspotIdSchema,
  type: z.literal('scene'),
  target: sceneIdSchema,
  yaw: z.number().finite().min(-360).max(360),
  pitch: z.number().finite().min(-90).max(90),
  direction: z.enum(['standard', 'up', 'down']).optional()
});

const infoHotspotSchema = z.object({
  id: hotspotIdSchema,
  type: z.literal('info'),
  yaw: z.number().finite().min(-360).max(360),
  pitch: z.number().finite().min(-90).max(90)
});

export const tourStructureSceneSchema = z.object({
  id: sceneIdSchema,
  archived: z.boolean().optional(),
  panorama: panoramaUrlSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
  tags: z.object({
    th: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
    en: z.array(z.string().trim().min(1).max(120)).min(1).max(20)
  }),
  initialView: z.object({
    yaw: z.number().finite().min(-360).max(360),
    pitch: z.number().finite().min(-90).max(90),
    zoom: z.number().finite().min(0).max(100)
  }),
  mapPosition: z.object({
    x: z.number().finite().min(0),
    y: z.number().finite().min(0)
  }),
  mapLandmark: z.boolean().optional(),
  hotspots: z.array(z.discriminatedUnion('type', [sceneHotspotSchema, infoHotspotSchema])).max(80)
});

export const tourStructureDataSchema = z.object({
  schemaVersion: z.literal(1),
  startSceneId: sceneIdSchema,
  map: z.object({
    image: panoramaUrlSchema,
    width: z.number().int().positive().max(20_000),
    height: z.number().int().positive().max(20_000)
  }),
  scenes: z.array(tourStructureSceneSchema).min(1).max(1_000)
}).superRefine((value, context) => {
  const sceneIds = new Set<string>();
  const hotspotIds = new Set<string>();
  value.scenes.forEach((scene, sceneIndex) => {
    if (sceneIds.has(scene.id)) {
      context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'id'], message: `Scene ID ซ้ำ: ${scene.id}` });
    }
    sceneIds.add(scene.id);
    if (scene.mapPosition.x > value.map.width || scene.mapPosition.y > value.map.height) {
      context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'mapPosition'], message: 'พิกัดอยู่นอกภาพแผนที่' });
    }
    scene.hotspots.forEach((hotspot, hotspotIndex) => {
      if (hotspotIds.has(hotspot.id)) {
        context.addIssue({
          code: 'custom',
          path: ['scenes', sceneIndex, 'hotspots', hotspotIndex, 'id'],
          message: `Hotspot ID ซ้ำ: ${hotspot.id}`
        });
      }
      hotspotIds.add(hotspot.id);
    });
  });
  if (!sceneIds.has(value.startSceneId)) {
    context.addIssue({ code: 'custom', path: ['startSceneId'], message: 'ไม่พบฉากเริ่มต้นในรายการฉาก' });
  }
  if (value.scenes.find((scene) => scene.id === value.startSceneId)?.archived) {
    context.addIssue({ code: 'custom', path: ['startSceneId'], message: 'ฉากเริ่มต้นต้องไม่ถูกเก็บเข้าคลัง' });
  }
  value.scenes.forEach((scene, sceneIndex) => {
    scene.hotspots.forEach((hotspot, hotspotIndex) => {
      if (hotspot.type === 'scene' && !sceneIds.has(hotspot.target)) {
        context.addIssue({
          code: 'custom',
          path: ['scenes', sceneIndex, 'hotspots', hotspotIndex, 'target'],
          message: `ไม่พบฉากปลายทาง ${hotspot.target}`
        });
      }
      if (hotspot.type === 'scene' && value.scenes.find((item) => item.id === hotspot.target)?.archived && !scene.archived) {
        context.addIssue({
          code: 'custom',
          path: ['scenes', sceneIndex, 'hotspots', hotspotIndex, 'target'],
          message: `ฉากปลายทาง ${hotspot.target} อยู่ในคลัง`
        });
      }
    });
  });
});

export type TourStructureData = z.infer<typeof tourStructureDataSchema>;
export type TourStructureScene = z.infer<typeof tourStructureSceneSchema>;

export interface TourStructureSnapshot {
  readonly version: number;
  readonly generatedAt: string;
  readonly source: 'database' | 'fallback';
  readonly data: TourStructureData;
}

export interface TourStructureIssue {
  readonly severity: 'error' | 'warning';
  readonly code: 'unreachable' | 'one-way' | 'missing-panorama' | 'invalid-structure';
  readonly message: string;
  readonly sceneId?: string;
  readonly hotspotId?: string;
}

function normalizeSignatureValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSignatureValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeSignatureValue(item)])
    );
  }
  return value;
}

function fnv1a(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * A deterministic, client-safe signature used to detect structure changes even
 * when a CLI sync or development overlay keeps the published version unchanged.
 */
export function getTourStructureDataSignature(data: TourStructureData): string {
  const normalized = JSON.stringify(normalizeSignatureValue(data));
  return `tour-v1-${fnv1a(normalized, 0x811c9dc5)}${fnv1a(normalized, 0x9e3779b9)}`;
}

export function createBootstrapTourStructureData(): TourStructureData {
  return tourStructureDataSchema.parse({
    schemaVersion: 1,
    startSceneId: fallbackTourScenes[0]?.id ?? 'entrance',
    map: { ...fallbackTourMap },
    scenes: fallbackTourScenes.map((scene) => ({
      id: scene.id,
      panorama: scene.panorama,
      title: { ...scene.title },
      description: { ...scene.description },
      tags: { th: [...scene.tags.th], en: [...scene.tags.en] },
      initialView: { ...scene.initialView },
      mapPosition: { ...scene.mapPosition },
      ...((scene as TourScene).mapLandmark === undefined
        ? {}
        : { mapLandmark: (scene as TourScene).mapLandmark }),
      hotspots: scene.hotspots.map((hotspot) => ({ ...hotspot }))
    }))
  });
}

export function createFallbackTourStructureSnapshot(): TourStructureSnapshot {
  return {
    version: 1,
    generatedAt: '1970-01-01T00:00:00.000Z',
    source: 'fallback',
    data: createBootstrapTourStructureData()
  };
}

export function analyzeTourStructure(data: TourStructureData): readonly TourStructureIssue[] {
  const issues: TourStructureIssue[] = [];
  const activeScenes = data.scenes.filter((scene) => !scene.archived);
  const scenes = new Map(activeScenes.map((scene) => [scene.id, scene]));
  const reachable = new Set<string>();
  const queue = [data.startSceneId];
  while (queue.length) {
    const sceneId = queue.shift();
    if (!sceneId || reachable.has(sceneId)) continue;
    reachable.add(sceneId);
    const scene = scenes.get(sceneId);
    scene?.hotspots.forEach((hotspot) => {
      if (hotspot.type === 'scene') queue.push(hotspot.target);
    });
  }

  activeScenes.forEach((scene) => {
    if (!reachable.has(scene.id)) {
      issues.push({ severity: 'error', code: 'unreachable', sceneId: scene.id, message: `ฉาก ${scene.id} เดินทางไปไม่ถึงจากฉากเริ่มต้น` });
    }
    scene.hotspots.forEach((hotspot) => {
      if (hotspot.type !== 'scene') return;
      const reverseExists = scenes.get(hotspot.target)?.hotspots.some((candidate) => (
        candidate.type === 'scene' && candidate.target === scene.id
      ));
      if (!reverseExists) {
        issues.push({
          severity: 'warning',
          code: 'one-way',
          sceneId: scene.id,
          hotspotId: hotspot.id,
          message: `เส้นทาง ${scene.id} → ${hotspot.target} ไม่มีลูกศรย้อนกลับ`
        });
      }
    });
  });
  return issues;
}

export function toRuntimeTourScenes(data: TourStructureData): readonly TourScene[] {
  return data.scenes.filter((scene) => !scene.archived) as unknown as readonly TourScene[];
}
