import Link from 'next/link';
import { getVisitStatistics, listAdminContent } from '../../../src/server/admin-repository';
import { requireStaff } from '../../../src/server/auth';

export default async function AdminDashboardPage() {
  const session = await requireStaff();
  const [stats, faculties, programs, activities, hotspots] = await Promise.all([
    getVisitStatistics(),
    listAdminContent('faculties'),
    listAdminContent('programs'),
    listAdminContent('activities'),
    listAdminContent('hotspot_contents')
  ]);
  const maximum = Math.max(1, ...stats.last7Days.map((day) => day.count));
  const managedHotspotIds = new Set(faculties.flatMap((row) => row.hotspotId ? [row.hotspotId] : []));
  const places = hotspots.filter((row) => !managedHotspotIds.has(row.id));

  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>DASHBOARD</p><h1>ภาพรวมระบบ</h1><span>สวัสดี {session.displayName || session.email}</span></div><a href="/" target="_blank">ดูเว็บไซต์ ↗</a></header>
      <div className="admin-stats">
        <article><span>เข้าชมวันนี้</span><strong>{stats.today.toLocaleString()}</strong><small>ครั้ง</small></article>
        <article><span>เข้าชมทั้งหมด</span><strong>{stats.total.toLocaleString()}</strong><small>ครั้ง</small></article>
        <article><span>เนื้อหาที่เผยแพร่</span><strong>{[...faculties, ...programs, ...activities, ...hotspots].filter((row) => row.publishedData && !row.archivedAt).length}</strong><small>รายการ</small></article>
      </div>
      <section className="admin-chart">
        <header><h2>ยอดเข้าชม 7 วันล่าสุด</h2><span>เก็บเฉพาะยอดรวม ไม่บันทึก IP หรือ session ID</span></header>
        <div className="admin-chart__bars">
          {stats.last7Days.length ? stats.last7Days.map((day) => (
            <div key={day.date}><span style={{ height: `${Math.max(5, (day.count / maximum) * 100)}%` }} title={`${day.count} ครั้ง`} /><strong>{day.count}</strong><small>{day.date.slice(5)}</small></div>
          )) : <p>ยังไม่มีข้อมูลการเข้าชม</p>}
        </div>
      </section>
      <details className="admin-visits-table">
        <summary>ดูยอดย้อนหลัง 30 วัน</summary>
        <div><table><thead><tr><th>วันที่</th><th>ยอดเข้าชม</th></tr></thead><tbody>
          {[...stats.last30Days].reverse().map((day) => <tr key={day.date}><td>{day.date}</td><td>{day.count.toLocaleString()}</td></tr>)}
        </tbody></table></div>
      </details>
      <div className="admin-collections">
        {[
          ['คณะ', faculties.length, '/admin/faculties'],
          ['หลักสูตร', programs.length, '/admin/programs'],
          ['กิจกรรม', activities.length, '/admin/activities'],
          ['สถานที่สำคัญ', places.length, '/admin/places']
        ].map(([label, count, href]) => <Link href={String(href)} key={String(href)}><strong>{String(label)}</strong><span>{String(count)} รายการ</span><b>จัดการ →</b></Link>)}
      </div>
    </section>
  );
}
