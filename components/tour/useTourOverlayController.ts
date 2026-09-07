'use client';

import { useEffect, useReducer } from 'react';
import type { CompactTourOverlay } from './TourControls';

interface TourOverlayState {
  readonly compactOverlay: CompactTourOverlay;
  readonly desktopChatOpen: boolean;
  readonly chatMounted: boolean;
  readonly headerMenuOpen: boolean;
  readonly mapExpanded: boolean;
}

type TourOverlayAction =
  | { type: 'compact-overlay'; value: CompactTourOverlay }
  | { type: 'desktop-chat'; value: boolean }
  | { type: 'header-menu'; value: boolean }
  | { type: 'map-expanded'; value: boolean }
  | { type: 'sync-layout'; compact: boolean }
  | { type: 'mount-chat' };

const initialState: TourOverlayState = {
  compactOverlay: null,
  desktopChatOpen: false,
  chatMounted: false,
  headerMenuOpen: false,
  mapExpanded: false
};

function reducer(state: TourOverlayState, action: TourOverlayAction): TourOverlayState {
  switch (action.type) {
    case 'compact-overlay': return { ...state, compactOverlay: action.value };
    case 'desktop-chat': return { ...state, desktopChatOpen: action.value, chatMounted: state.chatMounted || action.value };
    case 'header-menu': return { ...state, headerMenuOpen: action.value };
    case 'map-expanded': return { ...state, mapExpanded: action.value };
    case 'mount-chat': return state.chatMounted ? state : { ...state, chatMounted: true };
    case 'sync-layout': return action.compact
      ? { ...state, desktopChatOpen: false, headerMenuOpen: false, mapExpanded: false }
      : { ...state, compactOverlay: null, headerMenuOpen: false, mapExpanded: false };
  }
}

export default function useTourOverlayController(compact: boolean) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const chatOpen = compact ? state.compactOverlay === 'chat' : state.desktopChatOpen;

  useEffect(() => {
    dispatch({ type: 'sync-layout', compact });
  }, [compact]);

  useEffect(() => {
    if (chatOpen) dispatch({ type: 'mount-chat' });
  }, [chatOpen]);

  return {
    ...state,
    chatOpen,
    setCompactOverlay: (value: CompactTourOverlay) => dispatch({ type: 'compact-overlay', value }),
    toggleCompactOverlay: (value: Exclude<CompactTourOverlay, null>) => dispatch({
      type: 'compact-overlay',
      value: state.compactOverlay === value ? null : value
    }),
    setDesktopChatOpen: (value: boolean) => dispatch({ type: 'desktop-chat', value }),
    setHeaderMenuOpen: (value: boolean) => dispatch({ type: 'header-menu', value }),
    setMapExpanded: (value: boolean) => dispatch({ type: 'map-expanded', value })
  };
}
