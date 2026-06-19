import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained `.next/standalone` server for Docker/DigitalOcean.
  // The image then runs `node server.js` without installing node_modules.
  output: "standalone",
};

export default nextConfig;
