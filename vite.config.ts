import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const headers = { "Origin-Agent-Cluster": "?1" };

export default defineConfig({
  plugins: [react()],
  server: { headers },
  preview: { headers },
  test: {
    environment: "jsdom",
    restoreMocks: true,
  },
});
