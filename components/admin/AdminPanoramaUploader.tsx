'use client';

import { useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { createBrowserId } from '../../src/browser-id';
import type { AdminTourAsset } from '../../src/server/tour-structure-repository';

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminPanoramaUploader({ onUploaded }: {
  readonly onUploaded: (asset: AdminTourAsset) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    setStatus('กำลังตรวจภาพ…');
    try {
      if (!['image/jpeg', 'image/webp'].includes(file.type)) throw new Error('รองรับเฉพาะ JPEG หรือ WebP');
      if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์ต้องไม่เกิน 20 MB');
      const size = await imageSize(file);
      if (Math.abs(size.width / size.height - 2) > 0.02) throw new Error('ภาพ Panorama ต้องมีอัตราส่วน 2:1');
      if (size.width < 4096) throw new Error('แนะนำความกว้างอย่างน้อย 4096 พิกเซล');
      const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
        .map((part) => part.toString(16).padStart(2, '0')).join('');
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const storagePath = `${Date.now()}-${createBrowserId()}-${safeName}`;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.storage.from('tour-panoramas').upload(storagePath, file, {
        cacheControl: '31536000', upsert: false, contentType: file.type
      });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from('tour-panoramas').getPublicUrl(storagePath);
      const response = await fetch('/api/admin/tour-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          publicUrl: publicData.publicUrl,
          fileName: file.name,
          mimeType: file.type,
          width: size.width,
          height: size.height,
          byteSize: file.size,
          checksum
        })
      });
      const body = await response.json() as { asset?: AdminTourAsset; error?: string };
      if (!response.ok || !body.asset) throw new Error(body.error || 'บันทึกไฟล์ไม่สำเร็จ');
      onUploaded(body.asset);
      setStatus('อัปโหลดสำเร็จและเลือกภาพนี้แล้ว');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <div className="admin-panorama-upload">
    <label className="admin-button admin-button--secondary">
      {busy ? 'กำลังอัปโหลด…' : 'อัปโหลด Panorama ใหม่'}
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/webp" disabled={busy}
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    </label>
    <small>JPEG/WebP · 2:1 · ไม่เกิน 20 MB · ความกว้างอย่างน้อย 4096 px</small>
    {status ? <p role="status">{status}</p> : null}
  </div>;
}
