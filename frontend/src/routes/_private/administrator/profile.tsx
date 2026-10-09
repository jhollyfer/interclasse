import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * O endereço que o frontend anterior servia, apontado para onde a tela mora
 * hoje.
 *
 * No `frontend-old` a própria conta era `/administrator/profile`; aqui ela é
 * `/profile`, como na referência. Quem tem o endereço antigo salvo, no
 * favorito ou num link colado em algum lugar, chegaria a um 404 - e um 404
 * numa rota que existia é indistinguível de painel quebrado.
 *
 * `beforeLoad` e não `component`: o redirecionamento acontece antes de montar
 * qualquer coisa, então não pisca uma tela vazia no caminho. Sem `component`
 * porque nada chega a renderizar.
 */
export const Route = createFileRoute('/_private/administrator/profile')({
  beforeLoad: () => {
    throw redirect({ to: '/profile' })
  },
})
