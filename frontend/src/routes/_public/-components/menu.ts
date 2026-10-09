import { linkOptions } from '@tanstack/react-router'

/**
 * Os destinos do site, tipados contra a árvore de rotas.
 *
 * Cabeçalho e rodapé desenham a **mesma** lista: escrevê-la duas vezes
 * garantiria que divergissem no dia em que uma tela mudar de endereço.
 */
const HOME = linkOptions({ to: '/', label: 'Início' })

const GAMES = linkOptions({ to: '/jogos', label: 'Jogos' })

const STANDINGS = linkOptions({ to: '/classificacao', label: 'Classificação' })

const ANNOUNCEMENTS = linkOptions({ to: '/avisos', label: 'Avisos' })

const SIGN_IN = linkOptions({ to: '/authentication', label: 'Entrar' })

export type MenuItem =
  | typeof HOME
  | typeof GAMES
  | typeof STANDINGS
  | typeof ANNOUNCEMENTS
  | typeof SIGN_IN

export const NAVIGATION: ReadonlyArray<MenuItem> = [
  HOME,
  GAMES,
  STANDINGS,
  ANNOUNCEMENTS,
]

/** A porta do painel. Fica fora de `NAVIGATION`: é ação, e não destino de leitura. */
export const AUTHENTICATION = SIGN_IN
