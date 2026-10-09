import * as React from 'react'
import { toast } from 'sonner'

import { ImageFieldProvider } from './image-field-context'

import { Field } from '#/components/ui/field'
import {
  useStorageCreate,
  useStorageDelete,
} from '#/integrations/tanstack-query/mutations'
import { useRegisterUpload } from '#/components/common/uploading-context'
import { IMAGE_MIMETYPES, isStorageMimetype } from '#/lib/entity'
import type { StorageMimetype } from '#/lib/entity'

type ImageFieldProps = {
  /** O `id` do anexo atual, ou `null`. É o que vai no payload. */
  value: string | null
  onValueChange: (storageId: string | null) => void
  /** O arquivo já gravado, para o preview antes de qualquer troca. */
  previewUrl?: string | null
  /**
   * Os tipos que **este** campo aceita, de `STORAGE_MIMETYPES`. Padrão são os
   * de imagem; o áudio do episódio passa `AUDIO_MIMETYPES`.
   */
  accept?: ReadonlyArray<StorageMimetype>
  id?: string
  children: React.ReactNode
}

/**
 * O campo de **um** arquivo: o avatar do usuário, a foto do depoimento e o
 * áudio do episódio de podcast.
 *
 * O nome é de imagem por herança - era o único uso quando nasceu -, mas de
 * imagem só sobrou o padrão do `accept` e o `ImageFieldPreview`, que é uma
 * parte opcional como qualquer outra. O campo de áudio é este mesmo, com
 * `accept={AUDIO_MIMETYPES}` e sem o preview; copiá-lo para um `file-field`
 * gêmeo duplicaria o envio, o órfão e a trava do submit por um nome.
 *
 * Guarda o `id` do anexo, nunca o arquivo: quem anexa aponta para o registro, e
 * nunca o contrário. Tirar a imagem é apontar para `null`, e o binário já
 * gravado fica - trocar de avatar não apaga o anterior de propósito, e quem
 * varre o que sobrou é o `node ace storages:prune` do backend.
 *
 * O envio acontece **na hora da escolha**, e não no submit do formulário: o
 * `POST /storages` é uma operação própria, e o formulário só passa a conhecer o
 * `id` depois que o arquivo existe. É o que evita um payload que referencia um
 * arquivo que falhou ao subir.
 *
 * Compound porque rótulo, sigla do fallback e descrição eram markup viajando
 * como prop - `label="Enviar avatar"`, `fallback="JR"`. A tela que quiser um
 * `<Alert>` na descrição ou nenhuma descrição escreve isso; com prop, cada
 * variação dessas vira mais uma prop opcional aqui dentro.
 */
export function ImageField({
  value,
  onValueChange,
  previewUrl,
  accept = IMAGE_MIMETYPES,
  id,
  children,
}: ImageFieldProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(null)

  /**
   * O arquivo que **este campo** subiu e ainda não foi salvo em nada.
   *
   * Só ele pode ser apagado. O `value` que chegou por prop é o anexo já
   * gravado na entidade: apagá-lo ao trocar a imagem furaria o cadastro antes
   * de o formulário ser submetido, e o backend recusaria com
   * `409 STORAGE_IN_USE` de qualquer forma - pedir para receber um erro é pior
   * do que não pedir.
   */
  const [orphan, setOrphan] = React.useState<string | null>(null)

  const remove = useStorageDelete({
    // Silencioso de propósito: é faxina, não uma ação que a pessoa pediu.
    // Falhar aqui deixa um arquivo órfão, que é exatamente o estado de antes.
    onError: () => undefined,
  })

  const upload = useStorageCreate({
    onSuccess(storage) {
      // Trocar a imagem duas vezes seguidas não pode deixar a primeira para
      // trás: a que sai daqui nunca chegou a ser referenciada por ninguém.
      if (orphan) remove.mutate(orphan)

      setOrphan(storage.id)
      onValueChange(storage.id)
      setPreview(storage.url)
    },
    onError(error) {
      // Tipo e tamanho são recusados pelo servidor **antes** de gravar - o
      // teto é o `UPLOAD_MAX_SIZE` dele -, então a mensagem que vem é a que diz
      // o limite real; repetir o número aqui seria garantir que os dois
      // divergissem.
      toast.error(error.message, { id: 'storage-create-error' })
    },
  })

  function onSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.item(0)
    if (!file) return

    // O `accept` do input é só uma dica para o seletor nativo: o diálogo do
    // sistema deixa trocar o filtro por "todos os arquivos", e arrastar não
    // passa por filtro nenhum. Recusar aqui poupa o `POST /storages` e diz
    // *qual* arquivo não serve - o servidor diria só que o tipo é inválido.
    if (!isStorageMimetype(file.type) || !accept.includes(file.type)) {
      toast.error(`${file.name} não é um tipo de arquivo aceito neste campo.`, {
        id: 'storage-create-error',
      })
      event.target.value = ''
      return
    }

    upload.mutate(file)
    // Sem isto, escolher o mesmo arquivo duas vezes seguidas não dispara o
    // `change` de novo, e a segunda tentativa depois de um erro não acontece.
    event.target.value = ''
  }

  const clear = React.useCallback((): void => {
    if (orphan) {
      remove.mutate(orphan)
      setOrphan(null)
    }

    onValueChange(null)
    setPreview(null)
  }, [orphan, remove, onValueChange])

  const openPicker = React.useCallback((): void => {
    inputRef.current?.click()
  }, [])

  // Trava o submit enquanto o arquivo sobe: sem isso o payload sai sem o `id`
  // do anexo, e o registro nasce sem imagem.
  useRegisterUpload(upload.isPending)

  const shown = preview ?? previewUrl
  const hasImage = Boolean(value ?? shown)

  // Sem `useMemo` o objeto é novo a cada tecla digitada no formulário em volta,
  // e as três partes re-renderizam junto com o campo vizinho.
  const context = React.useMemo(
    () => ({
      shown,
      hasImage,
      isPending: upload.isPending,
      openPicker,
      clear,
      controlId: id,
    }),
    [shown, hasImage, upload.isPending, openPicker, clear, id],
  )

  return (
    <Field data-slot="image-field" orientation="horizontal" className="gap-4">
      <ImageFieldProvider value={context}>{children}</ImageFieldProvider>

      {/* O `<input type="file">` nativo não é estilizável, e escondê-lo atrás de
          um botão visível é a única forma de ter um seletor com a aparência do
          resto. Não confunde com a regra "zero botão escondido" do
          [[dialog-pattern]]: lá o alvo é gatilho de overlay segurando um `ref`,
          e aqui quem abre o seletor é o botão que o usuário vê. O shadcn não tem
          peça de arquivo - `AttachmentTrigger` é um `<button>`, não um input -,
          então este elemento nativo fica.

          Fica no `ImageField` e não numa parte própria: é encanamento, não
          markup, e nenhuma tela tem motivo para omiti-lo ou reposicioná-lo. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        onChange={onSelect}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </Field>
  )
}
