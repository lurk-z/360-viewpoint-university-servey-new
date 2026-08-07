import AdminMediaUploader from '../../../../components/admin/AdminMediaUploader';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { requireStaff } from '../../../../src/server/auth';
import { deleteMediaAction } from '../../actions';

export default async function AdminMediaPage() {
  const session = await requireStaff();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage.from('content-media').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' }
  });
  const media = (data ?? []).filter((item) => item.id);

  return (
    <section className="admin-page">
      <header className="admin-page__header"><div><p>MEDIA LIBRARY</p><h1>คลังรูปภาพ</h1><span>รูปสำหรับคณะ หลักสูตร กิจกรรม และสถานที่สำคัญเท่านั้น</span></div></header>
      <AdminMediaUploader />
      {error ? <p className="admin-form-error">ไม่สามารถอ่าน Storage: {error.message}</p> : null}
      <div className="admin-media-grid">
        {media.map((item) => {
          const publicUrl = supabase.storage.from('content-media').getPublicUrl(item.name).data.publicUrl;
          return (
            <article key={item.name}>
              <img src={publicUrl} alt={item.name} loading="lazy" />
              <strong>{item.name}</strong>
              <input aria-label={`URL ${item.name}`} value={publicUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
              {session.role === 'admin' ? (
                <form action={deleteMediaAction}>
                  <input type="hidden" name="path" value={item.name} />
                  <button className="admin-button admin-button--danger" type="submit">ลบรูป</button>
                </form>
              ) : null}
            </article>
          );
        })}
        {!media.length ? <div className="admin-empty">ยังไม่มีรูปใน Storage</div> : null}
      </div>
    </section>
  );
}
