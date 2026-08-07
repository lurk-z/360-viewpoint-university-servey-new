import { describe, expect, it, vi } from 'vitest';
import {
  PANORAMA_ENHANCEMENT,
  installPanoramaEnhancement,
  normalizePanoramaEnhancement
} from './panorama-enhancement';

describe('panorama enhancement', () => {
  it('uses the natural brightness and sharpening defaults', () => {
    expect(PANORAMA_ENHANCEMENT).toEqual({
      enabled: true,
      brightness: 1.08,
      sharpness: 0.12
    });
  });

  it('limits invalid or excessive enhancement settings', () => {
    expect(normalizePanoramaEnhancement({
      enabled: true,
      brightness: 4,
      sharpness: -2
    })).toEqual({
      enabled: true,
      brightness: 1.5,
      sharpness: 0
    });

    expect(normalizePanoramaEnhancement({
      enabled: false,
      brightness: Number.NaN,
      sharpness: Number.POSITIVE_INFINITY
    })).toEqual({
      enabled: false,
      brightness: 0.5,
      sharpness: 0
    });
  });

  it('disposes an installed renderer once and restores the standard renderer', () => {
    type RendererHost = Parameters<typeof installPanoramaEnhancement>[0];
    const dispose = vi.fn();
    const setCustomRenderer = vi.fn<RendererHost['setCustomRenderer']>((factory) => {
      if (factory) factory({} as never);
    });
    const host: RendererHost = { setCustomRenderer };
    const cleanup = installPanoramaEnhancement(host, PANORAMA_ENHANCEMENT, () => ({
      renderer: { render: vi.fn() },
      dispose
    }));

    cleanup();
    cleanup();

    expect(setCustomRenderer).toHaveBeenCalledTimes(2);
    expect(setCustomRenderer).toHaveBeenLastCalledWith(null);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the standard renderer when post-processing cannot start', () => {
    type RendererHost = Parameters<typeof installPanoramaEnhancement>[0];
    const setCustomRenderer = vi.fn<RendererHost['setCustomRenderer']>((factory) => {
      if (factory) factory({} as never);
    });
    const host: RendererHost = { setCustomRenderer };

    const cleanup = installPanoramaEnhancement(host, PANORAMA_ENHANCEMENT, () => {
      throw new Error('WebGL post-processing unavailable');
    });

    expect(setCustomRenderer).toHaveBeenCalledTimes(2);
    expect(setCustomRenderer).toHaveBeenLastCalledWith(null);
    expect(() => cleanup()).not.toThrow();
  });
});
