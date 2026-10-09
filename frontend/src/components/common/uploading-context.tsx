import * as React from 'react'

type UploadingContextValue = {
  register: (key: string) => void
  unregister: (key: string) => void
  isUploading: boolean
}

const UploadingContext = React.createContext<UploadingContextValue | null>(null)

/**
 * Quem está enviando arquivo, agora, em qualquer lugar da árvore.
 *
 * Existe por causa do submit: o upload acontece na hora da escolha e o
 * formulário só conhece o `id` depois que o arquivo existe. Sem isto, salvar
 * enquanto a barra ainda corre manda um payload sem o anexo - e o registro nasce
 * sem imagem, sem erro nenhum que denuncie.
 *
 * Um `Set` de chaves e não um contador: dois campos de upload na mesma tela
 * registram e cancelam em ordens imprevisíveis, e um contador que desce duas
 * vezes pelo mesmo campo chega a zero com o outro ainda em voo.
 */
export function UploadingProvider({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const [uploads, setUploads] = React.useState<Set<string>>(new Set())

  const register = React.useCallback((key: string) => {
    setUploads((previous) => {
      if (previous.has(key)) return previous

      const next = new Set(previous)
      next.add(key)
      return next
    })
  }, [])

  const unregister = React.useCallback((key: string) => {
    setUploads((previous) => {
      if (!previous.has(key)) return previous

      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ register, unregister, isUploading: uploads.size > 0 }),
    [register, unregister, uploads.size],
  )

  return <UploadingContext value={value}>{children}</UploadingContext>
}

/**
 * Registra este campo como ocupado enquanto `active` for verdadeiro.
 *
 * Fora de um `UploadingProvider` não faz nada - o campo de upload continua
 * funcionando, só ninguém está perguntando se ele terminou.
 */
export function useRegisterUpload(active: boolean): void {
  const context = React.use(UploadingContext)
  const key = React.useId()

  React.useEffect(() => {
    if (!context) return

    if (active) context.register(key)
    if (!active) context.unregister(key)

    // Desmontar com um upload em voo tem de liberar o cadeado, senão o botão
    // de salvar fica travado para sempre.
    return () => context.unregister(key)
  }, [active, context, key])
}

/** Há upload em andamento? Use para desabilitar o botão de salvar. */
export function useIsUploading(): boolean {
  const context = React.use(UploadingContext)

  return context?.isUploading ?? false
}
