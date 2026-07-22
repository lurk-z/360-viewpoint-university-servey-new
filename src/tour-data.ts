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

function mainPanorama(fileName: string): SceneMedia {
  return { panorama: mainImage(fileName) };
}

function busImage(fileName: string): string {
  return `/mainimages/bus/${fileName}`;
}


function busPanorama(fileName: string): SceneMedia {
  return { panorama: busImage(fileName) };
}


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
  buspage1: busPanorama('page1.jpg'),
  buspage2: busPanorama('page2.jpg'),
  buspage3: busPanorama('page3.jpg')


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
  readonly panorama: string;
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
        images: [
          {
            src: tourMedia.buspage1.panorama,
            alt: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'Front view of the university landmark' },
            caption: { th: 'มุมหน้าป้ายมหาวิทยาลัย', en: 'University landmark' }
          },
          {
            src: tourMedia.buspage2.panorama,
            alt: { th: 'ถนนบริเวณทางเข้ามหาวิทยาลัย', en: 'Road by the university entrance' },
            caption: { th: 'ถนนบริเวณทางเข้า', en: 'Entrance road' }
          },
          {
            src: tourMedia.buspage3.panorama,
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
    title: { th: 'ลานอนุสรณ์', en: 'Memorial Plaza' },
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
      { id: 'plaza-to-campus-road-1', type: 'scene', target: 'campusRoad1', yaw: 0, pitch: -2 }
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
    mapPosition: {  x: 1007, y: 193  },
    hotspots: [
      { id: 'memorial-to-plaza', type: 'scene', target: 'memorialPlaza', yaw: 180, pitch: -2 },
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
      { id: 'campus-road-2-to-hotel', type: 'scene', target: 'vallayaHotel', yaw: -70, pitch: -2 },
      { id: 'campus-road-2-to-road-3', type: 'scene', target: 'campusRoad3', yaw: 0, pitch: -2 }
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
      { id: 'campus-road-3-to-road-2', type: 'scene', target: 'campusRoad2', yaw: 180, pitch: -2 },
      { id: 'campus-road-3-to-road-4', type: 'scene', target: 'campusRoad4', yaw: 0, pitch: -2 },
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
      { id: 'campus-road-5-to-road-6', type: 'scene', target: 'campusRoad6', yaw: 0, pitch: -2 }
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
      { id: 'campus-road-6-to-road-5', type: 'scene', target: 'campusRoad5', yaw: 180, pitch: -2 },
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
      { id: 'campus-road-7-to-building-3', type: 'scene', target: 'campusBuilding3', yaw: -45, pitch: -2 }
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
    mapPosition: {  x: 729, y: 267  },
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
