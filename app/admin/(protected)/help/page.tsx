export default function AdminHelpPage() {
  return <section className="admin-page"><header className="admin-page__header"><div><p>HELP CENTER</p><h1>คู่มือผู้ดูแลแบบสั้น</h1><span>ทำตามลำดับนี้ได้โดยไม่ต้องเขียนโค้ด</span></div></header>
    <div className="admin-help-grid">
      <article><span>1</span><h2>สร้างหรือแก้ฉบับร่าง</h2><p>ฉบับร่างยังไม่เปลี่ยนหน้า Tour คุณจึงตรวจและแก้ได้จนพร้อม</p></article>
      <article><span>2</span><h2>กรอกไทย–อังกฤษ</h2><p>ทำตามขั้นตอนในฟอร์ม ใส่รูปและชื่อแหล่งข้อมูลให้ครบ ระบบจะบอกช่องที่ยังขาด</p></article>
      <article><span>3</span><h2>ตรวจตัวอย่าง</h2><p>เปิดตัวอย่างฉบับร่างและตรวจข้อความ รูป ปุ่ม และปลายทางก่อนเผยแพร่</p></article>
      <article><span>4</span><h2>เผยแพร่</h2><p>เฉพาะ Admin ที่เผยแพร่ได้ เมื่อเผยแพร่ Tour และ AI จะเห็นข้อมูลใหม่</p></article>
      <article><span>5</span><h2>เก็บเข้าคลัง</h2><p>ใช้ซ่อนรายการโดยไม่ลบถาวร สามารถคืนข้อมูลจากคลังได้ภายหลัง</p></article>
      <article><span>6</span><h2>กู้คืนเวอร์ชัน</h2><p>ประวัติจะเก็บทุกครั้งที่แก้ กู้คืนแล้วจะเป็นฉบับร่างก่อนเสมอ</p></article>
    </div>
    <div className="admin-guide-sections">
      <details open><summary>Admin กับ Editor ต่างกันอย่างไร</summary><p>Editor สร้างและแก้ฉบับร่างได้ ส่วน Admin เผยแพร่ ลบถาวร จัดการผู้ใช้ สำรองข้อมูล และเผยแพร่โครงสร้างทัวร์ได้</p></details>
      <details><summary>เพิ่มสถานที่สำคัญอย่างไร</summary><p>เปิด “โครงสร้างทัวร์” เลือกฉาก หมุนภาพแล้วเลือก Info จากนั้นคลิกวางตำแหน่งและบันทึก ระบบจะสร้างรายการรอกรอกใน “สถานที่สำคัญ” ให้อัตโนมัติ</p></details>
      <details><summary>เพิ่มฉาก 360 อย่างไร</summary><p>เปิด “โครงสร้างทัวร์” กดเพิ่มฉาก อัปโหลดภาพ JPEG/WebP อัตราส่วน 2:1 วางพิกัดบนแผนที่ แล้วสร้างลูกศรไป–กลับก่อนตรวจและเผยแพร่</p></details>
      <details><summary>เมื่อระบบแจ้งรอ Migration</summary><p>ไปหน้า “สถานะระบบ” กดคัดลอก Migration ที่ขาด แล้ววางเฉพาะ SQL ใน Supabase SQL Editor และกด Run</p></details>
      <details><summary>ก่อนแก้ชุดใหญ่ควรทำอะไร</summary><p>ไปหน้า “สำรองข้อมูล” ดาวน์โหลด JSON เก็บไว้ การนำเข้าจะสร้างเป็นฉบับร่างและข้ามรายการที่ชนโดยอัตโนมัติ</p></details>
    </div>
  </section>;
}
