import { afterEach, expect, test, vi } from 'vitest'

/** The module reads the environment at the top: each case loads it again. */
async function load() {
  vi.resetModules()
  return await import('./env')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

test('without VITE_API_URL, falls back to the dev backend', async () => {
  vi.stubEnv('VITE_API_URL', '')

  const { env } = await load()

  expect(env.VITE_API_URL).toBe('http://localhost:3333')
})

test('accepts the public URL as it came', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com')

  const { env } = await load()

  expect(env.VITE_API_URL).toBe('https://api.example.com')
})

test('refuses what is not a URL', async () => {
  vi.stubEnv('VITE_API_URL', 'api.example.com')

  await expect(load()).rejects.toThrow('VITE_API_URL não é uma URL')
})

test('refuses a trailing slash, which would double the path slash', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com/')

  await expect(load()).rejects.toThrow('não pode terminar em "/"')
})

test('without VITE_SITE_URL, falls back to the dev frontend', async () => {
  vi.stubEnv('VITE_SITE_URL', '')

  const { env } = await load()

  expect(env.VITE_SITE_URL).toBe('http://localhost:3001')
})

test('accepts the site public address as it came', async () => {
  vi.stubEnv('VITE_SITE_URL', 'https://interclass.maiyu.com.br')

  const { env } = await load()

  expect(env.VITE_SITE_URL).toBe('https://interclass.maiyu.com.br')
})

test('refuses VITE_SITE_URL with a trailing slash', async () => {
  vi.stubEnv('VITE_SITE_URL', 'https://interclass.maiyu.com.br/')

  await expect(load()).rejects.toThrow('VITE_SITE_URL não pode terminar')
})
