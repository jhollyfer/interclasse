import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { TRASHED_MODE, left, right } from '@interclasse/shared'
import type { Either, Paginated } from '@interclasse/shared'

import { UserRepository, type UserListCriteria, type UserRead } from './user.repository.ts'

import UserModel from '#models/user'
import { PostgresError } from '#core/postgres-error'
import { User } from '#domain/user/user.entity'
import type { UserError } from '#domain/user/user.errors'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class UserLucidRepository extends UserRepository {
  constructor(
    private readonly transaction: TransactionContext,
    private readonly storages: StorageRepository,
  ) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.query()
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .first()

    if (!row) return null

    return this.toEntity(row)
  }

  async findArchivedById(id: string): Promise<User | null> {
    const row = await this.query()
      .where('id', id)
      .withScopes((scopes) => scopes.onlyDeleted())
      .first()

    if (!row) return null

    return this.toEntity(row)
  }

  async findAnyById(id: string): Promise<User | null> {
    const row = await this.query().where('id', id).first()

    if (!row) return null

    return this.toEntity(row)
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.query().where('email', email).first()

    if (!row) return null

    return this.toEntity(row)
  }

  async existsByEmail(email: string, exceptId?: string): Promise<boolean> {
    const query = this.query().where('email', email)
    if (exceptId) query.whereNot('id', exceptId)

    return Boolean(await query.first())
  }

  async save(user: User): Promise<Either<UserError, void>> {
    const { id, createdAt, updatedAt, deletedAt, ...columns } = user.snapshot()

    try {
      // A senha vai como está: o hook do model cifra quando ela mudou, e o hash
      // já gravado volta igual e não é cifrado de novo.
      await UserModel.updateOrCreate(
        { id },
        {
          ...columns,
          createdAt: DateTime.fromJSDate(createdAt),
          updatedAt: this.dateOrNull(updatedAt),
          deletedAt: this.dateOrNull(deletedAt),
        },
        { client: this.transaction.client() },
      )

      return right(undefined)
    } catch (error) {
      if (PostgresError.isUniqueViolation(error)) return left({ code: 'USER_ALREADY_EXISTS' })

      throw error
    }
  }

  async delete(user: User): Promise<void> {
    await this.query().where('id', user.id).delete()
  }

  async detail(id: string): Promise<UserRead | null> {
    const row = await this.query()
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
    if (!row) return null

    const avatars = await this.storages.detailsOf(this.avatarIds([row]))

    return this.toResponse(row, avatars[0] ?? null)
  }

  async paginate(criteria: UserListCriteria): Promise<Paginated<UserRead>> {
    const query = this.query()

    if (criteria.trashed === undefined) query.withScopes((scopes) => scopes.notDeleted())
    if (criteria.trashed === TRASHED_MODE.ONLY) query.withScopes((scopes) => scopes.onlyDeleted())

    if (criteria.role) query.where('role', criteria.role)
    if (criteria.status) query.where('status', criteria.status)

    // O `OR` vai dentro de uma subquery: solto, ele escaparia do `AND` do filtro
    // de lixeira, de papel e de status, e traria conta arquivada na listagem padrão.
    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('name', search).orWhereILike('email', search)
      })
    }

    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)
    const rows = page.all()
    const avatars = await this.storages.detailsOf(this.avatarIds(rows))

    return {
      meta: page.getMeta(),
      data: rows.map((row) =>
        this.toResponse(row, avatars.find((avatar) => avatar.id === row.avatarId) ?? null),
      ),
    }
  }

  private avatarIds(rows: ReadonlyArray<UserModel>): string[] {
    return rows.flatMap((row) => row.avatarId ?? [])
  }

  private query() {
    return UserModel.query({ client: this.transaction.client() })
  }

  private toEntity(row: UserModel): User {
    return User.restore({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      status: row.status,
      avatarId: row.avatarId,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
      deletedAt: row.deletedAt?.toJSDate() ?? null,
    })
  }

  private toResponse(row: UserModel, avatar: UserRead['avatar']): UserRead {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      avatarId: row.avatarId,
      avatar,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
      deletedAt: row.deletedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
