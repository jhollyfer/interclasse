import * as React from 'react'

/** Onde cada arquivo da fila está. */
export type UploadItemStatus = 'uploading' | 'done' | 'failed'

export type UploadItem = {
  key: string
  name: string
  /** 0 a 100. */
  percent: number
  status: UploadItemStatus
  /** O `id` do anexo, depois de enviado. É o que vai no payload. */
  storageId: string | null
}

/**
 * O que o campo inteiro compartilha: a fila e as duas ações. As partes visíveis
 * só leem o resultado; os textos são markup e ficam fora (slot).
 */
export type MultiFileUploadContextValue = {
  items: ReadonlyArray<UploadItem>
  /** Abre o seletor nativo, que fica escondido no `MultiFileUpload`. */
  openPicker: () => void
  /** Tira da fila; o arquivo já enviado e sem dono é apagado do storage. */
  remove: (key: string) => void
  /** Algum arquivo está subindo? Trava o botão de adicionar. */
  isUploading: boolean
  /** Vai no botão que abre o seletor, para o `<label>` apontar algo focável. */
  controlId: string | undefined
}

const MultiFileUploadContext =
  React.createContext<MultiFileUploadContextValue | null>(null)

export const MultiFileUploadProvider = MultiFileUploadContext.Provider

/**
 * O campo, para quem está dentro de `MultiFileUpload`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider.
 */
export function useMultiFileUploadContext(
  consumer: string,
): MultiFileUploadContextValue {
  const context = React.use(MultiFileUploadContext)

  if (!context) {
    throw new Error(
      `\`${consumer}\` precisa estar dentro de \`MultiFileUpload\``,
    )
  }

  return context
}
