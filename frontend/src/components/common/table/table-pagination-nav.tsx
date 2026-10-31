import type { PaginationMeta } from '@interclasse/shared'
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import type * as React from 'react'
import { useId } from 'react'

import { OptionCombobox } from '#/components/common/option-combobox'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field'
import {
  PaginationContent,
  PaginationItem,
  Pagination as PaginationRoot,
} from '#/components/ui/pagination'
import type { ListSearch } from '#/lib/list-search'
import { m } from '#/paraglide/messages'

/** The items-per-page options. The backend cap is 100 (`perPage.max(100)`). */
const PER_PAGE_OPTIONS = ['10', '20', '30', '40', '50']

type PaginationProps<TSearch extends ListSearch> = Readonly<{
  meta: PaginationMeta
  /** This listing's route, where the links point. */
  to: string
  /**
   * The current filters. Generic to preserve each listing's own fields
   * (`?status`, `?category`) when changing page - typing them as
   * `ListSearch` would erase them from the spread object.
   */
  search: TSearch
}>

/**
 * The listings' pagination: items per page on the left, jumps on the right.
 *
 * **Four jumps and not a page ruler.** The numbered list was an `<li>` per
 * page: with 200 pages, 200 links. First/previous/next/last has a fixed
 * size, and the "3 / 47" count says where one is.
 *
 * The four are `Link` and not `onClick`, which was kept from the previous version: it is
 * what makes the middle button open the page in another tab and F5 return to the same
 * place. At the ends they are disabled instead of disappearing - a button that
 * disappears moves the others from under the cursor.
 *
 * Changing the page size goes back to the first page: page 7 of a list of
 * 10 per page almost never exists in the 50 per page one, and the screen would open empty without saying
 * why.
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

  /** `undefined` on the first page, to avoid dirtying the URL with `?page=1`. */
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
