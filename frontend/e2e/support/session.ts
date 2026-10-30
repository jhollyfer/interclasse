import { resolve } from 'node:path'

import type { Role } from './credentials'

/** Onde `auth.setup.ts` guarda a sessão de cada papel (pasta ignorada pelo git). */
export function storageStatePath(role: Role): string {
  return resolve(import.meta.dirname, '..', '.auth', `${role}.json`)
}
