import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    optimizePackageImports: [
      '@photo-sphere-viewer/autorotate-plugin',
      '@photo-sphere-viewer/core',
      '@photo-sphere-viewer/markers-plugin',
      '@photo-sphere-viewer/virtual-tour-plugin'
    ]
  }
};

export default nextConfig;
