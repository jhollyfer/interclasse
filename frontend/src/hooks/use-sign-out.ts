import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { useAuthenticationSignOut } from '#/integrations/tanstack-query/mutations'

/**
 * Sair do painel: encerra a sessão, esvazia o cache e volta para a entrada.
 *
 * Hook e não markup repetido porque a saída fica em **dois** lugares - o menu
 * do avatar no cabeçalho e o pé da barra lateral -, e a parte delicada é a
 * ordem das três coisas abaixo. Escrita duas vezes, bastava uma delas envelhecer
 * para a segunda saída deixar rastro da sessão anterior.
 *
 * Devolve a mutation inteira: quem chama precisa de `isPending` para desabilitar
 * o próprio botão.
 */
export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useAuthenticationSignOut({
    // `onSettled` e não `onSuccess`: se o token de acesso já expirou, o endpoint
    // responde 401 e a sessão morre do mesmo jeito - o que sobrar vence
    // sozinho. Limpar o cache só no sucesso deixaria o nome do usuário anterior
    // no cabeçalho de quem entrar depois.
    async onSettled() {
      // O cache inteiro, e não só `account`: o painel, as listagens e as fichas
      // são todos dados de uma sessão que acabou de deixar de existir.
      queryClient.clear()

      // Depois de limpar, e não antes: navegar primeiro remonta o guard de
      // `_private` sobre um cache que ainda tem a sessão velha, e ele deixaria
      // passar.
      await router.navigate({ to: '/authentication' })
    },
  })
}
