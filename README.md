# KMUTNB Prachinburi Virtual Tour

เว็บไซต์ Virtual Open House แบบ 360° สำหรับมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี

โปรเจกต์ถูก migrate จาก Vite/Vanilla TypeScript เป็น Next.js App Router เพื่อรองรับการเพิ่มหลายทัวร์, หน้า admin, API, authentication และข้อมูลจากฐานข้อมูลในอนาคต โดยยังคง Photo Sphere Viewer และข้อมูลฉากเดิมไว้

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 สำหรับ utility pipeline และ design system
- Photo Sphere Viewer 5 พร้อม Virtual Tour, Markers, Autorotate และ Equirectangular Tiles Adapter
- Leaflet 1.9 แบบ `CRS.Simple` สำหรับแผนที่ภาพที่ซูม ลาก และเลือกฉากได้
- Zustand สำหรับ shared client state ของ locale, scene, loading และ viewer controls
- Vitest สำหรับ scene graph และ localization tests
- Next Route Handler ที่ `/api/health` เป็น backend boundary เริ่มต้น
- Custom service worker แบบ network-first สำหรับหน้าเว็บ และ cache panorama เมื่อเปิดใช้งาน
- Vercel สำหรับ deployment

Viewer ถูกแยกเป็น Client Component เพราะต้องใช้ WebGL, DOM และ browser APIs ส่วน layout และ metadata อยู่ใน App Router

## เริ่มใช้งาน

ต้องใช้ Node.js 20.19 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด `http://127.0.0.1:3000`

สำหรับ production:

```bash
npm run build
npm run start
```

`start-tour.bat` จะเปิด Next.js development server หรือ production server จาก `.next/` ที่ `127.0.0.1:8360`

## คำสั่งสำคัญ

```bash
npm run dev          # Next.js development server + HMR
npm run generate:tiles # สร้าง base image และ tiles จาก panorama ต้นฉบับ
npm run typecheck    # TypeScript strict check
npm test             # scene graph / localization tests
npm run check:workers # ตรวจ syntax ของ service worker และ tile generator
npm run build        # Next.js production build
npm run start        # serve production build on port 8360
npm run check        # typecheck + tests + legacy syntax + build
```

## โครงสร้าง

```text
app/layout.tsx              metadata, viewport และ global styles
app/page.tsx                หน้าแรกของ App Router
app/api/health/route.ts     backend/API boundary สำหรับ health check
app/api/tour-assets/route.ts รายชื่อ panorama จาก media object
components/TourApp.tsx      React UI, dialogs, scene list และ controls
components/TourViewer.tsx   Client Component ที่สร้าง Photo Sphere Viewer
components/TourMap.tsx      Client Component ที่สร้างแผนที่ Leaflet
components/ModalDialog.tsx  accessible native dialog wrapper
src/tour-data.ts            source of truth ของ scene, hotspot และ route graph
src/i18n.ts                 ข้อความ UI ภาษาไทย/อังกฤษ
src/stores/tour-store.ts    Zustand store สำหรับ shared client state
src/styles.css              Photo Sphere Viewer styles และ design system
public/tour/                ไฟล์ legacy ที่แอป Next.js ไม่ได้อ้างอิง
public/mainimages/          panorama ทั้ง 15 ฉาก และโฟลเดอร์ map
public/mainimages/tiles/    base image, tiles และ manifest สำหรับ viewer
public/sw.js                offline cache strategy
360-tour-offline.html       legacy single-file compatibility artifact
```

## เพิ่มฉาก

1. วางภาพ panorama ใหม่ใน `public/mainimages/` เช่น `campus-02.jpg`
2. เพิ่ม object ใน `tourMedia` ที่ `src/tour-data.ts` โดยระบุเพียงชื่อไฟล์:

```ts
campus02: tiledMainImage('campus-02.jpg')
```

3. เพิ่มชื่อไฟล์ใน `SOURCE_FILES` ของ `scripts/generate-panorama-tiles.mjs` แล้วรัน `npm run generate:tiles`
4. เพิ่ม scene ที่มี `id: 'campus02'` ใน `tourScenes` แล้วเชื่อม scene hotspot ไป-กลับกับฉากอื่น

ไฟล์ในโฟลเดอร์ `public` ต้องอ้างผ่าน URL ที่ตัดคำว่า `public` ออกเสมอ เช่น `public/mainimages/campus-02.jpg` จะใช้ URL `/mainimages/campus-02.jpg` ระบบ test จะตรวจ path, ไฟล์ที่หาย และเส้นทางฉากให้โดยอัตโนมัติ ค่า `yaw` และ `pitch` ในข้อมูลใช้หน่วยองศา ส่วน `mapPosition` ใช้พิกัดพิกเซลของ `mainmap.png` จากมุมซ้ายบน

## Offline และ privacy

Service worker ทำงานเฉพาะ production โดย precache หน้าเริ่มต้น, manifest, icon และแผนที่ เมื่อผู้ใช้เปิดฉาก ระบบจะ cache base image และ tile ทั้ง 32 ชิ้นของฉากนั้นเบื้องหลัง ฉากที่เคยเปิดจึงหมุนดูได้ครบแบบออฟไลน์ ขณะ development ระบบจะถอน service worker และล้าง cache เก่าของโปรเจกต์เพื่อให้ refresh แล้วเห็นข้อมูลมุมล่าสุดทันที การเปิดผ่าน `file://` ไม่รองรับเพราะ WebGL, ES modules และ service worker ต้องใช้ HTTP origin

เว็บไซต์ไม่มี analytics, marketing cookies หรือ tracking form ภาพทั้งหมดถูก serve จาก repository นี้ และไม่มี runtime request ไปยัง CDN ภายนอก

## Legacy

`360-tour-offline.html` เก็บไว้เพื่อ compatibility เท่านั้น ไม่ใช่ source หลักของ Next.js และไม่ถูกใช้เป็นหน้า deploy หลัก

ก่อนส่งงานให้รัน:

```bash
npm run check
```
