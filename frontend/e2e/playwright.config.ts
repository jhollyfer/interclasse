import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// `.env.e2e` is optional: in CI the variables come from the environment. It loads before
// the rest of the config, because `webServer` and `baseURL` read `process.env`.
const envFile = resolve(import.meta.dirname, '..', '.env.e2e')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const port = process.env.E2E_PORT ?? '3010'
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3333'
const baseURL = `http://localhost:${port}`

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  forbidOnly: Boolean(process.env.CI),
  // Unconditional retry turns a broken test into a flaky one
  // (_doc-lib/playwright.md#docs/test-retries).
  retries: 0,
  // The flows touch the same data (sport, photos, About text): one worker at
  // a time keeps each spec the owner of what it created.
  workers: 1,
  // Without a global cap, a job killed by the provider produces no report
  // (_doc-lib/playwright.md#docs/test-timeouts).
  globalTimeout: 15 * 60 * 1000,
  timeout: 60 * 1000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../playwright-report' }],
  ],
  use: {
    baseURL,
    // The API answers in the request's language (CSV, messages): pt-BR is fixed.
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH,
    },
  },
  projects: [
    // Signs in once per role; the specs depend on it (`docs/auth`).
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `pnpm exec vite dev --port ${port} --strictPort`,
    cwd: '..',
    url: baseURL,
    env: { VITE_API_URL: apiUrl },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
