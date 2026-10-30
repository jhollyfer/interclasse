import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { left, right } from '@interclasse/shared'

import { TransactionContext } from './transaction-context.ts'
import { UnitOfWorkLucid } from './unit-of-work.lucid.ts'

import { resetDatabase } from '#tests/http-fixtures'

/** Uma escrita dentro da unidade, pelo cliente que os repositories usam. */
async function insertSport(context: TransactionContext, name: string): Promise<void> {
  await context.client().insertQuery().table('sports').insert({
    name,
    slug: name.toLowerCase(),
    min_athletes: 1,
    max_athletes: 3,
    created_at: new Date(),
  })
}

test.group('UnitOfWorkLucid', (group) => {
  group.each.setup(() => resetDatabase())

  test('right comita a escrita', async ({ assert }) => {
    const unit = await app.container.make(UnitOfWorkLucid)
    const context = await app.container.make(TransactionContext)

    const result = await unit.run(async () => {
      await insertSport(context, 'Xadrez')
      return right(true)
    })

    assert.isTrue(result.isRight())
    assert.lengthOf(await db.from('sports').where('name', 'Xadrez'), 1)
  })

  test('left desfaz a escrita sem throw', async ({ assert }) => {
    const unit = await app.container.make(UnitOfWorkLucid)
    const context = await app.container.make(TransactionContext)

    const result = await unit.run(async () => {
      await insertSport(context, 'Damas')
      return left('RECUSADO')
    })

    assert.isTrue(result.isLeft())
    assert.lengthOf(await db.from('sports').where('name', 'Damas'), 0)
  })

  test('exceção desfaz a escrita e sobe', async ({ assert }) => {
    const unit = await app.container.make(UnitOfWorkLucid)
    const context = await app.container.make(TransactionContext)

    await assert.rejects(() =>
      unit.run(async () => {
        await insertSport(context, 'Dominó')
        throw new Error('bug')
      }),
    )
    assert.lengthOf(await db.from('sports').where('name', 'Dominó'), 0)
  })
})
