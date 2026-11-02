export type Role =
  'administrator' | 'advisor' | 'secondAdvisor' | 'representative'

export type Credentials = Readonly<{ email: string; password: string }>

/**
 * E-mails of the demonstration seeder (`backend/database/seeders/dev/demo.ts`):
 * one account per role, all with the password of the backend `SEED_DEMO_PASSWORD`
 * (here `E2E_DEMO_PASSWORD`). The owner is the exception: it is the seeder's
 * administrator, from `E2E_OWNER_*`.
 */
const DEMO_EMAILS = {
  advisor: 'advisor@example.com',
  secondAdvisor: 'advisor-2@example.com',
  representative: 'representative@example.com',
} as const satisfies Record<Exclude<Role, 'administrator'>, string>

/** No default in code: a missing key stops the run and says which (`backend.md` §6.2). */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is not set. Copy frontend/.env.e2e.example to frontend/.env.e2e and fill it in.`,
    )
  }
  return value
}

/** The password belongs to whoever runs it (`tooling.md` §7). */
export function credentialsOf(role: Role): Credentials {
  if (role === 'administrator') {
    return {
      email: required('E2E_OWNER_EMAIL'),
      password: required('E2E_OWNER_PASSWORD'),
    }
  }

  return { email: DEMO_EMAILS[role], password: required('E2E_DEMO_PASSWORD') }
}

/** The origin of the app under test (the `webServer` starts it there). */
export function baseUrl(): string {
  return required('E2E_BASE_URL')
}

/** The API the app uses; the test prepares and cleans data through it. */
export function apiUrl(): string {
  return required('E2E_API_URL')
}

/**
 * `Origin` of the app under test. The API refuses writes without an origin in the
 * allowlist (`CORS_ORIGINS`, 403 `ORIGIN_NOT_ALLOWED`), and Playwright's
 * `request`, unlike the browser, does not send the header on its own.
 */
export function writeHeaders(): Readonly<{ Origin: string }> {
  return { Origin: new URL(baseUrl()).origin }
}
