import { z } from 'zod';
import { createAdminSupabaseClient } from '../../../../lib/supabase/admin';
import { requireAdmin, requireStaff } from '../../../../src/server/auth';
import { writeAdminAuditLog } from '../../../../src/server/tour-structure-repository';

const bodySchema = z.object({
  storagePath: z.string().trim().min(1).max(300).refine((value) => !value.includes('..')),
  publicUrl: z.url(),
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.enum(['image/jpeg', 'image/webp']),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  byteSize: z.number().int().positive().max(20 * 1024 * 1024),
  checksum: z.string().regex(/^[a-f0-9]{64}$/)
}).refine((value) => Math.abs(value.width / value.height - 2) <= 0.02, 'Panorama must use a 2:1 ratio');

export async function POST(request: Request) {
  const session = await requireStaff();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'ข้อมูลไฟล์ Panorama ไม่ถูกต้อง' }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data: duplicate } = await admin.from('tour_assets')
    .select('id,public_url,file_name,width,height,byte_size,created_at')
    .eq('checksum', parsed.data.checksum)
    .maybeSingle();
  if (duplicate) {
    await admin.storage.from('tour-panoramas').remove([parsed.data.storagePath]);
    return Response.json({ asset: {
      id: String(duplicate.id), publicUrl: String(duplicate.public_url), fileName: String(duplicate.file_name),
      width: Number(duplicate.width), height: Number(duplicate.height), byteSize: Number(duplicate.byte_size), createdAt: String(duplicate.created_at)
    }, duplicate: true });
  }
  const { data, error } = await admin.from('tour_assets').insert({
    storage_path: parsed.data.storagePath,
    public_url: parsed.data.publicUrl,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    width: parsed.data.width,
    height: parsed.data.height,
    byte_size: parsed.data.byteSize,
    checksum: parsed.data.checksum,
    created_by: session.userId
  }).select('id,public_url,file_name,width,height,byte_size,created_at').single();
  if (error) return Response.json({ error: 'บันทึกข้อมูล Panorama ไม่สำเร็จ' }, { status: 500 });
  await writeAdminAuditLog({ actorId: session.userId, action: 'upload-tour-panorama', entityKind: 'tour_asset', entityId: String(data.id) });
  return Response.json({ asset: {
    id: String(data.id), publicUrl: String(data.public_url), fileName: String(data.file_name),
    width: Number(data.width), height: Number(data.height), byteSize: Number(data.byte_size), createdAt: String(data.created_at)
  } });
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id || !z.uuid().safeParse(id).success) return Response.json({ error: 'Asset ID ไม่ถูกต้อง' }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const [{ data: asset, error }, { data: project }] = await Promise.all([
    admin.from('tour_assets').select('id,storage_path,public_url').eq('id', id).single(),
    admin.from('tour_projects').select('draft_data,published_data').eq('id', 'main').maybeSingle()
  ]);
  if (error || !asset) return Response.json({ error: 'ไม่พบ Panorama' }, { status: 404 });
  const publicUrl = String(asset.public_url);
  const usedInDraft = JSON.stringify(project?.draft_data ?? {}).includes(publicUrl);
  const usedInPublished = JSON.stringify(project?.published_data ?? {}).includes(publicUrl);
  if (usedInDraft || usedInPublished) return Response.json({
    error: `ยังลบไม่ได้ เพราะภาพถูกใช้ใน${usedInDraft ? 'ฉบับร่าง' : ''}${usedInDraft && usedInPublished ? 'และ' : ''}${usedInPublished ? 'ข้อมูลที่เผยแพร่' : ''}`
  }, { status: 409 });
  const { error: storageError } = await admin.storage.from('tour-panoramas').remove([String(asset.storage_path)]);
  if (storageError) return Response.json({ error: 'ลบไฟล์จาก Storage ไม่สำเร็จ' }, { status: 500 });
  const { error: deleteError } = await admin.from('tour_assets').delete().eq('id', id);
  if (deleteError) return Response.json({ error: 'ลบข้อมูลไฟล์ไม่สำเร็จ' }, { status: 500 });
  await writeAdminAuditLog({ actorId: session.userId, action: 'delete-tour-panorama', entityKind: 'tour_asset', entityId: id });
  return Response.json({ ok: true });
}
