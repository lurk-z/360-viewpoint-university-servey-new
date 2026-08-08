import AdminMediaUploader from '../../../../components/admin/AdminMediaUploader';
import AdminMediaLibrary from '../../../../components/admin/AdminMediaLibrary';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { requireStaff } from '../../../../src/server/auth';
import { getMediaUsageIndex } from '../../../../src/server/media-usage';

export default async function AdminMediaPage() {
  const session = await requireStaff();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage.from('content-media').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' }
  });
  const media = (data ?? []).filter((item) => item.id);
  const items = media.map((item) => ({
    path: item.name,
    publicUrl: supabase.storage.from('content-media').getPublicUrl(item.name).data.publicUrl
  }));
  const usageResult = error
    ? { index: {}, failed: true }
    : await getMediaUsageIndex(items)
      .then((index) => ({ index, failed: false }))
      .catch(() => ({ index: {}, failed: true }));

  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>MEDIA LIBRARY</p><h1>คลังรูปภาพ</h1><span>รูปสำหรับคณะ หลักสูตร กิจกรรม และสถานที่สำคัญเท่านั้น</span></div></header>
      <AdminMediaUploader />
      {error ? <p className="admin-form-error">ไม่สามารถอ่าน Storage: {error.message}</p> : null}
      {usageResult.failed && !error ? <p className="admin-form-error">ไม่สามารถตรวจสอบว่ารูปถูกใช้งานที่ใด จึงปิดการลบรูปชั่วคราวเพื่อป้องกันข้อมูลเสียหาย</p> : null}
      <AdminMediaLibrary
        canDelete={session.role === 'admin' && !usageResult.failed}
        items={items.map((item) => ({ ...item, usage: usageResult.index[item.path] ?? [] }))}
      />
    </section>
  );
}
