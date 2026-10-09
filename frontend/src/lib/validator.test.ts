import { describe, expect, it } from 'vitest'
import {
  AccountUpdateValidator,
  AdministratorClassroomUpdateValidator,
  AdministratorSportCreateValidator,
  AdministratorUserCreateValidator,
  AdministratorUserUpdateValidator,
  RepresentativeEnrollmentUpdateValidator,
  AuthenticationSignInValidator,
} from './validator'

function sport(overrides: Record<string, unknown> = {}) {
  return AdministratorSportCreateValidator.tryValidate({
    name: 'Futsal',
    minAthletes: 5,
    maxAthletes: 12,
    ...overrides,
  })
}

/** Os campos que falharam, para não depender da ordem das mensagens. */
function fieldsOf(error: { messages: Array<{ field: string }> } | null) {
  return (error?.messages ?? []).map((message) => message.field)
}

describe('mensagens', () => {
  // Sem o `messagesProvider` do topo de `validator.ts` a mensagem sai em inglês,
  // e o formulário fica bilíngue: rótulo em português, erro em inglês.
  it('responde em português, com o rótulo do campo', async () => {
    const [error] = await AuthenticationSignInValidator.tryValidate({
      email: 'nao-e-email',
      password: 'qualquer',
    })

    expect(error?.messages).toEqual([
      expect.objectContaining({
        field: 'email',
        message: 'Informe um e-mail válido',
      }),
    ])
  })

  it('nomeia o campo ausente pelo rótulo, e não pela chave', async () => {
    const [error] = await sport({ name: undefined })

    expect(error?.messages).toContainEqual(
      expect.objectContaining({ message: 'Informe o nome' }),
    )
  })
})

describe('convertEmptyStringsToNull', () => {
  /**
   * A flag do topo de `validator.ts` espelha o `config/bodyparser.ts` do
   * AdonisJS: o `''` de um `<input>` vazio vira `null` antes de validar, e um
   * campo `.optional()` o entrega ausente.
   *
   * Sem a flag, `vine.string().optional()` receberia a string vazia, passaria, e
   * a API recusaria depois - validação de cliente aprovando o que o servidor
   * nega é pior do que não validar. Este caso é o que impede a regressão.
   */
  it('aceita campo opcional em branco e o entrega ausente', async () => {
    const [error, payload] =
      await AdministratorClassroomUpdateValidator.tryValidate({
        name: '',
      })

    expect(error).toBeNull()
    expect(payload?.name).toBeUndefined()
  })
})

describe('AccountUpdateValidator', () => {
  it('trocar só a foto não pede a senha atual, com senha vazia ou ausente', async () => {
    const [vazia] = await AccountUpdateValidator.tryValidate({
      name: 'Fulana',
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
    })
    const [ausente] = await AccountUpdateValidator.tryValidate({
      name: 'Fulana',
    })

    expect(fieldsOf(vazia)).not.toContain('currentPassword')
    expect(ausente).toBeNull()
  })

  // O verbo promete parcial e o schema tem de aceitar parcial.
  it('aceita payload parcial', async () => {
    const [error, payload] = await AccountUpdateValidator.tryValidate({
      name: 'Ana Paula',
    })

    expect(error).toBeNull()
    expect(payload).toEqual({ name: 'Ana Paula' })
  })

  it('exige a senha atual quando a senha nova vem junto', async () => {
    const [error] = await AccountUpdateValidator.tryValidate({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@123',
    })

    expect(fieldsOf(error)).toContain('currentPassword')
  })

  it('recusa confirmação diferente', async () => {
    const [error] = await AccountUpdateValidator.tryValidate({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@124',
      currentPassword: 'Antiga@123',
    })

    expect(error?.messages).toContainEqual(
      expect.objectContaining({
        field: 'passwordConfirmation',
        message: 'As senhas não são iguais',
      }),
    )
  })

  it('recusa senha sem as quatro classes de caractere', async () => {
    const [error] = await AccountUpdateValidator.tryValidate({
      password: 'senhasenha',
      passwordConfirmation: 'senhasenha',
      currentPassword: 'Antiga@123',
    })

    expect(error?.messages).toContainEqual(
      expect.objectContaining({
        message:
          'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
      }),
    )
  })

  // `nullable` é o que permite tirar a foto sem trocá-la.
  it('aceita avatarId nulo', async () => {
    const [error, payload] = await AccountUpdateValidator.tryValidate({
      avatarId: null,
    })

    expect(error).toBeNull()
    expect(payload?.avatarId).toBeNull()
  })
})

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

describe('AdministratorSportCreateValidator', () => {
  it('recusa atletas fora de 1 a 40 e fracionários', async () => {
    const [error] = await sport({ minAthletes: 0, maxAthletes: 4.5 })

    expect(fieldsOf(error).sort()).toEqual(['maxAthletes', 'minAthletes'])
  })
})

describe('RepresentativeEnrollmentUpdateValidator', () => {
  const sportId = '00000000-0000-4000-8000-000000000001'
  const studentId = '00000000-0000-4000-8000-000000000002'

  it('aceita a lista vazia, que tira todo mundo da modalidade', async () => {
    const [error] = await RepresentativeEnrollmentUpdateValidator.tryValidate({
      sportId,
      studentIds: [],
    })

    expect(error).toBeNull()
  })

  it('recusa o mesmo aluno duas vezes', async () => {
    const [error] = await RepresentativeEnrollmentUpdateValidator.tryValidate({
      sportId,
      studentIds: [studentId, studentId],
    })

    expect(fieldsOf(error)).toEqual(['studentIds'])
  })
})
