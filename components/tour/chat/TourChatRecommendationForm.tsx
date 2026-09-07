'use client';

import type { FormEvent } from 'react';
import type { CurrentQualification, DesiredStudyLevel, RecommendationProfile } from '../../../src/chat';
import { message } from '../../../src/i18n';
import type { Locale } from '../../../src/tour-data';

export default function TourChatRecommendationForm({ locale, profile, loading, onChange, onSubmit }: {
  readonly locale: Locale;
  readonly profile: RecommendationProfile;
  readonly loading: boolean;
  readonly onChange: (profile: RecommendationProfile) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="tour-chat__recommendation-form" onSubmit={onSubmit}>
      <strong>{message(locale, 'aiRecommendationTitle')}</strong>
      <label>
        <span>{message(locale, 'aiInterestLabel')}</span>
        <textarea
          value={profile.interests}
          maxLength={300}
          rows={2}
          required
          placeholder={message(locale, 'aiInterestPlaceholder')}
          onChange={(event) => onChange({ ...profile, interests: event.target.value })}
        />
      </label>
      <label>
        <span>{message(locale, 'aiQualificationLabel')}</span>
        <select
          value={profile.currentQualification}
          onChange={(event) => onChange({
            ...profile,
            currentQualification: event.target.value as CurrentQualification
          })}
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
          value={profile.desiredLevel}
          onChange={(event) => onChange({
            ...profile,
            desiredLevel: event.target.value as DesiredStudyLevel
          })}
        >
          <option value="vocational">{message(locale, 'aiLevelVocational')}</option>
          <option value="bachelor">{message(locale, 'aiLevelBachelor')}</option>
          <option value="transfer">{message(locale, 'aiLevelTransfer')}</option>
          <option value="master">{message(locale, 'aiLevelMaster')}</option>
          <option value="unsure">{message(locale, 'aiLevelUnsure')}</option>
        </select>
      </label>
      <button type="submit" disabled={loading || profile.interests.trim().length < 2}>
        {message(locale, 'aiRecommendSubmit')}
      </button>
    </form>
  );
}
