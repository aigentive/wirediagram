import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: join(__dirname, "../.."),
  // Workspace packages are dist-built; transpile them in-process to avoid
  // ESM resolution edges in dev.
  transpilePackages: [
    "@aigentive/wire-core",
    "@aigentive/wire-renderers",
    "@aigentive/wire-react",
    "@aigentive/wire-mcp"
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
