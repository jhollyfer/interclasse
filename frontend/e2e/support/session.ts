import { resolve } from 'node:path'

import type { Role } from './credentials'

/** Where `auth.setup.ts` keeps each role's session (folder ignored by git). */
export function storageStatePath(role: Role): string {
  return resolve(import.meta.dirname, '..', '.auth', `${role}.json`)
}
