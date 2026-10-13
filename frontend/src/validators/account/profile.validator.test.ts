import { describe, expect, it } from 'vitest'
import { fieldsOf } from '#/lib/validator.test-utils'
import { ProfileUpdateValidator } from './profile.validator'

describe('ProfileUpdateValidator', () => {
  it('trocar só a foto não pede a senha atual, com senha vazia ou ausente', async () => {
    const [vazia] = await ProfileUpdateValidator.tryValidate({
      name: 'Fulana',
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
    })
    const [ausente] = await ProfileUpdateValidator.tryValidate({
      name: 'Fulana',
    })

    expect(fieldsOf(vazia)).not.toContain('currentPassword')
    expect(ausente).toBeNull()
  })

  // O verbo promete parcial e o schema tem de aceitar parcial.
  it('aceita payload parcial', async () => {
    const [error, payload] = await ProfileUpdateValidator.tryValidate({
      name: 'Ana Paula',
    })

    expect(error).toBeNull()
    expect(payload).toEqual({ name: 'Ana Paula' })
  })

  it('exige a senha atual quando a senha nova vem junto', async () => {
    const [error] = await ProfileUpdateValidator.tryValidate({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@123',
    })

    expect(fieldsOf(error)).toContain('currentPassword')
  })

  it('recusa confirmação diferente', async () => {
    const [error] = await ProfileUpdateValidator.tryValidate({
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
    const [error] = await ProfileUpdateValidator.tryValidate({
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
    const [error, payload] = await ProfileUpdateValidator.tryValidate({
      avatarId: null,
    })

    expect(error).toBeNull()
    expect(payload?.avatarId).toBeNull()
  })
})
