import {
  ACTIVE_STATUS,
  left,
  right,
  type ActiveStatus,
  type Either,
  type UserRole,
} from '@interclasse/shared'

import type { UserError } from './user.errors.ts'

export type UserProps = {
  readonly id: string
  name: string
  email: string
  /**
   * O hash, depois de gravada. Texto puro só entre `create`/`update` e o
   * `save` do repository: quem cifra é a persistência (hook do model), e não a
   * regra da conta.
   */
  password: string
  role: UserRole
  status: ActiveStatus
  avatarId: string | null
  readonly createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
}

/** O que `update` muda; campo ausente é "não mexer", e só `avatarId` aceita `null`. */
export type UserChanges = {
  readonly name?: string
  readonly email?: string
  readonly password?: string
  readonly role?: UserRole
  readonly status?: ActiveStatus
  readonly avatarId?: string | null
}

/** O que uma edição obriga a fazer além de gravar a conta. */
export type UserUpdateEffects = {
  /** O acesso mudou: as sessões vivas não valem mais. */
  readonly revokesSessions: boolean
  /** O papel mudou: a conta deixa de aconselhar ou representar turma. */
  readonly roleChanged: boolean
}

/** O que a prova de identidade da troca de senha encontrou, já conferido contra o hash. */
export type PasswordProof = {
  readonly currentConfirmed: boolean
  readonly sameAsCurrent: boolean
}

/**
 * A conta de quem entra no sistema: papel, status e ciclo de arquivamento
 * (`_standards/domain.md` §1). Arquivar é remoção lógica; apagar de vez só vale
 * para a conta arquivada.
 */
export class User {
  private constructor(private readonly props: UserProps) {}

  /** Nascimento. O id e o relógio chegam de fora: o domínio não faz I/O. */
  static create(input: {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly password: string
    readonly role: UserRole
    readonly status?: ActiveStatus
    readonly avatarId?: string | null
    readonly now: Date
  }): User {
    return new User({
      id: input.id,
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      status: input.status ?? ACTIVE_STATUS.ACTIVE,
      avatarId: input.avatarId ?? null,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    })
  }

  /** Reidratação pelo repository: o dado passou pelas regras ao ser gravado. */
  static restore(props: UserProps): User {
    return new User({ ...props })
  }

  /**
   * Reativa a conta arquivada que ocupa o e-mail com os dados novos. O `email`
   * é `UNIQUE` global e a remoção é lógica: inserir de novo esbarraria no
   * índice, e reaproveitar a linha preserva `id` e `createdAt`. Conta viva
   * ocupando o e-mail é conflito.
   */
  revive(
    input: UserChanges & Required<Pick<UserChanges, 'name' | 'password' | 'role'>>,
    now: Date,
  ): Either<UserError, User> {
    if (!this.isArchived()) return left({ code: 'USER_ALREADY_EXISTS' })

    this.apply(input, now)
    this.props.deletedAt = null

    return right(this)
  }

  /** Edição pelo administrador. */
  update(changes: UserChanges, now: Date): UserUpdateEffects {
    return this.apply(changes, now)
  }

  /**
   * Edição da própria conta. Trocar a senha exige a atual, e a nova tem de ser
   * outra: a sessão prova posse do cookie, não identidade.
   */
  updateOwn(
    changes: Omit<UserChanges, 'role' | 'status'>,
    proof: PasswordProof,
    now: Date,
  ): Either<UserError, UserUpdateEffects> {
    if (changes.password) {
      if (!proof.currentConfirmed) return left({ code: 'CURRENT_PASSWORD_INVALID' })
      if (proof.sameAsCurrent) return left({ code: 'PASSWORD_SAME_AS_CURRENT' })
    }

    return right(this.apply(changes, now))
  }

  archive(at: Date): Either<UserError, User> {
    if (this.isArchived()) return left({ code: 'USER_ALREADY_ARCHIVED' })

    this.props.deletedAt = at
    this.props.updatedAt = at

    return right(this)
  }

  unarchive(now: Date): Either<UserError, User> {
    if (!this.isArchived()) return left({ code: 'USER_NOT_ARCHIVED' })

    this.props.deletedAt = null
    this.props.updatedAt = now

    return right(this)
  }

  /** Apagar de vez exige a passagem pela lixeira: um clique não perde a conta. */
  remove(): Either<UserError, User> {
    if (!this.isArchived()) return left({ code: 'USER_NOT_ARCHIVED' })

    return right(this)
  }

  /** Conta viva e ativa: arquivada e inativa recebem a mesma recusa de quem erra a senha. */
  canSignIn(): boolean {
    return !this.isArchived() && this.props.status === ACTIVE_STATUS.ACTIVE
  }

  isArchived(): boolean {
    return this.props.deletedAt !== null
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<UserProps> {
    return { ...this.props }
  }

  /**
   * Escreve só as chaves presentes. E-mail e senha trocados, mudança de papel e
   * desativação derrubam as sessões: o guard não lê `status`, e um token
   * anterior sobreviveria à troca de acesso.
   */
  private apply(changes: UserChanges, now: Date): UserUpdateEffects {
    const emailChanged = changes.email !== undefined && changes.email !== this.props.email
    const roleChanged = changes.role !== undefined && changes.role !== this.props.role
    const deactivated = changes.status === ACTIVE_STATUS.INACTIVE

    if (changes.name !== undefined) this.props.name = changes.name
    if (changes.email !== undefined) this.props.email = changes.email
    if (changes.password !== undefined) this.props.password = changes.password
    if (changes.role !== undefined) this.props.role = changes.role
    if (changes.status !== undefined) this.props.status = changes.status
    if (changes.avatarId !== undefined) this.props.avatarId = changes.avatarId
    this.props.updatedAt = now

    return {
      revokesSessions: emailChanged || Boolean(changes.password) || roleChanged || deactivated,
      roleChanged,
    }
  }
}
