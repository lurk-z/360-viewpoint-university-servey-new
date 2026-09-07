import type { PublicContentSnapshot } from '../../../src/content';
import type { InfoHotspot, Locale, SceneId } from '../../../src/tour-data';

export interface TourViewerHandle {
  navigate: (sceneId: SceneId) => Promise<void>;
  reset: (sceneId: SceneId, animate?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutorotate: () => void;
  toggleFullscreen: () => void;
  focus: () => void;
}

export interface NavigationPositionPreview {
  readonly hotspotId: string;
  readonly yaw: number;
  readonly pitch: number;
}

export interface ViewerCallbacks {
  locale: Locale;
  content: PublicContentSnapshot;
  onInfo: (hotspot: InfoHotspot) => void;
  onProgress: (progress: number) => void;
  onReady: (sceneId: SceneId) => void;
  onSceneChange: (sceneId: SceneId) => void;
  onError: () => void;
  onAutorotate: (enabled: boolean) => void;
  onViewYaw?: (yaw: number) => void;
  navigationPlacementHotspotId?: string;
  onNavigationPositionPick?: (position: NavigationPositionPreview) => void;
}
