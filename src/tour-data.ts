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

function busImage(fileName: string): string {
  return `/mainimages/bus/${fileName}`;
}

const infoMedia = {
  busPage1: busImage('page1.jpg'),
  busPage2: busImage('page2.jpg'),
  busPage3: busImage('page3.jpg')
} as const;

export const tourMap = {
  image: mainImage('map/mainmap.png'),
  width: 1150,
  height: 577
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
  campusRoad18: mainPanorama('temp4-2.jpg'),
  campusRoad19: mainPanorama('temp4-3.jpg'),
  campusRoad20: mainPanorama('temp4-4.jpg'),
  campusRoad21: mainPanorama('temp4-5.jpg'),
  campusRoad22: mainPanorama('temp4-6.jpg'),
  campusRoad23: mainPanorama('temp5-1.jpg'),
  campusRoad24: mainPanorama('temp5-2.jpg'),
  campusRoad25: mainPanorama('temp5-3.jpg'),
  campusRoad26: mainPanorama('temp5-4.jpg')
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

const wikipediaReference: InfoReference = {
  label: { th: 'วิกิพีเดีย', en: 'Wikipedia' }
};

/** Structural Info point stored with tour geometry. Presentation is resolved from CMS content. */
export interface InfoHotspotDefinition extends HotspotBase {
  readonly type: 'info';
  /** Optional emergency fallback for existing locations. New points may omit all presentation fields. */
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly reference?: InfoReference;
  readonly images?: readonly InfoImage[];
}

/** Complete Info point passed to viewer components after CMS/fallback resolution. */
export interface InfoHotspot extends InfoHotspotDefinition {
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly reference: InfoReference;
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
  /** Optional degrees added to viewer yaw so 0 degrees points to the top of the map. */
  readonly mapHeadingOffset?: number;
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
    mapPosition: {   x: 1054, y: 159   },
    mapLandmark: true,
    hotspots: [
      { id: 'entrance-to-road', type: 'scene', target: 'entranceRoad', yaw: -40, pitch: -3 },
      
      {
        id: 'entrance-landmark-info',
        type: 'info',
        yaw: 10,
        pitch: 1,
        title: { th: 'ป้ายมหาวิทยาลัย', en: 'KMUTNB landmark' },
        description: {
          th: 'จุดเด่นบริเวณทางเข้าที่แสดงอักษรย่อ KMUTNB และต้อนรับผู้มาเยือนวิทยาเขตปราจีนบุรี',
          en: 'The KMUTNB landmark identifies the main entrance to the Prachinburi campus.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.entrance.panorama,
            alt: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'Front view of the university landmark' },
            caption: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'University landmark' }
          },
          {
            src: tourMedia.entranceRoad.panorama,
            alt: { th: 'ถนนบริเวณทางเข้ามหาวิทยาลัย', en: 'Road by the university entrance' },
            caption: { th: 'ถนนบริเวณทางเข้า', en: 'Entrance road' }
          }
        ]
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
    mapPosition: { x: 1046, y: 159  },
    hotspots: [
      { id: 'road-to-entrance', type: 'scene', target: 'entrance', yaw: 200, pitch: 1 },
      { id: 'road-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: -50, pitch: -2 },{
        id: 'bus-landmark-info',
        type: 'info',
        yaw: 130,
        pitch: 1,
        title: { th: 'จุดขึ้นรถเมล์เที่ยวรอบปราจีนบุรี', en: 'Bus boarding point for the Prachinburi sightseeing tour' },
        description: {
          th: 'จุดเด่นบริเวณทางเข้าที่แสดงอักษรย่อ KMUTNB และต้อนรับผู้มาเยือนวิทยาเขตปราจีนบุรี',
          en: 'The KMUTNB landmark identifies the main entrance to the Prachinburi campus.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: infoMedia.busPage1,
            alt: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'Front view of the university landmark' },
            caption: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'University landmark' }
          },
          {
            src: infoMedia.busPage2,
            alt: { th: 'ถนนบริเวณทางเข้ามหาวิทยาลัย', en: 'Road by the university entrance' },
            caption: { th: 'ถนนบริเวณทางเข้า', en: 'Entrance road' }
          },
          {
            src: infoMedia.busPage3,
            alt: { th: 'ถนนบริเวณทางเข้ามหาวิทยาลัย', en: 'Road by the university entrance' },
            caption: { th: 'ถนนบริเวณทางเข้า', en: 'Entrance road' }
          }
        ]
      }
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
    mapPosition: {  x: 1009, y: 176   },
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
    mapPosition: {  x: 1007, y: 193  },
    mapLandmark: true,
    hotspots: [
      { id: 'memorial-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 120, pitch: 0 },
      {
        id: 'memorial-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อนุสรณ์ประจำวิทยาเขต', en: 'Campus memorial' },
        description: {
          th: 'อนุสรณ์เป็นหนึ่งในจุดสำคัญของพื้นที่ลานภายในมหาวิทยาลัย',
          en: 'The memorial is one of the notable landmarks in the campus plaza.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.memorial.panorama,
            alt: { th: 'อนุสรณ์ประจำวิทยาเขต', en: 'Campus memorial' },
            caption: { th: 'อนุสรณ์ประจำวิทยาเขต', en: 'Campus memorial' }
          },
          {
            src: tourMedia.memorialPlaza.panorama,
            alt: { th: 'ลานบริเวณอนุสรณ์', en: 'Plaza surrounding the memorial' },
            caption: { th: 'ลานอนุสรณ์', en: 'Memorial plaza' }
          }
        ]
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
    mapPosition: {  x: 985, y: 193 },
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
    mapPosition: {  x: 926, y: 249  },
    mapLandmark: true,
    hotspots: [
      { id: 'hotel-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 180, pitch: -2 },
      {
        id: 'hotel-info',
        type: 'info',
        yaw: 0,
        pitch: 4,
        title: { th: 'อาคารโรงแรมวิลลาวิชาลัย', en: 'Villa Wichalai Hotel building' },
        description: {
          th: 'อาคารปฏิบัติการการท่องเที่ยวและโรงแรม วิลลาวิชาลัยเปิดให้บริการห้องพัก จำนวนถึง 33 ห้อง ท่ามกลางบรรยากาศร่มรื่น ทุกห้องสามารถมองเห็นวิววนอุทยานเขาอีโต้ สะดวกสบายด้วยการรักษาความปลอดภัยตลอด 24 ชั่วโมง อีกทั้งสถานที่ตั้งของโรงแรมอยู่ใกล้ทางขึ้นอุทยานแห่งชาติเขาใหญ่เพียง 10 นาที',
          en: 'Villa Wichalai, a tourism and hotel training facility, offers 33 guest rooms set amidst a lush, shady atmosphere. Every room features a view of Khao E-To Forest Park, and guests enjoy the convenience of 24-hour security. Additionally, the hotel is located just 10 minutes from the entrance to Khao Yai National Park.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.vallayaHotel.panorama,
            alt: { th: 'อาคารโรงแรมวิลลาวิชาลัย', en: 'Villa Wichalai Hotel building' },
            caption: { th: 'อาคารโรงแรม', en: 'Hotel building' }
          },
          {
            src: tourMedia.campusRoad1.panorama,
            alt: { th: 'ถนนใกล้อาคารโรงแรม', en: 'Road near the hotel building' },
            caption: { th: 'ถนนสายหลักใกล้อาคาร', en: 'Nearby main road' }
          }
        ]
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
    mapPosition: { x: 937, y: 222  },
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
    mapPosition: {   x: 889, y: 252  },
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
    mapPosition: {  x: 868, y: 263  },
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
    mapPosition: {  x: 895, y: 260  },
    mapLandmark: true,
    hotspots: [
      { id: 'building-1-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -2 },
      { id: 'building-1-to-building-2', type: 'scene', target: 'campusBuilding2', yaw: 90 ,pitch: 0 },
      {
        id: 'building-1-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ', en: 'Faculty of Business Administration and Industrial Services' },
        description: {
          th: 'ภาควิชาการจัดการอุตสาหกรรมการท่องเที่ยวและการโรงแรมแขนงวิชาการจัดการธุรกิจ (ในภาควิชาการจัดการอุตสาหกรรม) โครงสร้างคณะ: ประกอบด้วย 3 ส่วนงานคือ สำนักงานคณบดี, ภาควิชาบริหารธุรกิจท่องเที่ยวและโรงแรม และภาควิชาบริหารธุรกิจอุตสาหกรรมและการค้า หลักสูตรที่เปิดสอน: เริ่มเปิดสอนในปีการศึกษา 2559 ในระดับปริญญาตรี (บริหารธุรกิจบัณฑิต - บธ.บ.) 2 สาขาวิชา คือ: สาขาการจัดการอุตสาหกรรมการท่องเที่ยวและโรงแรม สาขาบริหารธุรกิจอุตสาหกรรมและการค้า',
          en: 'Department of Tourism and Hotel Industry Management (under the Industrial Management Department); Faculty Structure: Comprises three units—the Office of the Dean, the Department of Tourism and Hotel Business Administration, and the Department of Industrial and Trade Business Administration. Programs Offered: Instruction began in the 2016 academic year at the bachelor\'s degree level (Bachelor of Business Administration - B.B.A.) in two majors: Tourism and Hotel Industry Management, and Industrial and Trade Business Administration.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusBuilding1.panorama,
            alt: { th: 'อาคารคณะบริหารธุรกิจและอุตสาหกรรมบริการ', en: 'Faculty of Business Administration and Service Industries Building' },
            caption: { th: 'มุมหน้าอาคาร', en: 'Building view' }
          },
          {
            src: tourMedia.campusRoad4.panorama,
            alt: { th: 'ถนนทางแยกใกล้อาคารจุดที่ 1', en: 'Road junction near building point 1' },
            caption: { th: 'ทางเข้าจากถนนสายหลัก', en: 'Approach from the main road' }
          }
        ]
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
    mapPosition: {  x: 857, y: 283  },
    mapLandmark: true,
    hotspots: [
      { id: 'building-2-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -2 },
      {
        id: 'building-2-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อุทยานเทคโนโลยี มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', en: 'KMUTNB Techno Park' },
        description: {
          th: 'เป็นหน่วยงานกลาง (One Stop Service) ที่เป็นศูนย์รวมประสานงานการให้บริการวิชาการ งานวิจัยระดับสูง และพัฒนานวัตกรรมเพื่ออุตสาหกรรมที่มหาวิทยาลัยมีความเชี่ยวชาญเฉพาะ เป็นศูนย์รวมประสานงานการให้บริการวิชาการ งานวิจัยระดับสูง ให้สามารถนำไปใช้ประโยชน์ในเชิงพาณิชย์ และสร้างเครือข่ายความร่วมมือในลักษณะพันธมิตรอุตสาหกรรมระหว่างสถาบันการศึกษา ภาครัฐและเอกชน รวมถึงเป็นการผสมผสานระหว่างความเชี่ยวชาญในสาขาต่าง ๆ ของมหาวิทยาลัยกับภาคธุรกิจอุตสาหกรรม แบ่งเป็น 6 คลัสเตอร์ 25 ศูนย์ปฏิบัติการ 1 สถาบัน และ 1 หลักสูตร',
          en: 'It is a central agency (One Stop Service) that coordinates academic services, advanced research, and innovation development for industry in which the university has specialized expertise. It serves as a central hub for coordinating academic services and advanced research to facilitate commercialization and build collaborative networks in the form of industrial partnerships between educational institutions, the public and private sectors. It also integrates the expertise of the university in various fields with the business and industrial sectors, divided into 6 clusters, 25 operational centers, 1 institute, and 1 program.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusBuilding2.panorama,
            alt: { th: 'อาคารภายในวิทยาเขตจุดที่ 2', en: 'Campus building point 2' },
            caption: { th: 'มุมหน้าอาคาร', en: 'Building view' }
          },
          {
            src: tourMedia.campusRoad4.panorama,
            alt: { th: 'ถนนทางแยกใกล้อาคารจุดที่ 2', en: 'Road junction near building point 2' },
            caption: { th: 'ทางเข้าจากถนนสายหลัก', en: 'Approach from the main road' }
          }
        ]
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
    mapPosition: {   x: 851, y: 273   },
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
    mapPosition: {  x: 823, y: 290  },
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
    mapPosition: {  x: 729, y: 267  },
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
    mapPosition: { x: 701, y: 288 },
    mapLandmark: true,
    hotspots: [
      { id: 'building-3-to-campus-road-7', type: 'scene', target: 'campusRoad7', yaw: 180, pitch: -3 },
      {
        id: 'building-3-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารหอประชุมเเละกิจการนักศึกษา', en: 'Auditorium and Student Affairs Building' },
        description: {
          th: 'อาคารหอประชุมเเละกิจการนักศึกษา เป็นอาคารที่ทำกิจการต่างๆภายใน',
          en: 'The Auditorium and Student Affairs Building is a building that houses various activities within the organization.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusBuilding3.panorama,
            alt: { th: 'อาคารบริเวณปลายเส้นทาง', en: 'Building at the end of the route' },
            caption: { th: 'อาคารปลายเส้นทาง', en: 'Route-end building' }
          },
          {
            src: tourMedia.campusRoad7.panorama,
            alt: { th: 'ถนนใกล้อาคารปลายเส้นทาง', en: 'Road near the route-end building' },
            caption: { th: 'ทางแยกก่อนถึงอาคาร', en: 'Junction before the building' }
          }
        ]
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
    mapPosition: {  x: 694, y: 246  },
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
    mapPosition: { x: 639, y: 215 },
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
    mapPosition: { x: 575, y: 181 },
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
    mapPosition: { x: 526, y: 178 },
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
    mapPosition: { x: 486, y: 185 },
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
    mapPosition: { x: 438, y: 203 },
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
    mapPosition: { x: 404, y: 235 },
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
    mapPosition: { x: 374, y: 297 },
    hotspots: [
      { id: 'campus-road-15-to-road-14', type: 'scene', target: 'campusRoad14', yaw: 180, pitch: -3 },
      { id: 'campus-road-15-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 150, pitch: -3 },
      { id: 'campus-road-15-to-road-18', type: 'scene', target: 'campusRoad18', yaw: 0, pitch: -3 }
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
    mapPosition: { x: 351, y: 299 },
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
    mapPosition: { x: 344, y: 272 },
    hotspots: [
      { id: 'campus-road-17-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 200, pitch: -3 }
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
    mapPosition: { x: 411, y: 449 },
    hotspots: [
      { id: 'campus-road-18-to-road-15', type: 'scene', target: 'campusRoad15', yaw: 180, pitch: -3 },
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
    mapPosition: { x: 388, y: 430 },
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
    mapPosition: { x: 373, y: 418 },
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
    mapPosition: { x: 352, y: 401 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-21-to-road-20', type: 'scene', target: 'campusRoad20', yaw: -90, pitch: -3 },
      { id: 'campus-road-21-to-road-22', type: 'scene', target: 'campusRoad22', yaw: 90, pitch: -3 },
      {
        id: 'Administration Building-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารบริหาร', en: 'Administration Building' },
        description: {
          th: 'อาคารบริหารใน มจพ. วิทยาเขตปราจีนบุรี ใช้เป็นศูนย์กลางการให้บริการนักศึกษา งานกิจการนักศึกษา ทุนการศึกษา และห้องประชุมสำคัญของมหาวิทยาลัยงานบริการและกิจกรรมหลักกองกิจการนักศึกษาและสวัสดิการ: ให้บริการเรื่องกู้ยืมเงิน กยศ. ทุนการศึกษา และการผ่อนผันการเกณฑ์ทหารงานพยาบาลเบื้องต้น: ให้บริการตรวจรักษาพยาบาลเบื้องต้น ทำแผล และจ่ายยาห้องประชุมใหญ่: ใช้จัดกิจกรรมอบรม สัมมนานักศึกษาใหม่ และพิธีการต่างๆ ของมหาวิทยาลัยจุดติดต่อส่วนกลาง: เป็นสถานที่ประสานงานและติดต่อราชการภายในวิทยาเขต',
          en: 'The administrative building at KMUTT Prachinburi Campus serves as a central hub for student services, student affairs, scholarships, and important university meeting rooms. Key services and activities include: Student Affairs and Welfare Division: providing services related to student loans (Government Student Loan Fund), scholarships, and military service deferment; Basic Medical Services: providing basic medical check-ups, wound care, and medication; Main Meeting Room: used for training activities, seminars for new students, and various university ceremonies; Central Contact Point: serving as the location for coordinating and contacting government agencies within the campus.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad21.panorama,
            alt: { th: 'อาคารบริหาร', en: 'Administration Building' },
            caption: { th: 'อาคารบริหาร', en: 'Administration Building' }
          }
        ]
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
    mapPosition: { x: 250, y: 422 },
    mapLandmark: true,
    hotspots: [
      { id: 'campus-road-22-to-road-21', type: 'scene', target: 'campusRoad21', yaw: 180, pitch: -3 },
      { id: 'campus-road-22-to-road-26', type: 'scene', target: 'campusRoad26', yaw: 90, pitch: -3 },
       {
        id: 'Sirindhorn Building-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารสิรินธร', en: 'Sirindhorn Building' },
        description: {
          th: 'อาคารสิรินธร ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.) วิทยาเขตปราจีนบุรี หลักๆ ใช้เป็น สำนักหอสมุดกลาง สำหรับค้นคว้าและอ่านหนังสือ รวมถึงเป็นที่ตั้งของ สำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ บนชั้น 6 ที่มีบริการห้องคอมพิวเตอร์และพื้นที่การเรียนรู้หน้าที่และบริการภายในอาคารหอสมุดกลาง (ห้องสมุด): เป็นศูนย์รวมทรัพยากรสารสนเทศ หนังสือ และพื้นที่สำหรับให้นักศึกษามานั่งอ่านหนังสือและค้นคว้าข้อมูลบริการคอมพิวเตอร์ (ชั้น 6): จัดเตรียมเครื่องคอมพิวเตอร์พร้อมโปรแกรมการศึกษาและวิจัย เช่น Microsoft Office, Adobe Creative Cloud และ SPSSพื้นที่เรียนรู้ (Learning Space): รองรับการใช้งานและอ่านหนังสือกลุ่มหรือเดี่ยวของนักศึกษาจุดบริการสอบ/อบรม: ใช้เป็นห้องปฏิบัติการและสถานที่จัดสอบหรืออบรมด้านดิจิทัลต่างๆ ของมหาวิทยาลัย',
          en: 'The Sirindhorn Building at King Mongkut\'s University of Technology North Bangkok (KMUTNB), Prachinburi Campus, primarily serves as the Central Library, providing a space for research and reading. It also houses the Computer and Information Technology Center on the 6th floor, offering computer labs and learning spaces. Functions and services within the building include: Central Library (Library): A central repository of information resources, books, and a space for students to read and research. Computer Services (6th Floor): Equipped with computers and educational and research software such as Microsoft Office, Adobe Creative Cloud, and SPSS. Learning Space: Supports group and individual student reading and research. Examination/Training Center: Used as a laboratory and venue for conducting examinations or training in various digital areas offered by the university.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad22.panorama,
            alt: { th: 'อาคารสิรินธร', en: 'Sirindhorn Building' },
            caption: { th: 'อาคารสิรินธร', en: 'Sirindhorn Building' }
          }
        ]
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
    mapPosition: { x: 331, y: 324 },
    hotspots: [
      { id: 'campus-road-23-to-road-16', type: 'scene', target: 'campusRoad16', yaw: 180, pitch: -3 },
      { id: 'campus-road-23-to-road-24', type: 'scene', target: 'campusRoad24', yaw: 0, pitch: -3 },
      {
        id: 'luang-pho-sing-shrine-info',
        type: 'info',
        yaw: 98,
        pitch: 4,
        title: { th: 'หอพระหลวงพ่อสิง', en: 'Luang Pho Sing Shrine' },
        description: {
          th: 'หอพระหลวงพ่อสิงเป็นจุดสักการะภายในบริเวณมหาวิทยาลัย',
          en: 'The Luang Pho Sing Shrine is a place of worship within the university grounds.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad23.panorama,
            alt: { th: 'หอพระหลวงพ่อสิงภายในบริเวณมหาวิทยาลัย', en: 'Luang Pho Sing Shrine on the university grounds' },
            caption: { th: 'หอพระหลวงพ่อสิง', en: 'Luang Pho Sing Shrine' }
          }
        ]
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
    mapPosition: { x: 311, y: 348 },
    hotspots: [
      { id: 'campus-road-24-to-road-23', type: 'scene', target: 'campusRoad23', yaw: 180, pitch: -3 },
      { id: 'campus-road-24-to-road-25', type: 'scene', target: 'campusRoad25', yaw: 0, pitch: -3 },
      {
        id: 'faculty-technology-car-parking-info',
        type: 'info',
        yaw: 108,
        pitch: 2,
        title: { th: 'ที่จอดรถยนต์ในคณะเทคโนโลยี', en: 'Faculty of Technology Car Parking' },
        description: {
          th: 'พื้นที่จอดรถยนต์ภายในบริเวณคณะเทคโนโลยี',
          en: 'The car parking area within the Faculty of Technology.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad24.panorama,
            alt: { th: 'พื้นที่จอดรถยนต์ในคณะเทคโนโลยี', en: 'Car parking at the Faculty of Technology' },
            caption: { th: 'ที่จอดรถยนต์ในคณะเทคโนโลยี', en: 'Faculty of Technology Car Parking' }
          }
        ]
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
    mapPosition: { x: 291, y: 373 },
    hotspots: [
      { id: 'campus-road-25-to-road-24', type: 'scene', target: 'campusRoad24', yaw: 150, pitch: -3 },
      { id: 'campus-road-25-to-road-26', type: 'scene', target: 'campusRoad26', yaw: -50, pitch: -3 },
      {
        id: 'faculty-technology-motorcycle-parking-1-info',
        type: 'info',
        yaw: 30,
        pitch: 1,
        title: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี', en: 'Faculty of Technology Motorcycle Parking' },
        description: {
          th: 'พื้นที่จอดรถจักรยานยนต์ภายในบริเวณคณะเทคโนโลยี',
          en: 'The motorcycle parking area within the Faculty of Technology.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad25.panorama,
            alt: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยีจากจุดที่ 1', en: 'Faculty of Technology motorcycle parking from Point 1' },
            caption: { th: 'มุมมองจากจุดที่ 1', en: 'View from Point 1' }
          },
          {
            src: tourMedia.campusRoad26.panorama,
            alt: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยีจากจุดที่ 2', en: 'Faculty of Technology motorcycle parking from Point 2' },
            caption: { th: 'มุมมองจากจุดที่ 2', en: 'View from Point 2' }
          }
        ]
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
    mapPosition: { x: 270, y: 398 },
    hotspots: [
      { id: 'campus-road-26-to-road-25', type: 'scene', target: 'campusRoad25', yaw: 85, pitch: -3 },
      { id: 'campus-road-26-to-road-22', type: 'scene', target: 'campusRoad22', yaw: -90, pitch: -3 },
      {
        id: 'faculty-technology-motorcycle-parking-2-info',
        type: 'info',
        yaw: 0,
        pitch: 2,
        title: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี', en: 'Faculty of Technology Motorcycle Parking' },
        description: {
          th: 'พื้นที่จอดรถจักรยานยนต์ภายในบริเวณคณะเทคโนโลยี',
          en: 'The motorcycle parking area within the Faculty of Technology.'
        },
        reference: wikipediaReference,
        images: [
          {
            src: tourMedia.campusRoad25.panorama,
            alt: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยีจากจุดที่ 1', en: 'Faculty of Technology motorcycle parking from Point 1' },
            caption: { th: 'มุมมองจากจุดที่ 1', en: 'View from Point 1' }
          },
          {
            src: tourMedia.campusRoad26.panorama,
            alt: { th: 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยีจากจุดที่ 2', en: 'Faculty of Technology motorcycle parking from Point 2' },
            caption: { th: 'มุมมองจากจุดที่ 2', en: 'View from Point 2' }
          }
        ]
      }
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
    mapHeadingOffset: (scene as TourScene).mapHeadingOffset,
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
    const mapHeadingOffset = (scene as TourScene).mapHeadingOffset;
    if (mapHeadingOffset !== undefined && !Number.isFinite(mapHeadingOffset)) {
      errors.push(`Scene ${scene.id} map heading offset is invalid`);
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
        const hasFallbackContent = Boolean(hotspot.title || hotspot.description || hotspot.reference || hotspot.images?.length);
        if (hasFallbackContent) {
          if (!hotspot.title || !hotspot.description || !hotspot.reference || !hotspot.images?.length) {
            errors.push(`Info hotspot ${hotspot.id} fallback content must be complete when provided`);
          }
          for (const locale of locales) {
            if (!hotspot.title?.[locale].trim() || !hotspot.description?.[locale].trim()) {
              errors.push(`Info hotspot ${hotspot.id} fallback content is missing ${locale} text`);
            }
            if (!hotspot.reference?.label[locale].trim()) {
              errors.push(`Info hotspot ${hotspot.id} reference is missing ${locale} label`);
            }
          }
        }
        if (hotspot.reference?.url !== undefined) {
          try {
            const referenceUrl = new URL(hotspot.reference.url);
            if (referenceUrl.protocol !== 'http:' && referenceUrl.protocol !== 'https:') {
              errors.push(`Info hotspot ${hotspot.id} reference must use HTTP or HTTPS`);
            }
          } catch {
            errors.push(`Info hotspot ${hotspot.id} has an invalid reference URL`);
          }
        }
        for (const image of hotspot.images ?? []) {
          if (!image.src.startsWith('/mainimages/')) {
            errors.push(`Info hotspot ${hotspot.id} must use /mainimages media: ${image.src}`);
          }
          if (image.src.includes('/tour/pano') || image.src.includes('/tour/thumbs')) {
            errors.push(`Info hotspot ${hotspot.id} references legacy tour media: ${image.src}`);
          }
          if (image.src.includes('/tiles/')) {
            errors.push(`Info hotspot ${hotspot.id} references generated panorama tiles: ${image.src}`);
          }
          for (const locale of locales) {
            if (!image.alt[locale].trim()) {
              errors.push(`Info hotspot ${hotspot.id} image is missing ${locale} alternative text`);
            }
            if (image.caption && !image.caption[locale].trim()) {
              errors.push(`Info hotspot ${hotspot.id} image is missing ${locale} caption`);
            }
          }
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
