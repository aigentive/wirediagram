/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are dist-built; transpile them in-process to avoid
  // ESM resolution edges in dev.
  transpilePackages: [
    "@aigentive/wire-core",
    "@aigentive/wire-renderers",
    "@aigentive/wire-react",
    "@aigentive/wire-mcp"
  ]
};

export default nextConfig;
