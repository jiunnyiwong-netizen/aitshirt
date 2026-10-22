import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native module used by the print renderer.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
