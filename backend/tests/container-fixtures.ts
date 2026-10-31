import app from '@adonisjs/core/services/app'

import { StorageContract } from '#services/storage/storage.contract'
import { StorageFake } from '#services/storage/storage.fake'

/** A contract and the implementation the test puts in its place. */
type Binding<T> = readonly [abstract new (...args: never[]) => T, T]

/**
 * Builds the use case through the container with the in-memory implementations in
 * place of the real ones (`_standards/architecture.md` §8): `swap` only while the use
 * case is being built, and `restore` right after, so no swap leaks into the next test
 * (_doc-lib/adonisjs.md#guides/concepts/dependency-injection).
 *
 * The bucket is always the `StorageFake`, unless the test passes its own: a use case
 * that signs a read URL never talks to the real bucket in a unit test.
 */
export async function makeWithMemory<TUseCase>(
  useCase: new (...args: never[]) => TUseCase,
  bindings: ReadonlyArray<Binding<unknown>>,
): Promise<TUseCase> {
  const all: Array<Binding<unknown>> = [...bindings]
  if (!bindings.some(([contract]) => contract === StorageContract))
    all.push([StorageContract, new StorageFake()])

  for (const [contract, implementation] of all) app.container.swap(contract, () => implementation)

  try {
    return await app.container.make(useCase)
  } finally {
    for (const [contract] of all) app.container.restore(contract)
  }
}
