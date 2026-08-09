import { defineConfig, devices } from '@playwright/test'

// E2E scope: the sidebar served as a standalone page against a real browser IndexedDB.
// Playwright doesn't support loading unpacked Firefox extensions the way it does Chromium
// --load-extension, so the content-script -> browser.runtime -> background pipeline is
// out of scope here and remains a manual verification step (see README).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
