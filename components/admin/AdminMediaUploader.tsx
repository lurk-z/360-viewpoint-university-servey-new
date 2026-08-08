'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { broadcastContentUpdate } from '../../src/content-updates';
import { ADMIN_ACTION_SETTLED_EVENT } from './useAdminActionRefresh';

export default function AdminMediaUploader() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const upload = async (file: File): Promise<void> => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setStatus('รองรับ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      return;
    }
    setStatus('กำลังอัปโหลด…');
    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.storage.from('content-media').upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error) throw error;
      setStatus('อัปโหลดสำเร็จ');
      window.dispatchEvent(new Event(ADMIN_ACTION_SETTLED_EVENT));
      broadcastContentUpdate({ scope: 'draft', kind: 'media', id: path });
      router.refresh();
    } catch {
      setStatus('อัปโหลดไม่สำเร็จ กรุณาตรวจสิทธิ์และการเชื่อมต่อ');
    }
  };

  return (
    <div className="admin-upload">
      <label htmlFor="admin-media-file"><strong>อัปโหลดรูป</strong><span>JPEG, PNG หรือ WebP · สูงสุด 5 MB</span></label>
      <input id="admin-media-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }} />
      <p role="status">{status}</p>
    </div>
  );
}
