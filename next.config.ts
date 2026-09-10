import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // A stray package-lock.json in a parent directory otherwise makes
    // Turbopack's workspace-root auto-detection ambiguous.
    root: path.join(__dirname),
  },
};

export default nextConfig;
