/**
 * Whether the account can sign in. Generic name: it is the active/inactive pair, and
 * nothing in it is specific to users.
 *
 * Key and value in upper case: the enum value is an identifier, not interface text -
 * the Portuguese label belongs to the frontend.
 */
export const ACTIVE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ACTIVE_STATUS)[keyof typeof ACTIVE_STATUS]

export const ACTIVE_STATUSES = Object.values(ACTIVE_STATUS)
