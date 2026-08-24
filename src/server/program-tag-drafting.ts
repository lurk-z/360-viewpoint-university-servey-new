import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { createAdminSupabaseClient } from '../../lib/supabase/admin.ts';
import { programDataSchema, type ProgramData } from '../content.ts';
import {
  hasMissingProgramRecommendationData,
  inferProgramEligibleQualifications,
  inferProgramStudyLevel
} from '../program-recommendation-data.ts';
import { consumeAiQuota, recordAiMetric } from './ai-usage.ts';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const BATCH_SIZE = 6;

const generatedTagsSchema = z.object({
  programs: z.array(z.object({
    id: z.string().uuid(),
    interestTags: z.object({
      th: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
      en: z.array(z.string().trim().min(1).max(80)).min(1).max(5)
    }),
    careerTags: z.object({
      th: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
      en: z.array(z.string().trim().min(1).max(80)).min(1).max(5)
    })
  })).max(BATCH_SIZE)
});

interface ProgramDraftRow {
  readonly id: string;
  readonly draft_data: unknown;
  readonly published_data: unknown;
  readonly updated_at: string;
}

export interface ProgramTagDraftResult {
  readonly processed: number;
  readonly updated: number;
  readonly remaining: number;
}

function uniqueTags(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 5);
}

function mergeRecommendationData(
  program: ProgramData,
  tags: z.infer<typeof generatedTagsSchema>['programs'][number]
): ProgramData {
  const inferredQualifications = inferProgramEligibleQualifications(program);
  return programDataSchema.parse({
    ...program,
    studyLevel: program.studyLevel ?? inferProgramStudyLevel(program),
    eligibleQualifications: program.eligibleQualifications?.length
      ? program.eligibleQualifications
      : inferredQualifications.length ? inferredQualifications : undefined,
    interestTags: {
      th: program.interestTags?.th.length ? program.interestTags.th : uniqueTags(tags.interestTags.th),
      en: program.interestTags?.en.length ? program.interestTags.en : uniqueTags(tags.interestTags.en)
    },
    careerTags: {
      th: program.careerTags?.th.length ? program.careerTags.th : uniqueTags(tags.careerTags.th),
      en: program.careerTags?.en.length ? program.careerTags.en : uniqueTags(tags.careerTags.en)
    }
  });
}

export async function generateAndPublishProgramTagBatch(): Promise<ProgramTagDraftResult> {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key') throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('programs')
    .select('id,draft_data,published_data,updated_at')
    .is('archived_at', null)
    .not('published_data', 'is', null)
    .order('updated_at', { ascending: true });
  if (error) throw error;

  const candidates = ((data ?? []) as ProgramDraftRow[]).flatMap((row) => {
    const draft = programDataSchema.safeParse(row.draft_data);
    const published = programDataSchema.safeParse(row.published_data);
    return draft.success && published.success && (
      hasMissingProgramRecommendationData(draft.data) || hasMissingProgramRecommendationData(published.data)
    ) ? [{ row, draft: draft.data, published: published.data }] : [];
  });
  const batch = candidates.slice(0, BATCH_SIZE);
  if (!batch.length) return { processed: 0, updated: 0, remaining: 0 };

  const quota = await consumeAiQuota();
  if (!quota.allowed) {
    throw new Error(quota.reason === 'rate-limited'
      ? 'คำขอ AI ต่อนาทีเต็มแล้ว กรุณารอสักครู่'
      : 'โควตา AI วันนี้เต็มแล้ว');
  }

  const input = batch.map(({ row, published: program }) => ({
    id: row.id,
    name: program.name,
    department: program.department,
    level: program.level,
    summary: program.summary,
    description: program.description,
    admission: program.admission
  }));
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    contents: `Create concise recommendation tags only from the supplied program data. Do not use outside knowledge or Google Search.\nInterest tags describe subjects or interests. Career tags describe career fields or work areas directly supported by the program text. Return one to five useful tags in both Thai and English for each group.\n\nPROGRAMS:\n${JSON.stringify(input)}`,
    config: {
      httpOptions: { timeout: 20_000 },
      maxOutputTokens: 2_500,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['programs'],
        properties: {
          programs: {
            type: 'array',
            maxItems: BATCH_SIZE,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'interestTags', 'careerTags'],
              properties: {
                id: { type: 'string' },
                interestTags: {
                  type: 'object', additionalProperties: false, required: ['th', 'en'],
                  properties: {
                    th: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
                    en: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 }
                  }
                },
                careerTags: {
                  type: 'object', additionalProperties: false, required: ['th', 'en'],
                  properties: {
                    th: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
                    en: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  const generated = generatedTagsSchema.parse(JSON.parse(response.text ?? '{}'));
  const generatedById = new Map(generated.programs.map((item) => [item.id, item]));
  let updated = 0;
  for (const { row, draft, published } of batch) {
    const tags = generatedById.get(row.id);
    if (!tags) continue;
    const nextDraft = mergeRecommendationData(draft, tags);
    const nextPublished = mergeRecommendationData(published, tags);
    const result = await supabase.from('programs')
      .update({ draft_data: nextDraft, published_data: nextPublished })
      .eq('id', row.id)
      .eq('updated_at', row.updated_at)
      .select('id');
    if (result.error) throw result.error;
    if (result.data?.length) updated += 1;
  }
  await recordAiMetric('tag-draft', 'success', Date.now() - startedAt);
  return { processed: batch.length, updated, remaining: Math.max(0, candidates.length - batch.length) };
}
