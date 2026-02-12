import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["72.60.223.71"],
  transpilePackages: ["@contenthq/db", "@contenthq/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.slidify.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
