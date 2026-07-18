import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Virtual Open House KMUTNB Prachinburi',
        short_name: 'KMUTNB 360',
        description: 'ทัวร์เสมือนจริง 360 องศา มจพ. วิทยาเขตปราจีนบุรี',
        theme_color: '#9a3412',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        lang: 'th',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,jpg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 2_500_000,
        navigateFallback: 'index.html'
      }
    })
  ],
  build: {
    target: 'baseline-widely-available',
    sourcemap: false,
    chunkSizeWarningLimit: 800
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
