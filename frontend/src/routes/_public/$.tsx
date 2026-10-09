import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'

/**
 * O endereço público que não existe (VI-05).
 *
 * O `defaultNotFoundComponent` do `router.tsx` desenha a mesma tela, e desenha
 * **fora** de qualquer casca: um endereço que não casa com rota nenhuma nunca
 * chega ao `_public`, então o cabeçalho e o rodapé da vitrine não estão
 * montados quando ele responde. Quem erra o endereço fica sem menu, sem marca
 * e sem rodapé - sem saída que não seja o botão de voltar.
 *
 * Esta rota-curinga é o que traz a tela para dentro da casca: `$` casa com o
 * que sobrou, e por ser filha de `_public` ela vem com cabeçalho e rodapé. O
 * botão continua indo para a home, que é a saída certa para quem estava na
 * vitrine.
 *
 * **Sem arquivo `.lazy`, e é decisão**: a tela é um componente que já está no
 * pacote - dividi-la em duas requisições custaria uma ida ao servidor para
 * carregar seis linhas.
 *
 * `noindex` porque o endereço não existe: sem ele o buscador guardaria a URL
 * errada com uma resposta de sucesso.
 */
export const Route = createFileRoute('/_public/$')({
  head: () => ({
    meta: [
      { title: 'Página não encontrada | Jogos Estudantis' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  // `min-h` menor que o padrão: dentro da casca a tela divide a altura com o
  // cabeçalho e o rodapé, e `min-h-dvh` empurraria o rodapé para fora da
  // primeira dobra.
  component: () => <NotFoundPage className="min-h-[60dvh]" />,
})
