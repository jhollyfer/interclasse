import * as React from 'react'

/**
 * O que o campo inteiro compartilha - e nada além.
 *
 * O envio é uma máquina de estado pequena mas real: sobe na escolha, guarda o
 * órfão para apagar na troca, e trava o submit enquanto está em voo. As partes
 * visíveis só leem o resultado dela. Passar isso por prop obrigaria cada peça a
 * receber cinco props que nenhuma delas decide.
 *
 * Os textos **não** estão aqui: rótulo, sigla de fallback e descrição são
 * markup, e markup vai por slot.
 */
export type ImageFieldContextValue = {
  /** A imagem a mostrar: a recém-enviada, ou a que já estava gravada. */
  shown: string | null | undefined
  /** Tem o que remover? Governa se o botão de remover aparece. */
  hasImage: boolean
  /** O arquivo está subindo? Trava os dois botões e troca o ícone por spinner. */
  isPending: boolean
  /** Abre o seletor de arquivo nativo, que fica escondido no `ImageField`. */
  openPicker: () => void
  /** Aponta o campo para `null` e apaga o órfão, se houver. */
  clear: () => void
  /**
   * Vai no botão que abre o seletor, para o `FieldLabel` de quem consome poder
   * apontar um `htmlFor` para algo focável - o `<input type="file">` está
   * escondido, e rótulo apontando para elemento oculto não leva foco nenhum.
   */
  controlId: string | undefined
}

const ImageFieldContext = React.createContext<ImageFieldContextValue | null>(
  null,
)

export const ImageFieldProvider = ImageFieldContext.Provider

/**
 * O campo, para quem está dentro de `ImageField`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider - sem isso o `throw` reporta "faltou provider" e deixa a busca por
 * conta de quem lê a stack.
 */
export function useImageFieldContext(consumer: string): ImageFieldContextValue {
  const context = React.use(ImageFieldContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`ImageField\``)
  }

  return context
}
