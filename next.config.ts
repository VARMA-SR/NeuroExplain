import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  // @ts-ignore - Bypass NextConfig strict typing for eslint config
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

