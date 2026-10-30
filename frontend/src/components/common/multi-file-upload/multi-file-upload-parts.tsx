import type { Merge } from '@interclasse/shared'
import { UploadSimpleIcon, XIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { useMultiFileUploadContext } from './multi-file-upload-context'
import type { UploadItemStatus } from './multi-file-upload-context'

type MultiFileUploadTriggerProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof Button>, 'children'>,
    { children?: React.ReactNode }
  >
>

/** O botão que abre o seletor. Sem children escreve "Adicionar arquivos". */
export function MultiFileUploadTrigger({
  children,
  ...rest
}: MultiFileUploadTriggerProps): React.JSX.Element {
  const { openPicker, isUploading, controlId } = useMultiFileUploadContext(
    'MultiFileUploadTrigger',
  )

  return (
    <Button
      data-slot="multi-file-upload-trigger"
      id={controlId}
      type="button"
      variant="outline"
      size="sm"
      onClick={openPicker}
      {...rest}
    >
      {isUploading && <Spinner className="size-4" />}
      {!isUploading && <UploadSimpleIcon />}
      {children ?? m.multi_file_upload_add()}
    </Button>
  )
}

/** O texto de estado de cada item: a barra diz quanto, o texto diz o que houve. */
const STATUS_TEXTS = {
  uploading: (name: string, percent: number) =>
    m.multi_file_upload_progress({ name, percent }),
  done: (name: string) => name,
  failed: (name: string) => m.multi_file_upload_failed({ name }),
} satisfies Record<UploadItemStatus, (name: string, percent: number) => string>

/** O rótulo do botão de cada item: enquanto sobe ele cancela, depois ele tira. */
const REMOVE_LABELS = {
  uploading: (name: string) => m.multi_file_upload_cancel({ name }),
  done: (name: string) => m.multi_file_upload_remove({ name }),
  failed: (name: string) => m.multi_file_upload_remove({ name }),
} satisfies Record<UploadItemStatus, (name: string) => string>

/** A fila: nome, barra de progresso e a ação de tirar/cancelar de cada arquivo. */
export function MultiFileUploadList({
  className,
  ...props
}: React.ComponentProps<'ul'>): React.JSX.Element | null {
  const { items, remove } = useMultiFileUploadContext('MultiFileUploadList')

  if (items.length === 0) return null

  return (
    <ul
      data-slot="multi-file-upload-list"
      aria-label={m.multi_file_upload_list()}
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-3 rounded-md border p-2 text-sm"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className={cn(
                'truncate',
                item.status === 'failed' && 'text-destructive',
              )}
            >
              {STATUS_TEXTS[item.status](item.name, item.percent)}
            </span>
            {item.status === 'uploading' && (
              <progress
                className="h-1 w-full"
                max={100}
                value={item.percent}
                aria-label={item.name}
              />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={REMOVE_LABELS[item.status](item.name)}
            onClick={() => remove(item.key)}
          >
            <XIcon />
          </Button>
        </li>
      ))}
    </ul>
  )
}
