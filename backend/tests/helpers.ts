import type { ApiClient, ApiResponse } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user_factory'
import { COOKIE_TOKEN } from '#services/cookie.service'
import type User from '#models/user'

/**
 * Lê o JSON da resposta sem brigar com o tipo. O registry do client casa a rota
 * pelo caminho e não pelo método, então `response.body()` vem como a união de
 * todas as respostas daquele caminho - inclusive as de erro. Nos testes o que
 * importa é o conteúdo.
 */
export function body(response: ApiResponse): Record<string, any> {
  return response.body()
}

/**
 * O administrador do seeder. É a única conta que nenhum endpoint cria sem
 * sessão, então todo teste que precisa de sessão começa por ela.
 */
export const ADMINISTRATOR = {
  email: 'administrator@mail.com',
  password: 'Administrator1!',
}

export type Session = {
  [COOKIE_TOKEN.ACCESS]: string
  [COOKIE_TOKEN.REFRESH]: string
}

/**
 * Autentica por HTTP e devolve os cookies para encadear nas requisições
 * seguintes.
 *
 * Deliberadamente **não** usa o `loginAs` do plugin de auth, que monta a sessão
 * chamando o guard por dentro e por isso nunca exercita o caminho real:
 * validator do sign-in, emissão do par de tokens e leitura do cookie pelo
 * guard. Com o sign-in de verdade, um teste passa a provar o contrato inteiro.
 */
export async function authenticate(
  client: ApiClient,
  email: string,
  password: string
): Promise<Session> {
  const response = await client.post('/authentication/sign-in').json({ email, password })

  response.assertStatus(204)

  const access = response.cookie(COOKIE_TOKEN.ACCESS)
  const refresh = response.cookie(COOKIE_TOKEN.REFRESH)
  if (!access || !refresh) throw new Error('cookie de sessão ausente na resposta do sign-in')

  return {
    [COOKIE_TOKEN.ACCESS]: access.value,
    [COOKIE_TOKEN.REFRESH]: refresh.value,
  }
}

/** Atalho para a sessão do administrador do seeder, que é a mais usada. */
export function authenticateAsAdministrator(client: ApiClient): Promise<Session> {
  return authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
}

/**
 * Uma sessão de professor conselheiro, o papel padrão do factory: alcança a
 * própria turma e nada do painel administrativo. É o outro lado de toda
 * asserção de permissão do painel.
 */
export async function authenticateAsAdvisor(client: ApiClient): Promise<Session> {
  const { session } = await signInWithFactory(client)

  return session
}

/**
 * Cria a conta pelo factory e entra com ela. Devolve a conta junto da sessão,
 * para o teste poder vinculá-la a uma turma.
 */
export async function signInWithFactory(
  client: ApiClient,
  state?: 'administrator' | 'representative'
): Promise<{ user: User; session: Session }> {
  const factory = UserFactory.query()
  if (state) factory.apply(state)
  const user = await factory.create()

  return { user, session: await authenticate(client, user.email, FACTORY_PASSWORD) }
}

/**
 * Esvazia o banco e recria o administrador.
 *
 * O `truncate` apaga o administrador junto, e ele é o único usuário que nenhum
 * endpoint cria sem sessão - sem semear de novo, nenhum teste de painel teria
 * por onde começar.
 */
export async function resetDatabase() {
  // `truncate()` NÃO trunca: ela roda as migrations e **devolve** a função que
  // trunca, que o Japa registra como teardown do teste. Descartar esse retorno
  // faz o banco nunca ser limpo, e um teste passa a enxergar o dado do anterior.
  const teardown = await testUtils.db().truncate()

  await testUtils.db().seed()

  return teardown
}
