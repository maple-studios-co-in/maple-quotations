import type { NextConfig } from "next";

// Standalone app: no workspace packages to transpile — the shared code is vendored
// under ./src and resolved via tsconfig "paths".
const nextConfig: NextConfig = {
  allowedDevOrigins: ["quotations.maplefurnishers.com"],
  // Native/server-only packages used for cropping item photos out of PDFs.
  serverExternalPackages: ["sharp", "pdf-to-img", "@napi-rs/canvas"],
};

export default nextConfig;
