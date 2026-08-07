function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function effectiveRequestOrigin(request: Request): URL {
  const internalUrl = new URL(request.url);
  const protocol = firstForwardedValue(request.headers.get('x-forwarded-proto'))
    ?? internalUrl.protocol.replace(':', '');
  const host = firstForwardedValue(request.headers.get('x-forwarded-host'))
    ?? request.headers.get('host')
    ?? internalUrl.host;
  return new URL(`${protocol}://${host}`);
}

/**
 * Accepts browser POSTs from the current page even when Next.js is behind a proxy
 * or development uses localhost while the internal listener uses 127.0.0.1.
 */
export function isTrustedSameOriginPost(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') return false;
  if (fetchSite === 'same-origin' || fetchSite === 'none') return true;

  const originHeader = request.headers.get('origin');
  if (!originHeader) return true;

  try {
    const origin = new URL(originHeader);
    const expected = effectiveRequestOrigin(request);
    if (origin.origin === expected.origin) return true;
    return isLoopback(origin.hostname)
      && isLoopback(expected.hostname)
      && origin.protocol === expected.protocol
      && origin.port === expected.port;
  } catch {
    return false;
  }
}
