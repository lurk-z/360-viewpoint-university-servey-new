'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ChatResponse, ChatTurn, Citation } from '../src/chat';
import { localizeContent, resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../src/content';
import { getInfoHotspots, getScene, localize, type Locale, type SceneId } from '../src/tour-data';
import { message } from '../src/i18n';

interface DisplayMessage extends ChatTurn {
  readonly id: number;
  readonly citations?: readonly Citation[];
  readonly relatedSceneIds?: readonly SceneId[];
  readonly fallback?: boolean;
}

interface TourChatProps {
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly onNavigate: (sceneId: SceneId) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

function citationSceneId(citation: Citation, content: PublicContentSnapshot): SceneId | undefined {
  if (citation.kind === 'faculty') return content.faculties.find((item) => item.id === citation.id)?.sceneId;
  if (citation.kind === 'program') {
    const program = content.programs.find((item) => item.id === citation.id);
    return content.faculties.find((item) => item.id === program?.facultyId)?.sceneId;
  }
  if (citation.kind === 'hotspot') return content.hotspots.find((item) => item.id === citation.id)?.sceneId;
  if (citation.kind === 'activity') return content.activities.find((item) => item.id === citation.id)?.sceneId;
  return undefined;
}

export default function TourChat({ locale, sceneId, content, onNavigate, onOpenChange }: TourChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const nextMessageId = useRef(1);
  const scene = resolveTourScene(getScene(sceneId), content);
  const sceneHotspots = useMemo(() => (
    getInfoHotspots(scene).map((hotspot) => resolveInfoHotspot(hotspot, content))
  ), [content, scene]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);
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
      message(locale, 'aiQuestionActivities')
    ];
  }, [locale, scene.title, sceneHotspots]);

  const sendQuestion = async (question: string): Promise<void> => {
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
        body: JSON.stringify({ message: value, locale, sceneId, history })
      });
      if (!response.ok) throw new Error('Chat request failed');
      const result = await response.json() as ChatResponse;
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: 'assistant',
        text: result.answer,
        citations: result.citations,
        relatedSceneIds: result.relatedSceneIds,
        fallback: result.fallback
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

  return (
    <div className={`tour-chat${open ? ' is-open' : ''}`}>
      <button
        className="tour-chat__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="tour-chat-panel"
        aria-label={open ? message(locale, 'aiClose') : message(locale, 'aiOpen')}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14v10H9l-4 4V5Z" /><path d="M8 9h8M8 12h5" />
        </svg>
        <span>AI</span>
      </button>

      <aside id="tour-chat-panel" className="tour-chat__panel" aria-label={message(locale, 'aiAssistant')} hidden={!open}>
        <header className="tour-chat__header">
          <div><strong>{message(locale, 'aiAssistant')}</strong><span>{localize(scene.title, locale)}</span></div>
          <button type="button" aria-label={message(locale, 'aiClose')} onClick={() => setOpen(false)}>×</button>
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
              {item.citations?.length ? (
                <div className="tour-chat__citations">
                  <strong>{message(locale, 'aiSources')}</strong>
                  {item.citations.map((citation) => {
                    const targetSceneId = citationSceneId(citation, content);
                    const label = localizeContent(citation.title, locale);
                    if (targetSceneId) {
                      return <button type="button" key={`${citation.kind}-${citation.id}`} onClick={() => { onNavigate(targetSceneId); setOpen(false); }}>{label}</button>;
                    }
                    if (citation.url) {
                      return <a key={`${citation.kind}-${citation.id}`} href={citation.url} target="_blank" rel="noopener noreferrer">{label}</a>;
                    }
                    return <span key={`${citation.kind}-${citation.id}`}>{label}</span>;
                  })}
                </div>
              ) : null}
              {item.relatedSceneIds?.map((targetSceneId) => (
                <button className="tour-chat__scene-link" type="button" key={targetSceneId} onClick={() => { onNavigate(targetSceneId); setOpen(false); }}>
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
