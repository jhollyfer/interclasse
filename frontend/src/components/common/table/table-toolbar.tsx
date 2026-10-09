import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArchiveIcon } from '@phosphor-icons/react'

import { useTableContext } from './table-context'
import { InputSearch } from './table-search-input'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { Spinner } from '#/components/ui/spinner'
import { TrashedModes } from '#/lib/entity'

/**
 * A faixa de controles entre o cabeçalho e a tabela: busca, filtros do recurso,
 * lixeira e menu de colunas.
 *
 * Só um `ButtonGroup` com espaçamento - quem decide o que entra e em que ordem
 * é a tela, e um filtro próprio do recurso vira mais um filho aqui.
 */
export function TableToolbar({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const { isPlaceholderData } = useTableContext('TableToolbar')

  return (
    // Cada controle num grupo aninhado: a barra mistura busca, filtro e ações,
    // e são peças independentes - o `ButtonGroup` cola os filhos diretos, que é
    // o desenho de um controle segmentado, não o de uma barra.
    <ButtonGroup
      data-slot="table-toolbar"
      className="shrink-0 flex-wrap items-center"
    >
      {React.Children.map(children, (control) => {
        if (!control) return null

        return <ButtonGroup>{control}</ButtonGroup>
      })}
      {isPlaceholderData && <Spinner className="opacity-50" />}
    </ButtonGroup>
  )
}

/**
 * A caixa de busca da listagem.
 *
 * O termo aplicado mora na URL, não aqui: fechar a tela, recarregar ou
 * compartilhar o link tem de trazer a mesma lista de volta.
 */
export function TableSearch({
  placeholder,
  help = 'Digite e tecle Enter, ou clique na lupa',
}: {
  placeholder: string
  help?: string
}): React.JSX.Element {
  const { to, search } = useTableContext('TableSearch')
  const navigate = useNavigate()

  return (
    <InputSearch
      value={search.search}
      placeholder={placeholder}
      help={help}
      onSearch={(term) =>
        // `page` some junto: a página 3 do filtro anterior quase nunca existe no
        // novo, e a tela abriria vazia sem dizer por quê.
        navigate({ to, search: { ...search, search: term, page: undefined } })
      }
    />
  )
}

/** O botão que alterna entre a lista e a lixeira. */
export function TableTrashToggle(): React.JSX.Element {
  const { to, search } = useTableContext('TableTrashToggle')
  const navigate = useNavigate()

  const isTrash = search.trashed === TrashedModes.ONLY

  // Sem ternário de atribuição: o botão liga e desliga, e cada estado é uma
  // linha legível de cima para baixo.
  let variant: 'default' | 'outline' = 'outline'
  if (isTrash) variant = 'default'

  let nextTrashed: typeof search.trashed = TrashedModes.ONLY
  if (isTrash) nextTrashed = undefined

  return (
    <Button
      variant={variant}
      onClick={() =>
        navigate({
          to,
          search: { ...search, trashed: nextTrashed, page: undefined },
        })
      }
    >
      <ArchiveIcon />
      Arquivados
    </Button>
  )
}
