import { test as base } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

import type { Role } from './credentials'
import { storageStatePath } from './session'

type RoleSession = Readonly<{ page: Page; context: BrowserContext }>

type Fixtures = Readonly<{
  /** Aba já entrada como organização (sessão de `auth.setup.ts`). */
  administrator: RoleSession
  /** Aba já entrada como a conselheira do seed. */
  advisor: RoleSession
  /** Outra conselheira, de outra turma da mesma categoria (sorteio precisa de duas). */
  secondAdvisor: RoleSession
}>

async function openSession(
  browser: Browser,
  baseURL: string | undefined,
  role: Role,
): Promise<RoleSession> {
  const context = await browser.newContext({
    baseURL,
    storageState: storageStatePath(role),
  })
  return { context, page: await context.newPage() }
}

/**
 * O `test` da suíte: `page` é o visitante sem conta (site público), e
 * `administrator`/`advisor` são o mesmo navegador com a sessão do papel
 * (_doc-lib/playwright.md#docs/test-fixtures). Um contexto novo por teste, com
 * o `storageState` guardado: nenhum login a mais na API.
 */
export const test = base.extend<Fixtures>({
  administrator: async ({ browser, baseURL }, use) => {
    const session = await openSession(browser, baseURL, 'administrator')
    await use(session)
    await session.context.close()
  },
  advisor: async ({ browser, baseURL }, use) => {
    const session = await openSession(browser, baseURL, 'advisor')
    await use(session)
    await session.context.close()
  },
  secondAdvisor: async ({ browser, baseURL }, use) => {
    const session = await openSession(browser, baseURL, 'secondAdvisor')
    await use(session)
    await session.context.close()
  },
})

export { expect } from '@playwright/test'
