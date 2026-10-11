import type { NextConfig } from "next";

// The pages were renamed in plain words; old bookmarks still land.
const RENAMED = [
  ["/prescriptions", "/medicines"],
  ["/lab-reports", "/test-results"],
  ["/health-records", "/my-health"],
  ["/profile", "/account"],
  ["/settings", "/account"],
];

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return RENAMED.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: true },
      { source: `${from}/:rest*`, destination: to, permanent: true },
    ]);
  },
};

export default nextConfig;
