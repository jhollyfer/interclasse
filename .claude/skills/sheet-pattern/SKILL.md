---
name: sheet-pattern
description: >-
  Padrão único de componentes Sheet (painel lateral) em React. Use SEMPRE que
  criar, editar ou revisar qualquer Sheet (`components/ui/sheet`) — painéis de
  filtro, menu mobile, drawers de formulário, painéis de configuração, e
  qualquer coisa que abra da borda da tela. Dispare quando o usuário falar em
  "drawer", "painel lateral", "sheet", "gaveta", ou pedir para
  padronizar/revisar sheets existentes. Há UM único padrão válido
  (uncontrolled; gatilho visível por trigger-forward, abertura sem gatilho por
  `Dialog.createHandle()`), o mesmo do [[dialog-pattern]] — siga-o exatamente,
  não improvise outra forma. O estilo de código é [[code-pattern]].
---

# Padrão de Sheet

`Sheet` é o painel lateral: `components/ui/sheet`, o `Dialog` do Base UI posicionado na borda. É o
irmão do [[dialog-pattern]]: **a forma, o formulário, o texto, a acessibilidade e a abertura são os
de lá**, regra por regra. Esta skill só acrescenta o que é próprio do painel e aponta para as regras
do Dialog pelo número, para não existirem duas versões da mesma regra.

Contrato: `_doc-lib/base-ui.md#react/components/dialog` e `#react/components/drawer` (painel de
borda **sem** gesto nem snap point é Dialog posicionado; `Drawer` só quando há gesto);
`_doc-lib/tanstack-router.md` (search params). Régua: `_standards/frontend.md` §2 (onde o dado mora)
e §4, `_standards/i18n.md`.

**Sheet ou Dialog?** O Sheet abre na borda e a listagem continua à vista: serve filtro, navegação
(menu mobile) e contexto lateral do registro. O Dialog escurece o resto e serve a tarefa que precisa
de foco. Confirmação destrutiva não é nenhum dos dois: é o `ConfirmDialog` ([[dialog-pattern]] regras
25–31).

## Antes de escrever

As mesmas três checagens do [[dialog-pattern]] ("Antes de escrever"): alias e `@<projeto>/shared`,
primitiva Base UI, e o que já existe (`lib/dialog-handle.ts`, `hooks/use-dismissable-dialog.ts`, o
`-search.ts` da rota, o hook de mutation do módulo). O handle do Sheet é o mesmo
`createDialogHandle`.

## A referência: painel de filtros

O uso mais comum. O Sheet desenha controles e navega; o filtro mora na URL.

```tsx
// routes/_private/administrator/teams/-components/filters.tsx
import * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { TeamStatus } from '@acme/shared'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import type { DialogHandle } from '#/lib/dialog-handle'
import type { Merge } from '@<projeto>/shared'
import { m } from '#/paraglide/messages'

import { TeamStatusSelect } from './team-status-select'

const routeApi = getRouteApi('/_private/administrator/teams/')

type TeamFiltersSheetProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  { readonly handle?: DialogHandle }
>

export function TeamFiltersSheet({
  ref,
  handle,
  render,
  ...rest
}: TeamFiltersSheetProps): React.JSX.Element {
  return (
    <Sheet handle={handle}>
      {render !== undefined && <SheetTrigger {...rest} ref={ref} render={render} />}
      <SheetContent side="left">
        <TeamFiltersContent />
      </SheetContent>
    </Sheet>
  )
}

function TeamFiltersContent(): React.JSX.Element {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  function selectStatus(status: TeamStatus | undefined): void {
    navigate({ search: (previous) => ({ ...previous, status, page: 1 }) })
  }

  function clearFilters(): void {
    navigate({ search: (previous) => ({ perPage: previous.perPage, page: 1 }) })
  }

  return (
    <React.Fragment>
      <SheetHeader>
        <SheetTitle>{m.teams_filters_title()}</SheetTitle>
        <SheetDescription>{m.teams_filters_description()}</SheetDescription>
      </SheetHeader>
      <div className="grid flex-1 auto-rows-min gap-6 px-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="team-filter-status">{m.teams_field_status()}</FieldLabel>
            <TeamStatusSelect
              id="team-filter-status"
              value={search.status}
              onValueChange={selectStatus}
            />
          </Field>
        </FieldGroup>
      </div>
      <SheetFooter>
        <Button variant="outline" type="button" onClick={clearFilters}>
          {m.common_clear_filters()}
        </Button>
        <SheetClose render={<Button type="button">{m.common_close()}</Button>} />
      </SheetFooter>
    </React.Fragment>
  )
}
```

Sheet com **formulário que salva** é a referência do [[dialog-pattern]] trocando `Dialog*` por
`Sheet*`: form interno, schema e tipo de `@<projeto>/shared`, `mutate` com callbacks, `reset()` antes
de `close()`. Não existe uma segunda forma para o painel.

## As regras

1. **Forma, abertura e proibições:** [[dialog-pattern]] regras 1–9. Uncontrolled; trigger só com
   `render` (`<SheetTrigger {...rest} ref={ref} render={render} />`); sem gatilho visível, `handle`
   criado em `useState(createDialogHandle)` e `handle.open(null)` no handler; nunca `useEffect` +
   `ref.click()`, gatilho nu ou botão escondido; Title **e** Description; `SheetClose render` no
   cancelar; conteúdo num componente interno.
2. **Formulário:** [[dialog-pattern]] regras 10–15. Estado cru (`useState`) num Sheet só quando não
   há nada a validar nem a submeter; o filtro nem isso, porque mora na URL (regra 5).
3. **Texto e acessibilidade:** [[dialog-pattern]] regras 16–20 (chave i18n, nome acessível, foco ao
   abrir e ao fechar, erro de campo).
4. **Caller:** [[dialog-pattern]] regras 21–24 (irmão do menu, um handle por Sheet,
   `openWithPayload` para alvo dinâmico).
5. **Filtro de listagem não é estado do Sheet.** Filtro, página e ordenação moram nos search params,
   validados pelo `validateSearch` do `-search.ts` da rota (`frontend.md` §2). O Sheet lê com
   `useSearch` e escreve com `navigate({ search })`; trocar filtro volta para a página 1. Guardar
   filtro em `useState` dentro do painel é o engano mais comum: fecha o Sheet e some, F5 e some, o
   link não se compartilha.
6. **Item de navegação fecha o Sheet.** Menu mobile: o link vai dentro de
   `<SheetClose render={<Link to="…">{m.nav_…()}</Link>} />`, nunca com `onClick` fechando na mão. O
   link ativo leva `aria-current="page"` (o `Link` do router já marca).
7. **`side`** só quando não é o default: `left` para filtro e navegação, direita para contexto do
   registro. Uma escolha por tela.
8. **Sem gesto, sem `Drawer`.** Arrastar e snap point são o único motivo para trocar o Sheet pelo
   `Drawer` do Base UI (`_doc-lib/base-ui.md#react/components/drawer`).

## Antes de terminar

O checklist do [[dialog-pattern]], com `Sheet*` no lugar de `Dialog*`, mais: filtro lido e escrito na
URL (nenhum `useState` de filtro), troca de filtro zera a página, link de menu dentro de `SheetClose`,
`side` coerente na tela. Depois lint e typecheck do projeto.
