import factory from '@adonisjs/lucid/factories'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import User from '#models/user'

/**
 * Senha de todo usuário criado por factory. Passa na política de
 * `password()` (`#core/validator`): 8-32 caracteres, com minúscula, maiúscula,
 * dígito e símbolo - então serve para entrar de verdade pelo
 * `POST /authentication/sign-in`.
 *
 * Vai em texto puro: o mixin `withAuthFinder` de `app/models/user.ts` cifra ao
 * salvar. Passar o hash aqui geraria um hash de hash e nenhum login funcionaria.
 */
export const FACTORY_PASSWORD = 'Demo1234!'

/**
 * Usuário. O papel padrão é `ADVISOR`, que não alcança o painel administrativo
 * - um teste que precisa de administrador pede o estado, e nenhum ganha
 * privilégio por esquecimento.
 */
export const UserFactory = factory
  .define(User, ({ faker }) => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: FACTORY_PASSWORD,
    role: USER_ROLE.ADVISOR,
    status: ACTIVE_STATUS.ACTIVE,
  }))
  .state('administrator', (user) => (user.role = USER_ROLE.ADMINISTRATOR))
  .state('representative', (user) => (user.role = USER_ROLE.REPRESENTATIVE))
  .state('inactive', (user) => (user.status = ACTIVE_STATUS.INACTIVE))
  .build()
