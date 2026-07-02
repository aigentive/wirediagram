import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/playground", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx"
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"]
  }
});
