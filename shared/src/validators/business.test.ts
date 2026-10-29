import { describe, expect, it } from 'vitest'

import { AccountProfileUpdateValidator } from './account/profile.validator.js'
import { AdministratorSportCreateValidator } from './administrator/sports.validator.js'
import { AdministratorUserUpdateValidator } from './administrator/users.validator.js'
import { RepresentativeEnrollmentUpdateValidator } from './representative/enrollments.validator.js'

const ID = '0a1b2c3d-1111-4222-8333-444455556666'
const OTHER = '0a1b2c3d-1111-4222-8333-444455557777'

function failed(result: { success: boolean; error?: { issues: ReadonlyArray<{ path: PropertyKey[] }> } }) {
  return (result.error?.issues ?? []).map((issue) => issue.path.join('.')).sort()
}

describe('regras de negócio dos validators', () => {
  it('modalidade: atletas fora de 1 a 40 e fracionários são recusados', () => {
    const result = AdministratorSportCreateValidator.safeParse({
      name: 'Futsal',
      minAthletes: 0,
      maxAthletes: 4.5,
    })

    expect(failed(result)).toEqual(['maxAthletes', 'minAthletes'])
  })

  it('usuário: a edição aceita não trocar a senha', () => {
    expect(AdministratorUserUpdateValidator.safeParse({ name: 'Ana' }).success).toBe(true)
  })

  it('usuário: senha nova pede confirmação igual', () => {
    const result = AdministratorUserUpdateValidator.safeParse({
      password: 'Abcdef1!',
      passwordConfirmation: 'outra',
    })

    expect(failed(result)).toEqual(['passwordConfirmation'])
  })

  it('perfil: trocar só a foto não pede a senha atual', () => {
    expect(AccountProfileUpdateValidator.safeParse({ avatarId: null }).success).toBe(true)
  })

  it('perfil: senha nova exige a senha atual', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'Abcdef1!',
      passwordConfirmation: 'Abcdef1!',
    })

    expect(failed(result)).toEqual(['currentPassword'])
  })

  it('inscrição: a lista vazia vale, o aluno repetido não', () => {
    const empty = RepresentativeEnrollmentUpdateValidator.safeParse({ sportId: ID, studentIds: [] })
    const repeated = RepresentativeEnrollmentUpdateValidator.safeParse({
      sportId: ID,
      studentIds: [OTHER, OTHER],
    })

    expect(empty.success).toBe(true)
    expect(repeated.success).toBe(false)
  })
})
