import entrancePanorama from '../tour/pano/entrance.jpg?url';
import balconyPanorama from '../tour/pano/balcony.jpg?url';
import bicyclePanorama from '../tour/pano/bicycle.jpg?url';
import roomPanorama from '../tour/pano/room.jpg?url';
import entranceThumbnail from '../tour/thumbs/thumb-entrance.jpg?url';
import balconyThumbnail from '../tour/thumbs/thumb-balcony.jpg?url';
import bicycleThumbnail from '../tour/thumbs/thumb-bicycle.jpg?url';
import roomThumbnail from '../tour/thumbs/thumb-room.jpg?url';

export const locales = ['th', 'en'] as const;
export type Locale = (typeof locales)[number];

export const sceneIds = ['entrance', 'balcony', 'bicycle', 'room'] as const;
export type SceneId = (typeof sceneIds)[number];

export type LocalizedText = Readonly<Record<Locale, string>>;

export interface InitialView {
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
}

export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

interface HotspotBase {
  readonly id: string;
  readonly yaw: number;
  readonly pitch: number;
}

export interface SceneHotspot extends HotspotBase {
  readonly type: 'scene';
  readonly target: SceneId;
}

export interface InfoHotspot extends HotspotBase {
  readonly type: 'info';
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}

export type Hotspot = SceneHotspot | InfoHotspot;

export interface TourScene {
  readonly id: SceneId;
  readonly panorama: string;
  readonly thumbnail: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly tags: Readonly<Record<Locale, readonly string[]>>;
  readonly initialView: InitialView;
  readonly mapPosition: MapPosition;
  readonly hotspots: readonly Hotspot[];
}

export interface SceneEdge {
  readonly from: SceneId;
  readonly to: SceneId;
}

export const tourScenes = [
  {
    id: 'entrance',
    panorama: entrancePanorama,
    thumbnail: entranceThumbnail,
    title: {
      th: 'ทางเข้าอาคารคณะ',
      en: 'Faculty Entrance'
    },
    description: {
      th: 'โถงทางเดินหน้าอาคารคณะพร้อมประตูกระจกบานใหญ่ เปิดออกสู่ลานด้านนอกและเชื่อมต่อไปยังพื้นที่ต่าง ๆ ของคณะ',
      en: 'The faculty entrance corridor opens to the courtyard through large glass doors and connects visitors to the surrounding campus spaces.'
    },
    tags: {
      th: ['ทางเข้า', 'ประตูหลัก', 'โถงทางเดิน'],
      en: ['Entrance', 'Main door', 'Corridor']
    },
    initialView: { yaw: 118, pitch: -2, zoom: 22 },
    mapPosition: { x: 24, y: 26 },
    hotspots: [
      { id: 'entrance-to-balcony', type: 'scene', target: 'balcony', yaw: -30, pitch: -4 },
      { id: 'entrance-to-bicycle', type: 'scene', target: 'bicycle', yaw: 150, pitch: -6 },
      { id: 'entrance-to-room', type: 'scene', target: 'room', yaw: -95, pitch: -2 },
      {
        id: 'entrance-glass-door',
        type: 'info',
        yaw: 60,
        pitch: -2,
        title: { th: 'ประตูกระจกทางออก', en: 'Glass exit door' },
        description: {
          th: 'ประตูกระจกบานเลื่อนเชื่อมต่อระหว่างโถงภายในกับลานด้านนอกของอาคารคณะ',
          en: 'Sliding glass doors connect the interior hall to the outdoor faculty courtyard.'
        }
      }
    ]
  },
  {
    id: 'balcony',
    panorama: balconyPanorama,
    thumbnail: balconyThumbnail,
    title: {
      th: 'ระเบียงและบันได',
      en: 'Walkway & Stairway'
    },
    description: {
      th: 'ระเบียงทางเดินพร้อมบันไดเชื่อมระหว่างชั้น ราวระแนงเปิดรับแสงธรรมชาติและมองเห็นอาคารข้างเคียงภายในวิทยาเขต',
      en: 'A balcony walkway and stairway link the floors, with open slatted rails framing natural light and views across the campus.'
    },
    tags: {
      th: ['ระเบียง', 'บันได', 'เชื่อมชั้น'],
      en: ['Balcony', 'Stairs', 'Between floors']
    },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 76, y: 26 },
    hotspots: [
      { id: 'balcony-to-entrance', type: 'scene', target: 'entrance', yaw: 170, pitch: -4 },
      { id: 'balcony-to-bicycle', type: 'scene', target: 'bicycle', yaw: 70, pitch: -6 },
      {
        id: 'balcony-wooden-screen',
        type: 'info',
        yaw: -60,
        pitch: 0,
        title: { th: 'ราวระแนงไม้', en: 'Wooden screen railing' },
        description: {
          th: 'ราวกันตกแบบระแนงแนวนอนช่วยระบายอากาศและเปิดให้แสงธรรมชาติส่องผ่าน',
          en: 'Horizontal slats provide a safety barrier while allowing airflow and natural light through.'
        }
      }
    ]
  },
  {
    id: 'bicycle',
    panorama: bicyclePanorama,
    thumbnail: bicycleThumbnail,
    title: {
      th: 'ลานจอดจักรยาน',
      en: 'Bicycle Parking'
    },
    description: {
      th: 'พื้นที่จอดจักรยานใต้หลังคาริมอาคาร อยู่ใกล้ทางเดินหลักและให้บริการนักศึกษาและบุคลากรที่เดินทางด้วยจักรยาน',
      en: 'A covered bicycle parking area beside the main walkway serves students and staff who commute by bicycle.'
    },
    tags: {
      th: ['ที่จอด', 'จักรยาน', 'กึ่งกลางแจ้ง'],
      en: ['Parking', 'Bicycle', 'Semi-outdoor']
    },
    initialView: { yaw: 90, pitch: -4, zoom: 22 },
    mapPosition: { x: 24, y: 76 },
    hotspots: [
      { id: 'bicycle-to-entrance', type: 'scene', target: 'entrance', yaw: -110, pitch: -4 },
      { id: 'bicycle-to-balcony', type: 'scene', target: 'balcony', yaw: 200, pitch: -4 },
      {
        id: 'bicycle-racks',
        type: 'info',
        yaw: 20,
        pitch: -2,
        title: { th: 'จุดจอดจักรยานนักศึกษา', en: 'Student bicycle racks' },
        description: {
          th: 'ราวจอดจักรยานมีหลังคาคลุมเพื่อช่วยป้องกันแดดและฝน รองรับการเดินทางที่เป็นมิตรต่อสิ่งแวดล้อม',
          en: 'Sheltered bicycle racks offer protection from sun and rain while supporting lower-impact travel.'
        }
      }
    ]
  },
  {
    id: 'room',
    panorama: roomPanorama,
    thumbnail: roomThumbnail,
    title: {
      th: 'พื้นที่ภายในอาคาร',
      en: 'Indoor Space'
    },
    description: {
      th: 'พื้นที่ภายในอาคารสำหรับจัดเก็บอุปกรณ์และทำงาน แสดงตัวอย่างการใช้งานพื้นที่จริงภายในวิทยาเขต',
      en: 'An indoor work and storage area showing an example of how campus spaces are used day to day.'
    },
    tags: {
      th: ['ภายใน', 'พื้นที่ทำงาน', 'จัดเก็บ'],
      en: ['Indoor', 'Workspace', 'Storage']
    },
    initialView: { yaw: 0, pitch: 0, zoom: 22 },
    mapPosition: { x: 76, y: 76 },
    hotspots: [
      { id: 'room-to-entrance', type: 'scene', target: 'entrance', yaw: 0, pitch: 0 },
      {
        id: 'room-storage',
        type: 'info',
        yaw: 120,
        pitch: 0,
        title: { th: 'พื้นที่จัดเก็บ', en: 'Storage area' },
        description: {
          th: 'มุมจัดเก็บอุปกรณ์และเครื่องใช้ภายในอาคาร สะท้อนการใช้งานพื้นที่ของคณะ',
          en: 'A corner used to store equipment and supplies for everyday faculty activities.'
        }
      }
    ]
  }
] as const satisfies readonly TourScene[];

