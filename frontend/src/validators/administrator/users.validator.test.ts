import { describe, expect, it } from 'vitest'
import { fieldsOf } from '#/lib/validator.test-utils'
import {
  AdministratorUserCreateValidator,
  AdministratorUserUpdateValidator,
} from './users.validator'

const USER = {
  name: 'Ana Lima',
  email: 'ana@mail.com',
  password: 'Senha@123',
  passwordConfirmation: 'Senha@123',
  role: 'ADVISOR',
}

function user(overrides: Record<string, unknown> = {}) {
  return AdministratorUserCreateValidator.tryValidate({
    ...USER,
    ...overrides,
  })
}

describe('AdministratorUserCreateValidator', () => {
  /**
   * O campo é declarado aqui e **não** no schema do backend, e é a razão de
   * existir desta suíte: o `confirmed()` do servidor lê `passwordConfirmation`
   * do corpo cru, mas o VineJS só põe no payload validado o que o schema
   * declara. Sem a declaração, o corpo sairia daqui sem a confirmação e toda
   * criação levaria 422 - um erro que nenhum gate de build enxerga.
   */
  it('leva a confirmação de senha para dentro do payload validado', async () => {
    const [error, payload] = await user()

    expect(error).toBeNull()
    expect(payload).toMatchObject({ passwordConfirmation: 'Senha@123' })
  })

  it('exige a confirmação de senha', async () => {
    const { passwordConfirmation: _omitida, ...semConfirmacao } = USER
    const [error] =
      await AdministratorUserCreateValidator.tryValidate(semConfirmacao)

    expect(fieldsOf(error)).toContain('passwordConfirmation')
  })

  it('recusa confirmação diferente da senha, e aponta a confirmação', async () => {
    const [error] = await user({ passwordConfirmation: 'Senha@124' })

    expect(error?.messages).toContainEqual(
      expect.objectContaining({
        field: 'passwordConfirmation',
        message: 'As senhas não são iguais',
      }),
    )
  })

  it('recusa senha fora de 8 a 32 e sem as quatro classes', async () => {
    const [curta] = await user({
      password: 'Se@1',
      passwordConfirmation: 'Se@1',
    })
    const [fraca] = await user({
      password: 'senhasenha',
      passwordConfirmation: 'senhasenha',
    })

    expect(fieldsOf(curta)).toContain('password')
    expect(fieldsOf(fraca)).toContain('password')
  })

  // A coluna não tem `DEFAULT`: papel omitido gravaria o mais poderoso em
  // silêncio, que é o que o `backend-old` fazia.
  it('exige o papel', async () => {
    const { role: _omitido, ...semPapel } = USER
    const [error] = await AdministratorUserCreateValidator.tryValidate(semPapel)

    expect(fieldsOf(error)).toContain('role')
  })
})

describe('AdministratorUserUpdateValidator', () => {
  // Senha em branco significa "não trocar", e o formulário omite a chave. O
  // validator precisa aceitar o payload sem ela.
  it('aceita a edição sem senha nenhuma', async () => {
    const [error, payload] = await AdministratorUserUpdateValidator.tryValidate(
      {
        name: 'Ana Lima',
        email: 'ana@mail.com',
        role: 'ADVISOR',
        status: 'ACTIVE',
      },
    )

    expect(error).toBeNull()
    expect(payload?.password).toBeUndefined()
  })

  it('continua exigindo a confirmação quando a senha nova vem junto', async () => {
    const [error] = await AdministratorUserUpdateValidator.tryValidate({
      password: 'Senha@123',
    })

    expect(fieldsOf(error)).toContain('passwordConfirmation')
  })
})
