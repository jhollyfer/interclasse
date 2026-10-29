---
name: dialog-pattern
description: >-
  Padrão único de componentes Dialog (modal central) em React. Use SEMPRE que
  criar, editar ou revisar qualquer Dialog (`components/ui/dialog`) — modais de
  formulário, criação rápida a partir de um combobox, detalhe, configuração — e
  também para toda confirmação destrutiva, que é AlertDialog e tem regra própria
  aqui. Dispare quando o usuário falar em "dialog", "modal", "confirmação",
  "popup", ou pedir para padronizar/revisar dialogs existentes. Há UM único
  padrão válido (uncontrolled; gatilho visível por trigger-forward, abertura sem
  gatilho por `Dialog.createHandle()`), reproduzido inteiro aqui — siga-o
  exatamente, não improvise outra forma. Painel lateral usa [[sheet-pattern]];
  o estilo de código é [[code-pattern]].
---

# Padrão de Dialog

`Dialog` é o modal central: `components/ui/dialog`, o wrapper shadcn sobre o `Dialog` do Base UI.
Existe **um único padrão**, reproduzido abaixo. É o irmão do [[sheet-pattern]]: mesma forma,
componente diferente.

Contrato: `_doc-lib/base-ui.md#react/components/dialog` (anatomia, `createHandle`, `initialFocus`,
`finalFocus`), `#react/components/alert-dialog`, `#react/overview/accessibility`;
`_doc-lib/tanstack-query.md#guides/mutations`; `_doc-lib/react-hook-form.md#docs/useform/seterror`.
Abra a página oficial da entrada antes de decidir (`AGENTS.md`). A régua da camada é
`_standards/frontend.md` (§4 formulários, §6.1 compound, §8 kit comum) e `_standards/i18n.md`; esta
skill não repete o que está lá, só fixa a forma do Dialog.

**Modal não é a primeira opção.** Dialog serve a tarefa que precisa interromper e proteger o foco.
O resto é inline, `Sheet` ([[sheet-pattern]]) ou página própria (`$id/edit`).

## Antes de escrever

1. **Alias e pacote compartilhado.** Leia `tsconfig.json` / `package.json` (`imports`). Os exemplos
   usam `#/` e `@acme/shared`; troque pelo alias do projeto e por `@<projeto>/shared`.
2. **Primitiva.** Abra `components/ui/dialog.tsx`. A casa é Base UI (prop `render`). Projeto ainda
   em Radix (`asChild`) está fora da régua: a forma é a mesma, mas registre a migração.
3. **O que já existe.** Procure `lib/dialog-handle.ts`, `hooks/use-dismissable-dialog.ts`,
   `components/common/confirm-dialog/`, `lib/form-errors.ts`, `lib/form-a11y.ts` e o hook de mutation
   do módulo (`integrations/tanstack-query/mutations/<módulo>.ts`). Existe: use. Não existe: crie
   **uma vez**, no lugar da árvore (`architecture.md` §4), nunca dentro do Dialog.

## A referência

```ts
// lib/dialog-handle.ts — a fábrica do handle, um lugar só
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

export const createDialogHandle = DialogPrimitive.createHandle
export type DialogHandle = ReturnType<typeof createDialogHandle>
```

```ts
// hooks/use-dismissable-dialog.ts — fecha o Dialog uncontrolled pelo botão visível
export function useDismissableDialog(): {
  readonly closeRef: React.RefObject<HTMLButtonElement | null>
  readonly close: () => void
} {
  const closeRef = React.useRef<HTMLButtonElement | null>(null)
  const close = React.useCallback(() => closeRef.current?.click(), [])
  return { closeRef, close }
}
```

