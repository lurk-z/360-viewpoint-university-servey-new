'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ChatConversationContext, ChatResponse, RecommendationProfile } from '../../../src/chat';
import { detectPersonalData } from '../../../src/chat-privacy';
import { resolveInfoHotspot, resolveTourScene, type PublicContentSnapshot } from '../../../src/content';
import { message } from '../../../src/i18n';
import { getInfoHotspots, getScene, localize, type Locale, type SceneId } from '../../../src/tour-data';
import type { DisplayMessage } from './types';

interface LastRequest {
  readonly question: string;
  readonly profile?: RecommendationProfile;
}

export default function useTourChatController({ locale, sceneId, content, getViewYaw }: {
  readonly locale: Locale;
  readonly sceneId: SceneId;
  readonly content: PublicContentSnapshot;
  readonly getViewYaw?: () => number | undefined;
}) {
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

  return {
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
    cancelRequest: () => abortControllerRef.current?.abort()
  };
}
