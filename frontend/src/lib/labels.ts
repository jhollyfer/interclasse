import type { VariantProps } from 'class-variance-authority'
import type {
  ActiveStatus,
  BracketStatus,
  CardColor,
  Category,
  MatchPhase,
  MatchStatus,
  PhotoStatus,
  StorageMimetype,
  UploadStatus,
  UserRole,
} from '@interclasse/shared'

import type { badgeVariants } from '#/components/ui/badge'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import { SCHOOL_TIME_ZONE, formatNumber } from './i18n'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

/**
 * Os rótulos (no idioma da tela, lidos a cada acesso) e as cores de cada enum do
 * domínio. Cada rótulo é um `get` que chama `m.*()`: `LABELS[valor]` continua
 * sendo a forma de uso e devolve o texto do idioma atual.
 *
 * Separado de `validator.ts` de propósito: lá é o contrato com a API, e o valor
 * do enum é identificador, não texto de interface. Aqui é apresentação.
 *
 * Lookup object e não `if` espalhado por tela - e o mesmo objeto alimenta três
 * coisas: as `<option>` do formulário, o texto da tabela e a variante do
 * `Badge`.
 *
 * A chave é `string` e o valor pode faltar porque o status chega da API como
 * `string` larga. O `satisfies` é o que mantém a cobrança de ter todos: valor
 * novo no enum sem rótulo aqui não compila. O acesso é sempre
 * `LABELS[valor] ?? valor`, que mostra o identificador cru em vez de quebrar.
 */
export const ACTIVE_STATUS_LABELS: Record<string, string | undefined> = {
  get ACTIVE() {
    return m.label_active_status_active()
  },
  get INACTIVE() {
    return m.label_active_status_inactive()
  },
} satisfies Record<ActiveStatus, string>

export const ACTIVE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
} satisfies Record<ActiveStatus, BadgeVariant>

/**
 * O mesmo enum, na concordância de quem fala de pessoa: a conta é "Ativo", a
 * categoria é "Ativa". São dois rótulos que diferem só pela vogal, e é por isso
 * que o backend guarda o valor em inglês.
 */
export const ACCOUNT_STATUS_LABELS: Record<string, string | undefined> = {
  get ACTIVE() {
    return m.label_account_status_active()
  },
  get INACTIVE() {
    return m.label_account_status_inactive()
  },
} satisfies Record<ActiveStatus, string>

/**
 * A cor sólida do status, para a bolinha do formulário.
 *
 * Separada de `*_VARIANTS`, que é o par fundo-pálido/tinta-escura do `Badge`: o
 * fundo pálido em 8px no meio de um campo branco não se enxerga. A bolinha usa a
 * **tinta** do mesmo par, que é sólida e sobrevive ao tamanho.
 */
export const ACTIVE_STATUS_DOTS: Record<string, string | undefined> = {
  ACTIVE: 'bg-badge-success-foreground',
  INACTIVE: 'bg-muted-foreground',
} satisfies Record<ActiveStatus, string>

/** Um papel por responsabilidade nos jogos. */
export const USER_ROLE_LABELS: Record<string, string | undefined> = {
  get ADMINISTRATOR() {
    return m.label_role_administrator()
  },
  get ADVISOR() {
    return m.label_role_advisor()
  },
  get REPRESENTATIVE() {
    return m.label_role_representative()
  },
} satisfies Record<UserRole, string>

export const USER_ROLE_VARIANTS: Record<string, BadgeVariant> = {
  ADMINISTRATOR: 'info',
  ADVISOR: 'success',
  REPRESENTATIVE: 'neutral',
} satisfies Record<UserRole, BadgeVariant>

export const CATEGORY_LABELS: Record<string, string | undefined> = {
  get F1() {
    return m.label_category_f1()
  },
  get F2() {
    return m.label_category_f2()
  },
} satisfies Record<Category, string>

/** A forma curta, para coluna de tabela e aba. */
export const CATEGORY_SHORT_LABELS: Record<string, string | undefined> = {
  get F1() {
    return m.label_category_short_f1()
  },
  get F2() {
    return m.label_category_short_f2()
  },
} satisfies Record<Category, string>

export const BRACKET_STATUS_LABELS: Record<string, string | undefined> = {
  get KNOCKOUT() {
    return m.label_bracket_status_knockout()
  },
  get FINISHED() {
    return m.label_bracket_status_finished()
  },
} satisfies Record<BracketStatus, string>

export const BRACKET_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  KNOCKOUT: 'warning',
  FINISHED: 'success',
} satisfies Record<BracketStatus, BadgeVariant>

export const PHOTO_STATUS_LABELS: Record<string, string | undefined> = {
  get PENDING() {
    return m.label_photo_status_pending()
  },
  get APPROVED() {
    return m.label_photo_status_approved()
  },
  get REJECTED() {
    return m.label_photo_status_rejected()
  },
} satisfies Record<PhotoStatus, string>

