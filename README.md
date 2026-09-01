# KMUTNB Prachinburi Virtual Tour

## สถานะระบบปัจจุบัน

- ทัวร์เริ่มต้น 123 ฉาก ใช้แผนที่ `/mainimages/map/mainmap1.png` ขนาด 1096×583
- ข้อมูลเริ่มต้น 4 คณะและ 35 หลักสูตร จัดการฉบับร่าง/เผยแพร่ผ่าน Admin
- `src/tour-data.ts` เป็นแหล่งหลักของลูกศรนำทางและเป็น Emergency fallback; ฉาก รูป Info และพิกัดส่วนอื่นจัดการจาก `/admin/tour`
- Panorama 123 ฉากที่มากับโปรเจกต์ยังอยู่ใน `public/mainimages`; ภาพใหม่หลังจากนี้อัปโหลดไป Supabase bucket `tour-panoramas`
- หน้า Public โหลดโครงสร้าง Published จาก `/api/tour-structure` และกลับไปใช้ข้อมูลในโค้ดอัตโนมัติเมื่อฐานข้อมูลไม่พร้อม
- Admin มีประวัติ/กู้คืน สำรอง JSON รายงาน CSV นำเข้าเป็น Draft สถานะระบบ และ Visual Tour Editor

เปิดโปรเจกต์บน Windows โดยดับเบิลคลิก `start-tour.bat` และปิดด้วย `stop-tour.bat` หรือใช้ `npm run dev` / `Ctrl+C` ตามปกติ ตรวจความพร้อมทั้งเครื่องด้วย `npm run doctor`

เว็บไซต์ Virtual Open House แบบ 360° สำหรับมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ วิทยาเขตปราจีนบุรี

โปรเจกต์ถูก migrate จาก Vite/Vanilla TypeScript เป็น Next.js App Router เพื่อรองรับการเพิ่มหลายทัวร์, หน้า admin, API, authentication และข้อมูลจากฐานข้อมูลในอนาคต โดยยังคง Photo Sphere Viewer และข้อมูลฉากเดิมไว้

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 สำหรับ utility pipeline และ design system
- Photo Sphere Viewer 5 พร้อม Virtual Tour, Markers, Autorotate และ Equirectangular Adapter สำหรับภาพต้นฉบับไฟล์เดียว
- Leaflet 1.9 แบบ `CRS.Simple` สำหรับแผนที่ภาพที่ซูม ลาก และเลือกฉากได้
- Zustand สำหรับ shared client state ของ locale, scene, loading และ viewer controls
- Vitest สำหรับ scene graph และ localization tests
- Supabase PostgreSQL, Auth, Storage และ RLS สำหรับระบบจัดการเนื้อหา
- Gemini สำหรับ AI ถามตอบจากข้อมูลที่เผยแพร่แล้วเท่านั้น
- Playwright สำหรับตรวจ responsive ของ Public, Chat และ Admin
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

### เปิดและปิด Development Server บน Windows

- เปิดโปรเจกต์ด้วย `npm run dev` และเปิด `http://localhost:3000`
- ปิด Server จาก Terminal เดิมด้วย `Ctrl+C` แล้วกด `Y` หาก Command Prompt ขอให้ยืนยัน
- หากปิด Terminal เดิมไปแล้ว ให้หา PID ที่ใช้พอร์ต 3000 แล้วหยุดเฉพาะ Process นั้น:

```cmd
netstat -ano | findstr :3000
taskkill /PID ใส่-PID-ที่พบ /T /F
```

