/**
 * A trilha do painel, derivada das rotas que casaram.
 *
 * Das rotas, e não do `location.pathname` sozinho, por um motivo só: um caminho
 * partido em segmentos produz destinos que não existem, e um link para eles
 * levaria a 404. O conjunto de `pathname` das rotas casadas responde quais
 * prefixos são navegáveis de verdade, então só esses viram link.
 *
 * Mora fora de `routes/` para poder ser testado sem que o gerador da árvore
 * trate o arquivo de teste como uma rota - mesmo motivo de `list-search.ts`.
 */

export type Crumb = {
  label: string
  /** Ausente quando o prefixo não é uma rota, ou quando é a página atual. */
  to?: string
}

/**
 * O rótulo de cada segmento fixo do caminho. Lookup object pelo mesmo motivo de
 * `labels.ts`: segmento novo sem rótulo aqui aparece cru, e não some.
 *
 * Os seis recursos do Ciclo 2 já estão na lista. Rótulo de segmento não custa
 * rota nenhuma - ele só é lido quando o caminho existe -, e escrevê-los agora
 * evita que a tela de chaves nasça com "brackets" na trilha.
 */
const SEGMENT_LABELS: Record<string, string | undefined> = {
  administrator: 'Painel',
  profile: 'Perfil',
  brackets: 'Chaves',
  matches: 'Partidas',
  classrooms: 'Turmas',
  sports: 'Modalidades',
  announcements: 'Avisos',
  users: 'Usuários',
  advisor: 'Minhas turmas',
  representative: 'Atletas da turma',
  new: 'Novo',
  edit: 'Editar',
}

function segments(path: string): Array<string> {
  return path.split('/').filter(Boolean)
}

/** O que o roteador chama de match, reduzido ao que a trilha precisa. */
export type BreadcrumbMatch = {
  /** Com os parâmetros por preencher: `/administrator/testimonials/$id`. */
  fullPath: string
  /** Com os parâmetros preenchidos: `/administrator/testimonials/abc-123`. */
  pathname: string
}

/**
 * `fullPath` e `pathname` andam em paralelo: o primeiro diz se o segmento é
 * parâmetro (`$id`) e o segundo diz o valor dele. É o par que permite rotular
 * "Detalhe" onde há um uuid, em vez de imprimir o uuid na trilha.
 */
export function buildBreadcrumbs(
  matches: ReadonlyArray<BreadcrumbMatch>,
): Array<Crumb> {
  const last = matches.at(-1)

  if (!last) return []

  const navigable = new Set(
    matches.map((match) => match.pathname.replace(/\/$/, '')),
  )

  const pattern = segments(last.fullPath)
  const actual = segments(last.pathname)
  const crumbs: Array<Crumb> = []

  for (const [index, value] of actual.entries()) {
    const token = pattern[index] ?? value
    const to = '/'.concat(actual.slice(0, index + 1).join('/'))

    let label = SEGMENT_LABELS[token] ?? value

    // Parâmetro de identificador: o uuid não diz nada a quem lê.
    if (token.startsWith('$')) label = 'Detalhe'

    const crumb: Crumb = { label }

    // A página atual nunca é link, e prefixo que não casou com rota nenhuma
    // também não.
    if (index < actual.length - 1 && navigable.has(to)) crumb.to = to

    crumbs.push(crumb)
  }

  return crumbs
}

/**
 * O título da aba no painel, tirado da mesma trilha: do mais específico para o
 * mais geral, "Detalhe · Chaves". O "Painel" da raiz só aparece sozinho - em
 * toda aba ele seria ruído, e é a parte que some quando a aba encolhe.
 */
export function breadcrumbTitle(crumbs: ReadonlyArray<Crumb>): string {
  const labels = crumbs.map((crumb) => crumb.label)
  // "Detalhe" no meio ("Editar · Detalhe · Avisos") não diz nada; só vale
  // quando é a própria página.
  // O "Painel" da raiz sai; a raiz de outro papel ("Minhas turmas") fica, ou
  // a aba do conselheiro diria só "Detalhe".
  let start = 0
  if (labels[0] === 'Painel') start = 1
  const specific = labels
    .slice(start)
    .filter(
      (label, index, all) => label !== 'Detalhe' || index === all.length - 1,
    )

  if (specific.length === 0) return labels.join('')

  return specific.reverse().join(' · ')
}