export const PHOTO_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
} satisfies Record<PhotoStatus, BadgeVariant>

export const MATCH_PHASE_LABELS: Record<string, string | undefined> = {
  get ROUND_OF_16() {
    return m.label_match_phase_round_of_16()
  },
  get QUARTER() {
    return m.label_match_phase_quarter()
  },
  get SEMI() {
    return m.label_match_phase_semi()
  },
  get FINAL() {
    return m.label_match_phase_final()
  },
} satisfies Record<MatchPhase, string>

export const MATCH_STATUS_LABELS: Record<string, string | undefined> = {
  get SCHEDULED() {
    return m.label_match_status_scheduled()
  },
  get FINISHED() {
    return m.label_match_status_finished()
  },
} satisfies Record<MatchStatus, string>

export const MATCH_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  SCHEDULED: 'neutral',
  FINISHED: 'success',
} satisfies Record<MatchStatus, BadgeVariant>

export const CARD_COLOR_LABELS: Record<string, string | undefined> = {
  get YELLOW() {
    return m.label_card_color_yellow()
  },
  get RED() {
    return m.label_card_color_red()
  },
} satisfies Record<CardColor, string>

/** A cor do próprio cartão, para o retângulo que o representa na tela. */
export const CARD_COLOR_CLASSES: Record<string, string | undefined> = {
  YELLOW: 'bg-yellow-400',
  RED: 'bg-red-600',
} satisfies Record<CardColor, string>

/**
 * O estado de um arquivo na biblioteca.
 *
 * `PENDING` não é "aguardando aprovação": é upload que abriu e não confirmou, e
 * o arquivo não pode ser anexado a nada nesse estado. O rótulo diz isso, senão a
 * tela promete um arquivo que o backend recusa.
 */
export const UPLOAD_STATUS_LABELS: Record<string, string | undefined> = {
  get PENDING() {
    return m.label_upload_status_pending()
  },
  get UPLOADED() {
    return m.label_upload_status_uploaded()
  },
} satisfies Record<UploadStatus, string>

export const UPLOAD_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  UPLOADED: 'success',
} satisfies Record<UploadStatus, BadgeVariant>

export const UPLOAD_STATUS_DOTS: Record<string, string | undefined> = {
  PENDING: 'bg-badge-warning-foreground',
  UPLOADED: 'bg-badge-success-foreground',
} satisfies Record<UploadStatus, string>

/**
 * O tipo de um arquivo, na forma como se fala dele.
 *
 * "JPEG" e não "image/jpeg": o mimetype é identificador de protocolo, e quem
 * escolhe um filtro procura o formato, não o cabeçalho HTTP. O valor cru
 * continua sendo o que viaja na URL e no corpo.
 */
export const STORAGE_MIMETYPE_LABELS: Record<string, string | undefined> = {
  get 'image/jpeg'() {
    return m.label_mimetype_jpeg()
  },
  get 'image/png'() {
    return m.label_mimetype_png()
  },
  get 'image/webp'() {
    return m.label_mimetype_webp()
  },
  get 'image/gif'() {
    return m.label_mimetype_gif()
  },
  get 'application/pdf'() {
    return m.label_mimetype_pdf()
  },
  get 'audio/mpeg'() {
    return m.label_mimetype_mp3()
  },
  get 'audio/mp4'() {
    return m.label_mimetype_mp4()
  },
  get 'audio/ogg'() {
    return m.label_mimetype_ogg()
  },
  get 'audio/wav'() {
    return m.label_mimetype_wav()
  },
} satisfies Record<StorageMimetype, string>

/**
 * As iniciais de um nome, para o avatar sem imagem.
 *
 * Primeira letra do primeiro nome e do último. **Nome de uma palavra só devolve
 * uma inicial**: repetir a primeira como sobrenome sairia "MM" para "Matheus".
 *
 * Nome ausente devolve string vazia, e não um "?": quem quiser um marcador
 * escreve `initials(nome) || '?'` - o fallback é decisão da tela, e o
 * `AvatarFallback` já sabe ficar vazio.
 */
export function initials(name: string | undefined | null): string {
  if (!name?.trim()) return ''

  const parts = name.trim().split(/\s+/)
  const first = parts.at(0)?.at(0) ?? ''

  let last = ''
  if (parts.length > 1) last = parts.at(-1)?.at(0) ?? ''

  return first.concat(last).toUpperCase()
}

/**
 * O formatador de data no idioma atual e no fuso da escola. Montado a cada uso
 * porque o idioma muda com a URL; o `Intl` guarda o cache dos dados por dentro.
 */
function schoolFormat(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(getLocale(), {
    ...options,
    timeZone: SCHOOL_TIME_ZONE,
  })
}

/**
 * Data no fuso do servidor, e não com `toLocaleString()` do navegador: o painel
 * renderiza no SSR, e a mesma data formatada em dois fusos é divergência de
 * hidratação na primeira renderização.
 */
