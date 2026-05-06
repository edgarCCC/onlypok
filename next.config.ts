import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