const sceneById = new Map<SceneId, TourScene>(tourScenes.map((scene) => [scene.id, scene]));

export function getScene(id: SceneId): TourScene {
  const scene = sceneById.get(id);
  if (!scene) {
    throw new Error(`Unknown scene: ${id}`);
  }
  return scene;
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function getNavigationHotspots(scene: TourScene): readonly SceneHotspot[] {
  return scene.hotspots.filter((hotspot): hotspot is SceneHotspot => hotspot.type === 'scene');
}

export function getInfoHotspots(scene: TourScene): readonly InfoHotspot[] {
  return scene.hotspots.filter((hotspot): hotspot is InfoHotspot => hotspot.type === 'info');
}

export function getSceneEdges(): readonly SceneEdge[] {
  const seen = new Set<string>();
  const edges: SceneEdge[] = [];

  for (const scene of tourScenes) {
    for (const hotspot of getNavigationHotspots(scene)) {
      const pair = [scene.id, hotspot.target].sort().join(':');
      if (!seen.has(pair)) {
        seen.add(pair);
        edges.push({ from: scene.id, to: hotspot.target });
      }
    }
  }

  return edges;
}

export function validateTour(): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<SceneId>();
  const hotspotIds = new Set<string>();

  for (const scene of tourScenes) {
    if (ids.has(scene.id)) {
      errors.push(`Duplicate scene id: ${scene.id}`);
    }
    ids.add(scene.id);

    if (!scene.panorama || !scene.thumbnail) {
      errors.push(`Scene ${scene.id} is missing media`);
    }

    for (const locale of locales) {
      const tags: readonly string[] = scene.tags[locale];
      if (!scene.title[locale] || !scene.description[locale] || tags.length === 0) {
        errors.push(`Scene ${scene.id} is missing ${locale} content`);
      }
    }

    for (const hotspot of scene.hotspots) {
      if (hotspotIds.has(hotspot.id)) {
        errors.push(`Duplicate hotspot id: ${hotspot.id}`);
      }
      hotspotIds.add(hotspot.id);

      if (hotspot.type === 'scene' && !sceneIds.includes(hotspot.target)) {
        errors.push(`Scene ${scene.id} links to missing scene ${hotspot.target}`);
      }
    }
  }

  const reachable = new Set<SceneId>();
  const queue: SceneId[] = [sceneIds[0]];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    for (const hotspot of getNavigationHotspots(getScene(id))) {
      queue.push(hotspot.target);
    }
  }

  for (const id of sceneIds) {
    if (!reachable.has(id)) errors.push(`Scene ${id} is not reachable`);
  }

  return errors;
}
