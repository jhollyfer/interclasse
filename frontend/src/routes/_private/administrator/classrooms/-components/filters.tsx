import type * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import { CATEGORIES } from '#/lib/entity'
import { CATEGORY_LABELS } from '#/lib/labels'
import type { ClassroomListSearch } from '#/integrations/tanstack-query/queries'

/** `page: undefined` junto: a página 3 de tudo quase nunca existe no recorte. */
export function ClassroomFilters({
  search,
}: {
  search: ClassroomListSearch
}): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <OptionCombobox
      aria-label="Categoria"
      className="w-full sm:w-44"
      value={search.category ?? ''}
      clearable
      onValueChange={(value) =>
        void navigate({
          to: '/administrator/classrooms',
          search: { ...search, category: value || undefined, page: undefined },
        })
      }
      options={toOptions(['', ...CATEGORIES], {
        ...CATEGORY_LABELS,
        '': 'Toda categoria',
      })}
    />
  )
}
