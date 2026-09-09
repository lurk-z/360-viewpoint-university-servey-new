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

const fitmCoworkingSampleRooms: TourSupplementalMediaGroup = {
  id: 'fitm-coworking-sample-rooms',
  title: { th: 'ห้องตัวอย่าง Co-working Space', en: 'Co-working Space sample rooms' },
  description: {
    th: 'ชมตัวอย่างห้อง SPARK ซึ่งมีทั้งหมด 6 ห้อง และห้อง SPARK Lab ซึ่งมีทั้งหมด 2 ห้อง ภายใน Co-working Space แบบ 360 องศา',
    en: 'Explore a sample of the six SPARK rooms and both SPARK Lab rooms inside the co-working space in 360 degrees.'
  },
  items: [
    {
      id: 'fitm-coworking-spark-sample',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-co-working-space-ex-spark.jpg'),
      floor: 1,
      title: { th: 'ห้อง SPARK ตัวอย่าง (มีทั้งหมด 6 ห้อง)', en: 'Sample SPARK room (6 rooms total)' }
    },
    {
      id: 'fitm-coworking-spark-lab-1',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-co-working-space-ex-spark-lab-1.jpg'),
      floor: 1,
      title: { th: 'ห้อง SPARK Lab ห้องที่ 1', en: 'SPARK Lab room 1' }
    },
    {
      id: 'fitm-coworking-spark-lab-2',
      kind: 'panorama',
      src: mediaUrl('temp-faculty-co-working-space-ex-spark-lab-2.jpg'),
      floor: 1,
      title: { th: 'ห้อง SPARK Lab ห้องที่ 2', en: 'SPARK Lab room 2' }
    }
  ]
};

const maleDormitoryRoomsAndFacilities: TourSupplementalMediaGroup = {
  id: 'male-dormitory-rooms-and-facilities',
  title: { th: 'ห้องพักและพื้นที่บริการตัวอย่าง', en: 'Sample room and shared facilities' },
  description: {
    th: 'ชมห้องพักตัวอย่าง ห้องน้ำ และพื้นที่ซักผ้าภายในหอพักนักศึกษาชายแบบ 360 องศา',
    en: 'Explore a sample room, restroom and laundry facilities inside the male student dormitory in 360 degrees.'
  },
  items: [
    {
      id: 'male-dormitory-sample-room-balcony',
      kind: 'panorama',
      src: mediaUrl('temp-male-dormitory-1-ex-room-balcony.jpg'),
      floor: 1,
      title: { th: 'ระเบียงห้องพักตัวอย่าง', en: 'Sample room balcony' }
    },
    {
      id: 'male-dormitory-sample-room-inside',
      kind: 'panorama',
      src: mediaUrl('temp-male-dormitory-1-ex-room-inside.jpg'),
      floor: 1,
      title: { th: 'ภายในห้องพักตัวอย่าง', en: 'Inside a sample room' }
    },
    {
      id: 'male-dormitory-restroom-and-laundry',
      kind: 'panorama',
      src: mediaUrl('temp-male-dormitory-laundry-area-bathroom-1.jpg'),
      floor: 1,
      title: { th: 'ห้องน้ำและพื้นที่ซักผ้า', en: 'Restroom and laundry area' }
    },
    {
      id: 'male-dormitory-laundry-machines',
      kind: 'panorama',
      src: mediaUrl('temp-male-dormitory-laundry-area-bathroom-2.jpg'),
      floor: 1,
      title: { th: 'พื้นที่เครื่องซักผ้า', en: 'Laundry machine area' }
    }
  ]
};

const femaleDormitory1RoomsAndFacilities: TourSupplementalMediaGroup = {
  id: 'female-dormitory-1-rooms-and-facilities',
  title: { th: 'ห้องพักและห้องน้ำตัวอย่าง', en: 'Sample room and restroom' },
  description: {
    th: 'ชมห้องพักแบบพัดลมและห้องน้ำภายในหอพักนักศึกษาหญิงหลังที่ 1 แบบ 360 องศา',
    en: 'Explore a sample fan room and restroom inside Female Dormitory 1 in 360 degrees.'
  },
  items: [
    {
      id: 'female-dormitory-1-sample-room-balcony',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-1-ex-room-balcony.jpg'),
      floor: 1,
      title: { th: 'ระเบียงห้องพักตัวอย่าง', en: 'Sample room balcony' }
    },
    {
      id: 'female-dormitory-1-sample-room-inside',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-1-ex-room-inside.jpg'),
      floor: 1,
      title: { th: 'ภายในห้องพักตัวอย่าง', en: 'Inside a sample room' }
    },
    {
      id: 'female-dormitory-1-restroom',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-1-women-restroom.jpg'),
      floor: 1,
      title: { th: 'ห้องน้ำหอพักหญิงหลังที่ 1', en: 'Female Dormitory 1 restroom' }
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
    },
    {
      id: 'female-dormitory-2-restroom',
      kind: 'panorama',
      src: mediaUrl('temp-female-dormitory-2-women-restroom.jpg'),
      floor: 1,
      title: { th: 'ห้องน้ำหอพักหญิงหลังที่ 2', en: 'Female Dormitory 2 restroom' }
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
  if (sceneId === 'fitmInterior7') return [fitmClassrooms, fitmCoworkingSampleRooms];
  if (sceneId.startsWith('fitmCoworkingSpace')) return [fitmCoworkingSampleRooms];
  if (isFitmInteriorScene(sceneId)) return [fitmClassrooms];
  if (sceneId === 'maleDormitory' || sceneId === 'maleDormitoryGroundFloorMinimart') {
    return [maleDormitoryRoomsAndFacilities, maleDormitoryFloorPlans];
  }
  if (sceneId === 'femaleDormitory1') return [femaleDormitory1RoomsAndFacilities, femaleDormitory1FloorPlans];
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
  fitmCoworkingSampleRooms,
  maleDormitoryRoomsAndFacilities,
  femaleDormitory1RoomsAndFacilities,
  femaleDormitory2Rooms,
  maleDormitoryFloorPlans,
  femaleDormitory1FloorPlans,
  femaleDormitory2FloorPlans
] as const satisfies readonly TourSupplementalMediaGroup[];
