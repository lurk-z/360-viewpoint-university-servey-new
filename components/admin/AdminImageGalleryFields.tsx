'use client';

import { useState } from 'react';
import type { ContentImage } from '../../src/content';
import { createBrowserId } from '../../src/browser-id';

interface EditableImage {
  readonly key: string;
  readonly src: string;
  readonly altTh: string;
  readonly altEn: string;
  readonly captionTh: string;
  readonly captionEn: string;
}

export interface AdminMediaOption {
  readonly name: string;
  readonly url: string;
}

function editableImage(image?: ContentImage): EditableImage {
  return {
    key: createBrowserId(),
    src: image?.src ?? '',
    altTh: image?.alt.th ?? '',
    altEn: image?.alt.en ?? '',
    captionTh: image?.caption?.th ?? '',
    captionEn: image?.caption?.en ?? ''
  };
}

export default function AdminImageGalleryFields({
  images,
  media = [],
  required = true
}: {
  readonly images: readonly ContentImage[];
  readonly media?: readonly AdminMediaOption[];
  readonly required?: boolean;
}) {
  const [rows, setRows] = useState<readonly EditableImage[]>(() => (
    images.length ? images.map(editableImage) : required ? [editableImage()] : []
  ));
  const update = (key: string, values: Partial<Omit<EditableImage, 'key'>>): void => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...values } : row));
  };

  return (
    <fieldset className="admin-gallery-fields">
      <legend>รูปภาพ</legend>
      <p>เลือกจาก Media Library หรือวาง URL โดยตรง รองรับสูงสุด 12 รูป · <a href="/admin/media">อัปโหลดรูปใหม่</a></p>
      {rows.map((row, index) => (
        <article key={row.key}>
          <header><strong>รูปที่ {index + 1}</strong>{rows.length > 1 ? (
            <button type="button" className="admin-button admin-button--danger" onClick={() => {
              setRows((current) => current.filter((item) => item.key !== row.key));
            }}>ลบรูปนี้</button>
          ) : null}</header>
          {media.length ? (
            <label className="admin-gallery-fields__media"><span>เลือกจาก Media Library</span><select value="" onChange={(event) => {
              if (event.target.value) update(row.key, { src: event.target.value });
            }}>
              <option value="">เลือกรูป…</option>
              {media.map((item) => <option value={item.url} key={item.url}>{item.name}</option>)}
            </select></label>
          ) : null}
          {row.src ? <img className="admin-gallery-fields__preview" src={row.src} alt="" /> : null}
          <label><span>URL รูปภาพ</span><input name="imageSrc" type="text" value={row.src} onChange={(event) => update(row.key, { src: event.target.value })} required={required || rows.length > 0} /></label>
          <label><span>คำอธิบายรูป (ไทย)</span><input name="imageAltTh" value={row.altTh} onChange={(event) => update(row.key, { altTh: event.target.value })} required={required || rows.length > 0} /></label>
          <label><span>Image description (English)</span><input name="imageAltEn" value={row.altEn} onChange={(event) => update(row.key, { altEn: event.target.value })} required={required || rows.length > 0} /></label>
          <label><span>คำบรรยายใต้ภาพ (ไทย)</span><input name="imageCaptionTh" value={row.captionTh} onChange={(event) => update(row.key, { captionTh: event.target.value })} /></label>
          <label><span>Caption (English)</span><input name="imageCaptionEn" value={row.captionEn} onChange={(event) => update(row.key, { captionEn: event.target.value })} /></label>
        </article>
      ))}
      {rows.length < 12 ? (
        <button type="button" className="admin-button admin-button--secondary" onClick={() => {
          setRows((current) => [...current, editableImage()]);
        }}>+ เพิ่มรูป</button>
      ) : null}
    </fieldset>
  );
}
