'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  ChatFallbackReason,
  ChatIntent,
  ChatResponse,
  ChatTurn,
  Citation,
  CurrentQualification,
  DesiredStudyLevel,
  ProgramRecommendation,
  RecommendationProfile,
  TourPlan
} from '../src/chat';
import { localizeContent, resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../src/content';
import { getInfoHotspots, getScene, localize, type Locale, type SceneId } from '../src/tour-data';
import { message } from '../src/i18n';

interface DisplayMessage extends ChatTurn {
  readonly id: number;
  readonly citations?: readonly Citation[];
  readonly relatedSceneIds?: readonly SceneId[];
  readonly relatedProgramIds?: readonly string[];
  readonly intent?: ChatIntent;
  readonly tourPlan?: TourPlan;
  readonly programRecommendations?: readonly ProgramRecommendation[];
  readonly needsRecommendationProfile?: boolean;
  readonly fallback?: boolean;
  readonly fallbackReason?: ChatFallbackReason;
}

interface TourChatProps {
  readonly open: boolean;
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly onOpenProgram: (programId: string) => void;
  readonly onOpenFaculty: (facultyId: string) => void;
  readonly onOpenAcademics: () => void;
  readonly onStartTour: (plan: TourPlan) => void;
  readonly onStartTourTo: (sceneId: SceneId) => void;
  readonly onOpenChange: (open: boolean) => void;
}

function citationSceneId(citation: Citation, content: PublicContentSnapshot): SceneId | undefined {
  if (citation.kind === 'faculty') return content.faculties.find((item) => item.id === citation.id)?.sceneId;
  if (citation.kind === 'hotspot') return content.hotspots.find((item) => item.id === citation.id)?.sceneId;
  if (citation.kind === 'activity') return content.activities.find((item) => item.id === citation.id)?.sceneId;
  return undefined;
}

export default function TourChat({
  open,
  locale,
  sceneId,
  content,
  onNavigate,
  onOpenProgram,
  onOpenFaculty,
  onOpenAcademics,
  onStartTour,
  onStartTourTo,
  onOpenChange
}: TourChatProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [recommendationProfile, setRecommendationProfile] = useState<RecommendationProfile>({
    interests: '',
    currentQualification: 'm6-pvoc',
    desiredLevel: 'bachelor'
  });
  const nextMessageId = useRef(1);
  const scene = resolveTourScene(getScene(sceneId), content);
  const sceneHotspots = useMemo(() => (
    getInfoHotspots(scene).map((hotspot) => resolveInfoHotspot(hotspot, content))
  ), [content, scene]);

  const suggestions = useMemo(() => {
    const sceneName = localize(scene.title, locale);
    const firstHotspot = sceneHotspots[0];
    return [
      locale === 'th' ? `สถานที่ ${sceneName} มีข้อมูลอะไรบ้าง` : `What can I learn about ${sceneName}?`,
      firstHotspot
        ? (locale === 'th'
          ? `ช่วยอธิบายเกี่ยวกับ ${localize(firstHotspot.title, locale)}`
          : `Tell me about ${localize(firstHotspot.title, locale)}`)
        : message(locale, 'aiQuestionCourses'),
      message(locale, 'aiQuestionActivities'),
      message(locale, 'aiQuestionRecommend'),
      message(locale, 'aiQuestionTour')
    ];
  }, [locale, scene.title, sceneHotspots]);

  const sendQuestion = async (question: string, profile?: RecommendationProfile): Promise<void> => {
    const value = question.trim();
    if (!value || loading) return;
    const userMessage: DisplayMessage = { id: nextMessageId.current++, role: 'user', text: value };
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, locale, sceneId, history, recommendationProfile: profile })
      });
      if (!response.ok) throw new Error('Chat request failed');
      const result = await response.json() as ChatResponse;
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: 'assistant',
        text: result.answer,
        citations: result.citations,
        relatedSceneIds: result.relatedSceneIds,
        relatedProgramIds: Array.isArray(result.relatedProgramIds) ? result.relatedProgramIds : [],
        intent: result.intent,
        tourPlan: result.tourPlan,
        programRecommendations: result.programRecommendations,
        needsRecommendationProfile: result.needsRecommendationProfile,
        fallback: result.fallback,
        fallbackReason: result.fallbackReason
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: 'assistant',
        text: message(locale, 'aiUnavailable'),
        fallback: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void sendQuestion(input);
  };

  const submitRecommendation = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!recommendationProfile.interests.trim() || loading) return;
    void sendQuestion(
      locale === 'th'
        ? `ช่วยแนะนำหลักสูตรตามความสนใจ ${recommendationProfile.interests}`
        : `Recommend programs for my interest in ${recommendationProfile.interests}`,
      recommendationProfile
    );
  };

  return (
    <div className={`tour-chat${open ? ' is-open' : ''}`}>
      <button
        className="tour-chat__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="tour-chat-panel"
        aria-label={open ? message(locale, 'aiClose') : message(locale, 'aiOpen')}
        onClick={() => onOpenChange(!open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14v10H9l-4 4V5Z" /><path d="M8 9h8M8 12h5" />
        </svg>
        <span>AI</span>
      </button>

      <aside id="tour-chat-panel" className="tour-chat__panel" aria-label={message(locale, 'aiAssistant')} hidden={!open}>
        <header className="tour-chat__header">
          <div><strong>{message(locale, 'aiAssistant')}</strong><span>{localize(scene.title, locale)}</span></div>
          <button type="button" aria-label={message(locale, 'aiClose')} onClick={() => onOpenChange(false)}>×</button>
        </header>
        <div className="tour-chat__body" aria-live="polite">
          {messages.length === 0 ? (
            <div className="tour-chat__welcome">
              <p>{message(locale, 'aiIntro')}</p>
              <strong>{message(locale, 'aiSuggested')}</strong>
              <div className="tour-chat__suggestions">
                {suggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => void sendQuestion(suggestion)}>{suggestion}</button>
                ))}
              </div>
            </div>
          ) : messages.map((item) => (
            <article className={`tour-chat__message is-${item.role}${item.fallback ? ' is-fallback' : ''}`} key={item.id}>
              <p>{item.text}</p>
              {item.needsRecommendationProfile ? (
                <form className="tour-chat__recommendation-form" onSubmit={submitRecommendation}>
                  <strong>{message(locale, 'aiRecommendationTitle')}</strong>
                  <label>
                    <span>{message(locale, 'aiInterestLabel')}</span>
                    <textarea
                      value={recommendationProfile.interests}
                      maxLength={300}
                      rows={2}
                      required
                      placeholder={message(locale, 'aiInterestPlaceholder')}
                      onChange={(event) => setRecommendationProfile((current) => ({ ...current, interests: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{message(locale, 'aiQualificationLabel')}</span>
                    <select
                      value={recommendationProfile.currentQualification}
                      onChange={(event) => setRecommendationProfile((current) => ({
                        ...current,
                        currentQualification: event.target.value as CurrentQualification
                      }))}
                    >
                      <option value="m3">{message(locale, 'aiQualificationM3')}</option>
                      <option value="m6-pvoc">{message(locale, 'aiQualificationM6Pvoc')}</option>
                      <option value="high-vocational">{message(locale, 'aiQualificationHighVocational')}</option>
                      <option value="bachelor">{message(locale, 'aiQualificationBachelor')}</option>
                      <option value="other">{message(locale, 'aiQualificationOther')}</option>
                    </select>
                  </label>
                  <label>
                    <span>{message(locale, 'aiDesiredLevelLabel')}</span>
                    <select
                      value={recommendationProfile.desiredLevel}
                      onChange={(event) => setRecommendationProfile((current) => ({
                        ...current,
                        desiredLevel: event.target.value as DesiredStudyLevel
                      }))}
                    >
                      <option value="vocational">{message(locale, 'aiLevelVocational')}</option>
                      <option value="bachelor">{message(locale, 'aiLevelBachelor')}</option>
                      <option value="transfer">{message(locale, 'aiLevelTransfer')}</option>
                      <option value="master">{message(locale, 'aiLevelMaster')}</option>
                      <option value="unsure">{message(locale, 'aiLevelUnsure')}</option>
                    </select>
                  </label>
                  <button type="submit" disabled={loading || recommendationProfile.interests.trim().length < 2}>
                    {message(locale, 'aiRecommendSubmit')}
                  </button>
                </form>
              ) : null}
              {item.tourPlan ? (
                <div className="tour-chat__route-card">
                  <strong>{message(locale, 'aiTourRoute')}</strong>
                  <span>{localize(resolveTourScene(getScene(item.tourPlan.destinationSceneId), content).title, locale)}</span>
                  <small>{message(locale, 'aiTourStepCount')}: {item.tourPlan.sceneIds.length}</small>
                  <button type="button" onClick={() => { onStartTour(item.tourPlan!); onOpenChange(false); }}>
                    {message(locale, 'aiStartTour')}
                  </button>
                </div>
              ) : null}
              {item.programRecommendations?.length ? (
                <div className="tour-chat__recommendations">
                  <strong>{message(locale, 'aiRelatedPrograms')}</strong>
                  {item.programRecommendations.flatMap((recommendation, index) => {
                    const program = content.programs.find((value) => value.id === recommendation.programId);
                    const faculty = program ? content.faculties.find((value) => value.id === program.facultyId) : undefined;
                    const facultySceneId = faculty?.sceneId;
                    if (!program) return [];
                    return [
                      <article key={program.id}>
                        <span>{index + 1}</span>
                        <div>
                          <h3>{localizeContent(program.name, locale)}</h3>
                          <p>{recommendation.reason}</p>
                          <small>{localizeContent(program.admission, locale)}</small>
                          <div>
                            <button type="button" onClick={() => onOpenProgram(program.id)}>{message(locale, 'aiViewProgram')}</button>
                            {faculty ? <button type="button" onClick={() => onOpenFaculty(faculty.id)}>{message(locale, 'aiViewFaculty')}</button> : null}
                            {facultySceneId ? <button type="button" onClick={() => { onStartTourTo(facultySceneId); onOpenChange(false); }}>{message(locale, 'aiGuideToFaculty')}</button> : null}
                          </div>
                        </div>
                      </article>
                    ];
                  })}
                  <button className="tour-chat__more-programs" type="button" onClick={onOpenAcademics}>{message(locale, 'aiMorePrograms')}</button>
                  <p className="tour-chat__recommendation-disclaimer">{message(locale, 'aiRecommendationDisclaimer')}</p>
                </div>
              ) : null}
              {item.citations?.length ? (
                <div className="tour-chat__citations">
                  <strong>{message(locale, 'aiSources')}</strong>
                  {item.citations.map((citation) => {
                    if (citation.kind === 'program' && content.programs.some((program) => program.id === citation.id)) {
                      return <button type="button" key={`${citation.kind}-${citation.id}`} onClick={() => onOpenProgram(citation.id)}>{localizeContent(citation.title, locale)}</button>;
                    }
                    const targetSceneId = citationSceneId(citation, content);
                    const label = localizeContent(citation.title, locale);
                    if (targetSceneId) {
                      return <button type="button" key={`${citation.kind}-${citation.id}`} onClick={() => { onNavigate(targetSceneId); onOpenChange(false); }}>{label}</button>;
                    }
                    if (citation.url) {
                      return <a key={`${citation.kind}-${citation.id}`} href={citation.url} target="_blank" rel="noopener noreferrer">{label}</a>;
                    }
                    return <span key={`${citation.kind}-${citation.id}`}>{label}</span>;
                  })}
                </div>
              ) : null}
              {item.relatedProgramIds?.length && !item.programRecommendations?.length ? (
                <div className="tour-chat__programs">
                  <strong>{message(locale, 'aiRelatedPrograms')}</strong>
                  {item.relatedProgramIds.flatMap((programId) => {
                    const program = content.programs.find((item) => item.id === programId);
                    return program ? [
                      <button type="button" key={program.id} onClick={() => onOpenProgram(program.id)}>
                        {localizeContent(program.name, locale)}
                      </button>
                    ] : [];
                  })}
                </div>
              ) : null}
              {item.relatedSceneIds?.map((targetSceneId) => (
                <button className="tour-chat__scene-link" type="button" key={targetSceneId} onClick={() => {
                  if (item.intent === 'tour') onStartTourTo(targetSceneId);
                  else onNavigate(targetSceneId);
                  onOpenChange(false);
                }}>
                  {localize(resolveTourScene(getScene(targetSceneId), content).title, locale)}
                </button>
              ))}
            </article>
          ))}
          {loading ? <p className="tour-chat__thinking" role="status">{message(locale, 'aiThinking')}</p> : null}
        </div>
        <form className="tour-chat__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="tour-chat-input">{message(locale, 'aiPlaceholder')}</label>
          <textarea
            id="tour-chat-input"
            value={input}
            maxLength={500}
            rows={2}
            placeholder={message(locale, 'aiPlaceholder')}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (input.trim()) void sendQuestion(input);
              }
            }}
          />
          <button type="submit" disabled={loading || !input.trim()}>{message(locale, 'aiSend')}</button>
        </form>
        <p className="tour-chat__privacy">{message(locale, 'aiPrivacy')}</p>
      </aside>
    </div>
  );
}
