const quickSteps = [
  ['1', 'แก้เป็นฉบับร่าง', 'บันทึกได้หลายครั้งโดยหน้า Tour จริงยังไม่เปลี่ยน'],
  ['2', 'กรอกไทย–อังกฤษ', 'เติมรูปและชื่อแหล่งข้อมูล ระบบจะบอกช่องที่ยังขาด'],
  ['3', 'ตรวจตัวอย่าง', 'ตรวจข้อความ รูป ปุ่ม และฉากปลายทางก่อนเผยแพร่'],
  ['4', 'เผยแพร่', 'เฉพาะ Admin เท่านั้นที่เปลี่ยนข้อมูลซึ่งผู้ชมและ AI ใช้งาน'],
  ['5', 'เก็บเข้าคลัง', 'ซ่อนรายการโดยไม่ลบถาวรและนำกลับมาแก้ได้'],
  ['6', 'กู้คืนเวอร์ชัน', 'ข้อมูลที่กู้คืนจะเป็นฉบับร่างก่อนเสมอ']
] as const;

export default function AdminHelpPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p>HELP CENTER</p>
          <h1>คู่มือผู้ดูแลระบบ</h1>
          <span>ทำตามขั้นตอนได้โดยไม่ต้องเขียนโค้ด งานที่ต้องใช้ VS Code จะมีป้ายบอกชัดเจน</span>
        </div>
      </header>

      <nav className="admin-help-shortcuts" aria-label="ทางลัดคู่มือ">
        <a href="/admin/tour">วางปุ่ม Info</a>
        <a href="/admin/places">กรอกข้อมูล Info</a>
        <a href="/tour-preview">ดูฉบับร่าง</a>
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

      <div className="admin-guide-sections">
        <details open>
          <summary>เพิ่มปุ่ม Info ใหม่ทีละขั้นตอน</summary>
          <ol>
            <li>เปิด <a href="/admin/tour">โครงสร้างทัวร์</a> แล้วเลือกฉาก</li>
            <li>หมุนภาพไปยังตำแหน่งที่ต้องการ กดเพิ่ม Info แล้วคลิกบนภาพ 360</li>
            <li>กด “บันทึกฉบับร่าง” ระบบจะสร้างรายการรอกรอกใน “สถานที่สำคัญ” ให้อัตโนมัติ</li>
            <li>เปิด <a href="/admin/places">สถานที่สำคัญ</a> ค้นด้วย Hotspot ID แล้วกรอกไทย อังกฤษ รูป และชื่อแหล่งข้อมูล</li>
            <li>บันทึกและตรวจตัวอย่าง จากนั้นให้ Admin เผยแพร่เนื้อหาสถานที่สำคัญ</li>
            <li>กลับมา “โครงสร้างทัวร์” แล้วให้ Admin กด “เผยแพร่โครงสร้างทัวร์”</li>
            <li>กด “ดูหน้าเว็บจริง” ของฉากและทดสอบปุ่มทั้งคอมพิวเตอร์และมือถือ</li>
          </ol>
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
            <li>กดบันทึกฉบับร่างก่อน แล้วตรวจตัวอย่าง</li>
            <li>ให้ Admin กดเผยแพร่หรืออัปเดตข้อมูลที่เผยแพร่</li>
          </ol>
          <p className="admin-guide-note">AI ใช้เฉพาะข้อมูลที่เผยแพร่แล้ว การแก้ฉบับร่างจะยังไม่เปลี่ยนคำตอบของ AI</p>
        </details>

        <details>
          <summary>เพิ่มฉาก Panorama ใหม่</summary>
          <ol>
            <li>เปิด <a href="/admin/tour">โครงสร้างทัวร์</a> แล้วกดเพิ่มฉากหรือคัดลอกฉาก</li>
            <li>อัปโหลด JPEG/WebP อัตราส่วน 2:1 ตั้งชื่อ คำอธิบาย มุมเริ่มต้น และพิกัดแผนที่</li>
            <li>บันทึกฉบับร่างและตรวจผ่าน Draft Preview</li>
            <li>ฉากใหม่ยังไม่มีทางเดิน ต้องให้ผู้พัฒนาเพิ่มบล็อกฉากและลูกศรไป–กลับใน VS Code แล้วซิงก์ก่อนเผยแพร่</li>
          </ol>
        </details>

        <details>
          <summary>ลูกศรนำทางและสื่อประกอบ — ต้องใช้ VS Code</summary>
          <p>Navigation ใน Admin เป็นแบบอ่านอย่างเดียว แก้ <code>id</code>, <code>target</code>, <code>yaw</code>, <code>pitch</code> และทิศทางใน <code>src/tour-data.ts</code> แล้วรัน <code>npm run sync:arrows</code> เมื่อปรับเสร็จ</p>
          <p>ห้องตัวอย่าง Panorama และผังอาคารเป็นสื่อประกอบ ไม่ใช่ฉากเดิน รายการกำหนดใน <code>src/tour-supplemental-media.ts</code></p>
        </details>

        <details>
          <summary>Admin กับ Editor ต่างกันอย่างไร</summary>
          <p>Editor สร้างและแก้ฉบับร่าง อัปโหลดรูป และดูตัวอย่างได้ ส่วน Admin จึงจะเผยแพร่ ยกเลิกเผยแพร่ เก็บเข้าคลัง ลบถาวร จัดการผู้ใช้ สำรองข้อมูล และเผยแพร่โครงสร้างทัวร์ได้</p>
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
          <p>ก่อนแก้ชุดใหญ่ ให้เปิด <a href="/admin/backup">สำรองข้อมูล</a> แล้วดาวน์โหลด JSON การนำเข้าจะสร้างเป็นฉบับร่างและข้ามรายการที่ชน ส่วนการกู้ Revision จะเป็นฉบับร่างก่อนและต้องตรวจแล้วเผยแพร่เอง</p>
        </details>

        <details>
          <summary>เปิด–ปิดโปรเจกต์และแก้ EADDRINUSE</summary>
          <p>ดับเบิลคลิก <code>start-tour.bat</code> เพื่อเปิดและ <code>stop-tour.bat</code> เพื่อปิด หรือใช้ <code>npm run dev</code> และปิดด้วย <code>Ctrl+C</code> หากขึ้น EADDRINUSE แปลว่า Server เดิมยังใช้พอร์ต 3000 อยู่ ไม่ต้องเปิดซ้ำ</p>
        </details>
      </div>

      <footer className="admin-help-footer">
        <p>คู่มือฉบับเต็ม รวมการแก้ลูกศร การตรวจ Info และการเปิดระบบบน Windows อยู่ที่ <code>docs/admin-user-guide.md</code></p>
      </footer>
    </section>
  );
}
