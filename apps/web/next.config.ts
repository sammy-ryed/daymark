import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@project/contracts", "@project/api-client"],
  webpack(config) {
    config.resolve.symlinks = false;
    config.resolveLoader.symlinks = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};
export default config;
