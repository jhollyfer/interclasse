import type {
  ActiveStatus,
  AdministratorUserShowResponse,
  Paginated,
  SortDirection,
  TrashedMode,
  UserRole,
} from '@interclasse/shared'
import type { Either } from '@interclasse/shared'

import type { User } from '#domain/user/user.entity'
import type { StorageFileRead } from '#repositories/storage/storage.repository'
import type { UserError } from '#domain/user/user.errors'

/**
 * A conta na forma da resposta, com o avatar sem a `url`: assinar é do use-case, pelo
 * contrato do bucket (`_standards/architecture.md` §2, `StorageContract.withUrl`).
 */
export type UserRead = Omit<AdministratorUserShowResponse, 'avatar'> & {
  readonly avatar: StorageFileRead | null
}

export type UserListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly role?: UserRole
  readonly status?: ActiveStatus
  /** Ausente é só quem está vivo; `only` é a lixeira; `with` traz os dois. */
  readonly trashed?: TrashedMode
  readonly sort: 'name' | 'email' | 'role' | 'status' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * A persistência da conta, por intenção (`_standards/domain.md` §5.1). O
 * escritor único da tabela `users`. O filtro de lixeira (`backend.md` §4.8) mora
 * dentro da implementação: o contrato diz qual conta quer, e não como filtrar.
 *
 * A senha entra em texto puro no `save` e volta cifrada nas leituras: cifrar é
 * mecânica de persistência, não regra da conta.
 */
export abstract class UserRepository {
  /** A conta viva, fora da lixeira. */
  abstract findById(id: string): Promise<User | null>
  /** Só a conta arquivada: o que restaurar. */
  abstract findArchivedById(id: string): Promise<User | null>
  /** Viva ou arquivada: o apagar de vez precisa distinguir as duas. */
  abstract findAnyById(id: string): Promise<User | null>
  /** Viva ou arquivada: o `unique` do e-mail vale para a tabela inteira. */
  abstract findByEmail(email: string): Promise<User | null>
  /** Outra conta, viva ou arquivada, que não `exceptId`, já usa o e-mail. */
  abstract existsByEmail(email: string, exceptId?: string): Promise<boolean>
  /** Grava a conta; o e-mail de outra conta (a corrida no `unique`) volta como `USER_ALREADY_EXISTS`. */
  abstract save(user: User): Promise<Either<UserError, void>>
  abstract delete(user: User): Promise<void>
  /** Leitura leve da conta viva, com o avatar (sem a `url`): a forma da resposta, sem a senha. */
  abstract detail(id: string): Promise<UserRead | null>
  abstract paginate(criteria: UserListCriteria): Promise<Paginated<UserRead>>
}
