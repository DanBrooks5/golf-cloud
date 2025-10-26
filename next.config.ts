// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Important: do NOT set output: 'export' on Vercel
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // If Vercel warns about monorepo roots, you can add:
  // outputFileTracingRoot: __dirname,
};

export default nextConfig;
