import { isSupabaseConfigured } from '../../../../lib/supabase/env';
import { loginAction } from '../../actions/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: {
  readonly searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const configured = isSupabaseConfigured();
  const error = query.error === 'credentials'
    ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ไม่มีสิทธิ์'
    : query.error === 'configuration'
      ? 'ยังไม่ได้ตั้งค่า Supabase ใน environment'
      : '';

  return (
    <main className="admin-login">
      <section className="admin-login__card">
        <img src="/mainimages/Logo_FitM/FITM_LOGO.png" alt="FITM" width={200} height={117} />
        <p>CONTENT MANAGEMENT SYSTEM</p>
        <h1>เข้าสู่ระบบผู้ดูแล</h1>
        <span>FITM 360° Virtual Tour</span>
        {!configured ? (
          <div className="admin-alert">
            <strong>ยังไม่พร้อมเชื่อมต่อ</strong>
            <p>คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ Supabase URL, publishable key และ service-role key</p>
          </div>
        ) : null}
        {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
        <form action={loginAction} className="admin-login__form">
          <input type="hidden" name="next" value={query.next ?? '/admin'} />
          <label htmlFor="admin-email"><span>อีเมล</span><input id="admin-email" type="email" name="email" autoComplete="username" required disabled={!configured} suppressHydrationWarning /></label>
          <label htmlFor="admin-password"><span>รหัสผ่าน</span><input id="admin-password" type="password" name="password" autoComplete="current-password" required disabled={!configured} suppressHydrationWarning /></label>
          <button type="submit" disabled={!configured} suppressHydrationWarning>เข้าสู่ระบบ</button>
        </form>
        <a href="/">← กลับไปหน้าทัวร์</a>
      </section>
    </main>
  );
}
