import type * as React from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderTitle,
  PageShellHeader,
} from '#/components/common/page-shell'
import { SubmitButton } from '#/components/common/submit-button'
import type { Merge } from '#/lib/interfaces'

import { useFormShellContext } from './form-shell-context'

/** O cabeçalho que não rola: voltar, título e ações. */
export function FormShellHeader({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <PageShellHeader>
      {/* Mesma largura e mesmo centro do formulário: o "Salvar" fica sobre o
          campo, e não a 1000px dele numa tela larga. */}
      <PageHeader data-slot="form-shell-header" className="mx-auto max-w-3xl">
        {children}
      </PageHeader>
    </PageShellHeader>
  )
}

/** A seta de voltar. O destino vem do contexto, não de prop. */
export function FormShellBack(): React.JSX.Element {
  const { backTo, backParams } = useFormShellContext('FormShellBack')

  return <PageHeaderBack to={backTo} params={backParams} />
}

export function FormShellTitle(
  props: React.ComponentProps<typeof PageHeaderTitle>,
): React.JSX.Element {
  return <PageHeaderTitle data-slot="form-shell-title" {...props} />
}

/**
 * As ações da direita. Em geral `FormShellDiscard` + `FormShellSubmit`, mas a
 * tela que precisar de mais um botão escreve o botão aqui dentro.
 */
export function FormShellActions(
  props: React.ComponentProps<typeof PageHeaderActions>,
): React.JSX.Element | null {
  return <PageHeaderActions data-slot="form-shell-actions" {...props} />
}

/**
 * A saída sem salvar.
 *
 * `Link` e não `onClick` com `navigate()`: descartar é navegação, e como link
 * ele responde a abrir em nova aba, ao clique do meio e ao menu de contexto.
 *
 * Sem children escreve "Descartar", que é o que todo formulário do painel diz.
 */
export function FormShellDiscard({
  children = 'Descartar',
  ...rest
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  const { backTo, backParams } = useFormShellContext('FormShellDiscard')

  return (
    <Button
      data-slot="form-shell-discard"
      variant="outline"
      type="button"
      {...rest}
      render={
        <Link to={backTo} params={backParams}>
          {children}
        </Link>
      }
    />
  )
}

// `Omit` antes do `Merge`: o `children` do `SubmitButton` é obrigatório, e
// `Merge` intersecta - sem tirar o original, o opcional daqui não vale nada.
type FormShellSubmitProps = Merge<
  Omit<React.ComponentProps<typeof SubmitButton>, 'children'>,
  { children?: React.ReactNode }
>

/**
 * O botão que salva.
 *
 * O `form` e o `isPending` vêm do contexto: quem os declara é a tela, no
 * `FormShell`, e repeti-los aqui daria duas fontes de verdade para a mesma
 * decisão. Sem children escreve "Salvar".
 */
export function FormShellSubmit({
  children = 'Salvar',
  ...rest
}: FormShellSubmitProps): React.JSX.Element {
  const { formId, isPending } = useFormShellContext('FormShellSubmit')

  return (
    <SubmitButton
      data-slot="form-shell-submit"
      form={formId}
      isPending={isPending}
      {...rest}
    >
      {children}
    </SubmitButton>
  )
}
