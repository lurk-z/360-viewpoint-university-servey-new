import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('live update integration', () => {
  it('polls public content only in development or an authenticated live preview', () => {
    const hook = source('components/usePublicContent.ts');
    const previewRoute = source('app/api/admin/live-status/route.ts');
    expect(hook).toContain("process.env.NODE_ENV === 'development'");
    expect(hook).toContain("get('preview') === 'admin'");
    expect(hook).toContain('LIVE_REFRESH_INTERVAL_MS = 5_000');
    expect(hook).toContain("fetch('/api/admin/live-status'");
    expect(hook).toContain('snapshot.version !== versionRef.current');
    expect(previewRoute).toContain('getAdminSession()');
  });

  it('refreshes content on public messages, focus, visibility, and reconnect', () => {
    const hook = source('components/usePublicContent.ts');
    expect(hook).toContain("message.scope === 'public'");
    expect(hook).toContain("window.addEventListener('focus'");
    expect(hook).toContain("window.addEventListener('online'");
    expect(hook).toContain("document.addEventListener('visibilitychange'");
  });

  it('rebuilds the imperative viewer from the tour signature while preserving its view', () => {
    const viewer = source('components/TourViewer.tsx');
    expect(viewer).toContain('getTourStructureSignature()');
    expect(viewer).toContain('preservedViewerStateRef');
    expect(viewer).toContain('viewer.getPosition()');
    expect(viewer).toContain('viewer.getZoomLevel()');
    expect(viewer).toContain('}, [tourStructureSignature]);');
  });

  it('keeps draft changes inside Admin and broadcasts public actions to the tour', () => {
    const editor = source('components/admin/AdminContentEditor.tsx');
    const refreshHook = source('components/admin/useAdminActionRefresh.ts');
    expect(editor).toContain("scope: 'draft', kind, id");
    expect(editor).toContain('scope="draft"');
    expect(refreshHook).toContain('broadcastContentUpdate(update)');
    expect(refreshHook).toContain('router.refresh()');
  });

  it('removes development service workers from every route', () => {
    const rootLayout = source('app/layout.tsx');
    const runtime = source('components/DevelopmentRuntime.tsx');
    expect(rootLayout).toContain('<DevelopmentRuntime />');
    expect(runtime).toContain('navigator.serviceWorker.getRegistrations()');
    expect(runtime).toContain("key.startsWith('kmuntb-tour-')");
  });

  it('keeps live updates hidden and orders Admin login before academics', () => {
    const tourApp = source('components/TourApp.tsx');
    const styles = source('src/styles.css');
    expect(tourApp).not.toContain('live-preview-badge');
    expect(styles).not.toContain('.live-preview-badge');
    expect(tourApp.indexOf("message(locale, 'adminLogin')"))
      .toBeLessThan(tourApp.indexOf("message(locale, 'academicsButton')"));
    expect(source('components/usePublicContent.ts')).toContain('LIVE_REFRESH_INTERVAL_MS = 5_000');
  });
});
