import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const localIpv4Addresses = Object.values(networkInterfaces()).flatMap((addresses) => (
  (addresses ?? []).filter((address) => address.family === 'IPv4' && !address.internal).map((address) => address.address)
));

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    ...localIpv4Addresses
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
