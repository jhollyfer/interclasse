import { linkOptions } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

/**
 * Os destinos do site, tipados contra a árvore de rotas.
 *
 * O `label` é a função da mensagem, chamada na tela: assim o texto acompanha o idioma.
 * Cabeçalho e rodapé desenham a **mesma** lista: escrevê-la duas vezes
 * garantiria que divergissem no dia em que uma tela mudar de endereço.
 */
const HOME = linkOptions({ to: '/', label: m.public_nav_home })

const GAMES = linkOptions({ to: '/jogos', label: m.public_nav_games })

const STANDINGS = linkOptions({
  to: '/classificacao',
  label: m.public_nav_standings,
})

const ANNOUNCEMENTS = linkOptions({
  to: '/avisos',
  label: m.public_nav_announcements,
})

const ABOUT = linkOptions({ to: '/sobre', label: m.public_nav_about })

const SIGN_IN = linkOptions({
  to: '/authentication',
  label: m.public_nav_sign_in,
})

export type MenuItem =
  | typeof HOME
  | typeof GAMES
  | typeof STANDINGS
  | typeof ANNOUNCEMENTS
  | typeof ABOUT
  | typeof SIGN_IN

export const NAVIGATION: ReadonlyArray<MenuItem> = [
  HOME,
  GAMES,
  STANDINGS,
  ANNOUNCEMENTS,
  ABOUT,
]

/** A porta do painel. Fica fora de `NAVIGATION`: é ação, e não destino de leitura. */
export const AUTHENTICATION = SIGN_IN
