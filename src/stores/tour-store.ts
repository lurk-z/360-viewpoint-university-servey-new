import { create } from 'zustand';
import type { Locale, SceneId } from '../tour-data';

interface TourStore {
  readonly locale: Locale;
  readonly currentSceneId: SceneId;
  readonly ready: boolean;
  readonly progress: number;
  readonly introOpen: boolean;
  readonly error: string | null;
  readonly sceneInfoVisible: boolean;
  readonly autorotate: boolean;
  setLocale: (locale: Locale) => void;
  setCurrentScene: (sceneId: SceneId) => void;
  setReady: (ready: boolean) => void;
  setProgress: (progress: number) => void;
  setIntroOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  setSceneInfoVisible: (visible: boolean) => void;
  setAutorotate: (enabled: boolean) => void;
}

export const useTourStore = create<TourStore>((set) => ({
  locale: 'th',
  currentSceneId: 'entrance',
  ready: false,
  progress: 0,
  introOpen: true,
  error: null,
  sceneInfoVisible: true,
  autorotate: false,
  setLocale: (locale) => set({ locale }),
  setCurrentScene: (currentSceneId) => set({ currentSceneId }),
  setReady: (ready) => set({ ready }),
  setProgress: (progress) => set({ progress }),
  setIntroOpen: (introOpen) => set({ introOpen }),
  setError: (error) => set({ error }),
  setSceneInfoVisible: (sceneInfoVisible) => set({ sceneInfoVisible }),
  setAutorotate: (autorotate) => set({ autorotate })
}));
