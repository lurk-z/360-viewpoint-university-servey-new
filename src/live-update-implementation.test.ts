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
    expect(hook).toContain("method: 'HEAD'");
    expect(hook).toContain("response.headers.get('X-Content-Version')");
    expect(hook).toContain("window.addEventListener('focus'");
    expect(hook).toContain("window.addEventListener('online'");
    expect(hook).toContain("document.addEventListener('visibilitychange'");
  });

  it('updates navigation in place and rebuilds only when scene media inventory changes', () => {
    const viewer = [
      source('components/TourViewer.tsx'),
      source('components/tour/viewer/useNavigationHotReload.ts'),
      source('components/tour/viewer/viewer-nodes.ts')
    ].join('\n');
    expect(viewer).toContain('getTourViewerInventorySignature()');
    expect(viewer).toContain('getTourNavigationSignature()');
    expect(viewer).toContain('plugin.updateNode({ id: scene.id, links: buildSceneLinks(scene, navigationPreview) })');
    expect(viewer).toContain('preservedViewerStateRef');
    expect(viewer).toContain('viewer.getPosition()');
    expect(viewer).toContain('viewer.getZoomLevel()');
    expect(viewer).toContain('}, [initialSceneId, viewerInventorySignature]);');
  });

  it('does not rebuild Leaflet for yaw/pitch edits and safely preserves only initialized map views', () => {
    const map = source('components/TourMap.tsx');
    expect(map).toContain('getTourMapStructureSignature()');
    expect(map).toContain('if (Number.isFinite(zoom))');
    expect(map).toContain('Fast Refresh can dispose Leaflet before its first setView()');
    expect(map).toContain('}, [tourMapStructureSignature]);');
    expect(map).not.toContain('getTourStructureSignature()');
  });

  it('provides a development click-preview-copy tool and locks Admin navigation editing', () => {
    const app = source('components/TourApp.tsx');
    const viewer = source('components/TourViewer.tsx');
    const positioner = source('components/DevelopmentArrowPositioner.tsx');
    const editor = [source('components/admin/AdminTourEditor.tsx'), source('components/admin/AdminTourHotspotPanel.tsx')].join('\n');
    const actions = [source('app/admin/actions/content.ts'), source('app/admin/actions/tour.ts')].join('\n');
    const importRoute = source('app/api/admin/backup/import/route.ts');
    expect(app).toContain("process.env.NODE_ENV === 'development'");
    expect(app).toContain('overlayCodeNavigation(tourStructure.data, codeStructure)');
    expect(viewer).toContain('viewerEvents.ClickEvent.type');
    expect(viewer).toContain('onNavigationPositionPick');
    expect(positioner).toContain("navigator.clipboard.writeText(snippet)");
    expect(positioner).toContain("type: 'scene'");
    expect(editor).toContain('is-navigation-readonly');
    expect(editor).not.toContain("setPlacementType");
    expect(actions).toContain('preserveCurrentNavigation(submittedStructure, current.draft)');
    expect(actions).toContain('preserveCurrentNavigation(restoredStructure, current.draft)');
    expect(importRoute).toContain('preserveCurrentNavigation');
  });

  it('keeps development tools off the panorama until opened from the control rail', () => {
    const app = [source('components/TourApp.tsx'), source('components/tour/TourControls.tsx')].join('\n');
    const styles = source('src/styles.css');
    expect(app).not.toContain('development-arrow-positioner-toggle');
    expect(app).not.toContain('development-info-source-warning');
    expect(styles).not.toContain('.development-arrow-positioner-toggle');
    expect(styles).not.toContain('.development-info-source-warning');
    expect(app).toContain("console.warn(");
    expect(app).toContain("'จัดตำแหน่งลูกศร'");
    expect(app).toContain('<DevelopmentArrowPositioner');
    expect(app).toContain('development-navigation-error');
  });

  it('separates Visual Tour scene presentation from Info fields in Admin', () => {
    const editor = [source('components/admin/AdminContentEditor.tsx'), source('components/admin/AdminContentFields.tsx')].join('\n');
    const actions = [source('app/admin/actions/content.ts'), source('src/server/admin-action-shared.ts')].join('\n');
    expect(editor).toContain('Visual Tour Editor ↗');
    expect(editor).not.toContain('name="sceneTitleTh"');
    expect(editor).not.toContain('name="sceneDescriptionTh"');
    expect(editor).not.toContain('name="sceneTitleEn"');
    expect(editor).not.toContain('name="sceneDescriptionEn"');
    expect(actions).toContain(".select('draft_data')");
    expect(actions).toContain('preserveLegacyInfoScenePresentation');
  });

  it('uses code arrows in development and detects same-version tour changes by signature', () => {
    const repository = source('src/server/tour-structure-repository.ts');
    const hook = source('components/useTourStructure.ts');
    const route = source('app/api/tour-structure/route.ts');
    expect(repository).toContain("process.env.NODE_ENV === 'development'");
    expect(repository).toContain('overlayCodeNavigation');
    expect(repository).toContain("process.env.NODE_ENV === 'production'");
    expect(route).toContain("'X-Tour-Structure-Signature'");
    expect(route).toContain('getFreshPublishedTourStructureSnapshot');
    expect(hook).toContain("response.headers.get('X-Tour-Structure-Signature')");
    expect(hook).toContain('window.setInterval(check, 15_000)');
    expect(hook).toContain('getTourStructureDataSignature');
  });

  it('keeps draft changes inside Admin and broadcasts public actions to the tour', () => {
    const editor = [source('components/admin/AdminContentEditor.tsx'), source('components/admin/AdminContentForms.tsx')].join('\n');
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
    const tourApp = [source('components/TourApp.tsx'), source('components/tour/TourHeader.tsx')].join('\n');
    const styles = source('src/styles.css');
    expect(tourApp).not.toContain('live-preview-badge');
    expect(styles).not.toContain('.live-preview-badge');
    expect(tourApp.indexOf("message(locale, 'adminLogin')"))
      .toBeLessThan(tourApp.indexOf("message(locale, 'academicsButton')"));
    expect(source('components/usePublicContent.ts')).toContain('LIVE_REFRESH_INTERVAL_MS = 5_000');
  });

  it('caches public content and invalidates it only for public Admin actions', () => {
    const repository = source('src/server/content-repository.ts');
    const contentRoute = source('app/api/content/route.ts');
    const actions = [source('app/admin/actions/content.ts'), source('src/server/admin-action-shared.ts')].join('\n');
    expect(repository).toContain('unstable_cache');
    expect(repository).toContain("PUBLIC_CONTENT_CACHE_TAG = 'public-content'");
    expect(repository).toContain('revalidate: 15');
    expect(contentRoute).toContain('export async function HEAD()');
    expect(contentRoute).toContain("'X-Content-Version'");
    expect(actions).toContain("updateTag(PUBLIC_CONTENT_CACHE_TAG)");
  });

  it('loads secondary tour interfaces on demand and preserves chat after its first mount', () => {
    const tourApp = source('components/TourApp.tsx');
    const overlayController = source('components/tour/useTourOverlayController.ts');
    for (const component of ['TourMap', 'TourChat', 'ActivitiesDialog', 'FacultyProgramsDialog']) {
      expect(tourApp).toContain(`const ${component} = dynamic(`);
    }
    expect(overlayController).toContain("if (chatOpen) dispatch({ type: 'mount-chat' })");
    expect(tourApp).toContain('{chatMounted ? (');
  });

  it('keeps the Login form tolerant only of extension-added control attributes', () => {
    const login = source('app/admin/(auth)/login/page.tsx');
    expect(login.match(/suppressHydrationWarning/g)).toHaveLength(3);
    expect(login).not.toContain('<main suppressHydrationWarning');
  });
});
