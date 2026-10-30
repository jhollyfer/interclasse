import app from '@adonisjs/core/services/app'

/** Um contrato e a implementação que o teste põe no lugar dela. */
type Binding<T> = readonly [abstract new (...args: never[]) => T, T]

/**
 * Monta o use-case pelo container com as implementações em memória no lugar das
 * reais (`_standards/architecture.md` §8): `swap` só enquanto o use-case é
 * construído, e `restore` logo depois, para nenhuma troca vazar para o teste
 * seguinte (_doc-lib/adonisjs.md#guides/concepts/dependency-injection).
 */
export async function makeWithMemory<TUseCase>(
  useCase: new (...args: never[]) => TUseCase,
  bindings: ReadonlyArray<Binding<unknown>>,
): Promise<TUseCase> {
  for (const [contract, implementation] of bindings)
    app.container.swap(contract, () => implementation)

  try {
    return await app.container.make(useCase)
  } finally {
    for (const [contract] of bindings) app.container.restore(contract)
  }
}
