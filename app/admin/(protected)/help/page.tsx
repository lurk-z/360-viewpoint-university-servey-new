const quickSteps = [
  ['1', 'แก้เป็นฉบับร่าง', 'บันทึกได้หลายครั้งโดยหน้า Tour จริงยังไม่เปลี่ยน'],
  ['2', 'กรอกไทย–อังกฤษ', 'เติมรูปและชื่อแหล่งข้อมูล ระบบจะบอกช่องที่ยังขาด'],
  ['3', 'ตรวจตัวอย่าง', 'ตรวจข้อความ รูป ปุ่ม และฉากปลายทางก่อนเผยแพร่'],
  ['4', 'เผยแพร่', 'เฉพาะ Admin เท่านั้นที่เปลี่ยนข้อมูลซึ่งผู้ชมและ AI ใช้งาน'],
  ['5', 'เก็บเข้าคลัง', 'ซ่อนรายการโดยไม่ลบถาวรและนำกลับมาแก้ได้'],
  ['6', 'กู้คืนเวอร์ชัน', 'ข้อมูลที่กู้คืนจะเป็นฉบับร่างก่อนเสมอ']
] as const;

const adminMenus = [
  ['ภาพรวม', '/admin', 'ดูความพร้อมของระบบ งานที่ควรตรวจ และยอดเข้าชมรวม', 'Admin / Editor'],
  ['คณะ', '/admin/faculties', 'แก้ข้อมูลประชาสัมพันธ์ของคณะ ไทย–อังกฤษ รูป และแหล่งอ้างอิง', 'Admin / Editor'],
  ['หลักสูตร', '/admin/programs', 'แก้ระดับการศึกษา คุณสมบัติรับสมัคร ความสนใจ และแนวทางอาชีพที่ AI ใช้แนะนำ', 'Admin / Editor'],
  ['กิจกรรม', '/admin/activities', 'แก้กิจกรรม วันที่ สถานที่ ฉากที่เกี่ยวข้อง และสถานะเผยแพร่', 'Admin / Editor'],
  ['สถานที่สำคัญ', '/admin/places', 'แก้ข้อความ รูป และแหล่งอ้างอิงของปุ่ม Info', 'Admin / Editor'],
  ['โครงสร้างทัวร์', '/admin/tour', 'จัดการฉาก Panorama มุมเริ่มต้น แผนที่ และตำแหน่ง Info', 'Admin / Editor'],
  ['Media', '/admin/media', 'อัปโหลดและตรวจการใช้งานรูปของเนื้อหา โดยไม่ใช้แทน Panorama ของฉาก', 'Admin / Editor'],
  ['สถานะระบบ', '/admin/system', 'ตรวจ Environment, Migration, Storage และโครงสร้างทัวร์', 'Admin / Editor'],
  ['คู่มือ', '/admin/help', 'คู่มือ Admin และ VS Code ฉบับย่อในระบบ', 'Admin / Editor'],
  ['สำรองข้อมูล', '/admin/backup', 'ส่งออก JSON/CSV และนำเข้าเป็นฉบับร่างอย่างปลอดภัย', 'Admin เท่านั้น'],
  ['ประวัติระบบ', '/admin/audit', 'ตรวจเวลา ชนิดงาน และรายการที่ถูกแก้ โดยไม่แสดง Secret', 'Admin เท่านั้น'],
  ['ผู้ใช้งาน', '/admin/users', 'เชิญผู้ใช้ กำหนด Role และปิดสิทธิ์เข้าใช้งาน', 'Admin เท่านั้น']
] as const;

const developerFiles = [
  ['src/tour-data.ts', 'บล็อกฉากสำรองและลูกศร Navigation: id, target, yaw, pitch และ direction'],
  ['src/tour-supplemental-media.ts', 'Panorama ตัวอย่างและผังอาคารที่เปิดจากเมนูสื่อ ไม่ใช่ฉากเดิน'],
  ['src/tour-scene-titles.ts', 'รายการย้ายชื่อฉากเก่าเท่านั้น ฉากใหม่ที่ตั้งชื่อถูกต้องไม่ต้องเพิ่มในไฟล์นี้'],
  ['src/i18n.ts', 'ข้อความภาษาไทย–อังกฤษของส่วนติดต่อผู้ชม'],
  ['src/styles.css', 'รูปแบบหน้า Public Tour และ Viewer'],
  ['app/admin/admin.css', 'รูปแบบหน้า Admin รวมคู่มือนี้'],
  ['public/mainimages/', 'ไฟล์ Panorama และสื่อเดิมที่เก็บกับโปรเจกต์'],
  ['.env.local', 'ค่าเชื่อมต่อ Supabase/Gemini ห้าม Commit หรือส่งให้ผู้อื่น']
] as const;

