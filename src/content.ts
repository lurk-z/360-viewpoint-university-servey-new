import { z } from 'zod';
import {
  getInfoHotspots,
  tourScenes,
  type InfoHotspot,
  type Locale,
  type SceneId
} from './tour-data';

export type AdminRole = 'admin' | 'editor';
export type ContentKind = 'faculties' | 'programs' | 'activities' | 'hotspot_contents';

export interface LocalizedContent {
  readonly th: string;
  readonly en: string;
}

export interface ContentSource {
  readonly label: LocalizedContent;
  readonly url?: string;
}

export interface ContentImage {
  readonly src: string;
  readonly alt: LocalizedContent;
  readonly caption?: LocalizedContent;
}

export interface FacultyContent {
  readonly id: string;
  readonly slug: string;
  readonly name: LocalizedContent;
  readonly summary: LocalizedContent;
  readonly description: LocalizedContent;
  readonly imageUrl?: string;
  readonly source: ContentSource;
}

export interface ProgramContent {
  readonly id: string;
  readonly facultyId: string;
  readonly slug: string;
  readonly name: LocalizedContent;
  readonly level: LocalizedContent;
  readonly summary: LocalizedContent;
  readonly description: LocalizedContent;
  readonly admission: LocalizedContent;
  readonly imageUrl?: string;
  readonly source: ContentSource;
}

export interface ActivityContent {
  readonly id: string;
  readonly slug: string;
  readonly title: LocalizedContent;
  readonly summary: LocalizedContent;
  readonly description: LocalizedContent;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly sceneId?: SceneId;
  readonly imageUrl?: string;
  readonly source: ContentSource;
}

export interface HotspotContent {
  readonly id: string;
  readonly sceneId: SceneId;
  readonly hotspotId: string;
  readonly title: LocalizedContent;
  readonly description: LocalizedContent;
  readonly reference: ContentSource;
  readonly images: readonly ContentImage[];
}

export interface PublicContentSnapshot {
  readonly version: number;
  readonly generatedAt: string;
  readonly source: 'database' | 'fallback';
  readonly faculties: readonly FacultyContent[];
  readonly programs: readonly ProgramContent[];
  readonly activities: readonly ActivityContent[];
  readonly hotspots: readonly HotspotContent[];
}

const requiredLocalizedSchema = z.object({
  th: z.string().trim().min(1).max(12_000),
  en: z.string().trim().min(1).max(12_000)
});

const optionalUrlSchema = z.union([
  z.literal(''),
  z.url().refine((value) => value.startsWith('http://') || value.startsWith('https://'))
]).optional().transform((value) => value || undefined);

const sourceSchema = z.object({
  label: requiredLocalizedSchema,
  url: optionalUrlSchema
});

const imageSchema = z.object({
  src: z.union([z.string().trim().startsWith('/'), z.url()]),
  alt: requiredLocalizedSchema,
  caption: requiredLocalizedSchema.optional()
});

export const facultyDataSchema = z.object({
  name: requiredLocalizedSchema,
  summary: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  imageUrl: optionalUrlSchema,
  source: sourceSchema
});

export const programDataSchema = z.object({
  name: requiredLocalizedSchema,
  level: requiredLocalizedSchema,
  summary: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  admission: requiredLocalizedSchema,
  imageUrl: optionalUrlSchema,
  source: sourceSchema
});

export const activityDataSchema = z.object({
  title: requiredLocalizedSchema,
  summary: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  startDate: z.iso.date().or(z.literal('')).optional().transform((value) => value || undefined),
  endDate: z.iso.date().or(z.literal('')).optional().transform((value) => value || undefined),
  sceneId: z.string().trim().optional().transform((value) => value || undefined),
  imageUrl: optionalUrlSchema,
  source: sourceSchema
});

export const hotspotDataSchema = z.object({
  title: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  reference: sourceSchema,
  images: z.array(imageSchema).min(1).max(12)
});

export type FacultyData = z.infer<typeof facultyDataSchema>;
export type ProgramData = z.infer<typeof programDataSchema>;
export type ActivityData = z.infer<typeof activityDataSchema>;
export type HotspotData = z.infer<typeof hotspotDataSchema>;

function staticHotspotContent(sceneId: SceneId, hotspot: InfoHotspot): HotspotContent {
  return {
    id: hotspot.id,
    sceneId,
    hotspotId: hotspot.id,
    title: hotspot.title,
    description: hotspot.description,
    reference: hotspot.reference,
    images: hotspot.images ?? []
  };
}

export function createFallbackContentSnapshot(): PublicContentSnapshot {
  return {
    version: 1,
    generatedAt: '1970-01-01T00:00:00.000Z',
    source: 'fallback',
    faculties: [],
    programs: [],
    activities: [],
    hotspots: tourScenes.flatMap((scene) => (
      getInfoHotspots(scene).map((hotspot) => staticHotspotContent(scene.id, hotspot))
    ))
  };
}

export function resolveInfoHotspot(
  hotspot: InfoHotspot,
  content: PublicContentSnapshot
): InfoHotspot {
  const override = content.hotspots.find((item) => item.hotspotId === hotspot.id);
  if (!override) return hotspot;
  return {
    ...hotspot,
    title: override.title,
    description: override.description,
    reference: override.reference,
    images: override.images
  };
}

export function localizeContent(value: LocalizedContent, locale: Locale): string {
  return value[locale];
}

export function isSceneId(value: string): value is SceneId {
  return tourScenes.some((scene) => scene.id === value);
}
