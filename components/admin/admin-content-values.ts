import type { ContentImage, ContentKind } from '../../src/content';

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function contentField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

export function localizedField(data: Record<string, unknown>, key: string, locale: 'th' | 'en'): string {
  return contentField(asObject(data[key]), locale);
}

export function localizedListField(data: Record<string, unknown>, key: string, locale: 'th' | 'en'): string {
  const value = asObject(data[key])[locale];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').join('\n') : '';
}

export function stringListField(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function contentSource(data: Record<string, unknown>, kind: ContentKind): Record<string, unknown> {
  return asObject(data[kind === 'hotspot_contents' ? 'reference' : 'source']);
}

export function contentImages(data: Record<string, unknown>): ContentImage[] {
  if (!Array.isArray(data.images)) return [];
  return data.images.flatMap((value) => {
    const image = asObject(value);
    const src = contentField(image, 'src');
    const alt = asObject(image.alt);
    if (!src || !contentField(alt, 'th') || !contentField(alt, 'en')) return [];
    const caption = asObject(image.caption);
    return [{
      src,
      alt: { th: contentField(alt, 'th'), en: contentField(alt, 'en') },
      ...((contentField(caption, 'th') || contentField(caption, 'en')) ? {
        caption: { th: contentField(caption, 'th'), en: contentField(caption, 'en') }
      } : {})
    }];
  });
}

export function contentInputId(prefix: string, name: string): string {
  return `${prefix}-${name}`.replace(/[^a-zA-Z0-9-_]/g, '-');
}
