import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATA_DIR: "./.test-data",
      SESSION_SECRET: "test-secret-not-for-production",
      APP_URL: "http://localhost:3000",
      AI_PROVIDER: "null",
      NODE_ENV: "test",
    },
    fileParallelism: false,
    pool: "forks",
  },
});
