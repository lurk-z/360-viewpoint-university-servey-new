import type { ChatRequest, Citation } from '../chat';
import type { ProgramContent, PublicContentSnapshot } from '../content';
import type { SceneId } from '../tour-data';
import { chatTokens, compactChatLookup, contextualProgramIds } from './chat-intents';

export interface KnowledgeDocument {
  readonly citation: Citation;
  readonly sceneId?: SceneId;
  readonly text: string;
}

const MAX_CONTEXT_CHARACTERS = 30_000;

function sourceUrl(source: { readonly url?: string }): string | undefined {
  return source.url;
}

function localizedTags(tags: ProgramContent['interestTags'] | ProgramContent['careerTags']): string {
  if (!tags) return '-';
  return `TH: ${tags.th.join(', ')} / EN: ${tags.en.join(', ')}`;
}

export function buildKnowledgeDocuments(content: PublicContentSnapshot): KnowledgeDocument[] {
  const facultyById = new Map(content.faculties.map((faculty) => [faculty.id, faculty]));
  const facultyManagedHotspots = new Set(content.faculties.flatMap((faculty) => faculty.hotspotId ? [faculty.hotspotId] : []));
  return [
    ...content.faculties.map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'faculty', title: item.name, url: sourceUrl(item.source) },
      sceneId: item.sceneId,
      text: `FACULTY ${item.slug}\nTH: ${item.name.th}\n${item.summary.th}\n${item.description.th}\nEN: ${item.name.en}\n${item.summary.en}\n${item.description.en}`
    })),
    ...content.programs.map((item): KnowledgeDocument => {
      const faculty = facultyById.get(item.facultyId);
      return {
        citation: { id: item.id, kind: 'program', title: item.name, url: sourceUrl(item.source) },
        sceneId: faculty?.sceneId,
        text: `PROGRAM ${item.slug}\nFACULTY: ${faculty?.name.th ?? '-'} / ${faculty?.name.en ?? '-'}\nDEPARTMENT: ${item.department?.th ?? '-'} / ${item.department?.en ?? '-'}\nSTUDY LEVEL: ${item.studyLevel ?? '-'}\nELIGIBLE QUALIFICATIONS: ${item.eligibleQualifications?.join(', ') ?? '-'}\nINTEREST TAGS: ${localizedTags(item.interestTags)}\nCAREER TAGS: ${localizedTags(item.careerTags)}\nTH: ${item.name.th} (${item.level.th})\n${item.summary.th}\n${item.description.th}\nการรับสมัคร: ${item.admission.th}\nEN: ${item.name.en} (${item.level.en})\n${item.summary.en}\n${item.description.en}\nAdmission: ${item.admission.en}`
      };
    }),
    ...content.activities.map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'activity', title: item.title, url: sourceUrl(item.source) },
      sceneId: item.sceneId,
      text: `ACTIVITY ${item.slug}\nTH: ${item.title.th}\n${item.summary.th}\n${item.description.th}\nEN: ${item.title.en}\n${item.summary.en}\n${item.description.en}\nDATE: ${item.startDate ?? '-'} to ${item.endDate ?? '-'}`
    })),
    ...content.hotspots.filter((item) => !facultyManagedHotspots.has(item.hotspotId)).map((item): KnowledgeDocument => ({
      citation: { id: item.id, kind: 'hotspot', title: item.title, url: sourceUrl(item.reference) },
      sceneId: item.sceneId,
      text: `PLACE ${item.hotspotId} at scene ${item.sceneId}\nTH: ${item.title.th}\n${item.description.th}\nEN: ${item.title.en}\n${item.description.en}`
    }))
  ];
}

function facultyLookupTerms(name: string, slug: string): string[] {
  const withoutPrefix = name.replace(/^คณะ/u, '').trim();
  const firstThaiPart = withoutPrefix.split('และ')[0]?.trim();
  const withoutEnglishPrefix = name.replace(/^faculty\s+of\s+/i, '').trim();
  const firstEnglishPart = withoutEnglishPrefix.split(/\s+and\s+/i)[0]?.trim();
  return [name, withoutPrefix, firstThaiPart ? `คณะ${firstThaiPart}` : '', withoutEnglishPrefix, firstEnglishPart ?? '', slug]
    .map(compactChatLookup)
    .filter((term) => term.length >= 6);
}

export function findRelatedProgramIds(request: ChatRequest, content: PublicContentSnapshot, citations: readonly Citation[] = []): string[] {
  const validProgramIds = new Set(content.programs.map((program) => program.id));
  const specificProgramIds = new Set(contextualProgramIds(request, content));
  if (specificProgramIds.size > 0) return content.programs.flatMap((program) => specificProgramIds.has(program.id) ? [program.id] : []);

  const compactQuestion = compactChatLookup(request.message);
  const facultyIds = new Set(citations.flatMap((citation) => citation.kind === 'faculty' && content.faculties.some((faculty) => faculty.id === citation.id) ? [citation.id] : []));
  for (const faculty of content.faculties) {
    const terms = [...facultyLookupTerms(faculty.name.th, faculty.slug), ...facultyLookupTerms(faculty.name.en, faculty.slug)];
    if (terms.some((term) => compactQuestion.includes(term))) facultyIds.add(faculty.id);
  }

  const hasAcademicIntent = /(คณะ|หลักสูตร|สาขา|เปิดสอน|เรียน|faculty|program|course|degree|study)/iu.test(request.message);
  if (facultyIds.size === 0 && hasAcademicIntent) {
    for (const faculty of content.faculties) if (faculty.sceneId === request.sceneId) facultyIds.add(faculty.id);
  }
  if (facultyIds.size === 0 && /(หลักสูตร|เปิดสอน|program|course|degree)/iu.test(request.message)) return content.programs.map((program) => program.id);
  if (facultyIds.size > 0) return content.programs.flatMap((program) => facultyIds.has(program.facultyId) ? [program.id] : []);

  const citedProgramIds = new Set(citations.flatMap((citation) => citation.kind === 'program' && validProgramIds.has(citation.id) ? [citation.id] : []));
  return content.programs.flatMap((program) => citedProgramIds.has(program.id) ? [program.id] : []);
}

export function selectKnowledge(documents: readonly KnowledgeDocument[], question: string, sceneId: SceneId, includeAllPrograms = false): KnowledgeDocument[] {
  const queryTokens = new Set(chatTokens(question));
  const ranked = documents.map((document, index) => ({
    document,
    index,
    score: (document.sceneId === sceneId ? 100 : 0)
      + chatTokens(document.text).reduce((score, token) => score + (queryTokens.has(token) ? 3 : 0), 0)
      + (includeAllPrograms && document.citation.kind === 'program' ? 1_000 : 0)
  })).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: KnowledgeDocument[] = [];
  let length = 0;
  for (const { document, score } of ranked) {
    if (score <= 0) continue;
    if (selected.length >= (includeAllPrograms ? 12 : 10) || length + document.text.length > MAX_CONTEXT_CHARACTERS) continue;
    selected.push(document);
    length += document.text.length;
  }
  return selected;
}
