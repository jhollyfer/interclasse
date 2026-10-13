import type { VariantProps } from 'class-variance-authority'

import type { badgeVariants } from '#/components/ui/badge'

import { SCHOOL_TIME_ZONE } from './constant'
import type {
  ActiveStatus,
  BracketStatus,
  Category,
  MatchPhase,
  MatchStatus,
  StorageMimetype,
  UploadStatus,
  UserRole,
} from './entity'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

/**
 * Os rótulos em português e as cores de cada enum do domínio.
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
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
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
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
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
  ADMINISTRATOR: 'Administrador',
  ADVISOR: 'Professor conselheiro',
  REPRESENTATIVE: 'Representante de turma',
} satisfies Record<UserRole, string>

export const USER_ROLE_VARIANTS: Record<string, BadgeVariant> = {
  ADMINISTRATOR: 'info',
  ADVISOR: 'success',
  REPRESENTATIVE: 'neutral',
} satisfies Record<UserRole, BadgeVariant>

export const CATEGORY_LABELS: Record<string, string | undefined> = {
  F1: 'Fundamental 1',
  F2: 'Fundamental 2',
} satisfies Record<Category, string>

/** A forma curta, para coluna de tabela e aba. */
export const CATEGORY_SHORT_LABELS: Record<string, string | undefined> = {
  F1: '3º ao 5º',
  F2: '6º ao 9º',
} satisfies Record<Category, string>

export const BRACKET_STATUS_LABELS: Record<string, string | undefined> = {
  KNOCKOUT: 'Em disputa',
  FINISHED: 'Encerrada',
} satisfies Record<BracketStatus, string>

export const BRACKET_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  KNOCKOUT: 'warning',
  FINISHED: 'success',
} satisfies Record<BracketStatus, BadgeVariant>

export const MATCH_PHASE_LABELS: Record<string, string | undefined> = {
  ROUND_OF_16: 'Oitavas',
  QUARTER: 'Quartas',
  SEMI: 'Semifinal',
  FINAL: 'Final',
} satisfies Record<MatchPhase, string>

export const MATCH_STATUS_LABELS: Record<string, string | undefined> = {
  SCHEDULED: 'A jogar',
  FINISHED: 'Encerrada',
} satisfies Record<MatchStatus, string>

export const MATCH_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  SCHEDULED: 'neutral',
  FINISHED: 'success',
} satisfies Record<MatchStatus, BadgeVariant>

/**
 * O estado de um arquivo na biblioteca.
 *
 * `PENDING` não é "aguardando aprovação": é upload que abriu e não confirmou, e
 * o arquivo não pode ser anexado a nada nesse estado. O rótulo diz isso, senão a
 * tela promete um arquivo que o backend recusa.
 */
export const UPLOAD_STATUS_LABELS: Record<string, string | undefined> = {
  PENDING: 'Incompleto',
  UPLOADED: 'Enviado',
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
  'image/jpeg': 'Imagem JPEG',
  'image/png': 'Imagem PNG',
  'image/webp': 'Imagem WebP',
  'image/gif': 'Imagem GIF',
  'image/svg+xml': 'Imagem SVG',
  'application/pdf': 'PDF',
  'audio/mpeg': 'Áudio MP3',
  'audio/mp4': 'Áudio MP4',
  'audio/ogg': 'Áudio OGG',
  'audio/wav': 'Áudio WAV',
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
 * Data no fuso do servidor, e não com `toLocaleString()` do navegador: o painel
 * renderiza no SSR, e a mesma data formatada em dois fusos é divergência de
 * hidratação na primeira renderização.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: SCHOOL_TIME_ZONE,
})

export function formatDate(value: string | null): string {
  if (!value) return '-'

  return DATE_FORMAT.format(new Date(value))
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
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`

  return `${(kb / 1024).toFixed(1)} MB`
}

/**
 * Concorda o substantivo com a contagem, e devolve os dois juntos.
 *
 * Existe porque a mesma condição estava escrita como ternário em sete telas -
 * `total === 1 ? '1 foto' : `${total} fotos`` - e a regra `no-ternary` do
 * `eslint.config.js` a proíbe. Escrever `if` em cada uma delas seria a mesma
 * duplicação com mais linhas.
 *
 * Português tem plural irregular demais para derivar do singular, então as duas
 * formas entram: `plural(3, 'foto', 'fotos')`. Quem precisa só do substantivo,
 * sem o número na frente, passa `withCount: false`.
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

  return `${count} ${word}`
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
