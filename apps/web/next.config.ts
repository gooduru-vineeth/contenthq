import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@contenthq/db", "@contenthq/shared"],
};

export default nextConfig;
