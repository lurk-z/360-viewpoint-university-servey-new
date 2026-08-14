export default function AdminLoading() {
  return (
    <section className="admin-page admin-loading" aria-busy="true" aria-live="polite">
      <header className="admin-page__header">
        <div>
          <p>กำลังโหลดข้อมูล</p>
          <h1>กำลังเปิดหน้าที่เลือก…</h1>
          <span>ระบบกำลังอ่านข้อมูลล่าสุดจากฐานข้อมูล</span>
        </div>
      </header>
      <div className="admin-loading__toolbar" aria-hidden="true" />
      <div className="admin-loading__cards" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
    </section>
  );
}
