export const TOUR_PANORAMA_ASSET_VERSION = '20260805-redacted';
export const TOUR_PANORAMA_BUCKET = 'tour-panoramas';
export const TOUR_PANORAMA_STORAGE_PREFIX = 'bootstrap-v1';

// NEXT_PUBLIC_SUPABASE_URL is public configuration. The fallback keeps tests,
// scripts and fresh checkouts deterministic before .env.local is created.
const DEFAULT_PUBLIC_SUPABASE_URL = 'https://emjdgsxsvyzokqqkdyxe.supabase.co';

export const MIGRATED_SUPPLEMENTAL_PANORAMA_FILES = new Set([
  'temp-faculty-floor4-4-01A.jpg',
  'temp-male-dormitory-1-ex-room-inside.jpg',
  'temp-female-dormitory-2-women-restroom.jpg',
  'temp-male-dormitory-laundry-area-bathroom-2.jpg',
  'temp-faculty-co-working-space-ex-spark.jpg',
  'temp-faculty-co-working-space-ex-spark-lab-2.jpg',
  'temp-faculty-co-working-space-ex-spark-lab-1.jpg',
  'temp-female-dormitory-1-women-restroom.jpg'
]);

function publicSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
    || DEFAULT_PUBLIC_SUPABASE_URL;
}

function encodeStoragePath(fileName: string): string {
  return fileName.split('/').map(encodeURIComponent).join('/');
}

export function tourPanoramaUrl(fileName: string): string {
  const storagePath = encodeStoragePath(`${TOUR_PANORAMA_STORAGE_PREFIX}/${fileName}`);
  return `${publicSupabaseUrl()}/storage/v1/object/public/${TOUR_PANORAMA_BUCKET}/${storagePath}?v=${TOUR_PANORAMA_ASSET_VERSION}`;
}

export function localMainImageUrl(fileName: string): string {
  return `/mainimages/${fileName}?v=${TOUR_PANORAMA_ASSET_VERSION}`;
}

export function supplementalPanoramaUrl(fileName: string): string {
  return MIGRATED_SUPPLEMENTAL_PANORAMA_FILES.has(fileName)
    ? tourPanoramaUrl(fileName)
    : localMainImageUrl(fileName);
}

export function tourAssetFileName(assetUrl: string): string {
  const pathname = new URL(assetUrl, 'https://tour.local').pathname;
  return decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1));
}

export function isStoredTourPanoramaUrl(assetUrl: string): boolean {
  const pathname = new URL(assetUrl, 'https://tour.local').pathname;
  return pathname.includes(`/storage/v1/object/public/${TOUR_PANORAMA_BUCKET}/${TOUR_PANORAMA_STORAGE_PREFIX}/`);
}
