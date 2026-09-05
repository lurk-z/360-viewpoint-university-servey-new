import type { LocalizedText, SceneId } from './tour-data';

export type TourSupplementalMediaKind = 'panorama' | 'floor-plan';

export interface TourSupplementalMediaItem {
  readonly id: string;
  readonly kind: TourSupplementalMediaKind;
  readonly src: string;
  readonly floor: number;
  readonly title: LocalizedText;
}

export interface TourSupplementalMediaGroup {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly items: readonly TourSupplementalMediaItem[];
}

const ASSET_VERSION = '20260805-redacted';

function mediaUrl(fileName: string): string {
  return `/mainimages/${fileName}?v=${ASSET_VERSION}`;
}

const fitmClassrooms: TourSupplementalMediaGroup = {
  id: 'fitm-sample-classrooms',
  title: { th: 'ห้องเรียนตัวอย่าง', en: 'Sample classrooms' },
  description: {
    th: 'เลือกชั้นและห้องเพื่อชมบรรยากาศภายในห้องเรียนแบบ 360 องศา',
    en: 'Choose a floor and room to explore a sample classroom in 360 degrees.'
  },
  items: [
    {
      id: 'fitm-floor-2-sample-classroom-1',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-floor2-ex_room1.jpg'),
      floor: 2,
      title: { th: 'ห้องเรียนตัวอย่าง ชั้น 2 ห้องที่ 1', en: 'Floor 2 sample classroom 1' }
    },
    {
      id: 'fitm-floor-2-sample-classroom-2',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-floor2-ex_room2.jpg'),
      floor: 2,
      title: { th: 'ห้องเรียนตัวอย่าง ชั้น 2 ห้องที่ 2', en: 'Floor 2 sample classroom 2' }
    },
    {
      id: 'fitm-floor-3-sample-classroom-1',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-floor3-ex_room1.jpg'),
      floor: 3,
      title: { th: 'ห้องเรียนตัวอย่าง ชั้น 3 ห้องที่ 1', en: 'Floor 3 sample classroom 1' }
    },
    {
      id: 'fitm-floor-3-sample-classroom-2',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-floor3-ex_room2.jpg'),
      floor: 3,
      title: { th: 'ห้องเรียนตัวอย่าง ชั้น 3 ห้องที่ 2', en: 'Floor 3 sample classroom 2' }
    }
  ]
};

const femaleDormitory2Rooms: TourSupplementalMediaGroup = {
  id: 'female-dormitory-2-sample-rooms',
  title: { th: 'ห้องพักตัวอย่าง', en: 'Sample dormitory rooms' },
  description: {
    th: 'เลือกห้องเพื่อชมตัวอย่างห้องพักภายในหอพักนักศึกษาหญิงหลังที่ 2 แบบ 360 องศา',
    en: 'Choose a room to explore a sample room in Female Dormitory 2 in 360 degrees.'
  },
  items: [
    {
      id: 'female-dormitory-2-sample-room-1',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-2-ex-room1.jpg'),
      floor: 1,
      title: { th: 'ห้องพักตัวอย่าง ภายในห้อง', en: 'Sample room inside the room' }
    },
    {
      id: 'female-dormitory-2-sample-room-2',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-2-ex-room2.jpg'),
      floor: 1,
      title: { th: 'ห้องพักตัวอย่าง ภายนอกห้อง', en: 'Sample room, exterior view.' }
    }
  ]
};

function floorPlan(
  id: string,
  fileName: string,
  floor: number,
  titleTh: string,
  titleEn: string
): TourSupplementalMediaItem {
  return {
    id,
    kind: 'floor-plan',
    src: mediaUrl(fileName),
    floor,
    title: { th: titleTh, en: titleEn }
  };
}

