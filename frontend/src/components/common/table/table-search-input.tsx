import * as React from 'react'
import { MagnifyingGlassIcon, QuestionIcon, XIcon } from '@phosphor-icons/react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

type InputSearchProps = {
  /** O termo **aplicado**, que mora na URL. */
  value: string | undefined
  /** Chamado quando a busca é aplicada ou limpa. `undefined` limpa. */
  onSearch: (term: string | undefined) => void
  placeholder?: string
  /** O texto do balão de ajuda. Ausente, o botão de ajuda não aparece. */
  help?: string
}

/**
 * A caixa de busca das listagens.
 *
 * **Busca por ação, não por intervalo.** Antes o campo disparava sozinho 300ms
 * depois da última tecla; agora quem aplica é o Enter ou a lupa. A diferença
 * prática é uma requisição por busca em vez de uma por pausa de digitação, e
 * uma entrada no histórico por busca em vez de uma por pausa - o botão voltar
 * do navegador volta uma busca, não meia palavra.
 *
 * O que está digitado é rascunho de campo e mora aqui; o que está aplicado mora
 * na URL. As duas coisas se reencontram no render: quando o termo da URL muda
 * por fora - um "limpar filtros", o botão voltar -, a caixa acompanha.
 *
 * A exceção é esvaziar o campo à mão, que limpa na hora. Sem isso a pessoa
 * apagaria o texto, não apertaria nada, e continuaria vendo a lista filtrada
 * por um termo que não está mais escrito em lugar nenhum.
 *
 * Quem navega é o chamador, e não este componente: as rotas são tipadas, e um
 * `useSearch({ strict: false })` com `@ts-ignore` jogaria isso fora.
 */
export function InputSearch({
  value,
  onSearch,
  placeholder = 'Pesquise aqui...',
  help,
}: InputSearchProps): React.JSX.Element {
  const [term, setTerm] = React.useState(value ?? '')
  const [applied, setApplied] = React.useState(value)

  // O termo aplicado semeia o campo, e o ajuste acontece **durante o render**
  // em vez de num efeito. O efeito rodava um render depois da navegação, e o
  // que fosse digitado nesse intervalo era apagado quando ele chegasse.
  if (applied !== value) {
    setApplied(value)
    setTerm(value ?? '')
  }

  function change(next: string): void {
    setTerm(next)

    // Campo esvaziado com um termo aplicado: limpa sem esperar ação.
    if (next.trim().length === 0 && value) onSearch(undefined)
  }

  function apply(): void {
    const trimmed = term.trim()

    if (trimmed.length === 0) return
    if (trimmed === value) return

    onSearch(trimmed)
  }

  function clear(): void {
    setTerm('')
    onSearch(undefined)
  }

  const hasTerm = term.length > 0

  return (
    <InputGroup data-slot="table-search-input" className="w-full sm:w-72">
      {help && (
        <InputGroupAddon>
          <Tooltip>
            <TooltipTrigger
              render={
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Ajuda"
                >
                  <QuestionIcon />
                </InputGroupButton>
              }
            />
            <TooltipContent>{help}</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      )}

      <InputGroupInput
        data-test-id="search-input"
        // O placeholder some ao digitar e não nomeia o campo.
        aria-label="Pesquisar na lista"
        value={term}
        placeholder={placeholder}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return

          event.preventDefault()
          apply()
        }}
      />

      <InputGroupAddon align="inline-end">
        {hasTerm && (
          <InputGroupButton
            data-test-id="search-clear"
            variant="ghost"
            size="icon-xs"
            aria-label="Limpar busca"
            onClick={clear}
          >
            <XIcon />
          </InputGroupButton>
        )}

        {!hasTerm && (
          <InputGroupButton
            data-test-id="search-submit"
            variant="ghost"
            size="icon-xs"
            aria-label="Buscar"
            onClick={apply}
          >
            <MagnifyingGlassIcon />
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
