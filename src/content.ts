import { z } from 'zod';
import {
  getInfoHotspots,
  tourScenes,
  type InfoHotspot,
  type InfoHotspotDefinition,
  type Locale,
  type SceneId,
  type TourScene
} from './tour-data.ts';

export type AdminRole = 'admin' | 'editor';
export type ContentKind = 'faculties' | 'programs' | 'activities' | 'hotspot_contents';

export interface LocalizedContent {
  readonly th: string;
  readonly en: string;
}

export interface LocalizedTagList {
  readonly th: readonly string[];
  readonly en: readonly string[];
}

export type ProgramEligibleQualification = 'm3' | 'm6-pvoc' | 'high-vocational' | 'bachelor' | 'other';
export type ProgramStudyLevel = 'vocational' | 'bachelor' | 'transfer' | 'master';

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
  readonly sceneId?: SceneId;
  readonly hotspotId?: string;
  readonly name: LocalizedContent;
  readonly summary: LocalizedContent;
  readonly description: LocalizedContent;
  readonly images: readonly ContentImage[];
  readonly source: ContentSource;
}

export interface ProgramContent {
  readonly id: string;
  readonly facultyId: string;
  readonly slug: string;
  readonly name: LocalizedContent;
  readonly department?: LocalizedContent;
  readonly level: LocalizedContent;
  readonly summary: LocalizedContent;
  readonly description: LocalizedContent;
  readonly admission: LocalizedContent;
  readonly eligibleQualifications?: readonly ProgramEligibleQualification[];
  readonly studyLevel?: ProgramStudyLevel;
  readonly interestTags?: LocalizedTagList;
  readonly careerTags?: LocalizedTagList;
  readonly images?: readonly ContentImage[];
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
  readonly images?: readonly ContentImage[];
  readonly imageUrl?: string;
  readonly source: ContentSource;
}

export interface HotspotContent {
  readonly id: string;
  readonly sceneId: SceneId;
  readonly hotspotId: string;
  readonly title: LocalizedContent;
  readonly description: LocalizedContent;
  readonly sceneTitle?: LocalizedContent;
  readonly sceneDescription?: LocalizedContent;
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

const localizedTagListSchema = z.object({
  th: z.array(z.string().trim().min(1).max(120)).max(20),
  en: z.array(z.string().trim().min(1).max(120)).max(20)
}).refine((value) => value.th.length > 0 && value.en.length > 0, {
  message: 'Recommendation tags must contain both Thai and English values'
});

export const facultyDataSchema = z.object({
  name: requiredLocalizedSchema,
  summary: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  images: z.array(imageSchema).min(1).max(12),
  source: sourceSchema
});

export const programDataSchema = z.object({
  name: requiredLocalizedSchema,
  department: requiredLocalizedSchema.optional(),
  level: requiredLocalizedSchema,
  summary: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  admission: requiredLocalizedSchema,
  eligibleQualifications: z.array(z.enum(['m3', 'm6-pvoc', 'high-vocational', 'bachelor', 'other']))
    .max(5)
    .optional(),
  studyLevel: z.enum(['vocational', 'bachelor', 'transfer', 'master']).optional(),
  interestTags: localizedTagListSchema.optional(),
  careerTags: localizedTagListSchema.optional(),
  images: z.array(imageSchema).max(12).optional(),
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
  images: z.array(imageSchema).max(12).optional(),
  imageUrl: optionalUrlSchema,
  source: sourceSchema
});

export const hotspotDataSchema = z.object({
  title: requiredLocalizedSchema,
  description: requiredLocalizedSchema,
  sceneTitle: requiredLocalizedSchema.optional(),
  sceneDescription: requiredLocalizedSchema.optional(),
  reference: sourceSchema,
  images: z.array(imageSchema).min(1).max(12)
});

export type FacultyData = z.infer<typeof facultyDataSchema>;
export type ProgramData = z.infer<typeof programDataSchema>;
export type ActivityData = z.infer<typeof activityDataSchema>;
export type HotspotData = z.infer<typeof hotspotDataSchema>;

export function mergeMissingScenePresentation(
  data: Record<string, unknown>,
  scene: Pick<TourScene, 'title' | 'description'>
): Record<string, unknown> {
  return {
    ...data,
    sceneTitle: data.sceneTitle ?? scene.title,
    sceneDescription: data.sceneDescription ?? scene.description
  };
}

const genericInfoTitle: LocalizedContent = { th: 'ข้อมูลสถานที่', en: 'Place information' };
const genericInfoDescription: LocalizedContent = {
  th: 'รายละเอียดของสถานที่นี้ยังอยู่ระหว่างการจัดทำ',
  en: 'Information about this place is being prepared.'
};
const pendingReference: ContentSource = {
  label: { th: 'ยังไม่ระบุแหล่งอ้างอิง', en: 'Source pending' }
};

export function createFallbackHotspotContent(
  scene: TourScene,
  hotspot: InfoHotspotDefinition
): HotspotContent {
  return {
    id: hotspot.id,
    sceneId: scene.id,
    hotspotId: hotspot.id,
    title: genericInfoTitle,
    description: genericInfoDescription,
    sceneTitle: scene.title,
    sceneDescription: scene.description,
    reference: pendingReference,
    images: []
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
      getInfoHotspots(scene).map((hotspot) => createFallbackHotspotContent(scene, hotspot))
    ))
  };
}

export function resolveTourScene(
  scene: TourScene,
  content: PublicContentSnapshot
): TourScene {
  const faculty = content.faculties.find((item) => item.sceneId === scene.id);
  if (faculty) {
    return { ...scene, title: faculty.name, description: faculty.summary };
  }

  const place = content.hotspots.find((item) => (
    item.sceneId === scene.id && item.sceneTitle && item.sceneDescription
  ));
  if (!place?.sceneTitle || !place.sceneDescription) return scene;
  return { ...scene, title: place.sceneTitle, description: place.sceneDescription };
}

export function resolveInfoHotspot(
  hotspot: InfoHotspotDefinition,
  content: PublicContentSnapshot
): InfoHotspot {
  const faculty = content.faculties.find((item) => item.hotspotId === hotspot.id);
  if (faculty) {
    return {
      ...hotspot,
      title: faculty.name,
      description: faculty.description,
      reference: faculty.source,
      images: faculty.images
    };
  }
  const override = content.hotspots.find((item) => item.hotspotId === hotspot.id);
  if (!override) {
    return {
      ...hotspot,
      title: genericInfoTitle,
      description: genericInfoDescription,
      reference: pendingReference,
      images: []
    };
  }
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
