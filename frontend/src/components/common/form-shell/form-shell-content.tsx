import type * as React from 'react'

import { Card, CardContent } from '#/components/ui/card'
import { PageShellContent } from '#/components/common/page-shell'
import { cn } from '#/lib/utils'
import type { Merge } from '#/lib/interfaces'

import { useFormShellContext } from './form-shell-context'

type FormShellContentProps = Readonly<
  Merge<React.ComponentProps<'form'>, { children: React.ReactNode }>
>

/**
 * O conteúdo que rola, e o `<form>` de verdade.
 *
 * O `id` vem do contexto porque o `Salvar` mora no cabeçalho fixo, fora desta
 * árvore, e é por ele que o clique alcança o formulário.
 */
export function FormShellContent({
  children,
  className,
  ...props
}: FormShellContentProps): React.JSX.Element {
  const { formId } = useFormShellContext('FormShellContent')

  return (
    <PageShellContent>
      {/* `method="post"`: clique antes da hidratação vira envio nativo, e GET
          poria os campos - senha inclusive - na URL e no histórico. */}
      {/* `max-w-3xl`: campo de texto esticado a 1200px faz o olho atravessar a
          tela inteira para ler um nome. */}
      <form
        data-slot="form-shell-content"
        method="post"
        id={formId}
        className={cn(
          'mx-auto flex w-full max-w-3xl flex-col gap-4',
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </PageShellContent>
  )
}

type FormShellCardProps = Readonly<
  Merge<React.ComponentProps<typeof CardContent>, { children: React.ReactNode }>
>

/**
 * Um bloco de campos.
 *
 * `Card` + `CardContent` + a coluna com `gap-4` que todo formulário do painel
 * escrevia à mão. Peça separada e não embutida no `FormShellContent` porque a
 * quantidade varia: a tela de depoimento tem um, a de notícia tem três, e a que
 * precisar de layout próprio não usa nenhum. Uma prop booleana de escape seria
 * a mesma coisa com um nome pior.
 */
export function FormShellCard({
  className,
  children,
  ...props
}: FormShellCardProps): React.JSX.Element {
  return (
    <Card data-slot="form-shell-card">
      <CardContent className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </CardContent>
    </Card>
  )
}
