import type { CustomRenderer } from '@photo-sphere-viewer/core';
import {
  Camera,
  Scene,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export interface PanoramaEnhancementSettings {
  readonly enabled: boolean;
  /** Output multiplier. 1 preserves the original brightness. */
  readonly brightness: number;
  /** Five-tap unsharp-mask strength. 0 disables sharpening. */
  readonly sharpness: number;
}

export const PANORAMA_ENHANCEMENT = Object.freeze({
  enabled: true,
  brightness: 1.08,
  sharpness: 0.12
}) satisfies PanoramaEnhancementSettings;

const LIMITS = Object.freeze({
  brightness: { min: 0.5, max: 1.5 },
  sharpness: { min: 0, max: 0.5 }
});

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
);

export function normalizePanoramaEnhancement(
  settings: PanoramaEnhancementSettings
): PanoramaEnhancementSettings {
  return {
    enabled: Boolean(settings.enabled),
    brightness: clamp(settings.brightness, LIMITS.brightness.min, LIMITS.brightness.max),
    sharpness: clamp(settings.sharpness, LIMITS.sharpness.min, LIMITS.sharpness.max)
  };
}

const ENHANCEMENT_SHADER = {
  name: 'PanoramaEnhancementShader',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2(1, 1) },
    brightness: { value: 1 },
    sharpness: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float brightness;
    uniform float sharpness;
    varying vec2 vUv;

    void main() {
      vec2 texel = 1.0 / max(resolution, vec2(1.0));
      vec4 centerSample = texture2D(tDiffuse, vUv);
      vec3 neighborAverage = (
        texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb +
        texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb +
        texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb +
        texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb
      ) * 0.25;
      vec3 sharpened = centerSample.rgb + (centerSample.rgb - neighborAverage) * sharpness;
      vec3 enhanced = clamp(sharpened * brightness, 0.0, 1.0);
      gl_FragColor = vec4(enhanced, centerSample.a);
    }
  `
};

interface EnhancementPipeline {
  readonly renderer: CustomRenderer;
  readonly dispose: () => void;
}

type EnhancementPipelineFactory = (
  renderer: WebGLRenderer,
  settings: PanoramaEnhancementSettings
) => EnhancementPipeline;

interface RendererHost {
  setCustomRenderer(factory: ((renderer: WebGLRenderer) => CustomRenderer) | null): void;
}

export function createPanoramaEnhancementRenderer(
  webglRenderer: WebGLRenderer,
  settings: PanoramaEnhancementSettings = PANORAMA_ENHANCEMENT
): EnhancementPipeline {
  const normalized = normalizePanoramaEnhancement(settings);
  const size = webglRenderer.getSize(new Vector2());
  const renderTarget = new WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
    depthBuffer: true,
    stencilBuffer: false,
    type: UnsignedByteType
  });

  let composer: EffectComposer | null = null;
  let enhancementPass: ShaderPass | null = null;
  let outputPass: OutputPass | null = null;

  try {
    composer = new EffectComposer(webglRenderer, renderTarget);
    const renderPass = new RenderPass(new Scene(), new Camera());
    enhancementPass = new ShaderPass(ENHANCEMENT_SHADER);
    outputPass = new OutputPass();
    enhancementPass.uniforms.brightness!.value = normalized.brightness;
    enhancementPass.uniforms.sharpness!.value = normalized.sharpness;
    composer.addPass(renderPass);
    composer.addPass(enhancementPass);
    composer.addPass(outputPass);

    const logicalSize = new Vector2();
    let currentWidth = 0;
    let currentHeight = 0;
    let currentPixelRatio = 0;

    const syncSize = (): void => {
      webglRenderer.getSize(logicalSize);
      const width = Math.max(1, Math.round(logicalSize.x));
      const height = Math.max(1, Math.round(logicalSize.y));
      const pixelRatio = webglRenderer.getPixelRatio();
      if (width !== currentWidth || height !== currentHeight || pixelRatio !== currentPixelRatio) {
        currentWidth = width;
        currentHeight = height;
        currentPixelRatio = pixelRatio;
        composer!.setPixelRatio(pixelRatio);
        composer!.setSize(width, height);
      }
      enhancementPass!.uniforms.resolution!.value.set(
        Math.max(1, Math.round(width * pixelRatio)),
        Math.max(1, Math.round(height * pixelRatio))
      );
    };

    const customRenderer: CustomRenderer = {
      render(scene, camera) {
        renderPass.scene = scene as Scene;
        renderPass.camera = camera;
        syncSize();
        composer!.render();
      }
    };

    let disposed = false;
    return {
      renderer: customRenderer,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        enhancementPass?.dispose();
        outputPass?.dispose();
        composer?.dispose();
      }
    };
  } catch (error) {
    enhancementPass?.dispose();
    outputPass?.dispose();
    composer?.dispose();
    renderTarget.dispose();
    throw error;
  }
}

export function installPanoramaEnhancement(
  host: RendererHost,
  settings: PanoramaEnhancementSettings = PANORAMA_ENHANCEMENT,
  createPipeline: EnhancementPipelineFactory = createPanoramaEnhancementRenderer
): () => void {
  const normalized = normalizePanoramaEnhancement(settings);
  if (!normalized.enabled) return () => undefined;

  const state: { pipeline: EnhancementPipeline | null } = { pipeline: null };
  try {
    host.setCustomRenderer((renderer) => {
      state.pipeline = createPipeline(renderer, normalized);
      return state.pipeline.renderer;
    });
  } catch {
    state.pipeline?.dispose();
    state.pipeline = null;
    host.setCustomRenderer(null);
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    host.setCustomRenderer(null);
    state.pipeline?.dispose();
    state.pipeline = null;
  };
}
