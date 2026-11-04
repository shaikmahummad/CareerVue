import type { NextConfig } from "next";

const isExport = process.env.NEXT_EXPORT === "true" || process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isExport ? "export" : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
