# KMUTNB Prachinburi Virtual Tour

เว็บไซต์ Virtual Open House แบบ 360° สำหรับมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี

โปรเจกต์ถูก migrate จาก Vite/Vanilla TypeScript เป็น Next.js App Router เพื่อรองรับการเพิ่มหลายทัวร์, หน้า admin, API, authentication และข้อมูลจากฐานข้อมูลในอนาคต โดยยังคง Photo Sphere Viewer และข้อมูลฉากเดิมไว้

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 สำหรับ utility pipeline และ design system
- Photo Sphere Viewer 5 พร้อม Virtual Tour, Markers และ Autorotate plugins
- Zustand สำหรับ shared client state ของ locale, scene, loading และ viewer controls
- Vitest สำหรับ scene graph และ localization tests
- Next Route Handler ที่ `/api/health` เป็น backend boundary เริ่มต้น
- Custom service worker สำหรับ cache หน้าเว็บ, panorama และ thumbnails
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
npm run typecheck    # TypeScript strict check
npm test             # scene graph / localization tests
npm run build        # Next.js production build
npm run start        # serve production build on port 8360
npm run check        # typecheck + tests + legacy syntax + build
```

## โครงสร้าง

```text
app/layout.tsx              metadata, viewport และ global styles
app/page.tsx                หน้าแรกของ App Router
app/api/health/route.ts     backend/API boundary สำหรับ health check
components/TourApp.tsx      React UI, dialogs, scene list และ controls
components/TourViewer.tsx   Client Component ที่สร้าง Photo Sphere Viewer
components/ModalDialog.tsx  accessible native dialog wrapper
src/tour-data.ts            source of truth ของ scene, hotspot และ route graph
src/i18n.ts                 ข้อความ UI ภาษาไทย/อังกฤษ
src/stores/tour-store.ts    Zustand store สำหรับ shared client state
src/styles.css              Photo Sphere Viewer styles และ design system
public/tour/                panorama และ thumbnails ที่ serve แบบ static
public/sw.js                offline cache strategy
360-tour-offline.html       legacy single-file compatibility artifact
```

## เพิ่มฉาก

เพิ่มไฟล์ panorama และ thumbnail ใน `public/tour/` แล้วแก้ข้อมูลใน `src/tour-data.ts` เพียงจุดเดียว ระบบจะสร้าง scene selector, hotspot navigation, route map และ text-only tour จาก source เดียวกัน

## Offline และ privacy

Service worker จะ cache application shell, panorama และ thumbnails เมื่อเปิดผ่าน `localhost` หรือ HTTPS หลังจากติดตั้งครั้งแรก การเปิดผ่าน `file://` ไม่รองรับเพราะ WebGL, ES modules และ service worker ต้องใช้ HTTP origin

เว็บไซต์ไม่มี analytics, marketing cookies หรือ tracking form ภาพทั้งหมดถูก serve จาก repository นี้ และไม่มี runtime request ไปยัง CDN ภายนอก

## Legacy

`360-tour-offline.html` เก็บไว้เพื่อ compatibility เท่านั้น ไม่ใช่ source หลักของ Next.js และไม่ถูกใช้เป็นหน้า deploy หลัก

ก่อนส่งงานให้รัน:

```bash
npm run check
```