- หลัง Restart Server ให้กด `Ctrl+F5` เพื่อไม่ใช้ JavaScript ของ Turbopack ที่ค้างจาก Process เดิม
- เปิดจากมือถือด้วย `http://IP-ของคอมพิวเตอร์:3000` โดยดู IP จาก `ipconfig` และให้อุปกรณ์อยู่ใน Wi-Fi เดียวกัน
- ห้ามรัน `npm run dev` ซ้ำขณะที่ Server เดิมยังทำงาน เพราะจะเกิด `EADDRINUSE`

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
npm run check:workers # ตรวจ syntax ของ service worker
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
components/TourApp.tsx      React UI, dialogs, persistent map และ controls
components/TourViewer.tsx   Client Component ที่สร้าง Photo Sphere Viewer
components/TourMap.tsx      Client Component ที่สร้างแผนที่ Leaflet
components/ModalDialog.tsx  accessible native dialog wrapper
src/tour-data.ts            source of truth ของ scene, hotspot และ route graph
src/i18n.ts                 ข้อความ UI ภาษาไทย/อังกฤษ
src/stores/tour-store.ts    Zustand store สำหรับ shared client state
src/styles.css              Photo Sphere Viewer styles และ design system
public/mainimages/          panorama ต้นฉบับทั้ง 34 ฉาก และโฟลเดอร์ map
public/sw.js                offline cache strategy
360-tour-offline.html       legacy single-file compatibility artifact
```

## เพิ่มฉาก

1. วางภาพ panorama ใหม่ใน `public/mainimages/` เช่น `campus-02.jpg`
2. เพิ่ม object ใน `tourMedia` ที่ `src/tour-data.ts` โดยระบุเพียงชื่อไฟล์:

```ts
campus02: mainPanorama('campus-02.jpg')
```

3. เพิ่ม scene ที่มี `id: 'campus02'` ใน `tourScenes` แล้วเชื่อม scene hotspot ไป-กลับกับฉากอื่น

ไฟล์ในโฟลเดอร์ `public` ต้องอ้างผ่าน URL ที่ตัดคำว่า `public` ออกเสมอ เช่น `public/mainimages/campus-02.jpg` จะใช้ URL `/mainimages/campus-02.jpg` ระบบ test จะตรวจ path, ไฟล์ที่หาย และเส้นทางฉากให้โดยอัตโนมัติ ค่า `yaw` และ `pitch` ในข้อมูลใช้หน่วยองศา ส่วน `mapPosition` ใช้พิกัดพิกเซลของ `mainmap.png` จากมุมซ้ายบน

## Offline และ privacy

Service worker ทำงานเฉพาะ production โดย precache หน้าเริ่มต้น, manifest, icon และแผนที่ เมื่อผู้ใช้เปิดฉาก ระบบจะ cache panorama ต้นฉบับหนึ่งไฟล์ของฉากนั้นเบื้องหลัง ฉากที่เคยเปิดจึงหมุนดูได้ครบแบบออฟไลน์ ขณะ development ระบบจะถอน service worker และล้าง cache เก่าของโปรเจกต์เพื่อให้ refresh แล้วเห็นข้อมูลมุมล่าสุดทันที การเปิดผ่าน `file://` ไม่รองรับเพราะ WebGL, ES modules และ service worker ต้องใช้ HTTP origin

เว็บไซต์ไม่มี marketing cookies หรือการติดตามรายบุคคล ระบบสถิติเก็บเพียงวันที่และยอดเข้าชมรวม โดยไม่นำ IP, user agent, session ID หรือข้อความสนทนาไปเก็บในฐานข้อมูล ภาพ panorama ถูก serve จาก repository ส่วนรูปเนื้อหาที่ Admin อัปโหลดจะมาจาก Supabase Storage

## Supabase, Admin และ AI

1. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าของ Supabase และ Gemini โดยเก็บ `SUPABASE_SERVICE_ROLE_KEY` กับ `GEMINI_API_KEY` ไว้ฝั่งเซิร์ฟเวอร์เท่านั้น
2. เปิด Supabase SQL Editor แล้วรัน `supabase/migrations/202608070001_cms.sql`
3. สร้างผู้ใช้คนแรกใน Supabase Auth แล้วเพิ่ม UUID ของผู้ใช้นั้นเป็น role `admin` ตามคำสั่งตัวอย่างท้าย migration
4. รัน migration `supabase/migrations/202608070002_linked_faculty_content.sql` สำหรับโปรเจกต์ที่เคยติดตั้ง CMS รุ่นแรกแล้ว
5. รัน `npm run seed:cms` เพื่อสร้างคณะเริ่มต้น 2 รายการ ย้ายสถานที่สำคัญเดิม 12 จุด และเพิ่มหลักสูตรคณะบริหารธุรกิจและอุตสาหกรรมบริการ 6 รายการ โดยไม่เขียนทับข้อมูลที่ Admin เคยแก้
6. เข้า `/admin/login` เพื่อจัดการคณะ หลักสูตร กิจกรรม สถานที่สำคัญ รูปภาพ บัญชี และสถิติ

