'use client';

import type { TourPlan } from '../src/chat';
import type { PublicContentSnapshot } from '../src/content';
import { localize, type Locale, type SceneId } from '../src/tour-data';
import { message } from '../src/i18n';
import TourChatMessage from './tour/chat/TourChatMessage';
import TourChatComposer from './tour/chat/TourChatComposer';
import useTourChatController from './tour/chat/useTourChatController';

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
  const {
    input,
    setInput,
    loading,
    messages,
    recommendationProfile,
    setRecommendationProfile,
    scene,
    suggestions,
    lastRequest,
    sendQuestion,
    handleSubmit,
    submitRecommendation,
    cancelRequest
  } = useTourChatController({ locale, sceneId, content, getViewYaw });

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
            <TourChatMessage
              key={item.id}
              item={item}
              locale={locale}
              currentSceneId={sceneId}
              content={content}
              recommendationProfile={recommendationProfile}
              loading={loading}
              onRecommendationProfileChange={setRecommendationProfile}
              onSubmitRecommendation={submitRecommendation}
              onNavigate={onNavigate}
              onOpenProgram={onOpenProgram}
              onOpenFaculty={onOpenFaculty}
              onOpenActivity={onOpenActivity}
              onOpenAcademics={onOpenAcademics}
              onStartTour={onStartTour}
              onStartTourTo={onStartTourTo}
              onClose={() => onOpenChange(false)}
            />
          ))}
          {loading ? (
            <div className="tour-chat__thinking" role="status">
              <span>{message(locale, 'aiThinking')}</span>
              <button type="button" onClick={cancelRequest}>
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
        <TourChatComposer
          locale={locale}
          input={input}
          loading={loading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onSend={() => void sendQuestion(input)}
        />
        <p className="tour-chat__privacy">{message(locale, 'aiPrivacy')}</p>
      </aside>
    </div>
  );
}
