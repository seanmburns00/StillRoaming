import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/StillRoaming/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
