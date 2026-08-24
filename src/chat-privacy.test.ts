import { describe, expect, it } from 'vitest';
import { detectPersonalData } from './chat-privacy';

describe('chat privacy guard', () => {
  it.each([
    ['test@example.com', 'email'],
    ['โทร 081-234-5678', 'phone'],
    ['1-2345-67890-12-3', 'national-id'],
    ['student id: 6501234567', 'student-id']
  ])('detects %s', (value, kind) => {
    expect(detectPersonalData(value)?.kind).toBe(kind);
  });

  it('does not block normal academic numbers', () => {
    expect(detectPersonalData('หลักสูตร 130 หน่วยกิต ปรับปรุง พ.ศ. 2567')).toBeNull();
  });
});
