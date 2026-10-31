export type Role = 'administrator' | 'advisor' | 'secondAdvisor'

export type Credentials = Readonly<{ email: string; password: string }>

const VARIABLES = {
  administrator: ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
  advisor: ['E2E_ADVISOR_EMAIL', 'E2E_ADVISOR_PASSWORD'],
  secondAdvisor: ['E2E_SECOND_ADVISOR_EMAIL', 'E2E_SECOND_ADVISOR_PASSWORD'],
} as const satisfies Record<Role, readonly [string, string]>

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} não definida. Copie frontend/.env.e2e.example para frontend/.env.e2e e preencha.`,
    )
  }
  return value
}

/** No default in code: the password belongs to whoever runs it (`tooling.md` §7). */
export function credentialsOf(role: Role): Credentials {
  const [email, password] = VARIABLES[role]
  return { email: required(email), password: required(password) }
}

/** The API the app uses; the test prepares and cleans data through it. */
export function apiUrl(): string {
  return process.env.E2E_API_URL ?? 'http://localhost:3333'
}

/**
 * `Origin` of the app that `webServer` starts. The API refuses writes without an
 * origin in the allowlist (`CORS_ORIGINS`, 403 `ORIGIN_NOT_ALLOWED`), and
 * Playwright's `request`, unlike the browser, does not send the header on its own.
 */
export function writeHeaders(): Readonly<{ Origin: string }> {
  return { Origin: `http://localhost:${process.env.E2E_PORT ?? '3010'}` }
}