ตัวแปรสภาพแวดล้อมที่ต้องใช้:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_DAILY_LIMIT=200
GEMINI_MINUTE_LIMIT=10
```

Migration ต้องรันตามลำดับใน Supabase SQL Editor:

1. `202608070001_cms.sql`
2. `202608070002_linked_faculty_content.sql`
3. `202608240001_ai_rate_limits_and_metrics.sql`
4. `202608290001_admin_workflow_and_tour_structure.sql`

หลัง Migration ลำดับที่ 4 ให้เปิด `/admin/system` แล้วกด “นำ 123 ฉากเข้า Visual Tour Editor” หนึ่งครั้ง ระบบเป็น idempotent และไม่เขียนทับโครงการที่มีอยู่แล้ว

`Editor` แก้ draft และอัปโหลดรูปได้ ส่วน `Admin` จึงจะเผยแพร่ ยกเลิกเผยแพร่ เก็บเข้าคลัง ลบ และจัดการบัญชีได้

### แก้ตำแหน่งลูกศรใน VS Code

เมื่อรัน `npm run dev` ลูกศรชนิด `scene` จะอ่านจาก `src/tour-data.ts` ทันทีหลังบันทึกไฟล์ โดย Viewer ไม่กลับฉากแรก ไม่เปลี่ยนมุมกล้อง และไม่โหลด Panorama ซ้ำ ส่วนชื่อฉาก รูป Info และแผนที่ยังอ่านจาก Supabase เหมือนเดิม

หลังเริ่มทัวร์ให้กด “จัดตำแหน่งลูกศร” (มือถืออยู่ในเมนูเครื่องมือ) แล้วเลือกลูกศร คลิกตำแหน่งบนภาพ 360 และกด “คัดลอก object” เพื่อนำค่าไปวางแทน object เดิมใน `src/tour-data.ts` เครื่องมือนี้เป็น Preview เท่านั้นและไม่เขียนไฟล์หรือเผยแพร่ให้อัตโนมัติ หน้า Admin จะแสดง Navigation แบบอ่านอย่างเดียว แต่ยังเพิ่มและแก้ตำแหน่ง Info ได้ตามเดิม

เมื่อปรับ `id`, `target`, `yaw` หรือ `pitch` จนเรียบร้อย ให้เผยแพร่ไปยัง Draft และ Published ด้วย:

```bash
npm run sync:arrows
```

ครั้งแรกคำสั่งจะสร้าง Baseline โดยไม่เพิ่มเวอร์ชันหากข้อมูลในโค้ด, Draft และ Published ตรงกัน หลังจากนั้นระบบจะซิงก์เฉพาะลูกศรและไม่เขียนทับ Info หรือรายละเอียดฉาก หากฐานข้อมูลมีค่าลูกศรเก่าที่ต่างจาก Baseline และโค้ด คำสั่งจะหยุดพร้อมบอก ID และค่าที่ชนกัน การรันซ้ำโดยไม่มีการเปลี่ยนแปลงจะไม่เพิ่มเวอร์ชัน

Public page อ่านข้อมูลผ่าน `/api/content` และยังใช้ข้อมูลเดิมในโค้ดได้เมื่อ Supabase ไม่พร้อม Service worker ใช้ network-first และเก็บ snapshot ล่าสุดสำหรับ offline ส่วน AI และ Admin ต้องเชื่อมต่ออินเทอร์เน็ต

คำสั่งทดสอบ responsive แบบ browser:

```bash
npx playwright install chromium
npm run test:e2e
```

## Legacy

`360-tour-offline.html` เก็บไว้เพื่อ compatibility เท่านั้น ไม่ใช่ source หลักของ Next.js และไม่ถูกใช้เป็นหน้า deploy หลัก

ก่อนส่งงานให้รัน:

```bash
npm run check
```