const maleDormitoryFloorPlans: TourSupplementalMediaGroup = {
  id: 'male-dormitory-floor-plans',
  title: { th: 'ผังอาคารหอพักชาย', en: 'Male dormitory floor plans' },
  description: {
    th: 'เลือกชั้นเพื่อดูและซูมผังอาคารหอพักนักศึกษาชาย',
    en: 'Choose an available floor to view and zoom the male dormitory floor plan.'
  },
  items: [
    floorPlan('male-dormitory-floor-2', "temp-men's-dormitory-floor-2.png", 2, 'ผังหอพักชาย ชั้น 2', 'Male dormitory floor 2'),
    floorPlan('male-dormitory-floor-3', "temp-men's-dormitory-floor-3.png", 3, 'ผังหอพักชาย ชั้น 3', 'Male dormitory floor 3'),
    floorPlan('male-dormitory-floor-5', "temp-men's-dormitory-floor-5.png", 5, 'ผังหอพักชาย ชั้น 5', 'Male dormitory floor 5')
  ]
};

const femaleDormitory1FloorPlans: TourSupplementalMediaGroup = {
  id: 'female-dormitory-1-floor-plans',
  title: { th: 'ผังอาคารหอพักหญิงหลังที่ 1', en: 'Female Dormitory 1 floor plans' },
  description: {
    th: 'เลือกชั้นเพื่อดูและซูมผังอาคารหอพักนักศึกษาหญิงหลังที่ 1',
    en: 'Choose a floor to view and zoom the Female Dormitory 1 floor plan.'
  },
  items: Array.from({ length: 5 }, (_, index) => {
    const floor = index + 1;
    return floorPlan(
      `female-dormitory-1-floor-${floor}`,
      `temp-female-dormitory-1-floor-${floor}.jpeg`,
      floor,
      `ผังหอพักหญิงหลังที่ 1 ชั้น ${floor}`,
      `Female Dormitory 1 floor ${floor}`
    );
  })
};

const femaleDormitory2FloorPlans: TourSupplementalMediaGroup = {
  id: 'female-dormitory-2-floor-plans',
  title: { th: 'ผังอาคารหอพักหญิงหลังที่ 2', en: 'Female Dormitory 2 floor plans' },
  description: {
    th: 'เลือกชั้นเพื่อดูและซูมผังอาคารหอพักนักศึกษาหญิงหลังที่ 2',
    en: 'Choose a floor to view and zoom the Female Dormitory 2 floor plan.'
  },
  items: Array.from({ length: 5 }, (_, index) => {
    const floor = index + 1;
    return floorPlan(
      `female-dormitory-2-floor-${floor}`,
      `temp-female-dormitory-2-floor-${floor}.png`,
      floor,
      `ผังหอพักหญิงหลังที่ 2 ชั้น ${floor}`,
      `Female Dormitory 2 floor ${floor}`
    );
  })
};

function isFitmInteriorScene(sceneId: SceneId): boolean {
  return sceneId.startsWith('fitmInterior')
    || sceneId.startsWith('fitmFloor')
    || sceneId.startsWith('itiElectricalLab')
    || sceneId.startsWith('mechanicalLab')
    || sceneId === 'puangKhramRoom1'
    || sceneId === 'puangKhrangRoom2';
}

export function getTourSupplementalMediaGroups(sceneId: SceneId): readonly TourSupplementalMediaGroup[] {
  if (isFitmInteriorScene(sceneId)) return [fitmClassrooms];
  if (sceneId === 'maleDormitory') return [maleDormitoryFloorPlans];
  if (sceneId === 'femaleDormitory1') return [femaleDormitory1FloorPlans];
  if (sceneId === 'femaleDormitory2') return [femaleDormitory2Rooms, femaleDormitory2FloorPlans];
  return [];
}

export function getDefaultSupplementalMediaItemId(
  sceneId: SceneId,
  group: TourSupplementalMediaGroup
): string | undefined {
  const floorMatch = /^fitmFloor(\d)/.exec(sceneId);
  const currentFloor = floorMatch ? Number(floorMatch[1]) : undefined;
  return group.items.find((item) => item.floor === currentFloor)?.id ?? group.items[0]?.id;
}

export const tourSupplementalMediaGroups = [
  fitmClassrooms,
  femaleDormitory2Rooms,
  maleDormitoryFloorPlans,
  femaleDormitory1FloorPlans,
  femaleDormitory2FloorPlans
] as const satisfies readonly TourSupplementalMediaGroup[];
