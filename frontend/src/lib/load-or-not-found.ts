import { notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'

/**
 * Roda a leitura de um `loader` e converte só o 404 em "não encontrado"
 * (`frontend.md` §5). Quem desenha é o `defaultNotFoundComponent` do
 * `router.tsx`.
 *
 * Rede fora, 403 e 500 sobem como estão: um backend indisponível não pode
 * parecer registro apagado, e quem não tem a permissão não errou de endereço,
 * errou de papel - dizer "não existe" esconderia isso.
 * _doc-lib/tanstack-router.md#guide/not-found-errors.
 */
export async function loadOrNotFound<TData>(
  load: () => Promise<TData>,
): Promise<TData> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
      throw notFound()
    }

    throw error
  }
}
