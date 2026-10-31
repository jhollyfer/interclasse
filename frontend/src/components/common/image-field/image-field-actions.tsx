import type { Merge } from '@interclasse/shared'
import { TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { FieldContent, FieldDescription } from '#/components/ui/field'
import { Spinner } from '#/components/ui/spinner'
import { m } from '#/paraglide/messages'

import { useImageFieldContext } from './image-field-context'

/** The column to the right of the preview: the buttons and the description. */
export function ImageFieldContent(
  props: React.ComponentProps<typeof FieldContent>,
): React.JSX.Element {
  return <FieldContent data-slot="image-field-content" {...props} />
}

/**
 * The row of buttons.
 *
 * Each button goes in its own `ButtonGroup`, as in `PageHeaderActions`: the
 * `ButtonGroup` glues its direct children together, and "Enviar" and "Remover" are
 * independent actions, not a segmented control.
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

type ImageFieldUploadProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof Button>, 'children'>,
    { children: React.ReactNode }
  >
>

/**
 * The button that opens the file picker. The children are the label - "Enviar
 * avatar", "Foto do depoimento" -, which used to be the `label` prop.
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
 * The button that removes the image. It disappears when there is nothing to remove - and does so
 * on its own, so the screen does not need to repeat the condition.
 *
 * Without children it writes "Remover", which is what all the fields say.
 */
export function ImageFieldRemove({
  children = m.common_remove(),
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
 * The line that says what the picker accepts. Without children it writes the
 * `ImageField` default formats; a screen that accepts another set writes its own.
 */
export function ImageFieldDescription({
  children = m.common_image_formats(),
  ...props
}: React.ComponentProps<typeof FieldDescription>): React.JSX.Element {
  return (
    <FieldDescription data-slot="image-field-description" {...props}>
      {children}
    </FieldDescription>
  )
}
