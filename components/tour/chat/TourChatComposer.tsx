'use client';

import type { FormEvent, KeyboardEvent } from 'react';
import { message } from '../../../src/i18n';
import type { Locale } from '../../../src/tour-data';

export default function TourChatComposer({ locale, input, loading, onInputChange, onSubmit, onSend }: {
  readonly locale: Locale;
  readonly input: string;
  readonly loading: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onSend: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim()) onSend();
    }
  };

  return (
    <form className="tour-chat__form" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="tour-chat-input">{message(locale, 'aiPlaceholder')}</label>
      <textarea
        id="tour-chat-input"
        value={input}
        maxLength={500}
        rows={2}
        placeholder={message(locale, 'aiPlaceholder')}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" disabled={loading || !input.trim()}>{message(locale, 'aiSend')}</button>
    </form>
  );
}
