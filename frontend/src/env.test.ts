import { afterEach, expect, test, vi } from 'vitest'

/** O módulo lê o ambiente no topo: cada caso o carrega de novo. */
async function load() {
  vi.resetModules()
  return await import('./env')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

test('sem VITE_API_URL, cai no backend de dev', async () => {
  vi.stubEnv('VITE_API_URL', '')

  const { env } = await load()

  expect(env.VITE_API_URL).toBe('http://localhost:3333')
})

test('aceita a URL pública como veio', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com')

  const { env } = await load()

  expect(env.VITE_API_URL).toBe('https://api.example.com')
})

test('recusa o que não é URL', async () => {
  vi.stubEnv('VITE_API_URL', 'api.example.com')

  await expect(load()).rejects.toThrow('VITE_API_URL não é uma URL')
})

test('recusa barra no fim, que dobraria a barra do caminho', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com/')

  await expect(load()).rejects.toThrow('não pode terminar em "/"')
})
