export const panoramaTileConfig = {
  width: 7680,
  height: 3840,
  cols: 8,
  rows: 4,
  tileSize: 960,
  baseWidth: 2048,
  baseHeight: 1024
} as const;

export interface TiledPanoramaMedia {
  readonly width: number;
  readonly cols: number;
  readonly rows: number;
  readonly baseUrl: string;
  readonly tileUrlPattern: string;
}

export interface SceneMedia {
  /** Original 7680×3840 source. It is preserved and is not loaded by the viewer. */
  readonly sourcePanorama: string;
  readonly tiledPanorama: TiledPanoramaMedia;
}

/**
 * Files inside public/mainimages are served from /mainimages.
 * Pass only the file name here; never include the public directory in a URL.
 */
function mainImage(fileName: string): string {
  return `/mainimages/${fileName}`;
}

function tiledMainImage(fileName: string): SceneMedia {
  const stem = fileName.replace(/\.jpe?g$/i, '');
  const tileRoot = `tiles/${stem}`;
  return {
    sourcePanorama: mainImage(fileName),
    tiledPanorama: {
      width: panoramaTileConfig.width,
      cols: panoramaTileConfig.cols,
      rows: panoramaTileConfig.rows,
      baseUrl: mainImage(`${tileRoot}/base.jpg`),
      tileUrlPattern: mainImage(`${tileRoot}/tile-{col}-{row}.jpg`)
    }
  };
}

export const tourMap = {
  image: mainImage('map/mainmap.png'),
  width: 1150,
  height: 577
} as const;

