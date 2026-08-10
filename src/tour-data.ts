export interface SceneMedia {
  /** Original 7680×3840 equirectangular image loaded directly by the viewer. */
  readonly panorama: string;
}

/**
 * Files inside public/mainimages are served from /mainimages.
 * Pass only the file name here; never include the public directory in a URL.
 */
function mainImage(fileName: string): string {
  return `/mainimages/${fileName}`;
}

const PANORAMA_ASSET_VERSION = '20260805-redacted';

function mainPanorama(fileName: string): SceneMedia {
  return { panorama: `${mainImage(fileName)}?v=${PANORAMA_ASSET_VERSION}` };
}

export const tourMap = {
  image: mainImage('map/mainmap1.png'),
  width: 1096,
  height: 583
} as const;

//เพิ่มรูป
export const tourMedia = {
  entrance: mainPanorama('temp1.jpg'),
  entranceRoad: mainPanorama('temp1-2.jpg'),
  memorialPlaza: mainPanorama('temp1-3.jpg'),
  memorial: mainPanorama('temp1-3-1.jpg'),
  campusRoad1: mainPanorama('temp1-4.jpg'),
  vallayaHotel: mainPanorama('temp1-4-1.jpg'),
  campusRoad2: mainPanorama('temp1-4.5.jpg'),
  campusRoad3: mainPanorama('temp1-4.9.jpg'),
  campusRoad4: mainPanorama('temp1-5.jpg'),
  campusBuilding1: mainPanorama('temp1-5-1.jpg'),
  campusBuilding2: mainPanorama('temp1-5-2.jpg'),
  campusRoad5: mainPanorama('temp2-1.jpg'),
  campusRoad6: mainPanorama('temp2-2.jpg'),
  campusRoad7: mainPanorama('temp2-3.jpg'),
  campusBuilding3: mainPanorama('temp2-4.jpg'),
  campusRoad8: mainPanorama('temp3-1.jpg'),
  campusRoad9: mainPanorama('temp3-2.jpg'),
  campusRoad10: mainPanorama('temp3-3.jpg'),
  campusRoad11: mainPanorama('temp3-4.jpg'),
  campusRoad12: mainPanorama('temp3-5.jpg'),
  campusRoad13: mainPanorama('temp3-6.jpg'),
  campusRoad14: mainPanorama('temp3-7.jpg'),
  campusRoad15: mainPanorama('temp3-8.jpg'),
  campusRoad16: mainPanorama('temp3-9.jpg'),
  campusRoad17: mainPanorama('temp3-10.jpg'),
  campusRoad27: mainPanorama('temp4-1.jpg'),
  campusRoad18: mainPanorama('temp4-2.jpg'),
  campusRoad19: mainPanorama('temp4-3.jpg'),
  campusRoad20: mainPanorama('temp4-4.jpg'),
  campusRoad21: mainPanorama('temp4-5.jpg'),
  campusRoad22: mainPanorama('temp4-6.jpg'),
  campusRoad23: mainPanorama('temp5-1.jpg'),
  campusRoad24: mainPanorama('temp5-2.jpg'),
  campusRoad25: mainPanorama('temp5-3.jpg'),
  campusRoad26: mainPanorama('temp5-4.jpg'),
  campusRoad28: mainPanorama('temp6-1.jpg'),
  campusRoad29: mainPanorama('temp6-2.jpg'),
  campusRoad30: mainPanorama('temp6-3.jpg'),
  campusRoad31: mainPanorama('temp6-4.jpg'),
  campusRoad32: mainPanorama('temp6-5.jpg'),
  campusRoad33: mainPanorama('temp6-6.jpg'),
  campusRoad34: mainPanorama('temp6-7.jpg'),
  campusRoad35: mainPanorama('temp6-8.jpg'),
  campusRoad36: mainPanorama('temp6-9.jpg'),
  campusRoad37: mainPanorama('temp6-10.jpg'),
  universityCafeteria: mainPanorama('temp6-University_cafeteria.jpg'),
  campusRoad38: mainPanorama('temp7-1.jpg'),
  campusRoad39: mainPanorama('temp7-2.jpg'),
  campusRoad40: mainPanorama('temp7-3.jpg'),
  campusRoad41: mainPanorama('temp7-4.jpg'),
  campusRoad42: mainPanorama('temp7-5.jpg'),
  campusRoad43: mainPanorama('temp7-6.jpg'),
  multipurposeGym: mainPanorama('temp9-1.jpg'),
  campusRoad44: mainPanorama('temp9-2.jpg'),
  campusRoad45: mainPanorama('temp9-3.jpg'),
  campusRoad46: mainPanorama('temp9-3-1.jpg'),
  campusRoad47: mainPanorama('temp9-4.jpg'),
  campusRoad48: mainPanorama('temp9-5.jpg'),
  campusRoad49: mainPanorama('temp9-6.jpg'),
  campusRoad50: mainPanorama('temp9-7.jpg')
} as const satisfies Record<string, SceneMedia>;

export const locales = ['th', 'en'] as const;
export type Locale = (typeof locales)[number];

export type SceneId = keyof typeof tourMedia;
export const sceneIds: readonly SceneId[] = Object.keys(tourMedia) as SceneId[];

export type LocalizedText = Readonly<Record<Locale, string>>;

export interface InitialView {
  /** Degrees. Numeric values are converted to a `deg` string at the viewer boundary. */
  readonly yaw: number;
  /** Degrees. Numeric values are converted to a `deg` string at the viewer boundary. */
  readonly pitch: number;
  readonly zoom: number;
}

export interface MapPosition {
  /** Horizontal pixel coordinate on tourMap.image. */
  readonly x: number;
  /** Vertical pixel coordinate from the top of tourMap.image. */
  readonly y: number;
}

interface HotspotBase {
  /** Degrees. */
  readonly yaw: number;
  /** Degrees. */
  readonly pitch: number;
  readonly id: string;
}

export interface SceneHotspot extends HotspotBase {
  readonly type: 'scene';
  readonly target: SceneId;
}

export interface InfoImage {
  readonly src: string;
  readonly alt: LocalizedText;
  readonly caption?: LocalizedText;
}

export interface InfoReference {
  readonly label: LocalizedText;
  /** Optional source page. Only HTTP and HTTPS URLs are accepted by validation. */
  readonly url?: string;
}

/** Structural Info point stored with tour geometry. Presentation is resolved from CMS content. */
export interface InfoHotspotDefinition extends HotspotBase {
  readonly type: 'info';
}

/** Complete Info point passed to viewer components after CMS/fallback resolution. */
export interface InfoHotspot extends InfoHotspotDefinition {
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly reference: InfoReference;
  readonly images: readonly InfoImage[];
}

export type Hotspot = SceneHotspot | InfoHotspotDefinition;

export interface TourScene {
  readonly id: SceneId;
  readonly panorama: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly tags: Readonly<Record<Locale, readonly string[]>>;
  readonly initialView: InitialView;
  readonly mapPosition: MapPosition;
  /** Shows this scene as a named destination marker on the map. */
  readonly mapLandmark?: boolean;
  readonly hotspots: readonly Hotspot[];
}

export interface SceneEdge {
  readonly from: SceneId;
  readonly to: SceneId;
}

