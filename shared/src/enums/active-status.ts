/**
 * Se a conta pode entrar. Nome genérico: é o par ativo/inativo, e nada nele é
 * específico de usuário.
 *
 * Chave e valor em caixa alta: o valor do enum é identificador, não texto de
 * interface - o rótulo em português é do frontend.
 */
export const ACTIVE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ACTIVE_STATUS)[keyof typeof ACTIVE_STATUS]

export const ACTIVE_STATUSES = Object.values(ACTIVE_STATUS)
