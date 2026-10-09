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
  items: Array<TItem>,
  action: (item: TItem) => Promise<unknown>,
): Promise<BulkOutcome> {
  const results = await Promise.allSettled(items.map(action))

  const done = results.filter((result) => result.status === 'fulfilled').length

  return { done, failed: results.length - done }
}

/**
 * O texto do aviso, já flexionado e já dizendo o que falhou.
 *
 * O relato parcial é o ponto: "7 de 9 arquivados" é acionável, "erro ao
 * arquivar" depois de sete sucessos é mentira.
 *
 * `verb` vem no particípio e no masculino plural (`arquivados`, `excluídos`),
 * que é como as duas mensagens o usam.
 */
export function bulkMessage(outcome: BulkOutcome, verb: string): string {
  const total = outcome.done + outcome.failed

  if (outcome.failed === 0) {
    if (outcome.done === 1) return `1 ${verb.replace(/s$/, '')}.`

    return `${outcome.done} ${verb}.`
  }

  if (outcome.done === 0)
    return `Nenhum ${verb.replace(/s$/, '')}: ${total} falharam.`

  return `${outcome.done} de ${total} ${verb}; ${outcome.failed} falharam.`
}
