import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { USER_ROLE, type UserRole } from '@interclasse/shared'

import type Storage from '#models/storage'
import type User from '#models/user'

/**
 * Quem baixa qual arquivo pela rota de download.
 *
 * A rota existe porque o atributo `download` de um `<a>` é ignorado entre
 * origens; ela não é um caminho alternativo de leitura. O que o site mostra sai
 * por `url` assinada, derivada na leitura do recurso que a contém - e quem
 * chega àquele recurso já passou pela autorização dele.
 *
 * O administrador baixa tudo. Os demais papéis alcançam só o que é deles - hoje,
 * o próprio avatar, que o `actor` já carrega, sem consulta (a policy não vai ao
 * banco além do alvo, _standards/architecture.md §2). Fechado por omissão.
 *
 * A negação é `404` e não `403`, a mesma resposta de arquivo inexistente: um
 * 403 confirmaria a quem sonda que aquele uuid existe.
 */
/**
 * Quem opera o painel administrativo, e não só a própria turma. À parte de
 * `USER_ROLES` para que papel novo nasça de fora: entraria em `USER_ROLE` sem
 * entrar aqui, e ficaria de fora da checagem por omissão.
 */
const STAFF_USER_ROLES: ReadonlyArray<UserRole> = [USER_ROLE.ADMINISTRATOR]

export default class StoragePolicy extends BasePolicy {
  download(actor: User, storage: Storage | null): AuthorizerResponse {
    if (storage && STAFF_USER_ROLES.includes(actor.role)) return true
    if (storage && actor.avatarId === storage.id) return true

    return AuthorizationResponse.deny('Arquivo não encontrado', 404).t('STORAGE_NOT_FOUND')
  }
}
