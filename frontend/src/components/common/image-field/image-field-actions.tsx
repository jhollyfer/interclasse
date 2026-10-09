import type * as React from 'react'
import { TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'

import { useImageFieldContext } from './image-field-context'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { FieldContent, FieldDescription } from '#/components/ui/field'
import { Spinner } from '#/components/ui/spinner'
import type { Merge } from '#/lib/interfaces'

/** A coluna à direita do preview: os botões e a descrição. */
export function ImageFieldContent(
  props: React.ComponentProps<typeof FieldContent>,
): React.JSX.Element {
  return <FieldContent data-slot="image-field-content" {...props} />
}

/**
 * A linha de botões.
 *
 * Cada botão entra num `ButtonGroup` próprio, como em `PageHeaderActions`: o
 * `ButtonGroup` cola os filhos diretos, e "Enviar" e "Remover" são ações
 * independentes, não um controle segmentado.
 */
export function ImageFieldActions({
  children,
  ...props
}: React.ComponentProps<typeof ButtonGroup>): React.JSX.Element {
  return (
    <ButtonGroup data-slot="image-field-actions" {...props}>
      {children}
    </ButtonGroup>
  )
}

type ImageFieldUploadProps = Merge<
  React.ComponentProps<typeof Button>,
  { children: React.ReactNode }
>

/**
 * O botão que abre o seletor de arquivo. Os children são o rótulo - "Enviar
 * avatar", "Foto do depoimento" -, que antes era a prop `label`.
 */
export function ImageFieldUpload({
  children,
  ...rest
}: ImageFieldUploadProps): React.JSX.Element {
  const { isPending, openPicker, controlId } =
    useImageFieldContext('ImageFieldUpload')

  return (
    <ButtonGroup>
      <Button
        data-slot="image-field-upload"
        id={controlId}
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={openPicker}
        {...rest}
      >
        {isPending && <Spinner className="size-4" />}
        {!isPending && <UploadSimpleIcon />}
        {children}
      </Button>
    </ButtonGroup>
  )
}

/**
 * O botão que tira a imagem. Some quando não há o que tirar - e some sozinho,
 * para a tela não precisar repetir a condição.
 *
 * Sem children escreve "Remover", que é o que todos os campos dizem.
 */
export function ImageFieldRemove({
  children = 'Remover',
  ...rest
}: React.ComponentProps<typeof Button>): React.JSX.Element | null {
  const { hasImage, isPending, clear } =
    useImageFieldContext('ImageFieldRemove')

  if (!hasImage) return null

  return (
    <ButtonGroup>
      <Button
        data-slot="image-field-remove"
        type="button"
        variant="ghost"
        size="sm"
        onClick={clear}
        disabled={isPending}
        {...rest}
      >
        <TrashIcon />
        {children}
      </Button>
    </ButtonGroup>
  )
}

/**
 * A linha que diz o que o seletor aceita. Sem children escreve os formatos
 * padrão do `ImageField`; a tela que aceitar outro conjunto escreve o dela.
 */
export function ImageFieldDescription({
  children = 'JPG, PNG, WEBP, GIF ou SVG.',
  ...props
}: React.ComponentProps<typeof FieldDescription>): React.JSX.Element {
  return (
    <FieldDescription data-slot="image-field-description" {...props}>
      {children}
    </FieldDescription>
  )
}
