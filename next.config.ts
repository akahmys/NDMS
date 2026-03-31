import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/NDMS",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
