import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./test/visual", outputDir: "/tmp/freehub-playwright-results", use: { baseURL: process.env.BASE_URL || "http://modern:3001" }, webServer: process.env.BASE_URL ? undefined : { command: "npm run dev", port: 3001 } });
