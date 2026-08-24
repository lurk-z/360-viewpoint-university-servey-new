import { resolveTourScene, type PublicContentSnapshot } from './content';
import {
  getNavigationHotspots,
  getScene,
  localize,
  tourScenes,
  type Locale,
  type SceneId
} from './tour-data';

export interface TourDestinationCandidate {
  readonly sceneId: SceneId;
  readonly label: string;
  readonly score: number;
}

export interface MultiStopTourPath {
  readonly stopSceneIds: readonly SceneId[];
  readonly sceneIds: readonly SceneId[];
}

function compactLookup(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function lookupTokens(value: string): string[] {
  return value.normalize('NFKC').toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length > 1) ?? [];
}

export function findShortestTourPath(from: SceneId, to: SceneId): readonly SceneId[] | null {
  if (from === to) return [from];
  const queue: SceneId[] = [from];
  const previous = new Map<SceneId, SceneId | null>([[from, null]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const hotspot of getNavigationHotspots(getScene(current))) {
      if (previous.has(hotspot.target)) continue;
      previous.set(hotspot.target, current);
      if (hotspot.target === to) {
        const path: SceneId[] = [to];
        let cursor: SceneId | null = current;
        while (cursor) {
          path.push(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        return path.reverse();
      }
      queue.push(hotspot.target);
    }
  }
  return null;
}

export function buildMultiStopTourPath(
  from: SceneId,
  requestedStops: readonly SceneId[],
  maximumStops = 5
): MultiStopTourPath | null {
  const stopSceneIds = requestedStops
    .filter((sceneId, index, items) => sceneId !== from && items.indexOf(sceneId) === index)
    .slice(0, Math.max(1, maximumStops));
  if (stopSceneIds.length === 0) return null;

  const sceneIds: SceneId[] = [from];
  let cursor = from;
  for (const stop of stopSceneIds) {
    const segment = findShortestTourPath(cursor, stop);
    if (!segment) return null;
    sceneIds.push(...segment.slice(1));
    cursor = stop;
  }
  return { stopSceneIds, sceneIds };
}

function sceneAliases(sceneId: SceneId, content: PublicContentSnapshot): string[] {
  const scene = getScene(sceneId);
  const resolved = resolveTourScene(scene, content);
  const aliases = [
    resolved.title.th,
    resolved.title.en,
    scene.title.th,
    scene.title.en,
    ...scene.tags.th,
    ...scene.tags.en,
    sceneId
  ];

  for (const faculty of content.faculties) {
    if (faculty.sceneId === sceneId) aliases.push(faculty.name.th, faculty.name.en, faculty.slug);
  }
  const facultyIds = new Set(content.faculties.flatMap((faculty) => (
    faculty.sceneId === sceneId ? [faculty.id] : []
  )));
  for (const program of content.programs) {
    if (!facultyIds.has(program.facultyId)) continue;
    aliases.push(
      program.name.th,
      program.name.en,
      program.department?.th ?? '',
      program.department?.en ?? '',
      ...(program.interestTags?.th ?? []),
      ...(program.interestTags?.en ?? []),
      ...(program.careerTags?.th ?? []),
      ...(program.careerTags?.en ?? [])
    );
  }
  for (const hotspot of content.hotspots) {
    if (hotspot.sceneId === sceneId) aliases.push(hotspot.title.th, hotspot.title.en, hotspot.hotspotId);
  }
  for (const activity of content.activities) {
    if (activity.sceneId === sceneId) aliases.push(activity.title.th, activity.title.en, activity.slug);
  }
  return [...new Set(aliases.filter(Boolean))];
}

export function findTourDestinationCandidates(
  question: string,
  content: PublicContentSnapshot,
  locale: Locale,
  limit = 5
): readonly TourDestinationCandidate[] {
  const compactQuestion = compactLookup(question);
  const questionTokens = new Set(lookupTokens(question));
  return tourScenes.map((scene, index) => {
    const aliases = sceneAliases(scene.id, content);
    let score = 0;
    for (const alias of aliases) {
      const compactAlias = compactLookup(alias);
      if (!compactAlias) continue;
      if (compactQuestion === compactAlias) score = Math.max(score, 1_000);
      else if (compactQuestion.includes(compactAlias)) score = Math.max(score, 500 + compactAlias.length);
      else if (compactAlias.includes(compactQuestion) && compactQuestion.length >= 4) score = Math.max(score, 300);
      const overlap = lookupTokens(alias).filter((token) => questionTokens.has(token)).length;
      score = Math.max(score, overlap * 25);
    }
    return {
      sceneId: scene.id,
      label: localize(resolveTourScene(scene, content).title, locale),
      score,
      index
    };
  })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(({ sceneId, label, score }) => ({ sceneId, label, score }));
}

export function findTourDestinationMentions(
  question: string,
  content: PublicContentSnapshot,
  locale: Locale,
  limit = 5
): readonly TourDestinationCandidate[] {
  const compactQuestion = compactLookup(question);
  const sceneTerms = tourScenes.map((scene) => ({
    scene,
    terms: [...new Set(sceneAliases(scene.id, content).map(compactLookup).filter((term) => term.length >= 4))]
  }));
  const frequency = new Map<string, number>();
  sceneTerms.forEach(({ terms }) => terms.forEach((term) => frequency.set(term, (frequency.get(term) ?? 0) + 1)));

  return sceneTerms.flatMap(({ scene, terms }) => {
    const matches = terms
      .filter((term) => frequency.get(term) === 1)
      .flatMap((term) => {
        const position = compactQuestion.indexOf(term);
        return position >= 0 ? [{ term, position }] : [];
      })
      .sort((a, b) => a.position - b.position || b.term.length - a.term.length);
    const match = matches[0];
    return match ? [{
      sceneId: scene.id,
      label: localize(resolveTourScene(scene, content).title, locale),
      score: 500 + match.term.length,
      position: match.position
    }] : [];
  })
    .sort((a, b) => a.position - b.position || b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map(({ sceneId, label, score }) => ({ sceneId, label, score }));
}

export function buildTourDestinationCatalog(content: PublicContentSnapshot): string {
  return tourScenes.map((scene) => {
    const aliases = sceneAliases(scene.id, content).slice(0, 8).join(' | ');
    return `${scene.id}: ${aliases}`;
  }).join('\n');
}
