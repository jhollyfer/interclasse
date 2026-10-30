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

/** Sem default no código: a senha é de quem roda (`tooling.md` §7). */
export function credentialsOf(role: Role): Credentials {
  const [email, password] = VARIABLES[role]
  return { email: required(email), password: required(password) }
}

/** A API que o app usa; é por ela que o teste prepara e limpa dados. */
export function apiUrl(): string {
  return process.env.E2E_API_URL ?? 'http://localhost:3333'
}

/**
 * `Origin` do app que o `webServer` sobe. A API recusa escrita sem origem na
 * allowlist (`CORS_ORIGINS`, 403 `ORIGIN_NOT_ALLOWED`), e o `request` do
 * Playwright, ao contrário do navegador, não envia o cabeçalho sozinho.
 */
export function writeHeaders(): Readonly<{ Origin: string }> {
  return { Origin: `http://localhost:${process.env.E2E_PORT ?? '3010'}` }
}
