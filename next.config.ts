// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true, // replaces experimental.typedRoutes
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
