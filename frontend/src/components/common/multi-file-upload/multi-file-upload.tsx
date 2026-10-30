import type { StorageMimetype } from '@interclasse/shared'
import * as React from 'react'
import { toast } from 'sonner'

import { useRegisterUpload } from '#/components/common/uploading-context'
import { useAbortOnUnmount } from '#/hooks/use-abort-on-unmount'
import { useMultipartUpload } from '#/hooks/use-multipart-upload'
import { useStorageDeleteMutation } from '#/integrations/tanstack-query/mutations/storages'
import { notifyError } from '#/lib/form-errors'
import { IMAGE_MIMETYPES } from '#/lib/mimetype'
import { m } from '#/paraglide/messages'

import { MultiFileUploadProvider } from './multi-file-upload-context'
import type { UploadItem } from './multi-file-upload-context'

type MultiFileUploadProps = Readonly<{
  /** Recebe os `id` dos anexos já enviados a cada mudança: é o que vai no payload. */
  onValueChange: (storageIds: ReadonlyArray<string>) => void
  accept?: ReadonlyArray<StorageMimetype>
  id?: string
  /** `MultiFileUploadTrigger` e `MultiFileUploadList`. */
  children: React.ReactNode
}>

/**
 * Campo que sobe vários arquivos na escolha, cada um com a própria barra e
 * cancelável (`frontend.md` §8). É o par de `ImageField` para a lista: o envio
 * é do `useMultipartUpload`, o campo registra o voo no `uploading-context` (o
 * submit espera) e o arquivo trocado ou tirado, que nunca teve dono, é apagado.
 *
 * Os envios correm em paralelo, e o sinal de cada um é abortado quando o campo
 * sai de cena (`useAbortOnUnmount`).
 */
export function MultiFileUpload({
  onValueChange,
  accept = IMAGE_MIMETYPES,
  id,
  children,
}: MultiFileUploadProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Um controller por arquivo: cancelar um envio não pode abortar os outros.
  const controllers = React.useRef(new Map<string, AbortController>())
  const [items, setItems] = React.useState<ReadonlyArray<UploadItem>>([])
  const { upload } = useMultipartUpload()
  const nextSignal = useAbortOnUnmount()
  const discard = useStorageDeleteMutation({
    // Faxina, e não uma ação pedida: falhar deixa um órfão, como antes.
    onError: () => undefined,
  })

  const change = React.useCallback(
    (key: string, patch: Partial<UploadItem>): void => {
      setItems((previous) =>
        previous.map((item) => {
          if (item.key !== key) return item

          return { ...item, ...patch }
        }),
      )
    },
    [],
  )

  async function start(file: File): Promise<void> {
    const key = crypto.randomUUID()
    const controller = new AbortController()
    controllers.current.set(key, controller)
    setItems((previous) => [
      ...previous,
      {
        key,
        name: file.name,
        percent: 0,
        status: 'uploading',
        storageId: null,
      },
    ])

    try {
      const storage = await upload(
        file,
        (percent) => change(key, { percent }),
        AbortSignal.any([nextSignal(), controller.signal]),
      )
      controllers.current.delete(key)
      change(key, { status: 'done', percent: 100, storageId: storage.id })
    } catch (error) {
      // Cancelado pela pessoa: o item já saiu da fila, e não há falha a contar.
      if (controller.signal.aborted) return

      change(key, { status: 'failed' })
      if (error instanceof Error) {
        notifyError(error, { id: `multi-file-upload-${key}` })
        return
      }

      toast.error(m.multi_file_upload_failed({ name: file.name }))
    }
  }

  function onSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    for (const file of event.target.files ?? []) void start(file)

    // Sem isto, escolher o mesmo arquivo duas vezes seguidas não dispara o
    // `change` de novo.
    event.target.value = ''
  }

  const remove = React.useCallback(
    (key: string): void => {
      controllers.current.get(key)?.abort()
      controllers.current.delete(key)

      const target = items.find((item) => item.key === key)

      if (target?.storageId) discard.mutate(target.storageId)

      setItems((previous) => previous.filter((item) => item.key !== key))
    },
    [items, discard],
  )

  const openPicker = React.useCallback((): void => {
    inputRef.current?.click()
  }, [])

  const isUploading = items.some((item) => item.status === 'uploading')

  // Trava o submit enquanto algum arquivo sobe: sem isso o payload sai sem o
  // `id` do anexo.
  useRegisterUpload(isUploading)

  // A lista de `id` vira primitiva para a dependência do efeito, e o aviso ao
  // pai fica fora das deps (`useEffectEvent`): trocar o callback não reenvia.
  const doneIds = items.flatMap((item) => item.storageId ?? [])
  const doneKey = doneIds.join(',')
  const notify = React.useEffectEvent(() => onValueChange(doneIds))

  React.useEffect(() => {
    notify()
  }, [doneKey])

  const context = React.useMemo(
    () => ({ items, openPicker, remove, isUploading, controlId: id }),
    [items, openPicker, remove, isUploading, id],
  )

  return (
    <div data-slot="multi-file-upload" className="flex flex-col gap-3">
      <MultiFileUploadProvider value={context}>
        {children}
      </MultiFileUploadProvider>

      {/* O `<input type="file">` nativo não é estilizável: fica escondido atrás
          do botão visível (`MultiFileUploadTrigger`), como no `ImageField`. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept.join(',')}
        onChange={onSelect}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  )
}
