
/** O resultado de uma ação em massa: quantos passaram e quantos não. */
export type BulkOutcome = {
  done: number
  failed: number
}

/**
 * Roda uma ação sobre vários itens e conta o que passou.
 *
 * **Um laço sobre os endpoints por id, e não um endpoint em massa.** A API não
 * tem `bulk-archive` nem `bulk-delete`, e inventar um só para a barra de seleção
 * seria escrever contrato novo para um botão. O custo é N requisições, com N
 * limitado pelo `perPage` - no máximo 100.
 *
 * `allSettled` e não `all`: com `all` a primeira falha aborta o resto, e a
 * pessoa ficaria com metade arquivada sem saber qual metade. Aqui todas
 * terminam e a contagem é exata.
 */
export async function runBulk<TItem>(
  items: ReadonlyArray<TItem>,
  action: (item: TItem) => Promise<unknown>,
): Promise<BulkOutcome> {
  const results = await Promise.allSettled(items.map(action))

  const done = results.filter((result) => result.status === 'fulfilled').length

  return { done, failed: results.length - done }
}