export const tourMedia = {
  entrance: tiledMainImage('temp1.jpg'),
  entranceRoad: tiledMainImage('temp1-2.jpg'),
  memorialPlaza: tiledMainImage('temp1-3.jpg'),
  memorial: tiledMainImage('temp1-3-1.jpg'),
  campusRoad1: tiledMainImage('temp1-4.jpg'),
  vallayaHotel: tiledMainImage('temp1-4-1.jpg'),
  campusRoad2: tiledMainImage('temp1-4.5.jpg'),
  campusRoad3: tiledMainImage('temp1-4.9.jpg'),
  campusRoad4: tiledMainImage('temp1-5.jpg'),
  campusBuilding1: tiledMainImage('temp1-5-1.jpg'),
  campusBuilding2: tiledMainImage('temp1-5-2.jpg'),
  campusRoad5: tiledMainImage('temp2-1.jpg'),
  campusRoad6: tiledMainImage('temp2-2.jpg'),
  campusRoad7: tiledMainImage('temp2-3.jpg'),
  campusBuilding3: tiledMainImage('temp2-4.jpg')
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

export interface InfoHotspot extends HotspotBase {
  readonly type: 'info';
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  /** One or more supporting images shown in the centered information gallery. */
  readonly images?: readonly InfoImage[];
}

export type Hotspot = SceneHotspot | InfoHotspot;

export interface TourScene {
  readonly id: SceneId;
  readonly sourcePanorama: string;
  readonly tiledPanorama: TiledPanoramaMedia;
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

/** Converts the degree values stored in tour data to Photo Sphere Viewer angle syntax. */
export function toDegrees(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid angle: ${value}`);
  }
  return `${Object.is(value, -0) ? 0 : value}deg`;
}

export function panoramaTileUrl(media: TiledPanoramaMedia, col: number, row: number): string {
  if (!Number.isInteger(col) || col < 0 || col >= media.cols) {
    throw new Error(`Invalid panorama tile column: ${col}`);
  }
  if (!Number.isInteger(row) || row < 0 || row >= media.rows) {
    throw new Error(`Invalid panorama tile row: ${row}`);
  }
  return media.tileUrlPattern.replace('{col}', String(col)).replace('{row}', String(row));
}

export function getSceneAssetUrls(scene: TourScene): readonly string[] {
  const assets = [scene.tiledPanorama.baseUrl];
  for (let row = 0; row < scene.tiledPanorama.rows; row += 1) {
    for (let col = 0; col < scene.tiledPanorama.cols; col += 1) {
      assets.push(panoramaTileUrl(scene.tiledPanorama, col, row));
    }
  }
  return assets;
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
    mapPosition: { x: 360, y: 290 },
    hotspots: [
      { id: 'entrance-to-road', type: 'scene', target: 'entranceRoad', yaw: 100, pitch: -3 },
      {
        id: 'entrance-landmark-info',
        type: 'info',
        yaw: 0,
        pitch: 1,
        title: { th: 'ป้ายมหาวิทยาลัย', en: 'KMUTNB landmark' },
        description: {
          th: 'จุดเด่นบริเวณทางเข้าที่แสดงอักษรย่อ KMUTNB และต้อนรับผู้มาเยือนวิทยาเขตปราจีนบุรี',
          en: 'The KMUTNB landmark identifies the main entrance to the Prachinburi campus.'
        },
        images: [
          {
            src: tourMedia.entrance.tiledPanorama.baseUrl,
            alt: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'Front view of the university landmark' },
            caption: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'University landmark' }
          },
          {
            src: tourMedia.entranceRoad.tiledPanorama.baseUrl,
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
    mapPosition: { x: 330, y: 320 },
    hotspots: [
      { id: 'road-to-entrance', type: 'scene', target: 'entrance', yaw: 170, pitch: -3 },
      { id: 'road-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'memorialPlaza',
    ...tourMedia.memorialPlaza,
    title: { th: 'ลานอนุสรณ์', en: 'Memorial Plaza' },
    description: {
      th: 'พื้นที่ลานกลางแจ้งและสวนริมถนนภายในวิทยาเขต เชื่อมต่อไปยังอนุสรณ์และเส้นทางส่วนถัดไป',
      en: 'An open plaza and garden beside the campus road, connecting to the memorial and the next route segment.'
    },
    tags: { th: ['ลาน', 'สวน', 'อนุสรณ์'], en: ['Plaza', 'Garden', 'Memorial'] },
    initialView: { yaw: 0, pitch: -1, zoom: 22 },
    mapPosition: { x: 290, y: 340 },
    hotspots: [
      { id: 'plaza-to-road', type: 'scene', target: 'entranceRoad', yaw: 175, pitch: -3 },
      { id: 'plaza-to-memorial', type: 'scene', target: 'memorial', yaw: -55, pitch: -2 },
      { id: 'plaza-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 15, pitch: -3 }
    ]
  },
  {
    id: 'memorial',
    ...tourMedia.memorial,
    title: { th: 'จุดอนุสรณ์ภายในวิทยาเขต', en: 'Campus Memorial' },
    description: {
      th: 'จุดอนุสรณ์ในพื้นที่ลานกลางแจ้งของวิทยาเขต เป็นจุดแยกจากเส้นทางหลักและสามารถย้อนกลับไปยังลานได้',
      en: 'A campus memorial in the open plaza, reached from and connected back to the main route.'
    },
    tags: { th: ['อนุสรณ์', 'จุดสำคัญ', 'กลางแจ้ง'], en: ['Memorial', 'Landmark', 'Outdoor'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 270, y: 350 },
    hotspots: [
      { id: 'memorial-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 180, pitch: -3 },
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
        images: [
          {
            src: tourMedia.memorial.tiledPanorama.baseUrl,
            alt: { th: 'อนุสรณ์ประจำวิทยาเขต', en: 'Campus memorial' },
            caption: { th: 'อนุสรณ์ประจำวิทยาเขต', en: 'Campus memorial' }
          },
          {
            src: tourMedia.memorialPlaza.tiledPanorama.baseUrl,
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
    mapPosition: { x: 255, y: 370 },
    hotspots: [
      { id: 'campus-road-1-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 180, pitch: -3 },
      { id: 'campus-road-1-to-hotel', type: 'scene', target: 'vallayaHotel', yaw: -70, pitch: -2 },
      { id: 'campus-road-1-to-road-2', type: 'scene', target: 'campusRoad2', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'vallayaHotel',
    ...tourMedia.vallayaHotel,
    title: { th: 'โรงแรมวไลยอลงกรณ์', en: 'Vallayalangkorn Hotel' },
    description: {
      th: 'อาคารโรงแรมวไลยอลงกรณ์ภายในวิทยาเขต เป็นจุดแยกที่เชื่อมกลับไปยังถนนเส้นหลัก',
      en: 'Vallayalangkorn Hotel is a campus building located just off the main internal road.'
    },
    tags: { th: ['โรงแรม', 'อาคาร', 'จุดบริการ'], en: ['Hotel', 'Building', 'Service'] },
    initialView: { yaw: 0, pitch: 1, zoom: 24 },
    mapPosition: { x: 215, y: 385 },
    hotspots: [
      { id: 'hotel-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 180, pitch: -3 },
      {
        id: 'hotel-info',
        type: 'info',
        yaw: 0,
        pitch: 4,
        title: { th: 'อาคารโรงแรมวไลยอลงกรณ์', en: 'Vallayalangkorn Hotel building' },
        description: {
          th: 'อาคารบริการและที่พักภายในมหาวิทยาลัยซึ่งตั้งอยู่ใกล้ถนนสายหลักของวิทยาเขต',
          en: 'A campus accommodation and service building near the main internal road.'
        },
        images: [
          {
            src: tourMedia.vallayaHotel.tiledPanorama.baseUrl,
            alt: { th: 'อาคารโรงแรมวไลยอลงกรณ์', en: 'Vallayalangkorn Hotel building' },
            caption: { th: 'อาคารโรงแรม', en: 'Hotel building' }
          },
          {
            src: tourMedia.campusRoad1.tiledPanorama.baseUrl,
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
    mapPosition: { x: 270, y: 405 },
    hotspots: [
      { id: 'campus-road-2-to-road-1', type: 'scene', target: 'campusRoad1', yaw: 180, pitch: -3 },
      { id: 'campus-road-2-to-road-3', type: 'scene', target: 'campusRoad3', yaw: 0, pitch: -3 }
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
    mapPosition: { x: 295, y: 425 },
    hotspots: [
      { id: 'campus-road-3-to-road-2', type: 'scene', target: 'campusRoad2', yaw: 180, pitch: -3 },
      { id: 'campus-road-3-to-road-4', type: 'scene', target: 'campusRoad4', yaw: 0, pitch: -3 }
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
    mapPosition: { x: 320, y: 445 },
    hotspots: [
      { id: 'campus-road-4-to-road-3', type: 'scene', target: 'campusRoad3', yaw: 180, pitch: -3 },
      { id: 'campus-road-4-to-building-1', type: 'scene', target: 'campusBuilding1', yaw: -60, pitch: -2 },
      { id: 'campus-road-4-to-building-2', type: 'scene', target: 'campusBuilding2', yaw: 55, pitch: -2 },
      { id: 'campus-road-4-to-road-5', type: 'scene', target: 'campusRoad5', yaw: 0, pitch: -3 }
    ]
  },
  {
    id: 'campusBuilding1',
    ...tourMedia.campusBuilding1,
    title: { th: 'อาคารภายในวิทยาเขต จุดที่ 1', en: 'Campus Building Point 1' },
    description: {
      th: 'อาคารเรียนและพื้นที่ใช้งานภายในวิทยาเขต สามารถย้อนกลับไปยังถนนเส้นหลักได้',
      en: 'An academic and activity building connected back to the main campus road.'
    },
    tags: { th: ['อาคาร', 'พื้นที่เรียน', 'จุดที่ 1'], en: ['Building', 'Academic', 'Point 1'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 280, y: 465 },
    hotspots: [
      { id: 'building-1-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -3 },
      {
        id: 'building-1-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารภายในวิทยาเขต', en: 'Campus building' },
        description: {
          th: 'อาคารสำหรับการเรียน การทำกิจกรรม และการให้บริการภายในมหาวิทยาลัย',
          en: 'A campus building supporting learning, activities and university services.'
        },
        images: [
          {
            src: tourMedia.campusBuilding1.tiledPanorama.baseUrl,
            alt: { th: 'อาคารภายในวิทยาเขตจุดที่ 1', en: 'Campus building point 1' },
            caption: { th: 'มุมหน้าอาคาร', en: 'Building view' }
          },
          {
            src: tourMedia.campusRoad4.tiledPanorama.baseUrl,
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
    title: { th: 'อาคารภายในวิทยาเขต จุดที่ 2', en: 'Campus Building Point 2' },
    description: {
      th: 'อาคารอีกจุดหนึ่งในกลุ่มอาคารของวิทยาเขต เชื่อมต่อกับถนนเส้นหลักบริเวณเดียวกัน',
      en: 'Another building in the campus complex, connected to the same main road point.'
    },
    tags: { th: ['อาคาร', 'พื้นที่เรียน', 'จุดที่ 2'], en: ['Building', 'Academic', 'Point 2'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 350, y: 465 },
    hotspots: [
      { id: 'building-2-to-campus-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -3 },
      {
        id: 'building-2-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารภายในวิทยาเขต', en: 'Campus building' },
        description: {
          th: 'อาคารสำหรับรองรับการเรียนรู้และกิจกรรมของนักศึกษาและบุคลากร',
          en: 'A building supporting learning and activities for students and staff.'
        },
        images: [
          {
            src: tourMedia.campusBuilding2.tiledPanorama.baseUrl,
            alt: { th: 'อาคารภายในวิทยาเขตจุดที่ 2', en: 'Campus building point 2' },
            caption: { th: 'มุมหน้าอาคาร', en: 'Building view' }
          },
          {
            src: tourMedia.campusRoad4.tiledPanorama.baseUrl,
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
    mapPosition: { x: 365, y: 430 },
    hotspots: [
      { id: 'campus-road-5-to-road-4', type: 'scene', target: 'campusRoad4', yaw: 180, pitch: -3 },
      { id: 'campus-road-5-to-road-6', type: 'scene', target: 'campusRoad6', yaw: 0, pitch: -3 }
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
    mapPosition: { x: 400, y: 405 },
    hotspots: [
      { id: 'campus-road-6-to-road-5', type: 'scene', target: 'campusRoad5', yaw: 180, pitch: -3 },
      { id: 'campus-road-6-to-road-7', type: 'scene', target: 'campusRoad7', yaw: 0, pitch: -3 }
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
    mapPosition: { x: 430, y: 380 },
    hotspots: [
      { id: 'campus-road-7-to-road-6', type: 'scene', target: 'campusRoad6', yaw: 180, pitch: -3 },
      { id: 'campus-road-7-to-building-3', type: 'scene', target: 'campusBuilding3', yaw: -45, pitch: -2 }
    ]
  },
  {
    id: 'campusBuilding3',
    ...tourMedia.campusBuilding3,
    title: { th: 'อาคารภายในวิทยาเขต จุดที่ 3', en: 'Campus Building Point 3' },
    description: {
      th: 'อาคารบริเวณปลายเส้นทางทัวร์ พร้อมลานและพื้นที่เปิดโล่งโดยรอบ',
      en: 'A building at the end of the tour route, surrounded by an open forecourt and green space.'
    },
    tags: { th: ['อาคาร', 'ลาน', 'จุดที่ 3'], en: ['Building', 'Forecourt', 'Point 3'] },
    initialView: { yaw: 0, pitch: 2, zoom: 24 },
    mapPosition: { x: 455, y: 350 },
    hotspots: [
      { id: 'building-3-to-campus-road-7', type: 'scene', target: 'campusRoad7', yaw: 180, pitch: -3 },
      {
        id: 'building-3-info',
        type: 'info',
        yaw: 0,
        pitch: 5,
        title: { th: 'อาคารปลายเส้นทาง', en: 'Route-end building' },
        description: {
          th: 'อาคารและลานอเนกประสงค์บริเวณส่วนปลายของเส้นทางเยี่ยมชมวิทยาเขต',
          en: 'A campus building and open activity area at the end of the visitor route.'
        },
        images: [
          {
            src: tourMedia.campusBuilding3.tiledPanorama.baseUrl,
            alt: { th: 'อาคารบริเวณปลายเส้นทาง', en: 'Building at the end of the route' },
            caption: { th: 'อาคารปลายเส้นทาง', en: 'Route-end building' }
          },
          {
            src: tourMedia.campusRoad7.tiledPanorama.baseUrl,
            alt: { th: 'ถนนใกล้อาคารปลายเส้นทาง', en: 'Road near the route-end building' },
            caption: { th: 'ทางแยกก่อนถึงอาคาร', en: 'Junction before the building' }
          }
        ]
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
    if (ids.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    ids.add(scene.id);

    const mediaUrls = [scene.sourcePanorama, ...getSceneAssetUrls(scene)];
    for (const mediaUrl of mediaUrls) {
      if (!mediaUrl.startsWith('/mainimages/')) {
        errors.push(`Scene ${scene.id} must use /mainimages media: ${mediaUrl}`);
      }
      if (mediaUrl.includes('/tour/pano') || mediaUrl.includes('/tour/thumbs')) {
        errors.push(`Scene ${scene.id} references legacy tour media: ${mediaUrl}`);
      }
    }
    if (scene.tiledPanorama.width !== panoramaTileConfig.width
      || scene.tiledPanorama.cols !== panoramaTileConfig.cols
      || scene.tiledPanorama.rows !== panoramaTileConfig.rows) {
      errors.push(`Scene ${scene.id} has an invalid tile configuration`);
    }
    if (scene.mapPosition.x < 0 || scene.mapPosition.x > tourMap.width) {
      errors.push(`Scene ${scene.id} map x is outside the image`);
    }
    if (scene.mapPosition.y < 0 || scene.mapPosition.y > tourMap.height) {
      errors.push(`Scene ${scene.id} map y is outside the image`);
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
        for (const image of hotspot.images ?? []) {
          if (!image.src.startsWith('/mainimages/')) {
            errors.push(`Info hotspot ${hotspot.id} must use /mainimages media: ${image.src}`);
          }
          if (image.src.includes('/tour/pano') || image.src.includes('/tour/thumbs')) {
            errors.push(`Info hotspot ${hotspot.id} references legacy tour media: ${image.src}`);
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
