import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// `.env.e2e` é opcional: em CI as variáveis vêm do ambiente. Carrega antes do
// resto da config, porque `webServer` e `baseURL` leem `process.env`.
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
  // Retry sem condição transforma teste quebrado em intermitente
  // (_doc-lib/playwright.md#docs/test-retries).
  retries: 0,
  // Os fluxos mexem nos mesmos dados (modalidade, fotos, texto do Sobre): um
  // worker por vez mantém cada spec dono do que criou.
  workers: 1,
  // Sem teto global, o job morto pelo provedor não gera relatório
  // (_doc-lib/playwright.md#docs/test-timeouts).
  globalTimeout: 15 * 60 * 1000,
  timeout: 60 * 1000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../playwright-report' }],
  ],
  use: {
    baseURL,
    // A API responde no idioma da requisição (CSV, mensagens): pt-BR fixo.
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH,
    },
  },
  projects: [
    // Entra uma vez por papel; os specs dependem dele (`docs/auth`).
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