```tsx
// routes/_private/administrator/teams/-components/team-create-dialog.tsx
import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { vineResolver } from '@hookform/resolvers/vine'
import {
  AdministratorTeamCreateValidator,
  type AdministratorTeamCreatePayload,
} from '@acme/shared'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { useDismissableDialog } from '#/hooks/use-dismissable-dialog'
import { useTeamCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import type { DialogHandle } from '#/lib/dialog-handle'
import { applyHTTPErrorToForm } from '#/lib/form-errors'
import { errorId, invalidProps } from '#/lib/form-a11y'
import type { Merge } from '@<projeto>/shared'
import { m } from '#/paraglide/messages'

const TEAM_CREATE_FIELDS = ['name'] as const

type TeamCreateDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { readonly handle?: DialogHandle }
>

export function TeamCreateDialog({
  ref,
  handle,
  render,
  ...rest
}: TeamCreateDialogProps): React.JSX.Element {
  return (
    <Dialog handle={handle}>
      {render !== undefined && <DialogTrigger {...rest} ref={ref} render={render} />}
      <DialogContent className="sm:max-w-xl">
        <TeamCreateForm />
      </DialogContent>
    </Dialog>
  )
}

function TeamCreateForm(): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog()
  const create = useTeamCreateMutation()
  const form = useForm<AdministratorTeamCreatePayload>({
    resolver: vineResolver(AdministratorTeamCreateValidator),
    defaultValues: { name: '' },
    mode: 'onTouched',
  })

  function onValid(payload: AdministratorTeamCreatePayload): void {
    create.mutate(payload, {
      onSuccess: () => {
        form.reset()
        close()
      },
      onError: (error) =>
        applyHTTPErrorToForm({
          form,
          error,
          fields: TEAM_CREATE_FIELDS,
          retry: () => form.handleSubmit(onValid)(),
        }),
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onValid)}>
      <DialogHeader>
        <DialogTitle>{m.teams_create_title()}</DialogTitle>
        <DialogDescription>{m.teams_create_description()}</DialogDescription>
      </DialogHeader>
      <div className="grid flex-1 auto-rows-min gap-6 px-4 py-4">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="team-create-name">{m.teams_field_name()}</FieldLabel>
                <Input
                  {...field}
                  id="team-create-name"
                  {...invalidProps(fieldState.invalid, 'team-create-name')}
                />
                {fieldState.invalid && (
                  <FieldError id={errorId('team-create-name')} errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={create.isPending}>
          {m.common_save()}
        </Button>
        <DialogClose
          render={
            <Button ref={closeRef} variant="outline" type="button">
              {m.common_cancel()}
            </Button>
          }
        />
      </DialogFooter>
    </form>
  )
}
```

Os nomes de módulo (`useTeamCreateMutation`, `applyHTTPErrorToForm`, `invalidProps`, `Merge`) são os
da régua; se o projeto usa outro nome para a mesma peça, use a do projeto e registre o desvio.

## As regras

### Forma

1. **Uncontrolled.** O `<Dialog>` abre e fecha pela primitiva, pelo `DialogClose` e pelo `handle`.
   Nunca `open`/`onOpenChange` de estado próprio, nunca `useState` de abertura.
2. **Gatilho visível: trigger-forward.** Props `Merge<React.ComponentProps<typeof DialogTrigger>, {
   handle?, ...extras }>`; desestruture `{ ref, handle, render, ...rest }` e renderize
   `<DialogTrigger {...rest} ref={ref} render={render} />` **só quando há `render`**. Quem chama passa o
   elemento visível: `<TeamCreateDialog render={<Button>{m.teams_create()}</Button>} />`. Prop que
   colide com atributo do DOM (`onSubmit`, `title`) sai por `Omit` antes do `Merge`
   ([[code-pattern]] §5).
3. **Sem gatilho visível: `handle`.** Abrir de item de menu, linha de tabela, atalho de teclado,
   outro componente ou parâmetro de URL é `Dialog.createHandle()` (`_doc-lib/base-ui.md#react/components/dialog`).
   O componente recebe `handle` e não renderiza trigger nenhum; quem abre chama `handle.open(null)` no
   próprio handler do evento. Ver "Como o caller abre".
4. **Proibido:** `useEffect` que clica um `ref`, `triggerRef.current?.click()`, gatilho nu sem
   filho (`<XDialog ref={ref} />`), botão escondido (`hidden`, `sr-only`, `aria-hidden` num
   gatilho). O clique programático acerta um `<button>` que o Base UI ainda não ligou quando o
   Dialog monta no mesmo commit, e falha em silêncio; o gatilho nu deixa em cada linha um botão
   focável, invisível e sem nome.
5. **Header sempre com `DialogTitle` e `DialogDescription`.** O Popup é rotulado por eles. Precisa
   esconder: `className="sr-only"`, nunca omitir.
6. **Corpo** em `<div className="grid flex-1 auto-rows-min gap-6 px-4 py-4">`, campos com o kit
   `Field`/`FieldGroup`/`FieldLabel`/`FieldError` (+ `InputGroup*` com ícone ou addon).
7. **Footer:** ação primária + `DialogClose render={<Button … />}` no cancelar. Nunca
   `onClick={() => onOpenChange(false)}`.
8. **Conteúdo é um componente interno** dentro do `<DialogContent>`. A primitiva monta o conteúdo só
   aberto: o form se inicializa ao abrir e se descarta ao fechar, sem `useEffect` atrelado a `open`.
   Componente nunca é declarado dentro de outro componente.
9. **Estilo:** [[code-pattern]] inteiro. Retorno `React.JSX.Element`, props `readonly`.

### Formulário dentro do Dialog

10. **`useForm` + `vineResolver(<Validator>)`, sempre.** Campo por `Controller` (ou `AppField`),
    nunca `register`: o kit trabalha com `value`/`onValueChange`. `mode: 'onTouched'`.
