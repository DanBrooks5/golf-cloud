import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  output: 'standalone', // works well on Vercel + local
};

export default nextConfig;
