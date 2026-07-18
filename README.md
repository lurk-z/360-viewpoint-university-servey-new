# KMUTNB Prachinburi Virtual Tour

เว็บ Virtual Open House แบบ 360° สำหรับมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี

โปรเจกต์รุ่นใหม่เป็น static application ที่ใช้ **Vite 8 + Vanilla TypeScript + Photo Sphere Viewer 5** ไม่มี backend และไม่ส่งคำขอไปยัง CDN หรือ Google Fonts ระหว่างใช้งาน

## เริ่มใช้งาน

ต้องใช้ Node.js 20.19 ขึ้นไป (แนะนำ Node.js 24)

```bash
npm install
npm run dev
```

เปิด `http://127.0.0.1:5173`

บน Windows สามารถดับเบิลคลิก `start-tour.bat` ได้ ตัว launcher จะให้บริการเฉพาะ `127.0.0.1` และถ้ามี `dist/` จะเปิด production build บน port `8360`

## คำสั่งสำคัญ

```bash
npm run dev          # development server + HMR
npm run typecheck    # TypeScript strict check
npm test             # scene graph / translation tests
npm run build        # production build ไปยัง dist/
npm run preview      # preview production build
npm run check        # typecheck + tests + legacy syntax + build
```

## Stack และเหตุผล

- Vite 8: dev server และ optimized static build
- TypeScript แบบ strict: ตรวจ scene id, hotspot และ translation ตั้งแต่ตอนพัฒนา
- Photo Sphere Viewer 5: renderer แบบ ESM/TypeScript พร้อม Virtual Tour, Markers และ Autorotate plugins
- Vitest: ตรวจ graph, route map และความครบถ้วนของเนื้อหาสองภาษา
- vite-plugin-pwa: precache ตัวแอป ภาพพาโนรามา และ thumbnail เพื่อใช้งานหลังโหลดสำเร็จครั้งแรกแบบ offline
- Plain CSS: ไม่มี framework UI หรือ runtime เพิ่มเกินความจำเป็น

React, Next.js, Tailwind, backend และ state library ไม่ได้ถูกใช้ เพราะทัวร์นี้เป็นหน้าเดียวและมีเพียง 4 ฉาก

## โครงสร้าง

```text
index.html                 semantic application shell
src/main.ts                viewer + UI orchestration
src/tour-data.ts           single source of truth ของฉากและ hotspot
src/i18n.ts                ข้อความ UI ไทย/อังกฤษ
src/styles.css             design system และ responsive layout
src/tour-data.test.ts      validation tests
tour/pano/                 ภาพ 360 ที่ใช้จริง
tour/thumbs/               thumbnail ที่ใช้จริง
images/                    ภาพต้นฉบับ ไม่ถูกนำเข้า dist/
public/favicon.svg         icon และ PWA asset
dist/                      production build (ไม่ commit)
```

Vite import ภาพจาก `tour/` และสร้างชื่อแบบ content hash ใน `dist/assets/` ส่วน `images/`, source code, `.git` และไฟล์ legacy จะไม่ถูก deploy เมื่อใช้ `vercel.json`

## Offline

Production build ไม่มี external runtime request และ service worker จะ precache ทั้ง 4 ฉาก หลังเปิดเว็บไซต์สำเร็จครั้งแรกแล้วสามารถ reload และเดินทัวร์ต่อได้โดยไม่มีอินเทอร์เน็ต

สำหรับเครื่องที่ไม่เคยต่ออินเทอร์เน็ต ให้แจกโฟลเดอร์ `dist/` แล้วเปิดผ่าน `start-tour.bat` หรือ local HTTP server ไม่รับประกันการเปิดผ่าน `file://` เพราะ WebGL viewer และ ES modules ต้องใช้ HTTP origin

`360-tour-offline.html` เป็น legacy single-file compatibility artifact เท่านั้น ได้รับการซ่อม syntax แล้ว แต่ไม่ใช่ source หลักและไม่ถูก deploy

## การเพิ่มฉาก

เพิ่ม panorama และ thumbnail ใน `tour/` แล้วแก้ข้อมูลเพียงที่เดียวใน `src/tour-data.ts` ระบบจะสร้าง thumbnail selector, hotspot navigation, route map, text tour และ PWA cache จากข้อมูลชุดเดียวกัน

ก่อนส่งงานให้รัน:

```bash
npm run check
```

## Privacy

ภาพต้นฉบับและภาพ runtime ปัจจุบันมีบุคคลปรากฏในหลายฉาก ควรยืนยันความยินยอมและเบลอข้อมูลระบุตัวบุคคลก่อนเผยแพร่สาธารณะ ตัวเว็บไม่มี analytics, marketing cookies หรือแบบฟอร์มติดตามผู้ใช้
