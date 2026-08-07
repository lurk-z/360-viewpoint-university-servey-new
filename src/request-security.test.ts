import { describe, expect, it } from 'vitest';
import { isTrustedSameOriginPost } from './server/request-security';

function request(headers: Record<string, string>, url = 'http://127.0.0.1:3000/api/visits'): Request {
  return new Request(url, { method: 'POST', headers });
}

describe('POST origin validation', () => {
  it('accepts browser same-origin metadata when Next has an internal URL', () => {
    expect(isTrustedSameOriginPost(request({
      origin: 'http://localhost:3000',
      'sec-fetch-site': 'same-origin'
    }))).toBe(true);
  });

  it('accepts trusted forwarded hosts and equivalent development loopback names', () => {
    expect(isTrustedSameOriginPost(request({
      origin: 'https://tour.example.ac.th',
      'x-forwarded-host': 'tour.example.ac.th',
      'x-forwarded-proto': 'https'
    }))).toBe(true);
    expect(isTrustedSameOriginPost(request({ origin: 'http://localhost:3000' }))).toBe(true);
  });

  it('rejects browser cross-site requests and unrelated origins', () => {
    expect(isTrustedSameOriginPost(request({
      origin: 'https://attacker.example',
      'sec-fetch-site': 'cross-site'
    }))).toBe(false);
    expect(isTrustedSameOriginPost(request({ origin: 'https://attacker.example' }))).toBe(false);
  });
});
