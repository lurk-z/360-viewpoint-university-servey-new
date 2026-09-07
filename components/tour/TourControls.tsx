'use client';

import { message } from '../../src/i18n';
import type { Locale, SceneId } from '../../src/tour-data';
import type { TourViewerHandle } from '../TourViewer';
import TourIcon from './TourIcon';

export type CompactTourOverlay = 'info' | 'map' | 'tools' | 'chat' | null;

interface TourControlsProps {
  readonly locale: Locale;
  readonly activeSceneId: SceneId;
  readonly autorotate: boolean;
  readonly sceneInfoVisible: boolean;
  readonly compactOverlay: CompactTourOverlay;
  readonly introOpen: boolean;
  readonly chatOpen: boolean;
  readonly developmentArrowTool: boolean;
  readonly viewer: TourViewerHandle | null;
  readonly onSceneInfoVisibleChange: (visible: boolean) => void;
  readonly onToggleCompactOverlay: (overlay: Exclude<CompactTourOverlay, null>) => void;
  readonly onOpenDevelopmentArrowTool: () => void;
}

function ViewerButtons({
  locale,
  activeSceneId,
  autorotate,
  viewer,
  includeInfo,
  sceneInfoVisible,
  developmentArrowTool,
  onSceneInfoVisibleChange,
  onOpenDevelopmentArrowTool
}: Omit<TourControlsProps, 'compactOverlay' | 'introOpen' | 'chatOpen' | 'onToggleCompactOverlay'> & { readonly includeInfo: boolean }) {
  return <>
    <button type="button" aria-pressed={autorotate} aria-label={message(locale, 'rotate')} data-tooltip={message(locale, 'rotate')} onClick={() => viewer?.toggleAutorotate()}>
      <TourIcon><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" /></TourIcon>
    </button>
    <button type="button" aria-label={message(locale, 'zoomIn')} data-tooltip={message(locale, 'zoomIn')} onClick={() => viewer?.zoomIn()}>
      <TourIcon><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M21 21l-4.3-4.3" /></TourIcon>
    </button>
    <button type="button" aria-label={message(locale, 'zoomOut')} data-tooltip={message(locale, 'zoomOut')} onClick={() => viewer?.zoomOut()}>
      <TourIcon><circle cx="11" cy="11" r="7" /><path d="M8 11h6M21 21l-4.3-4.3" /></TourIcon>
    </button>
    <button type="button" aria-label={message(locale, 'reset')} data-tooltip={message(locale, 'reset')} onClick={() => viewer?.reset(activeSceneId, true)}>
      <TourIcon><path d="M3 12a9 9 0 1 1 9 9M3 12V7M3 12h5" /></TourIcon>
    </button>
    <button type="button" aria-label={message(locale, 'enterFullscreen')} data-tooltip={message(locale, 'enterFullscreen')} onClick={() => viewer?.toggleFullscreen()}>
      <TourIcon><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></TourIcon>
    </button>
    {includeInfo ? (
      <button type="button" aria-pressed={sceneInfoVisible} aria-label={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} data-tooltip={sceneInfoVisible ? message(locale, 'hideInfo') : message(locale, 'showInfo')} onClick={() => onSceneInfoVisibleChange(!sceneInfoVisible)}>
        <TourIcon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></TourIcon>
      </button>
    ) : null}
    {!includeInfo && developmentArrowTool ? (
      <button type="button" aria-label={locale === 'th' ? 'จัดตำแหน่งลูกศร' : 'Position arrows'} onClick={onOpenDevelopmentArrowTool}>
        <TourIcon><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="5" /></TourIcon>
      </button>
    ) : null}
  </>;
}

export default function TourControls(props: TourControlsProps) {
  const { locale, compactOverlay, introOpen, chatOpen, onToggleCompactOverlay } = props;
  return <>
    <div className="control-rail" role="toolbar" aria-label={message(locale, 'controlsLabel')}>
      <ViewerButtons {...props} includeInfo />
    </div>

    <div id="compact-viewer-tools" className="compact-tool-popover" role="toolbar" aria-label={message(locale, 'controlsLabel')} hidden={compactOverlay !== 'tools'}>
      <ViewerButtons {...props} includeInfo={false} />
    </div>

    <nav className="compact-tour-dock" aria-label={message(locale, 'tourToolbar')} hidden={introOpen}>
      <button type="button" className={compactOverlay === 'info' ? 'is-active' : ''} aria-pressed={compactOverlay === 'info'} aria-controls="scene-panel" onClick={() => onToggleCompactOverlay('info')}>
        <TourIcon><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></TourIcon><span>{message(locale, 'dockInfo')}</span>
      </button>
      <button type="button" className={compactOverlay === 'map' ? 'is-active' : ''} aria-pressed={compactOverlay === 'map'} aria-controls="tour-map-canvas" onClick={() => onToggleCompactOverlay('map')}>
        <TourIcon><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15" /></TourIcon><span>{message(locale, 'dockMap')}</span>
      </button>
      <button type="button" className={compactOverlay === 'tools' ? 'is-active' : ''} aria-pressed={compactOverlay === 'tools'} aria-controls="compact-viewer-tools" onClick={() => onToggleCompactOverlay('tools')}>
        <TourIcon><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3" /></TourIcon><span>{message(locale, 'dockTools')}</span>
      </button>
      <button type="button" className={compactOverlay === 'chat' ? 'is-active' : ''} aria-pressed={compactOverlay === 'chat'} aria-expanded={chatOpen} aria-label={message(locale, compactOverlay === 'chat' ? 'aiClose' : 'aiOpen')} aria-controls="tour-chat-panel" onClick={() => onToggleCompactOverlay('chat')}>
        <TourIcon><path d="M5 5h14v10H9l-4 4V5ZM8 9h8M8 12h5" /></TourIcon><span>{message(locale, 'dockAi')}</span>
      </button>
    </nav>
  </>;
}
