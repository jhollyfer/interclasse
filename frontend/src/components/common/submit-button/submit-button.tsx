import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useIsUploading } from '#/components/common/uploading-context'
import type { Merge } from '#/lib/merge'

type SubmitButtonProps = Readonly<
  Merge<
    React.ComponentProps<typeof Button>,
    {
      /** A mutation está em voo? Mostra o spinner e trava o botão. */
      isPending?: boolean
      children: React.ReactNode
    }
  >
>

/**
 * O botão de salvar de todo formulário do painel.
 *
 * Existe por um motivo só: ele trava sozinho enquanto há **upload** em
 * andamento. O anexo é enviado na escolha do arquivo, e o formulário só conhece
 * o `id` depois que o arquivo existe - salvar no meio manda um payload sem o
 * anexo, e o registro nasce sem imagem, sem erro nenhum que denuncie.
 *
 * Um componente e não duas linhas em cada tela porque é um formulário por
 * recurso - notícia, evento, podcast, vídeo, álbum, depoimento, usuário -, e
 * duas linhas repetidas sete vezes são sete chances de esquecer numa oitava.
 */
export function SubmitButton({
  isPending,
  disabled,
  children,
  ...props
}: SubmitButtonProps): React.JSX.Element {
  const isUploading = useIsUploading()

  return (
    <Button
      type="submit"
      disabled={disabled || isPending || isUploading}
      {...props}
    >
      {isPending && <Spinner className="size-4" />}
      {children}
    </Button>
  )
}