/** Converts the degree values stored in tour data to Photo Sphere Viewer angle syntax. */
export function toDegrees(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid angle: ${value}`);
  }
  return `${Object.is(value, -0) ? 0 : value}deg`;
}

export function getSceneAssetUrls(scene: TourScene): readonly string[] {
  return [scene.panorama];
}

export const tourScenes = [
  {
    id: 'entrance',
    ...tourMedia.entrance,
    title: { th: 'ลานหน้ามหาวิทยาลัย', en: 'University Front Plaza' },
    description: {
      th: 'จุดต้อนรับบริเวณป้าย KMUTNB ด้านหน้ามหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี',
      en: 'The KMUTNB landmark welcomes visitors at the front of the Prachinburi campus.'
    },
    tags: { th: ['ทางเข้า', 'ป้ายมหาวิทยาลัย', 'กลางแจ้ง'], en: ['Entrance', 'Landmark', 'Outdoor'] },
    initialView: { yaw: 0, pitch: 0, zoom: 22 },
    mapPosition: { x: 939, y: 217 },
    mapLandmark: true,
    hotspots: [
      { id: 'entrance-to-road', type: 'scene', target: 'entranceRoad', yaw: -40, pitch: -3 },
      
      {
        id: 'entrance-landmark-info',
        type: 'info',
        yaw: 10,
        pitch: 1
      }
    ]
  },
  {
    id: 'entranceRoad',
    ...tourMedia.entranceRoad,
    title: { th: 'ถนนบริเวณประตูทางเข้า', en: 'Entrance Road' },
    description: {
      th: 'ถนนและพื้นที่หน้าประตูมหาวิทยาลัยซึ่งเชื่อมต่อจากจุดต้อนรับเข้าสู่ถนนภายในวิทยาเขต',
      en: 'The road by the campus gate connects the front landmark to the internal campus route.'
    },
    tags: { th: ['ถนน', 'ประตูทางเข้า', 'เส้นทาง'], en: ['Road', 'Gate', 'Route'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 933, y: 217 },
    hotspots: [
      { id: 'road-to-entrance', type: 'scene', target: 'entrance', yaw: 200, pitch: 1 },
      { id: 'road-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: -50, pitch: -2 },
      { id: 'bus-landmark-info', type: 'info', yaw: 130, pitch: 1 }
    ]
  },
  {
    id: 'memorialPlaza',
    ...tourMedia.memorialPlaza,
    title: { th: 'หน้าลานอนุสรณ์ ราชกาลที่4', en: 'In front of the King Rama IV Memorial Plaza.' },
    description: {
      th: 'พื้นที่ลานกลางแจ้งและสวนริมถนนภายในวิทยาเขต เชื่อมต่อไปยังอนุสรณ์และเส้นทางส่วนถัดไป',
      en: 'An open plaza and garden beside the campus road, connecting to the memorial and the next route segment.'
    },
    tags: { th: ['ลาน', 'สวน', 'อนุสรณ์'], en: ['Plaza', 'Garden', 'Memorial'] },
    initialView: { yaw: 0, pitch: -1, zoom: 22 },
    mapPosition: { x: 904, y: 229 },
    hotspots: [
      { id: 'plaza-to-road', type: 'scene', target: 'entranceRoad', yaw: 175, pitch: -2 },
      { id: 'plaza-to-memorial', type: 'scene', target: 'memorial', yaw: -55, pitch: -2 },
      { id: 'plaza-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 0, pitch: -8 }
    ]
  },
  {
    id: 'memorial',
    ...tourMedia.memorial,
    title: { th: 'ลานอนุสรณ์ ราชกาลที่4', en: 'King Rama IV Memorial Plaza' },
    description: {
      th: 'จุดอนุสรณ์ในพื้นที่ลานกลางแจ้งของวิทยาเขต เป็นจุดแยกจากเส้นทางหลักและสามารถย้อนกลับไปยังลานได้',
      en: 'A campus memorial in the open plaza, reached from and connected back to the main route.'
    },
    tags: { th: ['อนุสรณ์', 'จุดสำคัญ', 'กลางแจ้ง'], en: ['Memorial', 'Landmark', 'Outdoor'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 903, y: 242 },
    mapLandmark: true,
    hotspots: [
      { id: 'memorial-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 120, pitch: 0 },
      {
        id: 'memorial-info',
        type: 'info',
        yaw: 0,
        pitch: 5
      }
    ]
  },
  {
    id: 'campusRoad1',
    ...tourMedia.campusRoad1,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 1', en: 'Campus Road Point 1' },
    description: {
      th: 'จุดเริ่มต้นของเส้นทางถนนภายในวิทยาเขต พร้อมทางแยกไปยังอาคารบริการที่อยู่ใกล้เคียง',
      en: 'The first internal road point, with a nearby branch to a campus service building.'
    },
    tags: { th: ['ถนน', 'ทางเดิน', 'จุดที่ 1'], en: ['Road', 'Walkway', 'Point 1'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 886, y: 242 },
    hotspots: [
      { id: 'campus-road-1-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 180, pitch: -2 },
      { id: 'campus-road-1-to-road-2', type: 'scene', target: 'campusRoad2', yaw: 10, pitch: -2 }
    ]
  },
  {
    id: 'vallayaHotel',
    ...tourMedia.vallayaHotel,
    title: { th: 'โรงแรมวิลลาวิชาลัย', en: 'Villa Wichalai Hotel' },
    description: {
      th: 'อาคารปฏิบัติการการท่องเที่ยวและโรงแรม โรงแรมวิลลาวิชาลัย',
      en: 'Tourism and Hotel Training Facility – Villa Wichalai Hotel'
    },
    tags: { th: ['โรงแรม', 'อาคาร', 'จุดบริการ'], en: ['Hotel', 'Building', 'Service'] },
    initialView: { yaw: 0, pitch: 1, zoom: 24 },
    mapPosition: { x: 841, y: 285 },
    mapLandmark: true,
    hotspots: [
      { id: 'hotel-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 180, pitch: -2 },
      {
        id: 'hotel-info',
        type: 'info',
        yaw: 0,
        pitch: 4
      }
    ]
  },
  {
    id: 'campusRoad2',
    ...tourMedia.campusRoad2,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 2', en: 'Campus Road Point 2' },
    description: {
      th: 'ทางเดินและถนนภายในมหาวิทยาลัยที่เชื่อมต่อระหว่างกลุ่มอาคารและพื้นที่สีเขียว',
      en: 'A campus road and walkway connecting nearby buildings and green spaces.'
    },
    tags: { th: ['ถนน', 'ทางเดิน', 'จุดที่ 2'], en: ['Road', 'Walkway', 'Point 2'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 850, y: 264 },
    hotspots: [
      { id: 'campus-road-2-to-road-1', type: 'scene', target: 'campusRoad1', yaw: 180, pitch: -2 },
      { id: 'campus-road-2-to-hotel', type: 'scene', target: 'vallayaHotel', yaw: -50, pitch: -2 },
      { id: 'campus-road-2-to-road-3', type: 'scene', target: 'campusRoad3', yaw: 10, pitch: -5 }
    ]
  },
  {
    id: 'campusRoad3',
    ...tourMedia.campusRoad3,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 3', en: 'Campus Road Point 3' },
    description: {
      th: 'จุดถนนหน้าอาคารและแนวต้นไม้ในวิทยาเขต เชื่อมต่อเส้นทางไปยังพื้นที่ส่วนถัดไป',
      en: 'A tree-lined road point near campus buildings leading to the next part of the route.'
    },
    tags: { th: ['ถนน', 'อาคาร', 'จุดที่ 3'], en: ['Road', 'Buildings', 'Point 3'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 813, y: 287 },
    hotspots: [
      { id: 'campus-road-3-to-road-2', type: 'scene', target: 'campusRoad2', yaw: 190, pitch: -2 },
      { id: 'campus-road-3-to-road-4', type: 'scene', target: 'campusRoad4', yaw: 13, pitch: -5 },
      { id: 'campus-road-3-to-building-1', type: 'scene', target: 'campusBuilding1', yaw: -60, pitch: -2 },
    ]
  },
  {
    id: 'campusRoad4',
    ...tourMedia.campusRoad4,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 4', en: 'Campus Road Point 4' },
    description: {
      th: 'ถนนบริเวณกลุ่มอาคารภายในวิทยาเขต มีทางแยกไปยังอาคารใกล้เคียงสองจุด',
      en: 'A road point in the campus building zone with branches to two nearby buildings.'
    },
    tags: { th: ['ถนน', 'ทางแยก', 'จุดที่ 4'], en: ['Road', 'Junction', 'Point 4'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 797, y: 296 },
    hotspots: [
      { id: 'campus-road-4-to-road-3', type: 'scene', target: 'campusRoad3', yaw: 180, pitch: -2 },
      { id: 'campus-road-4-to-building-1', type: 'scene', target: 'campusBuilding1', yaw: -80, pitch: -2 },
      { id: 'campus-road-4-to-building-2', type: 'scene', target: 'campusBuilding2', yaw: -60, pitch: -2 },
      { id: 'campus-road-4-to-road-5', type: 'scene', target: 'campusRoad5', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusBuilding1',
    ...tourMedia.campusBuilding1,
    title: { th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ', en: 'Faculty of Business Administration and Industrial Services' },
    description: {
      th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.) ได้รับการยกฐานะขึ้นเป็นส่วนงานใหม่เทียบเท่าคณะ',
      en: 'The Faculty of Business Administration and Service Industries at King Mongkut\'s University of Technology North Bangkok (KMUTNB) has been elevated to the status of a new organizational unit equivalent to a faculty.'
    },
    tags: { th: ['อาคาร', 'พื้นที่เรียน', 'จุดที่ 1'], en: ['Building', 'Academic', 'Point 1'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 818, y: 293 },
    mapLandmark: true,
    hotspots: [
      { id: 'building-1-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -2 },
      { id: 'building-1-to-building-2', type: 'scene', target: 'campusBuilding2', yaw: 90 ,pitch: 0 },
      {
        id: 'building-1-info',
        type: 'info',
        yaw: 0,
        pitch: 5
      }
    ]
  },
  {
    id: 'campusBuilding2',
    ...tourMedia.campusBuilding2,
    title: { th: 'อุทยานเทคโนโลยี มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', en: 'KMUTNB Techno Park' },
    description: {
      th: 'เป็นศูนย์รวมประสานงานการให้บริการวิชาการ งานวิจัยระดับสูง และพัฒนานวัตกรรมเพื่ออุตสาหกรรมที่มหาวิทยาลัยมีความเชี่ยวชาญเฉพาะด',
      en: 'It serves as a coordination hub for academic services, advanced research, and industrial innovation development in areas where the university possesses specialized expertise.'
    },
    tags: { th: ['อาคาร', 'พื้นที่เรียน', 'จุดที่ 2'], en: ['Building', 'Academic', 'Point 2'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 789, y: 311 },
    mapLandmark: true,
    hotspots: [
      { id: 'building-2-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -2 },
      {
        id: 'building-2-info',
        type: 'info',
        yaw: 0,
        pitch: 5
      }
    ]
  },
  {
    id: 'campusRoad5',
    ...tourMedia.campusRoad5,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 5', en: 'Campus Road Point 5' },
    description: {
      th: 'จุดข้ามถนนและทางเดินในช่วงถัดไปของเส้นทางทัวร์ภายในมหาวิทยาลัย',
      en: 'A crossing and walkway on the next section of the internal campus tour route.'
    },
    tags: { th: ['ถนน', 'ทางข้าม', 'จุดที่ 5'], en: ['Road', 'Crossing', 'Point 5'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 784, y: 303 },
    hotspots: [
      { id: 'campus-road-5-to-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -2 },
      { id: 'campus-road-to-building-2', type: 'scene', target: 'campusBuilding2', yaw: -70 ,pitch: 0 },
      { id: 'campus-road-5-to-road-6', type: 'scene', target: 'campusRoad6', yaw: 5, pitch: -2 }
    ]
  },
  {
    id: 'campusRoad6',
    ...tourMedia.campusRoad6,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 6', en: 'Campus Road Point 6' },
    description: {
      th: 'ช่วงถนนโค้งและพื้นที่สีเขียวซึ่งเชื่อมต่อไปยังกลุ่มอาคารปลายเส้นทาง',
      en: 'A curved road and green area leading toward the buildings at the end of the route.'
    },
    tags: { th: ['ถนน', 'พื้นที่สีเขียว', 'จุดที่ 6'], en: ['Road', 'Green space', 'Point 6'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 763, y: 316 },
    hotspots: [
      { id: 'campus-road-6-to-road-5', type: 'scene', target: 'campusRoad5', yaw: 150, pitch: 0 },
      { id: 'campus-road-6-to-road-7', type: 'scene', target: 'campusRoad7', yaw: -10, pitch: -2 }
    ]
  },
  {
    id: 'campusRoad7',
    ...tourMedia.campusRoad7,
    title: { th: 'ถนนภายในวิทยาเขต จุดที่ 7', en: 'Campus Road Point 7' },
    description: {
      th: 'ทางแยกบริเวณอาคารปลายเส้นทาง เชื่อมต่อไปยังจุดอาคารสำหรับเยี่ยมชม',
      en: 'A junction near the end of the route, connecting to the final campus building.'
    },
    tags: { th: ['ถนน', 'ทางแยก', 'จุดที่ 7'], en: ['Road', 'Junction', 'Point 7'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 692, y: 299 },
    hotspots: [
      { id: 'campus-road-7-to-road-6', type: 'scene', target: 'campusRoad6', yaw: 180, pitch: -3 },
      { id: 'campus-road-7-to-building-3', type: 'scene', target: 'campusBuilding3', yaw: -45, pitch: -2 },
      { id: 'campus-road-7-to-campus-road-8', type: 'scene', target: 'campusRoad8', yaw: 0, pitch: -3 },
    ]
  },
  {
    id: 'campusBuilding3',
    ...tourMedia.campusBuilding3,
    title: { th: 'อาคารหอประชุมเเละกิจการนักศึกษา', en: 'Auditorium and Student Affairs Building' },
    description: {
      th: 'อาคารหอประชุมเเละกิจการนักศึกษา เป็นอาคารที่ทำกิจการต่างๆภายใน',
      en: 'The Auditorium and Student Affairs Building is a building that houses various activities within the organization.'
    },
    tags: { th: ['อาคาร', 'ลาน', 'จุดที่ 3'], en: ['Building', 'Forecourt', 'Point 3'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 671, y: 315 },
    mapLandmark: true,
    hotspots: [
      { id: 'building-3-to-campus-road-7', type: 'scene', target: 'campusRoad7', yaw: 180, pitch: -3 },
      {
        id: 'building-3-info',
        type: 'info',
        yaw: 0,
        pitch: 5
      }
    ]
  },
  {
    id: 'campusRoad8',
    ...tourMedia.campusRoad8,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 8', en: 'Campus Route Point 8' },
    description: {
      th: 'จุดที่ 8 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจากอาคารหอประชุมและกิจการนักศึกษาไปยังจุดถัดไป',
      en: 'Point 8 on the continuing campus route, connecting the auditorium and student affairs building to the next point.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 8'], en: ['Route', 'Outdoor', 'Point 8'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 665, y: 283 },
    hotspots: [
      { id: 'campus-road-8-to-building-3', type: 'scene', target: 'campusBuilding3', yaw: 180, pitch: -3 },
      { id: 'campus-road-8-to-road-9', type: 'scene', target: 'campusRoad9', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad9',
    ...tourMedia.campusRoad9,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 9', en: 'Campus Route Point 9' },
    description: {
      th: 'จุดที่ 9 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 9 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 9'], en: ['Route', 'Outdoor', 'Point 9'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 623, y: 259 },
    hotspots: [
      { id: 'campus-road-9-to-road-8', type: 'scene', target: 'campusRoad8', yaw: 180, pitch: -3 },
      { id: 'campus-road-9-to-road-10', type: 'scene', target: 'campusRoad10', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad10',
    ...tourMedia.campusRoad10,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 10', en: 'Campus Route Point 10' },
    description: {
      th: 'จุดที่ 10 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 10 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 10'], en: ['Route', 'Outdoor', 'Point 10'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 575, y: 233 },
    hotspots: [
      { id: 'campus-road-10-to-road-9', type: 'scene', target: 'campusRoad9', yaw: 180, pitch: -3 },
      { id: 'campus-road-10-to-road-11', type: 'scene', target: 'campusRoad11', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad11',
    ...tourMedia.campusRoad11,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 11', en: 'Campus Route Point 11' },
    description: {
      th: 'จุดที่ 11 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 11 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 11'], en: ['Route', 'Outdoor', 'Point 11'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 538, y: 231 },
    hotspots: [
      { id: 'campus-road-11-to-road-10', type: 'scene', target: 'campusRoad10', yaw: 180, pitch: -3 },
      { id: 'campus-road-11-to-road-12', type: 'scene', target: 'campusRoad12', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad12',
    ...tourMedia.campusRoad12,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 12', en: 'Campus Route Point 12' },
    description: {
      th: 'จุดที่ 12 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 12 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 12'], en: ['Route', 'Outdoor', 'Point 12'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 507, y: 236 },
    hotspots: [
      { id: 'campus-road-12-to-road-11', type: 'scene', target: 'campusRoad11', yaw: 180, pitch: -3 },
      { id: 'campus-road-12-to-road-13', type: 'scene', target: 'campusRoad13', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad13',
    ...tourMedia.campusRoad13,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 13', en: 'Campus Route Point 13' },
    description: {
      th: 'จุดที่ 13 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 13 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 13'], en: ['Route', 'Outdoor', 'Point 13'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 471, y: 250 },
    hotspots: [
      { id: 'campus-road-13-to-road-12', type: 'scene', target: 'campusRoad12', yaw: 180, pitch: -3 },
      { id: 'campus-road-13-to-road-14', type: 'scene', target: 'campusRoad14', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad14',
    ...tourMedia.campusRoad14,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 14', en: 'Campus Route Point 14' },
    description: {
      th: 'จุดที่ 14 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 14 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 14'], en: ['Route', 'Outdoor', 'Point 14'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 445, y: 274 },
    hotspots: [
      { id: 'campus-road-14-to-road-13', type: 'scene', target: 'campusRoad13', yaw: 180, pitch: -3 },
      { id: 'campus-road-14-to-road-15', type: 'scene', target: 'campusRoad15', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad15',
    ...tourMedia.campusRoad15,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 15', en: 'Campus Route Point 15' },
    description: {
      th: 'จุดที่ 15 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 15 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 15'], en: ['Route', 'Outdoor', 'Point 15'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 422, y: 321 },
    hotspots: [
      { id: 'campus-road-15-to-road-14', type: 'scene', target: 'campusRoad14', yaw: 180, pitch: -3 },
      { id: 'campus-road-15-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 150, pitch: -3 },
      { id: 'campus-road-15-to-road-27', type: 'scene', target: 'campusRoad27', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad16',
    ...tourMedia.campusRoad16,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 16', en: 'Campus Route Point 16' },
    description: {
      th: 'จุดที่ 16 ของเส้นทางต่อเนื่องภายในวิทยาเขต เชื่อมต่อจุดก่อนหน้าและจุดถัดไป',
      en: 'Point 16 on the continuing campus route, connecting the previous and next points.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 16'], en: ['Route', 'Outdoor', 'Point 16'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 405, y: 323 },
    hotspots: [
      { id: 'campus-road-16-to-road-15', type: 'scene', target: 'campusRoad15', yaw: 230, pitch: -3 },
      { id: 'campus-road-16-to-road-17', type: 'scene', target: 'campusRoad17', yaw: 120, pitch: -3 },
      { id: 'campus-road-16-to-road-23', type: 'scene', target: 'campusRoad23', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad17',
    ...tourMedia.campusRoad17,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 17', en: 'Campus Route Point 17' },
    description: {
      th: 'จุดที่ 17 ซึ่งเป็นปลายช่วงของเส้นทางชุดนี้ และสามารถย้อนกลับไปยังจุดก่อนหน้าได้',
      en: 'Point 17 at the end of this route segment, with a return path to the previous point.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 17'], en: ['Route', 'Outdoor', 'Point 17'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 399, y: 302 },
    hotspots: [
      { id: 'campus-road-17-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 200, pitch: -3 },
      { id: 'campus-road-17-to-road-28', type: 'scene', target: 'campusRoad28', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad27',
    ...tourMedia.campusRoad27,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 27', en: 'Campus Route Point 27' },
    description: {
      th: 'จุดเชื่อมต่อบนเส้นทางระหว่างจุดที่ 15 และพื้นที่กลุ่มอาคารภายในวิทยาเขต',
      en: 'A connecting route point between Point 15 and the campus building area.'
    },
    tags: { th: ['เส้นทาง', 'ทางแยก', 'จุดที่ 27'], en: ['Route', 'Junction', 'Point 27'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 436, y: 379 },
    hotspots: [
      { id: 'campus-road-27-to-road-15', type: 'scene', target: 'campusRoad15', yaw: 180, pitch: -3 },
      { id: 'campus-road-27-to-road-18', type: 'scene', target: 'campusRoad18', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad18',
    ...tourMedia.campusRoad18,
    title: { th: 'เส้นทางภายในวิทยาเขต จุดที่ 18', en: 'Campus Route Point 18' },
    description: {
      th: 'จุดเริ่มต้นของเส้นทางแยกจากจุดที่ 15 ซึ่งเชื่อมต่อไปยังกลุ่มอาคารภายในวิทยาเขต',
      en: 'The first point on the branch from Point 15, leading toward the campus building area.'
    },
    tags: { th: ['เส้นทาง', 'ทางแยก', 'จุดที่ 18'], en: ['Route', 'Junction', 'Point 18'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 450, y: 437 },
    hotspots: [
      { id: 'campus-road-18-to-road-27', type: 'scene', target: 'campusRoad27', yaw: 100, pitch: 0 },
      { id: 'campus-road-18-to-road-19', type: 'scene', target: 'campusRoad19', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad19',
    ...tourMedia.campusRoad19,
    title: { th: 'คณะอุตสาหกรรมเกษตรดิจิทัล', en: 'Faculty of Digital Agro-Industry' },
    description: {
      th: 'จุดชมบริเวณด้านหน้าคณะอุตสาหกรรมเกษตรดิจิทัลบนเส้นทางแยกภายในวิทยาเขต',
      en: 'A viewpoint in front of the Faculty of Digital Agro-Industry on the campus branch route.'
    },
    tags: { th: ['อาคาร', 'คณะ', 'จุดที่ 19'], en: ['Building', 'Faculty', 'Point 19'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 433, y: 422 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-19-to-road-18', type: 'scene', target: 'campusRoad18', yaw: -90, pitch: -3 },
      { id: 'campus-road-19-to-road-20', type: 'scene', target: 'campusRoad20', yaw: 90, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad20',
    ...tourMedia.campusRoad20,
    title: { th: 'เส้นทางบริเวณกลุ่มอาคาร จุดที่ 20', en: 'Building Area Route Point 20' },
    description: {
      th: 'ถนนเชื่อมต่อระหว่างกลุ่มอาคารบนเส้นทางแยกภายในวิทยาเขต',
      en: 'A connecting road between campus buildings on the branch route.'
    },
    tags: { th: ['เส้นทาง', 'อาคาร', 'จุดที่ 20'], en: ['Route', 'Buildings', 'Point 20'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 421, y: 413 },
    hotspots: [
      { id: 'campus-road-20-to-road-19', type: 'scene', target: 'campusRoad19', yaw: 30, pitch: -3 },
      { id: 'campus-road-20-to-road-21', type: 'scene', target: 'campusRoad21', yaw: -200, pitch: 0 }
    ]
  },
  {
    id: 'campusRoad21',
    ...tourMedia.campusRoad21,
    title: { th: 'อาคารบริหาร', en: 'Administration Building' },
    description: {
      th: 'จุดชมบริเวณด้านหน้าอาคารบริหารของวิทยาเขต',
      en: 'A viewpoint in front of the campus Administration Building.'
    },
    tags: { th: ['อาคาร', 'บริหาร', 'จุดที่ 21'], en: ['Building', 'Administration', 'Point 21'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 405, y: 400 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-21-to-road-20', type: 'scene', target: 'campusRoad20', yaw: -90, pitch: -3 },
      { id: 'campus-road-21-to-road-22', type: 'scene', target: 'campusRoad22', yaw: 90, pitch: -3 },
      {
        id: 'Administration Building-info',
        type: 'info',
        yaw: 0,
        pitch: 5
      }
      
    ]
  },
  {
    id: 'campusRoad22',
    ...tourMedia.campusRoad22,
    title: { th: 'อาคารสิรินธร', en: 'Sirindhorn Building' },
    description: {
      th: 'สำนักหอสมุดกลาง สำหรับค้นคว้าและอ่านหนังสือ รวมถึงเป็นที่ตั้งของ สำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ บนชั้น 6 ที่มีบริการห้องคอมพิวเตอร์และพื้นที่การเรียนรู้',
      en: 'The central library building, used for research and reading, and home to the Computer and Information Technology Department on the 6th floor with computer rooms and learning spaces.'
    },
    tags: { th: ['อาคาร', 'หอสมุด'], en: ['Building', 'Library'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 328, y: 416 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-22-to-road-21', type: 'scene', target: 'campusRoad21', yaw: 180, pitch: -3 },
      { id: 'campus-road-22-to-road-26', type: 'scene', target: 'campusRoad26', yaw: 90, pitch: -3 },
       {
         id: 'Sirindhorn Building-info',
         type: 'info',
         yaw: 0,
         pitch: 5
       }
    ]
  },
  {
    id: 'campusRoad23',
    ...tourMedia.campusRoad23,
    title: { th: 'บริเวณหอพระหลวงพ่อสิง', en: 'Luang Pho Sing Shrine Area' },
    description: {
      th: 'เส้นทางภายในวิทยาเขตบริเวณหอพระหลวงพ่อสิง เชื่อมต่อจากจุดที่ 16 ไปยังพื้นที่คณะเทคโนโลยี',
      en: 'A campus route by the Luang Pho Sing Shrine, connecting Point 16 to the Faculty of Technology area.'
    },
    tags: { th: ['เส้นทาง', 'หอพระ', 'จุดที่ 23'], en: ['Route', 'Shrine', 'Point 23'] },
    initialView: { yaw: 98, pitch: 0, zoom: 24 },
    mapPosition: { x: 390, y: 342 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-23-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 180, pitch: -3 },
      { id: 'campus-road-23-to-road-24', type: 'scene', target: 'campusRoad24', yaw: 0, pitch: -3 },
      {
        id: 'luang-pho-sing-shrine-info',
        type: 'info',
        yaw: 98,
        pitch: 4
      }
    ]
  },
  {
    id: 'campusRoad24',
    ...tourMedia.campusRoad24,
    title: { th: 'ที่จอดรถยนต์ในคณะเทคโนโลยี', en: 'Faculty of Technology Car Parking' },
    description: {
      th: 'เส้นทางบริเวณพื้นที่จอดรถยนต์ของคณะเทคโนโลยี เชื่อมต่อไปยังพื้นที่จอดรถจักรยานยนต์',
      en: 'A route by the Faculty of Technology car park, continuing toward the motorcycle parking area.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถยนต์', 'จุดที่ 24'], en: ['Route', 'Car parking', 'Point 24'] },
    initialView: { yaw: 108, pitch: 0, zoom: 24 },
    mapPosition: { x: 374, y: 360 },
    hotspots: [
      { id: 'campus-road-24-to-road-23', type: 'scene', target: 'campusRoad23', yaw: 180, pitch: -3 },
      { id: 'campus-road-24-to-road-25', type: 'scene', target: 'campusRoad25', yaw: 0, pitch: -3 },
      {
        id: 'faculty-technology-car-parking-info',
        type: 'info',
        yaw: 108,
        pitch: 2
      }
    ]
  },
  {
    id: 'campusRoad25',
    ...tourMedia.campusRoad25,
    title: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี จุดที่ 1', en: 'Faculty of Technology Motorcycle Parking Point 1' },
    description: {
      th: 'จุดแรกของเส้นทางบริเวณที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี',
      en: 'The first route point by the motorcycle parking area at the Faculty of Technology.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถจักรยานยนต์', 'จุดที่ 25'], en: ['Route', 'Motorcycle parking', 'Point 25'] },
    initialView: { yaw: 30, pitch: 0, zoom: 24 },
    mapPosition: { x: 359, y: 379 },
    hotspots: [
      { id: 'campus-road-25-to-road-24', type: 'scene', target: 'campusRoad24', yaw: 150, pitch: -3 },
      { id: 'campus-road-25-to-road-26', type: 'scene', target: 'campusRoad26', yaw: -50, pitch: -3 },
      {
        id: 'faculty-technology-motorcycle-parking-1-info',
        type: 'info',
        yaw: 30,
        pitch: 1
      }
    ]
  },
  {
    id: 'campusRoad26',
    ...tourMedia.campusRoad26,
    title: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี จุดที่ 2', en: 'Faculty of Technology Motorcycle Parking Point 2' },
    description: {
      th: 'จุดที่สองของพื้นที่จอดรถจักรยานยนต์ เชื่อมต่อไปยังอาคารสิรินธร',
      en: 'The second motorcycle parking point, connecting onward to the Sirindhorn Building.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถจักรยานยนต์', 'จุดที่ 26'], en: ['Route', 'Motorcycle parking', 'Point 26'] },
    initialView: { yaw: 0, pitch: 0, zoom: 24 },
    mapPosition: { x: 343, y: 398 },
    hotspots: [
      { id: 'campus-road-26-to-road-25', type: 'scene', target: 'campusRoad25', yaw: 85, pitch: -3 },
      { id: 'campus-road-26-to-road-22', type: 'scene', target: 'campusRoad22', yaw: -90, pitch: -3 },
      {
        id: 'faculty-technology-motorcycle-parking-2-info',
        type: 'info',
        yaw: 0,
        pitch: 2
      }
    ]
  },
  {
    id: 'campusRoad28',
    ...tourMedia.campusRoad28,
    title: { th: 'เส้นทางไปกลุ่มอาคาร จุดที่ 28', en: 'Building Route Point 28' },
    description: {
      th: 'เส้นทางต่อจากจุดที่ 17 มุ่งหน้าไปยังกลุ่มอาคารด้านในของวิทยาเขต',
      en: 'The route continuing from Point 17 toward the inner campus buildings.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 28'], en: ['Route', 'Outdoor', 'Point 28'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 363, y: 277 },
    hotspots: [
      { id: 'campus-road-28-to-road-17', type: 'scene', target: 'campusRoad17', yaw: 180, pitch: -3 },
      { id: 'campus-road-28-to-road-29', type: 'scene', target: 'campusRoad29', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad29',
    ...tourMedia.campusRoad29,
    title: { th: 'เส้นทางไปกลุ่มอาคาร จุดที่ 29', en: 'Building Route Point 29' },
    description: {
      th: 'ถนนภายในวิทยาเขตที่เชื่อมต่อไปยังทางแยกของกลุ่มอาคารคณะ',
      en: 'An internal campus road leading toward the faculty building junction.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 29'], en: ['Route', 'Outdoor', 'Point 29'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 329, y: 279 },
    hotspots: [
      { id: 'campus-road-29-to-road-28', type: 'scene', target: 'campusRoad28', yaw: 180, pitch: -3 },
      { id: 'campus-road-29-to-road-30', type: 'scene', target: 'campusRoad30', yaw: 0, pitch: -3 },
      { id: 'campus-road-29-to-multipurpose-gym', type: 'scene', target: 'multipurposeGym', yaw: 120, pitch: 3}
    ]
  },
  {
    id: 'campusRoad30',
    ...tourMedia.campusRoad30,
    title: { th: 'เส้นทางไปกลุ่มอาคาร จุดที่ 30', en: 'Building Route Point 30' },
    description: {
      th: 'เส้นทางช่วงก่อนถึงทางแยกไปคณะเทคโนโลยีและการจัดการอุตสาหกรรมและคณะวิศวกรรมศาสตร์',
      en: 'The route approaching the junction for the Faculty of Industrial Technology and Management and the Faculty of Engineering.'
    },
    tags: { th: ['เส้นทาง', 'กลางแจ้ง', 'จุดที่ 30'], en: ['Route', 'Outdoor', 'Point 30'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 313, y: 292 },
    hotspots: [
      { id: 'campus-road-30-to-road-29', type: 'scene', target: 'campusRoad29', yaw: 180, pitch: -3 },
      { id: 'campus-road-30-to-road-31', type: 'scene', target: 'campusRoad31', yaw: 0, pitch: -3 },
      { id: 'campus-road-30-to-road-49', type: 'scene', target: 'campusRoad49', yaw: 90, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad31',
    ...tourMedia.campusRoad31,
    title: { th: 'ทางแยกกลุ่มอาคารคณะ', en: 'Faculty Building Junction' },
    description: {
      th: 'ทางแยกไปคณะเทคโนโลยีและการจัดการอุตสาหกรรมและคณะวิศวกรรมศาสตร์ วิทยาเขตปราจีนบุรี',
      en: 'The junction for the Faculty of Industrial Technology and Management and the Faculty of Engineering at Prachinburi Campus.'
    },
    tags: { th: ['เส้นทาง', 'ทางแยก'], en: ['Route', 'Junction'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 300, y: 307 },
    hotspots: [
      { id: 'campus-road-31-to-road-30', type: 'scene', target: 'campusRoad30', yaw: 170, pitch: -3 },
      { id: 'campus-road-31-to-road-32', type: 'scene', target: 'campusRoad32', yaw: -95, pitch: -3 },
      { id: 'campus-road-31-to-road-38', type: 'scene', target: 'campusRoad38', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad32',
    ...tourMedia.campusRoad32,
    title: { th: 'เส้นทางคณะเทคโนโลยี จุดที่ 32', en: 'FITM Route Point 32' },
    description: {
      th: 'เส้นทางและพื้นที่จอดรถใกล้คณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'A route and parking area near the Faculty of Industrial Technology and Management.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถ', 'จุดที่ 32'], en: ['Route', 'Parking', 'Point 32'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 331, y: 324 },
    hotspots: [
      { id: 'campus-road-32-to-road-31', type: 'scene', target: 'campusRoad31', yaw: 190, pitch: 0 },
      { id: 'campus-road-32-to-road-33', type: 'scene', target: 'campusRoad33', yaw: 0, pitch: -3 },
      { id: 'campus-road-32-to-road-37', type: 'scene', target: 'campusRoad37', yaw: 85, pitch: -3 },
      {
        id: 'fitm-parking-1-info',
        type: 'info',
        yaw: 120,
        pitch: 1
      }
    ]
  },
  {
    id: 'campusRoad33',
    ...tourMedia.campusRoad33,
    title: { th: 'เส้นทางคณะเทคโนโลยี จุดที่ 33', en: 'FITM Route Point 33' },
    description: {
      th: 'เส้นทางและพื้นที่จอดรถในบริเวณคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'A route and parking area within the Faculty of Industrial Technology and Management.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถ', 'จุดที่ 33'], en: ['Route', 'Parking', 'Point 33'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 347, y: 340 },
    hotspots: [
      { id: 'campus-road-33-to-road-32', type: 'scene', target: 'campusRoad32', yaw: 180, pitch: -3 },
      { id: 'campus-road-33-to-road-34', type: 'scene', target: 'campusRoad34', yaw: 80, pitch: -3 },
      {
        id: 'fitm-parking-2-info',
        type: 'info',
        yaw: 35,
        pitch: 1
      }
    ]
  },
  {
    id: 'campusRoad34',
    ...tourMedia.campusRoad34,
    title: { th: 'เส้นทางคณะเทคโนโลยี จุดที่ 34', en: 'FITM Route Point 34' },
    description: {
      th: 'ถนนภายในกลุ่มอาคารคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'An internal road in the Faculty of Industrial Technology and Management building area.'
    },
    tags: { th: ['เส้นทาง', 'คณะเทคโนโลยี', 'จุดที่ 34'], en: ['Route', 'FITM', 'Point 34'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 337, y: 353 },
    hotspots: [
      { id: 'campus-road-34-to-road-33', type: 'scene', target: 'campusRoad33', yaw: 180, pitch: -3 },
      { id: 'campus-road-34-to-road-35', type: 'scene', target: 'campusRoad35', yaw: 0, pitch: -3 },
      {
        id: 'orange-blossom-room-info',
        type: 'info',
        yaw: -100,
        pitch: 1
      },
    ]
  },
  {
    id: 'campusRoad35',
    ...tourMedia.campusRoad35,
    title: { th: 'เส้นทางคณะเทคโนโลยี จุดที่ 35', en: 'FITM Route Point 35' },
    description: {
      th: 'เส้นทางเข้าใกล้อาคารคณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      en: 'The route approaching the Faculty of Industrial Technology and Management building.'
    },
    tags: { th: ['เส้นทาง', 'คณะเทคโนโลยี', 'จุดที่ 35'], en: ['Route', 'FITM', 'Point 35'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 327, y: 368 },
    hotspots: [
      { id: 'campus-road-35-to-road-34', type: 'scene', target: 'campusRoad34', yaw: 180, pitch: -3 },
      { id: 'campus-road-35-to-road-36', type: 'scene', target: 'campusRoad36', yaw: 80, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad36',
    ...tourMedia.campusRoad36,
    title: { th: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม', en: 'Faculty of Industrial Technology and Management' },
    description: {
      th: 'จุดชมบริเวณด้านหน้าคณะเทคโนโลยีและการจัดการอุตสาหกรรม มจพ. วิทยาเขตปราจีนบุรี',
      en: 'A viewpoint in front of the Faculty of Industrial Technology and Management at KMUTNB Prachinburi Campus.'
    },
    tags: { th: ['อาคาร', 'คณะ', 'FITM'], en: ['Building', 'Faculty', 'FITM'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 311, y: 358 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-36-to-road-35', type: 'scene', target: 'campusRoad35', yaw: -100, pitch: -3 },
      { id: 'campus-road-36-to-road-37', type: 'scene', target: 'campusRoad37', yaw: 150, pitch: -3 },
      { id: 'campus-road-36-to-road-universityCafeteria', type: 'scene', target: 'universityCafeteria', yaw: 50, pitch: -3 },
      {
        id: 'fitm-front-parking-info',
        type: 'info',
        yaw: 125,
        pitch: 1
      },
      {
        id: 'fitm-parking-3-info',
        type: 'info',
        yaw: 0,
        pitch: 1
      }
    ]
  },
  {
    id: 'campusRoad37',
    ...tourMedia.campusRoad37,
    title: { th: 'เส้นทางคณะเทคโนโลยี จุดที่ 37', en: 'FITM Route Point 37' },
    description: {
      th: 'เส้นทางบริเวณคณะเทคโนโลยีและการจัดการอุตสาหกรรมที่เชื่อมต่อไปยังโรงอาหารมหาวิทยาลัย',
      en: 'A route by the Faculty of Industrial Technology and Management connecting to the university cafeteria.'
    },
    tags: { th: ['เส้นทาง', 'ที่จอดรถ', 'จุดที่ 37'], en: ['Route', 'Parking', 'Point 37'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 322, y: 343 },
    hotspots: [
      { id: 'campus-road-37-to-road-36', type: 'scene', target: 'campusRoad36', yaw: 180, pitch: -3 },
      { id: 'campus-road-37-to-road-32', type: 'scene', target: 'campusRoad32', yaw: 0, pitch: -3 },
      {
        id: 'fitm-parking-4-info',
        type: 'info',
        yaw: -35,
        pitch: 1
      }
    ]
  },
  {
    id: 'universityCafeteria',
    ...tourMedia.universityCafeteria,
    title: { th: 'โรงอาหารมหาวิทยาลัย', en: 'University Cafeteria' },
    description: {
      th: 'โรงอาหารสำหรับนักศึกษา บุคลากร และผู้มาติดต่อภายในวิทยาเขตปราจีนบุรี',
      en: 'The cafeteria serving students, staff, and visitors at Prachinburi Campus.'
    },
    tags: { th: ['อาคาร', 'โรงอาหาร', 'บริการ'], en: ['Building', 'Cafeteria', 'Services'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 299, y: 352 },
    mapLandmark: true,
    hotspots: [
      { id: 'cafeteria-to-campus-road-38', type: 'scene', target: 'campusRoad38', yaw: 270, pitch: -3 },
      { id: 'cafeteria-to-campus-road-36', type: 'scene', target: 'campusRoad36', yaw: 90, pitch: -2 },
      {
        id: 'university-cafeteria-info',
        type: 'info',
        yaw: 0,
        pitch: 2
      }
    ]
  },
  {
    id: 'campusRoad38',
    ...tourMedia.campusRoad38,
    title: { th: 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 38', en: 'Engineering Route Point 38' },
    description: { th: 'เส้นทางจากทางแยกไปยังคณะวิศวกรรมศาสตร์ วิทยาเขตปราจีนบุรี', en: 'The route from the junction toward the Faculty of Engineering, Prachinburi Campus.' },
    tags: { th: ['เส้นทาง', 'วิศวกรรมศาสตร์', 'จุดที่ 38'], en: ['Route', 'Engineering', 'Point 38'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 278, y: 336 },
    hotspots: [
      { id: 'campus-road-38-to-road-31', type: 'scene', target: 'campusRoad31', yaw: 180, pitch: -3 },
      { id: 'campus-road-38-to-road-universityCafeteria', type: 'scene', target: 'universityCafeteria', yaw: -80, pitch: -3 },
      { id: 'campus-road-38-to-road-39', type: 'scene', target: 'campusRoad39', yaw: 0, pitch: -3 },
      { id: 'campus-road-38-to-road-50', type: 'scene', target: 'campusRoad50', yaw: 75, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad39',
    ...tourMedia.campusRoad39,
    title: { th: 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 39', en: 'Engineering Route Point 39' },
    description: { th: 'ถนนภายในบริเวณกลุ่มอาคารวิศวกรรมศาสตร์', en: 'An internal road in the engineering building area.' },
    tags: { th: ['เส้นทาง', 'วิศวกรรมศาสตร์', 'จุดที่ 39'], en: ['Route', 'Engineering', 'Point 39'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 244, y: 392 },
    hotspots: [
      { id: 'campus-road-39-to-road-38', type: 'scene', target: 'campusRoad38', yaw: 180, pitch: -3 },
      { id: 'campus-road-39-to-road-40', type: 'scene', target: 'campusRoad40', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad40',
    ...tourMedia.campusRoad40,
    title: { th: 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 40', en: 'Engineering Route Point 40' },
    description: { th: 'เส้นทางต่อเนื่องภายในบริเวณคณะวิศวกรรมศาสตร์', en: 'A continuing route within the Faculty of Engineering area.' },
    tags: { th: ['เส้นทาง', 'วิศวกรรมศาสตร์', 'จุดที่ 40'], en: ['Route', 'Engineering', 'Point 40'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 236, y: 409 },
    hotspots: [
      { id: 'campus-road-40-to-road-39', type: 'scene', target: 'campusRoad39', yaw: 180, pitch: -3 },
      { id: 'campus-road-40-to-road-41', type: 'scene', target: 'campusRoad41', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad41',
    ...tourMedia.campusRoad41,
    title: { th: 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 41', en: 'Engineering Route Point 41' },
    description: { th: 'ถนนเชื่อมต่อไปยังอาคารคณะวิศวกรรมศาสตร์', en: 'A road connecting toward the Faculty of Engineering building.' },
    tags: { th: ['เส้นทาง', 'วิศวกรรมศาสตร์', 'จุดที่ 41'], en: ['Route', 'Engineering', 'Point 41'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 226, y: 418 },
    hotspots: [
      { id: 'campus-road-41-to-road-40', type: 'scene', target: 'campusRoad40', yaw: 180, pitch: -3 },
      { id: 'campus-road-41-to-road-42', type: 'scene', target: 'campusRoad42', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad42',
    ...tourMedia.campusRoad42,
    title: { th: 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 42', en: 'Engineering Route Point 42' },
    description: { th: 'เส้นทางช่วงก่อนถึงอาคารคณะวิศวกรรมศาสตร์', en: 'The route approaching the Faculty of Engineering building.' },
    tags: { th: ['เส้นทาง', 'วิศวกรรมศาสตร์', 'จุดที่ 42'], en: ['Route', 'Engineering', 'Point 42'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 209, y: 438 },
    hotspots: [
      { id: 'campus-road-42-to-road-41', type: 'scene', target: 'campusRoad41', yaw: -80, pitch: -3 },
      { id: 'campus-road-42-to-road-43', type: 'scene', target: 'campusRoad43', yaw: 50, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad43',
    ...tourMedia.campusRoad43,
    title: { th: 'คณะวิศวกรรมศาสตร์ วิทยาเขตปราจีนบุรี', en: 'Faculty of Engineering, Prachinburi Campus' },
    description: {
      th: 'จุดชมบริเวณอาคารคณะวิศวกรรมศาสตร์ มจพ. วิทยาเขตปราจีนบุรี',
      en: 'A viewpoint by the Faculty of Engineering building at KMUTNB Prachinburi Campus.'
    },
    tags: { th: ['อาคาร', 'คณะ', 'วิศวกรรมศาสตร์'], en: ['Building', 'Faculty', 'Engineering'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 227, y: 452 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-43-to-road-42', type: 'scene', target: 'campusRoad42', yaw: 180, pitch: -3 },
      {
        id: 'faculty-of-engineering-info',
        type: 'info',
        yaw: 50,
        pitch: 2
      }
    ]
  },
  {
    id: 'multipurposeGym',
    ...tourMedia.multipurposeGym,
    title: {
      th: 'โรงยิมอเนกประสงค์ (โดมแดง) มจพ. วิทยาเขตปราจีนบุรี',
      en: 'Multipurpose Gymnasium (Red Dome), KMUTNB Prachinburi Campus'
    },
    description: {
      th: 'จุดชมภายในโรงยิมอเนกประสงค์หรือโดมแดง พร้อมมุมมองสนามฟุตบอลกลางแจ้งบริเวณโดยรอบ',
      en: 'A viewpoint inside the multipurpose gymnasium, or Red Dome, with views of the surrounding outdoor football field.'
    },
    tags: { th: ['โรงยิม', 'โดมแดง', 'สนามกีฬา'], en: ['Gymnasium', 'Red Dome', 'Sports'] },
    initialView: { yaw: 0, pitch: 4, zoom: 24 },
    mapPosition: { x: 364, y: 235 },
    mapLandmark: true,
    hotspots: [
      { id: 'multipurpose-gym-to-road-29', type: 'scene', target: 'campusRoad29', yaw: 90, pitch: -3 },
      { id: 'multipurpose-gym-to-road-44', type: 'scene', target: 'campusRoad44', yaw: -90, pitch: -3 },
      { id: 'multipurpose-gym-info', type: 'info', yaw: 0, pitch: 12 },
      { id: 'outdoor-football-field-info', type: 'info', yaw: 145, pitch: 0 }
    ]
  },
  {
    id: 'campusRoad44',
    ...tourMedia.campusRoad44,
    title: { th: 'ทางเดินบริเวณโดมแดง จุดที่ 1', en: 'Red Dome Walkway Point 1' },
    description: {
      th: 'ทางเดินมีหลังคาบริเวณสนามกีฬาที่เชื่อมระหว่างโดมแดงกับทางแยกภายในพื้นที่',
      en: 'A covered sports-area walkway connecting the Red Dome to the nearby internal junction.'
    },
    tags: { th: ['ทางเดิน', 'โดมแดง', 'จุดที่ 1'], en: ['Walkway', 'Red Dome', 'Point 1'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 357, y: 201 },
    hotspots: [
      { id: 'campus-road-44-to-multipurpose-gym', type: 'scene', target: 'multipurposeGym', yaw: 0, pitch: -3 },
      { id: 'campus-road-44-to-road-45', type: 'scene', target: 'campusRoad45', yaw: 90, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad45',
    ...tourMedia.campusRoad45,
    title: { th: 'ทางแยกทางเดินบริเวณโดมแดง', en: 'Red Dome Walkway Junction' },
    description: {
      th: 'ทางแยกของทางเดินมีหลังคา โดยเส้นทางหลักต่อไปยังจุดที่ 2 และอีกด้านเป็นทางเดินแยกปลายตัน',
      en: 'A covered-walkway junction where the main route continues to Point 2 and the opposite side leads to a short branch.'
    },
    tags: { th: ['ทางเดิน', 'ทางแยก', 'โดมแดง'], en: ['Walkway', 'Junction', 'Red Dome'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 320, y: 202 },
    hotspots: [
      { id: 'campus-road-45-to-road-44', type: 'scene', target: 'campusRoad44', yaw: -90, pitch: -3 },
      { id: 'campus-road-45-to-road-47', type: 'scene', target: 'campusRoad47', yaw: 0, pitch: -3 },
      { id: 'campus-road-45-to-road-46', type: 'scene', target: 'campusRoad46', yaw: 180, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad46',
    ...tourMedia.campusRoad46,
    title: { th: 'ทางเดินแยกบริเวณโดมแดง', en: 'Red Dome Branch Walkway' },
    description: {
      th: 'ทางเดินแยกจากจุดตัดหลักและย้อนกลับไปยังทางแยกบริเวณโดมแดงได้',
      en: 'A short branch from the main path that connects back to the Red Dome walkway junction.'
    },
    tags: { th: ['ทางเดิน', 'ทางแยก', 'ปลายทาง'], en: ['Walkway', 'Branch', 'Endpoint'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 316, y: 188 },
    hotspots: [
      { id: 'campus-road-46-to-road-45', type: 'scene', target: 'campusRoad45', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad47',
    ...tourMedia.campusRoad47,
    title: { th: 'ทางเดินบริเวณโดมแดง จุดที่ 2', en: 'Red Dome Walkway Point 2' },
    description: {
      th: 'ทางเดินมีหลังคาข้างพื้นที่สนาม เชื่อมต่อจากทางแยกไปยังเส้นทางส่วนถัดไป',
      en: 'A covered walkway beside the field connecting the junction to the next route segment.'
    },
    tags: { th: ['ทางเดิน', 'สนามกีฬา', 'จุดที่ 2'], en: ['Walkway', 'Sports field', 'Point 2'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 319, y: 229 },
    hotspots: [
      { id: 'campus-road-47-to-road-45', type: 'scene', target: 'campusRoad45', yaw: 180, pitch: -3 },
      { id: 'campus-road-47-to-road-48', type: 'scene', target: 'campusRoad48', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad48',
    ...tourMedia.campusRoad48,
    title: { th: 'ทางเดินบริเวณโดมแดง จุดที่ 3', en: 'Red Dome Walkway Point 3' },
    description: {
      th: 'ทางเดินต่อเนื่องใต้แนวหลังคาระหว่างพื้นที่สนามและกลุ่มอาคารภายในมหาวิทยาลัย',
      en: 'A continuing covered walkway between the sports field and nearby campus buildings.'
    },
    tags: { th: ['ทางเดิน', 'สนามกีฬา', 'จุดที่ 3'], en: ['Walkway', 'Sports field', 'Point 3'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 321, y: 259 },
    hotspots: [
      { id: 'campus-road-48-to-road-47', type: 'scene', target: 'campusRoad47', yaw: 180, pitch: -3 },
      { id: 'campus-road-48-to-road-49', type: 'scene', target: 'campusRoad49', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad49',
    ...tourMedia.campusRoad49,
    title: { th: 'ทางเดินบริเวณโดมแดง จุดที่ 4', en: 'Red Dome Walkway Point 4' },
    description: {
      th: 'จุดเชื่อมทางเดินบริเวณโดมแดงกับถนนในภาพ temp6-3 และทางเดินไปยังจุดที่ 5',
      en: 'The connection between the Red Dome walkway, the road shown in temp6-3, and the walkway toward Point 5.'
    },
    tags: { th: ['ทางเดิน', 'จุดเชื่อม', 'จุดที่ 4'], en: ['Walkway', 'Connection', 'Point 4'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 306, y: 282 },
    hotspots: [
      { id: 'campus-road-49-to-road-48', type: 'scene', target: 'campusRoad48', yaw: 170, pitch: -3 },
      { id: 'campus-road-49-to-road-50', type: 'scene', target: 'campusRoad50', yaw: 0, pitch: -3 },
      { id: 'campus-road-49-to-road-30', type: 'scene', target: 'campusRoad30', yaw: -90, pitch: -3 }
    ]
  },
  {
    id: 'campusRoad50',
    ...tourMedia.campusRoad50,
    title: { th: 'ทางเดินบริเวณโดมแดง จุดที่ 5', en: 'Red Dome Walkway Point 5' },
    description: {
      th: 'จุดเชื่อมปลายทางเดินบริเวณโดมแดงกับเส้นทางคณะวิศวกรรมศาสตร์ในภาพ temp7-1',
      en: 'The end connection from the Red Dome walkway to the engineering route shown in temp7-1.'
    },
    tags: { th: ['ทางเดิน', 'จุดเชื่อม', 'จุดที่ 5'], en: ['Walkway', 'Connection', 'Point 5'] },
    initialView: { yaw: 0, pitch: -2, zoom: 22 },
    mapPosition: { x: 270, y: 329 },
    hotspots: [
      { id: 'campus-road-50-to-road-49', type: 'scene', target: 'campusRoad49', yaw: -80, pitch: -3 },
      { id: 'campus-road-50-to-road-38', type: 'scene', target: 'campusRoad38', yaw: 10, pitch: -3 }
    ]
  }
] as const satisfies readonly TourScene[];

/**
 * Changes whenever viewer geometry or media changes. React Fast Refresh uses this
 * signature to rebuild the imperative Photo Sphere Viewer without a page reload.
 */
export function getTourStructureSignature(): string {
  return JSON.stringify(tourScenes.map((scene) => ({
    id: scene.id,
    panorama: scene.panorama,
    title: scene.title,
    initialView: scene.initialView,
    mapPosition: scene.mapPosition,
    mapLandmark: (scene as TourScene).mapLandmark,
    hotspots: scene.hotspots.map((hotspot) => ({
      id: hotspot.id,
      type: hotspot.type,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch,
      ...(hotspot.type === 'scene' ? { target: hotspot.target } : {})
    }))
  })));
}

const sceneById = new Map<SceneId, TourScene>(tourScenes.map((scene) => [scene.id, scene]));

export function getScene(id: SceneId): TourScene {
  const scene = sceneById.get(id);
  if (!scene) {
    throw new Error(`Unknown scene: ${id}`);
  }
  return scene;
}

export function getMapLandmarkScenes(): readonly TourScene[] {
  return tourScenes.filter((scene) => (scene as TourScene).mapLandmark === true);
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function getNavigationHotspots(scene: TourScene): readonly SceneHotspot[] {
  return scene.hotspots.filter((hotspot): hotspot is SceneHotspot => hotspot.type === 'scene');
}

export function getInfoHotspots(scene: TourScene): readonly InfoHotspotDefinition[] {
  return scene.hotspots.filter((hotspot): hotspot is InfoHotspotDefinition => hotspot.type === 'info');
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
    if (ids.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    ids.add(scene.id);

    const mediaUrls = getSceneAssetUrls(scene);
    for (const mediaUrl of mediaUrls) {
      if (!mediaUrl.startsWith('/mainimages/')) {
        errors.push(`Scene ${scene.id} must use /mainimages media: ${mediaUrl}`);
      }
      if (mediaUrl.includes('/tour/pano') || mediaUrl.includes('/tour/thumbs')) {
        errors.push(`Scene ${scene.id} references legacy tour media: ${mediaUrl}`);
      }
      if (mediaUrl.includes('/tiles/')) {
        errors.push(`Scene ${scene.id} references generated panorama tiles: ${mediaUrl}`);
      }
    }
    if (scene.mapPosition.x < 0 || scene.mapPosition.x > tourMap.width) {
      errors.push(`Scene ${scene.id} map x is outside the image`);
    }
    if (scene.mapPosition.y < 0 || scene.mapPosition.y > tourMap.height) {
      errors.push(`Scene ${scene.id} map y is outside the image`);
    }
    const mapLandmark = (scene as TourScene).mapLandmark;
    if (mapLandmark !== undefined && typeof mapLandmark !== 'boolean') {
      errors.push(`Scene ${scene.id} map landmark flag is invalid`);
    }

    for (const locale of locales) {
      const tags: readonly string[] = scene.tags[locale];
      if (!scene.title[locale] || !scene.description[locale] || tags.length === 0) {
        errors.push(`Scene ${scene.id} is missing ${locale} content`);
      }
    }

    for (const hotspot of scene.hotspots) {
      if (hotspotIds.has(hotspot.id)) errors.push(`Duplicate hotspot id: ${hotspot.id}`);
      hotspotIds.add(hotspot.id);
      if (!Number.isFinite(hotspot.yaw) || !Number.isFinite(hotspot.pitch)) {
        errors.push(`Hotspot ${hotspot.id} has a non-finite angle`);
      }
      if (hotspot.pitch < -90 || hotspot.pitch > 90) {
        errors.push(`Hotspot ${hotspot.id} pitch is outside -90..90 degrees`);
      }
      if (hotspot.type === 'scene' && !sceneIds.includes(hotspot.target)) {
        errors.push(`Scene ${scene.id} links to missing scene ${hotspot.target}`);
      }
      if (hotspot.type === 'info') {
        const allowedFields = new Set(['id', 'type', 'yaw', 'pitch']);
        const unexpectedFields = Object.keys(hotspot).filter((field) => !allowedFields.has(field));
        if (unexpectedFields.length > 0) {
          errors.push(
            `Info hotspot ${hotspot.id} must contain geometry only; move ${unexpectedFields.join(', ')} to Admin`
          );
        }
      }
    }
  }

  const reachable = new Set<SceneId>();
  const firstSceneId = sceneIds[0];
  if (!firstSceneId) errors.push('Tour has no scenes');
  const queue: SceneId[] = firstSceneId ? [firstSceneId] : [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    for (const hotspot of getNavigationHotspots(getScene(id))) queue.push(hotspot.target);
  }

  for (const id of sceneIds) {
    if (!reachable.has(id)) errors.push(`Scene ${id} is not reachable`);
  }

  return errors;
}
