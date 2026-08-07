import { z } from 'zod';
import { isSceneId, type LocalizedContent } from './content';
import type { Locale, SceneId } from './tour-data';

export type CitationKind = 'faculty' | 'program' | 'activity' | 'hotspot';

export interface Citation {
  readonly id: string;
  readonly kind: CitationKind;
  readonly title: LocalizedContent;
  readonly url?: string;
}

export interface ChatTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface ChatRequest {
  readonly message: string;
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly history: readonly ChatTurn[];
}

export interface ChatResponse {
  readonly answered: boolean;
  readonly answer: string;
  readonly citations: readonly Citation[];
  readonly relatedSceneIds: readonly SceneId[];
  readonly fallback: boolean;
}

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  locale: z.enum(['th', 'en']),
  sceneId: z.string().refine(isSceneId, 'Unknown scene'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(1_000)
  })).max(6).default([])
});

export const geminiAnswerSchema = z.object({
  answered: z.boolean(),
  answer: z.string().trim().min(1).max(4_000),
  citationIds: z.array(z.string()).max(8),
  relatedSceneIds: z.array(z.string()).max(6)
});
