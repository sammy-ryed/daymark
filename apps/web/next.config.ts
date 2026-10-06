import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@project/contracts", "@project/api-client", "@project/api"],
  webpack(config) {
    config.resolve.symlinks = false;
    config.resolveLoader.symlinks = false;
    return config;
  },
  async rewrites() {
    if (!process.env.API_ORIGIN) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};
export default config;