export function formatDate(value: string | null): string {
  if (!value) return '-'

  return schoolFormat({ dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}

/** "08:30", ou o relógio vazio de quem ainda não tem horário. */
export function formatTime(value: string | null): string {
  if (!value) return '--:--'

  return schoolFormat({ hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

/** "sexta-feira, 16 de outubro": o título de um dia da agenda. */
export function formatDay(value: string): string {
  return schoolFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}

/** `en-CA` porque escreve a data como `2026-10-16`, que serve de chave. */
const DAY_KEY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: SCHOOL_TIME_ZONE,
})

/** O dia no relógio da escola, `AAAA-MM-DD`: agrupa jogos do mesmo dia. */
export function formatDayKey(value: string): string {
  return DAY_KEY_FORMAT.format(new Date(value))
}

/** "sex., 16/10, 08:30", ou o aviso de que o horário ainda não saiu. */
export function formatWhen(value: string | null): string {
  if (!value) return m.label_when_undefined()

  return schoolFormat({
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const ZONE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: SCHOOL_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Quanto o relógio da escola está à frente do UTC naquele instante, em ms. */
function schoolOffset(instant: number): number {
  const part = (type: string) =>
    Number(
      ZONE_PARTS.formatToParts(instant).find((item) => item.type === type)
        ?.value,
    )
  const wall = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
  )

  return wall - Math.floor(instant / 60_000) * 60_000
}

/**
 * ISO da API para o valor de um `datetime-local`, no relógio da ESCOLA.
 *
 * Não no do navegador: quem agenda de outro fuso (o Acre, o interior do
 * Amazonas) digitava 08:30 e a tabela mostrava 09:30, porque a exibição já era
 * no fuso da escola e a entrada não.
 */
export function toSchoolInput(value: string | null): string {
  if (!value) return ''

  const instant = new Date(value).getTime()

  return new Date(instant + schoolOffset(instant)).toISOString().slice(0, 16)
}

/** O inverso: `2026-12-14T08:30` no relógio da escola para ISO. */
export function fromSchoolInput(value: string): string {
  const wall = Date.parse(value.concat(':00Z'))

  return new Date(wall - schoolOffset(wall)).toISOString()
}

/**
 * O tamanho de um arquivo em unidade legível.
 *
 * Base 1024 e uma casa decimal, que é o que o `backend` conta em
 * `UPLOAD_MAX_SIZE` e o que os gerenciadores de arquivo mostram. Para de subir
 * em MB de propósito: o teto por arquivo do projeto está longe do gigabyte, e
 * uma unidade que nunca aparece é um ramo que nunca é exercido.
 *
 * Mora aqui, e não na fila de upload que a estreou: a biblioteca de arquivos
 * mostra o mesmo número na coluna e no detalhe, e duas implementações
 * divergiriam na primeira mudança de arredondamento.
 */
/** Uma casa decimal fixa: "1,5 MB", e não "1,5 MB" num tamanho e "2 MB" no outro. */
const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${formatNumber(kb, ONE_DECIMAL)} KB`

  return `${formatNumber(kb / 1024, ONE_DECIMAL)} MB`
}

/**
 * Concorda o substantivo com a contagem, e devolve os dois juntos.
 *
 * Existe porque a mesma condição estava escrita como ternário em sete telas -
 * `total === 1 ? '1 foto' : `${total} fotos`` - e a regra `no-ternary` do
 * `eslint.config.js` a proíbe. Escrever `if` em cada uma delas seria a mesma
 * duplicação com mais linhas.
 *
 * Plural irregular não se deriva do singular, então as duas formas entram, já
 * traduzidas pelo chamador: `plural(3, m.photo_one(), m.photo_other())`. Frase
 * inteira com contagem é uma mensagem com variante de plural, não esta função.
 * Quem precisa só do substantivo, sem o número na frente, passa `withCount: false`.
 */
export function plural(
  count: number,
  singular: string,
  plural_: string,
  { withCount = true }: { withCount?: boolean } = {},
): string {
  let word = plural_
  if (count === 1) word = singular

  if (!withCount) return word

  return `${formatNumber(count)} ${word}`
}

/** A turma campeã: quem venceu a final. Nula enquanto a final não acontece. */
export function championName(bracket: {
  championTeamId: string | null
  matches: ReadonlyArray<{
    homeTeamId: string | null
    awayTeamId: string | null
    homeName: string | null
    awayName: string | null
  }>
}): string | null {
  if (!bracket.championTeamId) return null

  // Qualquer jogo da campeã serve: o nome é o mesmo em todos.
  const match = bracket.matches.find(
    (item) =>
      item.homeTeamId === bracket.championTeamId ||
      item.awayTeamId === bracket.championTeamId,
  )
  if (!match) return null
  if (match.homeTeamId === bracket.championTeamId) return match.homeName

  return match.awayName
}