const arrowExample = `{ id: 'scene-a-to-scene-b', type: 'scene', target: 'sceneB', yaw: 90.0, pitch: -8.0, direction: 'up' }`;

export default function AdminHelpPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p>HELP CENTER</p>
          <h1>คู่มือผู้ดูแลและผู้พัฒนา</h1>
          <span>รวมงานในหน้า Admin และขั้นตอน VS Code โดยแยกขอบเขตให้ชัดเจน</span>
        </div>
      </header>

      <nav className="admin-help-shortcuts" aria-label="ทางลัดคู่มือ">
        <a href="#admin-overview">เมนู Admin</a>
        <a href="#info-guide">เพิ่มปุ่ม Info</a>
        <a href="#tour-guide">จัดการฉาก</a>
        <a href="#vscode-guide">ใช้ VS Code</a>
        <a href="/admin/system">ตรวจสถานะระบบ</a>
        <a href="/admin/backup">สำรองข้อมูล</a>
      </nav>

      <div className="admin-help-grid">
        {quickSteps.map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <div className="admin-help-callout">
        <strong>จำง่าย ๆ: ปุ่ม Info มี 2 ส่วน</strong>
        <p>ตำแหน่งปุ่มจัดการใน “โครงสร้างทัวร์” ส่วนชื่อ รายละเอียด และรูปจัดการใน “สถานที่สำคัญ” ต้องเผยแพร่ทั้งสองส่วนจึงจะแสดงครบในหน้าเว็บจริง</p>
      </div>

      <section className="admin-guide-group" id="admin-overview">
        <header>
          <p>ADMIN WORKFLOW</p>
          <h2>เมนูและสถานะข้อมูลในระบบปัจจุบัน</h2>
        </header>
        <div className="admin-guide-table-wrap" role="region" tabIndex={0} aria-label="ตารางหน้าที่เมนู Admin เลื่อนแนวนอนได้">
          <table className="admin-guide-table">
            <thead><tr><th>เมนู</th><th>ใช้ทำอะไร</th><th>สิทธิ์</th></tr></thead>
            <tbody>{adminMenus.map(([label, href, description, role]) => (
              <tr key={href}><td><a href={href}>{label}</a></td><td>{description}</td><td>{role}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="admin-guide-status-grid">
          <article><strong>ฉบับร่าง (Draft)</strong><p>บันทึกแก้ไขได้หลายครั้ง ผู้ชมและ AI ยังไม่เห็นจนกว่าจะเผยแพร่</p></article>
          <article><strong>เผยแพร่แล้ว (Published)</strong><p>ข้อมูลที่ Public Tour และ AI ใช้งานจริง</p></article>
          <article><strong>เก็บเข้าคลัง (Archive)</strong><p>ซ่อนรายการโดยไม่ลบถาวร และยังเปิดกลับมาแก้หรือกู้คืนได้</p></article>
        </div>
      </section>

      <div className="admin-guide-sections">
        <details id="info-guide" open>
          <summary>เพิ่มปุ่ม Info ใหม่ทีละขั้นตอน</summary>
          <ol>
            <li>เปิด <a href="/admin/tour">โครงสร้างทัวร์</a> แล้วเลือกฉาก</li>
            <li>หมุนภาพไปยังตำแหน่งที่ต้องการ แล้วคลิกบนภาพ 360 เพื่อวางปุ่ม Info</li>
            <li>กด “บันทึกฉบับร่าง” ระบบจะสร้างรายการรอกรอกใน “สถานที่สำคัญ” ให้อัตโนมัติ</li>
            <li>เปิด <a href="/admin/places">สถานที่สำคัญ</a> ค้นด้วย Hotspot ID แล้วกรอกไทย อังกฤษ รูป และชื่อแหล่งข้อมูล</li>
            <li>บันทึกและตรวจตัวอย่าง จากนั้นให้ Admin เผยแพร่เนื้อหาสถานที่สำคัญ</li>
            <li>กลับมา “โครงสร้างทัวร์” แล้วให้ Admin กด “เผยแพร่โครงสร้างทัวร์”</li>
            <li>กด “ดูหน้าเว็บจริง” ของฉากและทดสอบปุ่มทั้งคอมพิวเตอร์และมือถือ</li>
          </ol>
          <div className="admin-guide-table-wrap" role="region" tabIndex={0} aria-label="ตารางสถานะปุ่ม Info เลื่อนแนวนอนได้">
            <table className="admin-guide-table">
              <thead><tr><th>สถานะที่เห็น</th><th>ความหมาย</th><th>สิ่งที่ต้องทำ</th></tr></thead>
              <tbody>
                <tr><td>ยังไม่บันทึก</td><td>ตำแหน่ง Info เปลี่ยนเฉพาะใน Browser</td><td>กดบันทึกฉบับร่าง</td></tr>
                <tr><td>บันทึกฉบับร่างแล้ว</td><td>Draft มีตำแหน่งนี้แล้ว แต่ Public อาจยังไม่มี</td><td>ตรวจ Draft Preview</td></tr>
                <tr><td>เผยแพร่โครงสร้างแล้ว</td><td>Public Tour มีปุ่ม Info แล้ว</td><td>ตรวจเนื้อหาในสถานที่สำคัญ</td></tr>
                <tr><td>เนื้อหาสถานที่เผยแพร่แล้ว</td><td>ชื่อ รายละเอียด รูป และอ้างอิงพร้อมให้ผู้ชมเปิด</td><td>ตรวจหน้าเว็บจริง</td></tr>
              </tbody>
            </table>
          </div>
          <p className="admin-guide-note">ปุ่มขึ้นแต่ไม่มีข้อมูล = ตรวจการเผยแพร่ “สถานที่สำคัญ” · มีข้อมูลแต่ปุ่มไม่ขึ้น = ตรวจการเผยแพร่ “โครงสร้างทัวร์”</p>
        </details>

        <details>
          <summary>ย้ายหรือลบปุ่ม Info</summary>
          <ul>
            <li>เลือก Info ในฉาก แล้วคลิกตำแหน่งใหม่หรือปรับ yaw/pitch ของ Info</li>
            <li>บันทึกฉบับร่างและเผยแพร่โครงสร้างทุกครั้งที่ต้องการให้หน้าเว็บจริงเปลี่ยน</li>
            <li>เมื่อลบปุ่มแล้ว เนื้อหาใน “สถานที่สำคัญ” ยังควรเก็บไว้ก่อน หากไม่ใช้แล้วให้เก็บเข้าคลังแทนการลบถาวร</li>
            <li>อย่าแก้ Info ใน <code>src/tour-data.ts</code> เป็นวิธีหลัก เพราะข้อมูลจาก Admin/Supabase มีลำดับความสำคัญกว่า</li>
          </ul>
        </details>

        <details>
          <summary>เพิ่มหรือแก้คณะ หลักสูตร กิจกรรม และสถานที่</summary>
          <ol>
            <li>เปิดหมวดที่ต้องการ แล้วเพิ่มรายการหรือเปิดรายการเดิม</li>
            <li>ทำตามขั้น ข้อมูลทั่วไป → ไทย → อังกฤษ → รูป/อ้างอิง → ตรวจและเผยแพร่</li>
            <li>หลักสูตรต้องตรวจระดับการศึกษา วุฒิที่รับสมัคร ความสนใจและแนวทางอาชีพ เพราะ AI ใช้ข้อมูลเหล่านี้จัดอันดับคำแนะนำ</li>
            <li>กิจกรรมควรใส่ช่วงวันที่และ Scene ID ที่เกี่ยวข้อง ส่วน Info ต้องใช้ Scene ID/Hotspot ID เดียวกับโครงสร้างทัวร์</li>
            <li>กดบันทึกฉบับร่างก่อน แล้วเปิดตัวอย่างเพื่อตรวจข้อความ รูป และลิงก์อ้างอิง</li>
            <li>ให้ Admin กดเผยแพร่หรืออัปเดตข้อมูลที่เผยแพร่ หากไม่ใช้แล้วให้เก็บเข้าคลังแทนการลบถาวร</li>
          </ol>
          <p className="admin-guide-note">AI ใช้เฉพาะข้อมูลที่เผยแพร่แล้ว การแก้ฉบับร่างจะยังไม่เปลี่ยนคำตอบของ AI</p>
        </details>

        <details id="tour-guide">
          <summary>เพิ่มฉาก Panorama ใหม่</summary>
          <ol>
            <li>เปิด <a href="/admin/tour">โครงสร้างทัวร์</a> แล้วกด “เพิ่มฉาก” หรือสร้าง Scene JSON ด้วย <code>npm run tour:add-scene</code> แล้วกด “นำเข้า Scene JSON”</li>
            <li>ตั้ง Scene ID ภาษาอังกฤษที่ไม่ซ้ำ และอัปโหลด JPEG/WebP อัตราส่วน 2:1 ไปยังคลัง Panorama</li>
            <li>กรอกชื่อและคำอธิบายไทย–อังกฤษ ตั้ง Panorama URL, yaw, pitch, zoom และคลิกพิกัดบนแผนที่</li>
            <li>กดบันทึกฉบับร่าง แล้วเปิด “ดูฉบับร่าง” ของฉากนั้นเพื่อตรวจภาพ มุมเริ่มต้น การ์ดฉาก และตำแหน่งแผนที่</li>
            <li>เพิ่มบล็อก Fallback และลูกศรไป–กลับใน <code>src/tour-data.ts</code> โดยใช้ Scene ID เดียวกัน จากนั้นตรวจผ่าน Development</li>
            <li>รัน <code>npm run sync:arrows</code> เมื่อเส้นทางสมบูรณ์ แล้ว Admin จึงเผยแพร่โครงสร้างทัวร์</li>
          </ol>
          <p className="admin-guide-note">อย่าเผยแพร่ฉากที่ยังไม่มีเส้นทางเข้า–ออก และอย่าใช้ <code>npm run sync:tour</code> สำหรับฉากทั่วไป เพราะคำสั่งนั้นรองรับชุดอัปเดตโครงสร้างที่เขียนไว้เฉพาะเท่านั้น</p>
        </details>

        <details id="vscode-guide">
          <summary>คู่มือ VS Code: เปิดโปรเจกต์และเลือกไฟล์ให้ถูก</summary>
          <p>งานทั่วไปทำใน Admin ก่อน ส่วน VS Code ใช้กับ Navigation, Fallback, สื่อประกอบ และการแก้ส่วนติดต่อที่ไม่มีแบบฟอร์มใน Admin</p>
          <pre className="admin-guide-code" tabIndex={0}><code>{`npm install
npm run dev
# เปิด http://localhost:3000
# บันทึกไฟล์แล้วตรวจ Fast Refresh
npm run check`}</code></pre>
          <div className="admin-guide-table-wrap" role="region" tabIndex={0} aria-label="ตารางหน้าที่ไฟล์ VS Code เลื่อนแนวนอนได้">
            <table className="admin-guide-table">
              <thead><tr><th>ไฟล์</th><th>ใช้แก้อะไร</th></tr></thead>
              <tbody>{developerFiles.map(([file, purpose]) => (
                <tr key={file}><td><code>{file}</code></td><td>{purpose}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="admin-guide-note">ฉากใหม่ไม่ต้องเพิ่มใน <code>src/tour-scene-titles.ts</code> ให้ตั้งชื่อสุดท้ายใน Admin และบล็อกฉากโดยตรง ไฟล์นี้มีไว้ย้ายชื่อฉากเก่าที่เคยมีคำว่า “จุดที่/Point” เท่านั้น</p>
        </details>

        <details>
          <summary>คู่มือ VS Code: เพิ่มและจัดตำแหน่งลูกศร</summary>
          <p>ลูกศรอยู่ใน <code>hotspots</code> ของฉากต้นทางภายใน <code>src/tour-data.ts</code> และต้องมี ID ไม่ซ้ำ ส่วน <code>target</code> ต้องตรงกับ Scene ID ที่มีอยู่จริง</p>
          <pre className="admin-guide-code" tabIndex={0}><code>{arrowExample}</code></pre>
          <ul>
            <li><code>direction</code> ไม่ใส่หรือใช้ <code>standard</code> สำหรับทางราบ, <code>up</code> สำหรับขึ้นชั้น และ <code>down</code> สำหรับลงชั้น</li>
            <li>เปิด Public Tour ใน Development แล้วกด “จัดตำแหน่งลูกศร” จากแถบเครื่องมือ; มือถือเปิดจากเมนูเครื่องมือ</li>
            <li>เลือก Hotspot → คลิก Panorama เพื่อ Preview → กด “คัดลอก object” → วางแทน object เดิมในฉากต้นทาง</li>
            <li>กด “คืนค่าจากโค้ด” เมื่อต้องการยกเลิก Preview เครื่องมือนี้ไม่เขียนไฟล์หรือ Supabase ให้อัตโนมัติ</li>
            <li>เพิ่มลูกศรย้อนกลับในฉากปลายทางเสมอ แล้วทดสอบเดินทั้งสองทิศทางโดยไม่กลับฉากแรกหรือโหลด Panorama ซ้ำ</li>
          </ul>
          <pre className="admin-guide-code" tabIndex={0}><code>{`npm run sync:arrows
# รันซ้ำหลังสำเร็จควรแสดง added/updated/moved/deleted เป็น 0`}</code></pre>
          <p className="admin-guide-warning">ก่อนซิงก์ให้ดาวน์โหลด Backup และอย่าแก้ Navigation พร้อมกันหลายเครื่อง หากพบ Conflict, Target หาย หรือเส้นทางขาดลูกศรย้อนกลับ ให้หยุดและแก้ข้อมูลก่อน ห้ามฝืนเขียนทับ</p>
        </details>

        <details>
          <summary>คู่มือ VS Code: เพิ่มฉาก Fallback และสื่อประกอบ</summary>
          <ol>
            <li>สร้างและบันทึกฉากใน Admin ก่อน เพื่อให้ Draft มี Scene ID, Panorama URL, ชื่อ มุมเริ่มต้น และแผนที่ครบ</li>
            <li>เพิ่ม Panorama ใน <code>tourMedia</code> เมื่อใช้ไฟล์ใน <code>public/mainimages/</code> หรือใช้ URL เดียวกับ Admin สำหรับภาพจาก Supabase</li>
            <li>เพิ่มบล็อกฉากเต็มใน <code>src/tour-data.ts</code> โดยใช้ Scene ID เดียวกัน และเพิ่มลูกศรไป–กลับ</li>
            <li>ตรวจ Development แล้วใช้ <code>npm run sync:arrows</code> สำหรับ Navigation เท่านั้น การซิงก์นี้ไม่สร้างรายละเอียดฉากแทน Admin</li>
          </ol>
          <p>ห้องตัวอย่าง Panorama และผังอาคารไม่ใช่ฉากเดิน ให้เพิ่มรายการแบบ Typed ใน <code>src/tour-supplemental-media.ts</code> แล้วเชื่อมกลุ่มกับ Scene ID ใน <code>getTourSupplementalMediaGroups()</code> สื่อเหล่านี้จะไม่แสดงบนแผนที่ Text Tour หรือ AI Routing</p>
          <p className="admin-guide-note">Info เพิ่ม ย้าย และลบจาก Visual Tour Editor ส่วนข้อความ Info แก้ใน “สถานที่สำคัญ” ข้อมูล Info ในโค้ดเป็น Emergency Fallback ไม่ใช่แหล่งแก้หลัก</p>
        </details>

        <details>
          <summary>Admin กับ Editor ต่างกันอย่างไร</summary>
          <p><strong>Editor</strong> สร้างและแก้ฉบับร่าง อัปโหลดรูป และดูตัวอย่างได้ แต่ไม่สามารถเปลี่ยนข้อมูลที่ผู้ชมเห็นจริง</p>
          <p><strong>Admin</strong> ทำได้เหมือน Editor และสามารถเผยแพร่ ยกเลิกเผยแพร่ เก็บเข้าคลัง ลบถาวร จัดการผู้ใช้ สำรอง/นำเข้าข้อมูล กู้ Revision และเผยแพร่โครงสร้างทัวร์</p>
        </details>

        <details>
          <summary>Media, AI และข้อมูลที่เผยแพร่</summary>
          <ul>
            <li>เมนู Media ใช้กับรูปคณะ หลักสูตร กิจกรรม และสถานที่สำคัญ ส่วน Panorama ของฉากอัปโหลดใน Visual Tour Editor</li>
            <li>ก่อนลบรูปให้ตรวจจำนวนรายการที่ใช้งานอยู่ ระบบจะไม่ควรลบรูปที่ยังถูกอ้างอิง</li>
            <li>AI ใช้ข้อมูล Published เท่านั้น โดยเฉพาะชื่อคณะ หลักสูตร ระดับ วุฒิ ความสนใจ แนวทางอาชีพ กิจกรรม และสถานที่</li>
            <li>ถ้าข้อมูล AI ไม่เปลี่ยนหลังบันทึก ให้ตรวจว่าเผยแพร่รายการแล้ว ไม่ใช่เพียงบันทึก Draft</li>
          </ul>
        </details>

        <details>
          <summary>เมื่อระบบแจ้ง “รอรัน Migration”</summary>
          <ol>
            <li>เปิด <a href="/admin/system">สถานะระบบ</a> และกดคัดลอก Migration ที่ขาด</li>
            <li>ไป Supabase → SQL Editor → New query</li>
            <li>วางเฉพาะ SQL ซึ่งควรขึ้นต้นด้วยคำสั่งอย่าง <code>create table</code> หรือ <code>alter table</code> ไม่ใช่คำสั่ง PowerShell</li>
            <li>กด Run แล้วกลับมากดตรวจสอบอีกครั้ง</li>
          </ol>
        </details>

        <details>
          <summary>สำรอง กู้คืน และป้องกันข้อมูลหาย</summary>
          <ul>
            <li>ก่อนแก้ชุดใหญ่หรือรันคำสั่งซิงก์ ให้เปิด <a href="/admin/backup">สำรองข้อมูล</a> แล้วดาวน์โหลด JSON; CSV ใช้สำหรับอ่านหรือทำรายงาน ไม่ใช่ไฟล์กู้ระบบ</li>
            <li>การนำเข้า JSON มีขั้น Preview ก่อน Commit รายการที่ ID/Slug ชนจะถูกข้าม และข้อมูลจะเข้าเป็น Draft</li>
            <li>การกู้ Revision จะสร้างฉบับร่างก่อน ต้องเปิดตัวอย่างและเผยแพร่เอง จึงไม่เปลี่ยนหน้า Public ทันที</li>
            <li>เมนูประวัติระบบใช้ตรวจว่าใครทำงานชนิดใดกับรายการใด โดยไม่เก็บข้อความสนทนา Token หรือ Secret</li>
          </ul>
        </details>

        <details>
          <summary>เปิด–ปิดโปรเจกต์และแก้ EADDRINUSE</summary>
          <p>ดับเบิลคลิก <code>start-tour.bat</code> เพื่อเปิดและ <code>stop-tour.bat</code> เพื่อปิด หรือใช้ <code>npm run dev</code> และปิดด้วย <code>Ctrl+C</code> หากขึ้น EADDRINUSE แปลว่า Server เดิมยังใช้พอร์ต 3000 อยู่ ไม่ต้องเปิดซ้ำ</p>
        </details>

        <details>
          <summary>แก้ Login, Supabase และหน้าเว็บที่ยังแสดงข้อมูลเก่า</summary>
          <ul>
            <li>ถ้า Login ขึ้น <code>fetch failed</code> ให้เปิด <a href="/admin/system">สถานะระบบ</a> และตรวจอินเทอร์เน็ต, Supabase URL/Key และไฟล์ <code>.env.local</code> ก่อนสรุปว่ารหัสผ่านผิด</li>
            <li>ถ้าขึ้น “รอรัน Migration” ให้รันเฉพาะ SQL ที่หน้าสถานะระบบระบุ แล้วกดตรวจสอบอีกครั้ง ห้ามรัน Seed หรือ Bootstrap ซ้ำเพราะข้อความเครือข่ายล้มเหลว</li>
            <li>หลังเผยแพร่ให้รอ Live Update ชั่วครู่ ถ้ายังเห็นข้อมูลเก่าให้กด <code>Ctrl+F5</code>; มือถือปิดแท็บแล้วเปิดใหม่เพื่อรับ Service Worker ล่าสุด</li>
            <li>ปุ่ม Info ขึ้นแต่ Dialog ไม่มีข้อมูล ให้ตรวจ Scene ID/Hotspot ID, สถานะเนื้อหา Published และสถานะเผยแพร่โครงสร้างตามลำดับ</li>
          </ul>
        </details>
      </div>

      <footer className="admin-help-footer">
        <p>คู่มือฉบับเต็มสำหรับ Admin และ VS Code ใช้เนื้อหาเดียวกับหน้านี้ อยู่ที่ <code>docs/admin-user-guide.md</code></p>
      </footer>
    </section>
  );
}
