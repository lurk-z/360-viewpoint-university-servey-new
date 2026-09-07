'use client';

import type { ContentKind } from '../../src/content';
import AdminLazyDetails from './AdminLazyDetails';
import { contentField, contentImages, contentSource, localizedField } from './admin-content-values';

export default function AdminContentPreview({ kind, data }: {
  readonly kind: ContentKind;
  readonly data: Record<string, unknown>;
}) {
  const nameKey = kind === 'activities' || kind === 'hotspot_contents' ? 'title' : 'name';
  const images = contentImages(data);
  const imageUrl = images[0]?.src ?? contentField(data, 'imageUrl');
  const sourceData = contentSource(data, kind);
  return (
    <AdminLazyDetails className="admin-preview" summary="ดูตัวอย่างฉบับร่าง">
      <article className="admin-preview__card">
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
        <div lang="th"><small>ภาษาไทย</small><h3>{localizedField(data, nameKey, 'th')}</h3><p>{localizedField(data, 'description', 'th')}</p></div>
        <div lang="en"><small>ENGLISH</small><h3>{localizedField(data, nameKey, 'en')}</h3><p>{localizedField(data, 'description', 'en')}</p></div>
        <footer>แหล่งอ้างอิง: {localizedField(sourceData, 'label', 'th') || '-'}</footer>
      </article>
    </AdminLazyDetails>
  );
}
