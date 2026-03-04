import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  async redirects() {
    return [
      { source: '/scheduler', destination: '/publish?tab=schedule', permanent: false },
      { source: '/distribute', destination: '/publish?tab=distribute', permanent: false },
      { source: '/trend-prediction', destination: '/trends', permanent: false },
      { source: '/engagement', destination: '/dashboard', permanent: false },
      { source: '/billing', destination: '/settings', permanent: false },
      { source: '/teams', destination: '/settings', permanent: false },
      { source: '/agency', destination: '/settings', permanent: false },
      { source: '/webhooks', destination: '/settings', permanent: false },
      { source: '/audit-log', destination: '/settings', permanent: false },
    ];
  },
};

export default nextConfig;
