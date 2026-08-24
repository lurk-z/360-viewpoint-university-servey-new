'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  ChatConversationContext,
  ChatFallbackReason,
  ChatIntent,
  ChatResponse,
  ChatTurn,
  CurrentQualification,
  DesiredStudyLevel,
  ProgramRecommendation,
  RecommendationProfile,
  TourPlan
} from '../src/chat';
import { detectPersonalData } from '../src/chat-privacy';
import { localizeContent, resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../src/content';
import { getInfoHotspots, getScene, localize, type Locale, type SceneId } from '../src/tour-data';
import { message } from '../src/i18n';

interface DisplayMessage extends ChatTurn {
  readonly id: number;
  readonly relatedSceneIds?: readonly SceneId[];
  readonly relatedProgramIds?: readonly string[];
  readonly relatedActivityIds?: readonly string[];
  readonly relatedFacultyIds?: readonly string[];
  readonly intent?: ChatIntent;
  readonly tourPlan?: TourPlan;
  readonly programRecommendations?: readonly ProgramRecommendation[];
  readonly comparisonProgramIds?: readonly string[];
  readonly needsRecommendationProfile?: boolean;
  readonly needsTourPreference?: boolean;
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
  readonly onOpenActivity: (activityId: string) => void;
  readonly onOpenAcademics: () => void;
  readonly onStartTour: (plan: TourPlan) => void;
  readonly onStartTourTo: (sceneId: SceneId) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly getViewYaw?: () => number | undefined;
}

interface LastRequest {
  readonly question: string;
  readonly profile?: RecommendationProfile;
}

function formatActivityDate(startDate: string | undefined, endDate: string | undefined, locale: Locale): string {
  if (!startDate && !endDate) return locale === 'th' ? 'ยังไม่ระบุวันที่' : 'Date not specified';
  const format = (value: string): string => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`));
  const start = startDate ?? endDate ?? '';
  const end = endDate ?? startDate ?? '';
  return start === end ? format(start) : `${format(start)} – ${format(end)}`;
}

export default function TourChat({
  open,
  locale,
  sceneId,
  content,
  onNavigate,
  onOpenProgram,
  onOpenFaculty,
  onOpenActivity,
  onOpenAcademics,
  onStartTour,
  onStartTourTo,
  onOpenChange,
  getViewYaw
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSentAtRef = useRef(0);
  const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);
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

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const buildConversationContext = (): ChatConversationContext | undefined => {
    const assistant = [...messages].reverse().find((item) => item.role === 'assistant');
    if (!assistant) return undefined;
    const programIds = [
      ...(assistant.comparisonProgramIds ?? []),
      ...(assistant.programRecommendations?.map((item) => item.programId) ?? []),
      ...(assistant.relatedProgramIds ?? [])
    ].filter((id, index, items) => items.indexOf(id) === index).slice(0, 3);
    const facultyIds = programIds.flatMap((programId) => {
      const facultyId = content.programs.find((program) => program.id === programId)?.facultyId;
      return facultyId ? [facultyId] : [];
    }).concat(assistant.relatedFacultyIds ?? [])
      .filter((id, index, items) => items.indexOf(id) === index).slice(0, 5);
    const sceneIds = [
      ...(assistant.tourPlan?.stopSceneIds ?? []),
      ...(assistant.relatedSceneIds ?? [])
    ].filter((id, index, items) => items.indexOf(id) === index).slice(0, 5);
    const awaitingTourPreference = assistant.needsTourPreference === true;
    return programIds.length || facultyIds.length || sceneIds.length || awaitingTourPreference
      ? { lastProgramIds: programIds, lastFacultyIds: facultyIds, lastSceneIds: sceneIds, awaitingTourPreference }
      : undefined;
  };

  const localError = (kind: 'personal-data' | 'network' | 'cancelled' | 'cooldown'): string => {
    if (locale === 'th') {
      if (kind === 'personal-data') return 'กรุณาอย่าส่งอีเมล เบอร์โทร เลขบัตรประชาชน หรือรหัสประจำตัว แล้วพิมพ์คำถามใหม่';
      if (kind === 'cancelled') return 'ยกเลิกคำขอแล้ว คุณสามารถลองส่งคำถามใหม่ได้';
      if (kind === 'cooldown') return 'กรุณารอสักครู่ก่อนส่งคำถามถัดไป';
      return 'เชื่อมต่อระบบ AI ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่';
    }
    if (kind === 'personal-data') return 'Please remove email addresses, phone numbers, national IDs, or student IDs and try again.';
    if (kind === 'cancelled') return 'The request was cancelled. You can submit it again.';
    if (kind === 'cooldown') return 'Please wait a moment before sending another question.';
    return 'Could not reach the AI service. Check your connection and try again.';
  };

  const addAssistantError = (text: string): void => setMessages((current) => [...current, {
    id: nextMessageId.current++, role: 'assistant', text, fallback: true
  }]);

  const sendQuestion = async (question: string, profile?: RecommendationProfile, retry = false): Promise<void> => {
    const value = question.trim();
    if (!value || loading) return;
    if (detectPersonalData(value)) {
      addAssistantError(localError('personal-data'));
      return;
    }
    if (!retry && !profile && Date.now() - lastSentAtRef.current < 800) {
      addAssistantError(localError('cooldown'));
      return;
    }
    lastSentAtRef.current = Date.now();
    const userMessage: DisplayMessage = { id: nextMessageId.current++, role: 'user', text: value };
    const history = messages.slice(-6).map(({ role, text }) => ({ role, text }));
    if (!retry) setMessages((current) => [...current, userMessage]);
    setInput('');
    setLastRequest({ question: value, profile });
    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: value,
          locale,
          sceneId,
          history,
          viewYaw: getViewYaw?.(),
          conversationContext: buildConversationContext(),
          recommendationProfile: profile
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (response.status === 422 && body.error === 'personal-data') {
          addAssistantError(localError('personal-data'));
          return;
        }
        throw new Error(body.error ?? 'Chat request failed');
      }
      const result = await response.json() as ChatResponse;
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: 'assistant',
        text: result.answer,
        relatedSceneIds: result.relatedSceneIds,
        relatedProgramIds: Array.isArray(result.relatedProgramIds) ? result.relatedProgramIds : [],
        relatedActivityIds: Array.isArray(result.relatedActivityIds) ? result.relatedActivityIds : [],
        relatedFacultyIds: Array.isArray(result.relatedFacultyIds) ? result.relatedFacultyIds : [],
        intent: result.intent,
        tourPlan: result.tourPlan,
        programRecommendations: result.programRecommendations,
        comparisonProgramIds: result.comparisonProgramIds,
        needsRecommendationProfile: result.needsRecommendationProfile,
        needsTourPreference: result.needsTourPreference,
        fallback: result.fallback,
        fallbackReason: result.fallbackReason
      }]);
    } catch (error) {
      addAssistantError(localError(error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'network'));
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
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
              {item.relatedFacultyIds?.length ? (
                <div className="tour-chat__faculties">
                  <strong>{locale === 'th' ? 'ข้อมูลคณะ' : 'Faculties'}</strong>
                  {item.relatedFacultyIds.flatMap((facultyId) => {
                    const faculty = content.faculties.find((value) => value.id === facultyId);
                    if (!faculty) return [];
                    const programCount = content.programs.filter((program) => program.facultyId === faculty.id).length;
                    return [
                      <button type="button" key={faculty.id} onClick={() => { onOpenFaculty(faculty.id); onOpenChange(false); }}>
                        <span>{localizeContent(faculty.name, locale)}</span>
                        <small>{locale === 'th' ? `${programCount} หลักสูตร` : `${programCount} ${programCount === 1 ? 'program' : 'programs'}`}</small>
                      </button>
                    ];
                  })}
                </div>
              ) : null}
              {item.relatedActivityIds?.length ? (
                <div className="tour-chat__activities">
                  <strong>{locale === 'th' ? 'กิจกรรมที่เผยแพร่' : 'Published activities'}</strong>
                  {item.relatedActivityIds.flatMap((activityId) => {
                    const activity = content.activities.find((value) => value.id === activityId);
                    if (!activity) return [];
                    return [
                      <button type="button" key={activity.id} onClick={() => { onOpenActivity(activity.id); onOpenChange(false); }}>
                        <span>{localizeContent(activity.title, locale)}</span>
                        <small>{formatActivityDate(activity.startDate, activity.endDate, locale)}</small>
                        <small>{localizeContent(activity.summary, locale)}</small>
                      </button>
                    ];
                  })}
                </div>
              ) : null}
              {item.tourPlan ? (
                <div className="tour-chat__route-card">
                  <strong>{message(locale, 'aiTourRoute')}</strong>
                  <span>{localize(resolveTourScene(getScene(item.tourPlan.destinationSceneId), content).title, locale)}</span>
                  <div className="tour-chat__route-stops">
                    <small>{localize(scene.title, locale)}</small>
                    {item.tourPlan.stopSceneIds.map((stopSceneId) => (
                      <small key={stopSceneId}>→ {localize(resolveTourScene(getScene(stopSceneId), content).title, locale)}</small>
                    ))}
                  </div>
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
                          {faculty ? (
                            <p className="tour-chat__program-faculty">
                              {locale === 'th' ? 'คณะ' : 'Faculty'}: {localizeContent(faculty.name, locale)}
                            </p>
                          ) : null}
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
              {item.comparisonProgramIds?.length ? (
                <div className="tour-chat__comparison">
                  <strong>{locale === 'th' ? 'เปรียบเทียบหลักสูตร' : 'Program comparison'}</strong>
                  <div className="tour-chat__comparison-grid">
                    {item.comparisonProgramIds.flatMap((programId) => {
                      const program = content.programs.find((value) => value.id === programId);
                      const faculty = program ? content.faculties.find((value) => value.id === program.facultyId) : undefined;
                      if (!program) return [];
                      return [
                        <article key={program.id}>
                          <h3>{localizeContent(program.name, locale)}</h3>
                          {faculty ? <strong>{localizeContent(faculty.name, locale)}</strong> : null}
                          {program.department ? <span>{localizeContent(program.department, locale)}</span> : null}
                          <span>{localizeContent(program.level, locale)}</span>
                          <p>{localizeContent(program.summary, locale)}</p>
                          <small>{localizeContent(program.admission, locale)}</small>
                          {program.interestTags?.[locale].length || program.careerTags?.[locale].length ? (
                            <div className="tour-chat__comparison-tags">
                              {program.interestTags?.[locale].map((tag) => <span key={`interest-${tag}`}>{tag}</span>)}
                              {program.careerTags?.[locale].map((tag) => <span key={`career-${tag}`}>{tag}</span>)}
                            </div>
                          ) : null}
                          <button type="button" onClick={() => onOpenProgram(program.id)}>{message(locale, 'aiViewProgram')}</button>
                        </article>
                      ];
                    })}
                  </div>
                </div>
              ) : null}
              {item.relatedProgramIds?.length && !item.programRecommendations?.length ? (
                <div className="tour-chat__programs">
                  <strong>{message(locale, 'aiRelatedPrograms')}</strong>
                  {item.relatedProgramIds.flatMap((programId) => {
                    const program = content.programs.find((item) => item.id === programId);
                    const faculty = program ? content.faculties.find((item) => item.id === program.facultyId) : undefined;
                    return program ? [
                      <button type="button" key={program.id} onClick={() => onOpenProgram(program.id)}>
                        <span>{localizeContent(program.name, locale)}</span>
                        {faculty ? <small>{locale === 'th' ? 'คณะ' : 'Faculty'}: {localizeContent(faculty.name, locale)}</small> : null}
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
          {loading ? (
            <div className="tour-chat__thinking" role="status">
              <span>{message(locale, 'aiThinking')}</span>
              <button type="button" onClick={() => abortControllerRef.current?.abort()}>
                {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
            </div>
          ) : lastRequest && messages.at(-1)?.fallback ? (
            <button
              className="tour-chat__retry"
              type="button"
              onClick={() => void sendQuestion(lastRequest.question, lastRequest.profile, true)}
            >
              {locale === 'th' ? 'ลองใหม่' : 'Try again'}
            </button>
          ) : null}
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
