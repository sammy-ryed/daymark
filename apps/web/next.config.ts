import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  transpilePackages: [
    "@project/contracts",
    "@project/api-client",
    "@project/api",
  ],
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
