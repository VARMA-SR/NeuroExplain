import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/NeuroExplain",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
