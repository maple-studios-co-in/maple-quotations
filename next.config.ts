import type { NextConfig } from "next";

// Standalone app: no workspace packages to transpile — the shared code is vendored
// under ./src and resolved via tsconfig "paths".
const nextConfig: NextConfig = {
  allowedDevOrigins: ["quotations.maplefurnishers.com"],
};

export default nextConfig;
