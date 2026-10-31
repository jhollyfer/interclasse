import { describe, expect, it } from 'vitest'

import { AccountProfileUpdateValidator } from './account/profile.validator.js'
import { AdministratorSportCreateValidator } from './administrator/sports.validator.js'
import { AdministratorUserUpdateValidator } from './administrator/users.validator.js'
import { RepresentativeEnrollmentUpdateValidator } from './representative/enrollments.validator.js'

const ID = '0a1b2c3d-1111-4222-8333-444455556666'
const OTHER = '0a1b2c3d-1111-4222-8333-444455557777'

function failed(result: {
  success: boolean
  error?: { issues: ReadonlyArray<{ path: PropertyKey[] }> }
}) {
  return (result.error?.issues ?? [])
    .map((issue) => issue.path.join('.'))
    .sort()
}

describe('validators business rules', () => {
  it('sport: athletes outside 1 to 40 and fractional ones are rejected', () => {
    const result = AdministratorSportCreateValidator.safeParse({
      name: 'Futsal',
      minAthletes: 0,
      maxAthletes: 4.5,
    })

    expect(failed(result)).toEqual(['maxAthletes', 'minAthletes'])
  })

  it('user: an update may leave the password unchanged', () => {
    expect(
      AdministratorUserUpdateValidator.safeParse({ name: 'Ana' }).success,
    ).toBe(true)
  })

  it('user: a new password requires a matching confirmation', () => {
    const result = AdministratorUserUpdateValidator.safeParse({
      password: 'Abcdef1!',
      passwordConfirmation: 'outra',
    })

    expect(failed(result)).toEqual(['passwordConfirmation'])
  })

  it('profile: changing only the photo does not ask for the current password', () => {
    expect(
      AccountProfileUpdateValidator.safeParse({ avatarId: null }).success,
    ).toBe(true)
  })

  it('perfil: senha nova exige a senha atual', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'Abcdef1!',
      passwordConfirmation: 'Abcdef1!',
    })

    expect(failed(result)).toEqual(['currentPassword'])
  })

  it('enrollment: an empty list is valid, a repeated student is not', () => {
    const empty = RepresentativeEnrollmentUpdateValidator.safeParse({
      sportId: ID,
      studentIds: [],
    })
    const repeated = RepresentativeEnrollmentUpdateValidator.safeParse({
      sportId: ID,
      studentIds: [OTHER, OTHER],
    })

    expect(empty.success).toBe(true)
    expect(repeated.success).toBe(false)
  })
})
