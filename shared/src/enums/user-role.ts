/**
 * The user role. A lookup object instead of a loose union: the key names the role in
 * code, the value is what goes to the database and the API, and the type is derived
 * from it - no repeated literal to drift apart.
 *
 * Three roles, one per responsibility in the games:
 *
 * - `ADMINISTRATOR`: the organization. Registers classrooms, sports and accounts,
 *   draws the brackets and enters scores.
 * - `ADVISOR`: the teacher advisor. Maintains the students of the classrooms they
 *   advise and their enrollments.
 * - `REPRESENTATIVE`: the student representative. Builds the athlete list per sport
 *   for their own classroom, and nothing else.
 *
 * No `OWNER`: purge stays with the administrator.
 */
export const USER_ROLE = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLES = Object.values(USER_ROLE)