11. **Schema e tipo vêm de `@<projeto>/shared`.** `resolver: vineResolver(AdministratorTeamCreateValidator)`
    e `useForm<AdministratorTeamCreatePayload>`, o mesmo validator que o backend usa
    (`architecture.md` §9–§10). Nunca `vine.create(...)` no componente, nunca `@vinejs/vine` importado
    direto, nunca `type` redigitado.
12. **Escrita por `mutation.mutate(vars, { onSuccess, onError })`.** `mutateAsync` só com `await`
    dentro de `try/catch`; nunca solto, nunca com `.then/.catch`, nunca com `void` na frente
    (`_doc-lib/tanstack-query.md#guides/mutations`: `mutateAsync` lança). O hook de mutation do
    módulo devolve a promessa da invalidação no `onSuccess`, então `isPending` cobre o refetch
    (`#guides/invalidations-from-mutations`).
13. **Sucesso:** `form.reset()` e depois `close()` (do `useDismissableDialog`, ancorado no Cancelar
    visível). Sem o reset, o segundo cadastro começa com o texto do primeiro. Proibido
    `<DialogClose className="hidden" />` só para segurar o ref.
14. **Erro do servidor:** `applyHTTPErrorToForm` primeiro. Erro com campo listado em
    `<RECURSO>_FIELDS` vai para o campo (`setError`). **409 e 5xx/rede** viram `toast.error` com `id`
    fixo e ação "Tentar de novo" (texto por chave) que reenvia mantendo o digitado; **outro 4xx**
    (validação, autorização) vai para `setError('root')`, sem retry (`frontend.md` §4,
    `DECISIONS.md` #113 C16). Erro mantém o Dialog aberto.
15. **Envio único:** o botão fica `disabled` com `isPending`; duplo clique não gera dois requests.

### Texto e acessibilidade

16. **Todo texto por chave i18n** (`m.*()`): título, descrição, rótulo, botão, toast, `aria-label`
    (`i18n.md` §2). Literal pt-BR no componente é desvio.
17. **Nome acessível:** gatilho só de ícone leva `aria-label={m.…()}`; ícone decorativo
    `aria-hidden`. O Base UI dá teclado, foco preso e `role`; o nome é sempre seu
    (`_doc-lib/base-ui.md#react/overview/accessibility`). Não reimplemente focus trap, `role` nem Esc.
18. **Foco ao abrir:** formulário foca o primeiro campo pelo `initialFocus` do Popup (o
    `DialogContent` repassa), não por `autoFocus` nem `useEffect`. Como o campo mora no componente
    interno, o ref nasce no componente externo e desce por prop até o `Controller` (`ref` do
    `field` encadeado). Por padrão a primitiva foca o próprio popup, o que obriga um Tab a mais.
19. **Foco ao fechar volta a quem abriu.** Pelo gatilho é o padrão da primitiva. Aberto por
    `handle` sem trigger, passe `finalFocus` com o ref do elemento que originou a abertura (o botão
    do menu da linha), senão o foco se perde no `body` *(comportamento de foco sem trigger: página
    oficial não conferida)*.
20. **Erro de campo** com `aria-invalid` + `aria-describedby` pelo par `invalidProps`/`errorId` de
    `lib/form-a11y.ts`; foco no primeiro campo inválido no submit (`shouldFocusError` ligado, padrão
    do RHF).

## Como o caller abre o Dialog

Dois jeitos, e só dois:

- **(a) Um elemento visível é o gatilho:** `render` no próprio componente (regra 2).
- **(b) Qualquer outro caso:** `handle` (regra 3).

```tsx
// routes/_private/administrator/teams/-components/row-actions.tsx
export function TeamRowActions({
  team,
}: {
  readonly team: AdministratorTeamListItemResponse
}): React.JSX.Element {
  // useState com inicializador, nunca escopo de módulo: no SSR um handle de módulo seria um
  // store único compartilhado entre requisições.
  const [editHandle] = React.useState(createDialogHandle)
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <React.Fragment>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button ref={menuTriggerRef} variant="ghost" size="icon" aria-label={m.common_actions()}>
              <DotsThreeIcon aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent className="w-48">
          <DropdownMenuItem onClick={() => editHandle.open(null)}>
            <PencilSimpleIcon aria-hidden />
            {m.common_edit()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Irmão do menu, nunca dentro do DropdownMenuContent: o Content desmonta ao fechar. */}
      <TeamEditDialog handle={editHandle} team={team} finalFocus={menuTriggerRef} />
    </React.Fragment>
  )
}
```

21. **O Dialog aberto por handle é irmão do `<DropdownMenu>`**, fora do `DropdownMenuContent`. O
    item usa `onClick` normal e o menu fecha: é o comportamento certo.
22. **Um handle por Dialog, não por lugar que abre.** Menu e botão da linha chamam o mesmo
    `handle.open(null)`; duplicar o componente monta dois Dialogs para um alvo.
23. **Alvo dinâmico** (um Dialog para a tabela inteira, qual linha só se sabe no clique):
    `handle.openWithPayload({ teamId })`, e o Root lê o payload (`_doc-lib/base-ui.md#react/components/dialog`).
    Substitui o antigo `{ alvo, nonce }` + `key` + `useEffect`. A forma exata de ler o payload no
    Root (função como `children`) é *página oficial não conferida*: confira antes de usar.
    Chamada a `open` sem Root montado com o mesmo handle é ignorada, então o Dialog fica montado
    (fechado) enquanto a tela existir.
24. **View-only aberto por URL** (o search param diz que está aberto): o mesmo `handle`, aberto no
    handler da navegação; efeito colateral de fechar vai no `onOpenChange` do Root lendo o `reason`,
    nunca em estado espelhado.

## Confirmação destrutiva é AlertDialog, não Dialog

25. **Toda ação que arquiva, restaura ou remove passa pelo `ConfirmDialog`**
    (`components/common/confirm-dialog/`, kit comum, `frontend.md` §8), que é `AlertDialog`. Não
    fecha por clique fora: um clique distraído não pode ser a resposta a "apagar de vez?". O Esc é o
    da primitiva e não se reimplementa *(a entrada `_doc-lib/base-ui.md#react/components/alert-dialog`
    diz que o AlertDialog não descarta por Esc; página oficial não conferida)*. Quando a remoção é
    recuperável, prefira desfazer (toast com "Desfazer") à confirmação.
26. **Um `ConfirmDialog` para o projeto inteiro.** Não existe? Crie na primeira vez, no kit.
27. **Compound: texto por slot, não por prop.** Em prop fica só o que a confirmação inteira divide
    (`isPending`, `destructive`, `onConfirm`, `handle`, `finalFocus`); título, descrição e rótulos
    são filhos:

    ```tsx
    <ConfirmDialog
      handle={removeHandle}
      finalFocus={menuTriggerRef}
      isPending={remove.isPending}
      onConfirm={(close) => remove.mutate(team.id, { onSuccess: close })}
    >
      <ConfirmDialogHeader>
        <ConfirmDialogMedia><TrashIcon aria-hidden /></ConfirmDialogMedia>
        <ConfirmDialogTitle>{m.teams_remove_title({ name: team.name })}</ConfirmDialogTitle>
        <ConfirmDialogDescription>{m.teams_remove_description()}</ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>{m.teams_remove_confirm()}</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
    ```

28. **O título nomeia ação e registro** ("Remover a equipe Design?"), nunca "Tem certeza?"; botões
    com verbo + objeto, nunca "Sim/Não/OK". Ação sem volta é `destructive`; "Cancelar" nunca é.
29. **Handle próprio do AlertDialog:** `AlertDialog.createHandle()` (exportado pelo
    `confirm-dialog`), nunca o handle de Dialog: o de Dialog faria o alerta fechar no clique fora.
30. **`children` é o conteúdo do alerta**, nunca o do gatilho. O gatilho visível vai no `render`
    (`render={<Button><TrashIcon aria-hidden />{m.common_remove()}</Button>}`). Item de menu que é o
    próprio gatilho fica dentro do `DropdownMenuContent` com `closeOnClick={false}`; aberto por
    handle, fica irmão do menu (regra 21).
31. **Peça sem estado compartilhado não vira compound**, e a instância genérica do TanStack Table não
    cabe em `React.Context` sem `as`: segue por prop (`frontend.md` §6.1).

## Teste

- Componente: Vitest + Testing Library, por papel e nome acessível
  (`getByRole('dialog', { name: m.teams_create_title() })`), `userEvent` para abrir, preencher e
  salvar; o nome vem da chave, não do literal (`architecture.md` §8).
- E2E (Playwright, `e2e/<fluxo>.spec.ts`): abre, Esc/Cancelar fecha sem gravar, inválido acusa o
  campo, 409/422 volta ao campo, válido grava uma vez com duplo clique, foco volta a quem abriu.

## Antes de terminar

Releia o diff: uncontrolled, sem `open`/`onOpenChange`/`useState` de abertura; trigger só com
`render`; abertura sem gatilho por `handle` criado em `useState`; nenhum `ref.click()`, `useEffect` de
abertura, gatilho nu ou botão escondido; Title **e** Description; `DialogClose render` no cancelar;
form interno com schema e tipo de `@<projeto>/shared`; `mutate` com callbacks; `reset()` antes de
`close()`; erro por `applyHTTPErrorToForm`, retry só em 409 e 5xx/rede; todo texto por `m.*()`;
`aria-label` em botão de ícone; `initialFocus` no primeiro campo e `finalFocus` quando abre por
handle; destrutivo pelo `ConfirmDialog` com texto nas partes. Depois lint e typecheck do projeto.
