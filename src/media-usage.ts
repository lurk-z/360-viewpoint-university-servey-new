export type MediaUsageKind = 'faculties' | 'programs' | 'activities' | 'hotspot_contents';

export interface MediaDescriptor {
  readonly path: string;
  readonly publicUrl: string;
}

export interface MediaUsage {
  readonly kind: MediaUsageKind;
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly scopes: readonly ('draft' | 'published')[];
  readonly archived: boolean;
}

function visitStrings(value: unknown, visitor: (value: string) => void): void {
  if (typeof value === 'string') {
    visitor(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => visitStrings(item, visitor));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => visitStrings(item, visitor));
  }
}

function storagePath(value: string): string | undefined {
  const marker = '/storage/v1/object/public/content-media/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return undefined;
  try {
    return decodeURIComponent(value.slice(markerIndex + marker.length).split(/[?#]/, 1)[0] ?? '');
  } catch {
    return value.slice(markerIndex + marker.length).split(/[?#]/, 1)[0];
  }
}

export function contentReferencesMedia(value: unknown, media: MediaDescriptor): boolean {
  let found = false;
  visitStrings(value, (candidate) => {
    if (found) return;
    found = candidate === media.publicUrl || storagePath(candidate) === media.path;
  });
  return found;
}

export function getContentLabel(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ['name', 'title']) {
    const localized = record[key];
    if (localized && typeof localized === 'object') {
      const th = (localized as Record<string, unknown>).th;
      const en = (localized as Record<string, unknown>).en;
      if (typeof th === 'string' && th.trim()) return th.trim();
      if (typeof en === 'string' && en.trim()) return en.trim();
    }
  }
  return undefined;
}
