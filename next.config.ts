import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native module used by the print renderer.
  serverExternalPackages: ["sharp"],
  webpack: (config) => {
    // Konva's Node build asks for the optional "canvas" package; the designer only runs in the browser.
    config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    return config;
  },
};

export default nextConfig;
