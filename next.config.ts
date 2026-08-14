import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '127.0.0.1',
    '192.168.1.47'
  ],
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
