import app from '@adonisjs/core/services/app'

import { StorageContract } from '#services/storage/storage.contract'
import { StorageFake } from '#services/storage/storage.fake'

/** Um contrato e a implementação que o teste põe no lugar dela. */
type Binding<T> = readonly [abstract new (...args: never[]) => T, T]

/**
 * Monta o use-case pelo container com as implementações em memória no lugar das
 * reais (`_standards/architecture.md` §8): `swap` só enquanto o use-case é
 * construído, e `restore` logo depois, para nenhuma troca vazar para o teste
 * seguinte (_doc-lib/adonisjs.md#guides/concepts/dependency-injection).
 *
 * O bucket é sempre o `StorageFake`, salvo se o teste passar o seu: use-case que
 * assina URL de leitura nunca fala com o bucket de verdade no unitário.
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
