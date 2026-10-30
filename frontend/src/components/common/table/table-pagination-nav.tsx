import type * as React from 'react'
import { useId } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import type { PaginationMeta } from '@interclasse/shared'

import { Button } from '#/components/ui/button'
import {
  PaginationContent,
  PaginationItem,
  Pagination as PaginationRoot,
} from '#/components/ui/pagination'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import { OptionCombobox } from '#/components/common/option-combobox'
import type { ListSearch } from '#/lib/list-search'
import { m } from '#/paraglide/messages'

/** As opções de itens por página. O teto do backend é 100 (`perPage.max(100)`). */
const PER_PAGE_OPTIONS = ['10', '20', '30', '40', '50']

type PaginationProps<TSearch extends ListSearch> = Readonly<{
  meta: PaginationMeta
  /** A rota desta listagem, para onde os links apontam. */
  to: string
  /**
   * Os filtros atuais. Genérico para preservar os campos próprios de cada
   * listagem (`?status`, `?category`) ao trocar de página - tipar como
   * `ListSearch` os apagaria do objeto espalhado.
   */
  search: TSearch
}>

/**
 * A paginação das listagens: itens por página à esquerda, saltos à direita.
 *
 * **Quatro saltos e não a régua de páginas.** A lista numerada era um `<li>` por
 * página: com 200 páginas, 200 links. Primeira/anterior/próxima/última tem
 * tamanho fixo, e a contagem "3 / 47" diz onde se está.
 *
 * Os quatro são `Link` e não `onClick`, o que se manteve da versão anterior: é
 * o que faz o botão do meio abrir a página em outra aba e o F5 voltar no mesmo
 * lugar. Nas pontas eles ficam desabilitados em vez de sumirem - botão que
 * some move os outros de lugar debaixo do cursor.
 *
 * Trocar de tamanho de página volta para a primeira: a página 7 de uma lista de
 * 10 em 10 quase nunca existe na de 50 em 50, e a tela abriria vazia sem dizer
 * por quê.
 */
export function Pagination<TSearch extends ListSearch>({
  meta,
  to,
  search,
}: PaginationProps<TSearch>): React.JSX.Element {
  const navigate = useNavigate()
  const perPageId = useId()

  const { currentPage, lastPage, total } = meta

  const isFirst = currentPage <= 1
  const isLast = currentPage >= lastPage

  /** `undefined` na primeira página, para não sujar a URL com `?page=1`. */
  function pageParam(page: number): number | undefined {
    if (page <= 1) return undefined

    return page
  }

  return (
    <section
      data-slot="table-pagination-nav"
      data-test-id="pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <Field orientation="horizontal" className="w-auto">
        <FieldLabel htmlFor={perPageId} className="flex-none text-sm">
          {m.table_per_page()}
        </FieldLabel>
        <OptionCombobox
          id={perPageId}
          value={String(meta.perPage)}
          onValueChange={(perPage) =>
            void navigate({
              to,
              search: { ...search, perPage: Number(perPage), page: undefined },
            })
          }
          options={PER_PAGE_OPTIONS.map((option) => ({
            value: option,
            label: option,
          }))}
          className="w-20"
        />
        <FieldDescription className="hidden sm:block">
          {m.table_records({ total })}
        </FieldDescription>
      </Field>

      <div className="flex items-center gap-4">
        <span className="text-sm tabular-nums text-muted-foreground">
          {m.table_page({ current: currentPage, last: lastPage })}
        </span>

        <PaginationRoot className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                data-test-id="pagination-first"
                variant="outline"
                size="icon"
                disabled={isFirst}
                aria-label={m.table_first_page()}
                render={
                  <Link
                    to={to}
                    search={{ ...search, page: undefined }}
                    disabled={isFirst}
                  />
                }
              >
                <CaretDoubleLeftIcon />
              </Button>
            </PaginationItem>

            <PaginationItem>
              <Button
                data-test-id="pagination-previous"
                variant="outline"
                size="icon"
                disabled={isFirst}
                aria-label={m.table_previous_page()}
                render={
                  <Link
                    to={to}
                    search={{ ...search, page: pageParam(currentPage - 1) }}
                    disabled={isFirst}
                  />
                }
              >
                <CaretLeftIcon />
              </Button>
            </PaginationItem>

            <PaginationItem>
              <Button
                data-test-id="pagination-next"
                variant="outline"
                size="icon"
                disabled={isLast}
                aria-label={m.table_next_page()}
                render={
                  <Link
                    to={to}
                    search={{ ...search, page: pageParam(currentPage + 1) }}
                    disabled={isLast}
                  />
                }
              >
                <CaretRightIcon />
              </Button>
            </PaginationItem>

            <PaginationItem>
              <Button
                data-test-id="pagination-last"
                variant="outline"
                size="icon"
                disabled={isLast}
                aria-label={m.table_last_page()}
                render={
                  <Link
                    to={to}
                    search={{ ...search, page: pageParam(lastPage) }}
                    disabled={isLast}
                  />
                }
              >
                <CaretDoubleRightIcon />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </PaginationRoot>
      </div>
    </section>
  )
}
