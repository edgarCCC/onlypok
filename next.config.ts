import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  turbopack: {},
  serverExternalPackages: ['sharp'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
};

export default nextConfig;
