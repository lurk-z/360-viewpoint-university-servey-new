'use client';

import { useState } from 'react';
import type { ContentImage } from '../../src/content';

interface EditableImage {
  readonly key: string;
  readonly src: string;
  readonly altTh: string;
  readonly altEn: string;
  readonly captionTh: string;
  readonly captionEn: string;
}

function editableImage(image?: ContentImage): EditableImage {
  return {
    key: crypto.randomUUID(),
    src: image?.src ?? '',
    altTh: image?.alt.th ?? '',
    altEn: image?.alt.en ?? '',
    captionTh: image?.caption?.th ?? '',
    captionEn: image?.caption?.en ?? ''
  };
}

export default function AdminImageGalleryFields({ images }: { readonly images: readonly ContentImage[] }) {
  const [rows, setRows] = useState<readonly EditableImage[]>(() => (
    images.length ? images.map(editableImage) : [editableImage()]
  ));

  return (
    <fieldset className="admin-gallery-fields">
      <legend>รูปภาพ</legend>
      <p>อัปโหลดรูปในเมนู Media แล้วนำ URL มาวาง รองรับสูงสุด 12 รูป</p>
      {rows.map((row, index) => (
        <article key={row.key}>
          <header><strong>รูปที่ {index + 1}</strong>{rows.length > 1 ? (
            <button type="button" className="admin-button admin-button--danger" onClick={() => {
              setRows((current) => current.filter((item) => item.key !== row.key));
            }}>ลบรูปนี้</button>
          ) : null}</header>
          <label><span>URL รูปภาพ</span><input name="imageSrc" type="text" defaultValue={row.src} required /></label>
          <label><span>คำอธิบายรูป (ไทย)</span><input name="imageAltTh" defaultValue={row.altTh} required /></label>
          <label><span>Image description (English)</span><input name="imageAltEn" defaultValue={row.altEn} required /></label>
          <label><span>คำบรรยายใต้ภาพ (ไทย)</span><input name="imageCaptionTh" defaultValue={row.captionTh} /></label>
          <label><span>Caption (English)</span><input name="imageCaptionEn" defaultValue={row.captionEn} /></label>
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
