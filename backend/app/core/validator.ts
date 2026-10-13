import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'
import env from '#start/env'
import type { Infer } from '@vinejs/vine/types'
import {
  ACTIVE_STATUSES,
  CATEGORIES,
  MATCH_PHASES,
  MATCH_STATUSES,
  SORT_DIRECTIONS,
  TRASHED_MODES,
} from '#core/entity'

/**
 * O `vine` configurado e o que é de todos os validators (_padroes/backend.md §4.4).
 *
 * Cada recurso tem o próprio `app/features/<módulo>/<recurso>/<recurso>.validator.ts`,
 * e importa daqui o `vine` - nunca de `@vinejs/vine` direto: é por este módulo
 * que as mensagens pt-BR e o transform de data valem em todo schema. Aqui ficam
 * só as regras usadas por dois ou mais recursos (como funções, para o
 * `optional()` de um validator não vazar para outro), `LIST_LIMITS`, os
 * validators globais e as mensagens.
 *
 * O gerador de OpenAPI resolve os validators pelo AST dos controllers, lendo o
 * especificador do import e reimportando o módulo. Renomear um export sem
 * atualizar o controller não quebra o build: a operação some do documento em
 * silêncio, e `node ace openapi:generate --check` é o que pega isso.
 */

export { vine }
export type { Infer }
/** Os erros do VineJS, para o `handler.ts` traduzir o 422 sem importar a lib direto. */
export { errors as vineErrors } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

/**
 * Datas validadas saem como `DateTime` do Luxon, prontas para o Lucid - e não
 * como o `Date` nativo, que o model teria de converter em cada caso de uso.
 */
VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * Regras reaproveitadas por mais de um recurso.
 *
 * São funções, não constantes: reaproveitar o mesmo nó de schema em dois
 * validators compartilharia as opções entre eles - o `optional()` de um
 * apareceria no outro.
 */

/**
 * Quantos itens cada lista aceita.
 *
 * Sem teto, `vine.array()` aceita o array que couber no corpo da requisição, e
 * o que chega vai inteiro para o banco.
 */
export const LIST_LIMITS = {
  /** Atletas de uma turma numa modalidade. Nenhuma modalidade escolar inscreve mais. */
  ATHLETES: 40,
} as const

export function email() {
  return vine.string().email().maxLength(254)
}

/**
 * Força da senha: um `regex` por classe de caractere, para a mensagem apontar
 * exatamente o que falta em vez de um "senha fraca" que não diz o que fazer.
 *
 * `confirmed` exige `passwordConfirmation` com o mesmo valor, lido do input
 * cru. Nenhum schema daqui o declara, e é só por isso que ele não aparece no
 * payload validado - não há o que descartar antes do `merge()`/`create()` no
 * use-case. O que o VineJS entrega é o que o schema declara.
 */
export function password() {
  return vine
    .string()
    .minLength(8)
    .maxLength(32)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/)
    .confirmed({ as: 'passwordConfirmation' })
}

/**
 * Status de conta. Canônico em inglês: o valor é identificador, e o rótulo em
 * português é do frontend.
 */
export function activeStatus() {
  return vine.enum(ACTIVE_STATUSES)
}

/**
 * Os três campos que toda listagem aceita. Espalhados
 * (`...paginationFields()`) pelos validators que ainda somam um filtro
 * próprio, para o teto de `perPage` viver num lugar só - repetido à mão em
 * cada recurso, é uma divergência esperando acontecer.
 */
export function paginationFields() {
  return {
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    search: vine.string().maxLength(100).optional(),
  }
}

/**
 * O recorte de lixeira, para as listagens que têm o que restaurar.
 *
 * Fora de `paginationFields()` de propósito: se estivesse lá, apareceria também
 * nas listagens da vitrine, que nunca enxergam registro arquivado. O parâmetro
 * seria aceito, ignorado em silêncio, e o documento OpenAPI passaria a prometer
 * um filtro que não existe.
 */
export function trashedField() {
  return { trashed: vine.enum(TRASHED_MODES).optional() }
}

/**
 * A ordem de uma listagem, em dois campos: `sort` (a coluna) e `direction`.
 *
 * **Um par, e não um `order-<coluna>` por coluna.** Dois parâmetros de ordem ao
 * mesmo tempo não expressam precedência - `?order-title=asc&order-date=desc`
 * não diz qual vence -, e a consulta ordena por uma coluna só.
 *
 * **A coluna vem de uma lista fechada, declarada por recurso.** O valor entra
 * direto no `orderBy`, que o compõe no SQL: aceitar texto livre da URL seria
 * entregar a cláusula ao cliente. Coluna fora da lista é 422 apontando o campo,
 * e não um 500 do banco reclamando de coluna inexistente.
 *
 * Fora de `paginationFields()` pelo mesmo motivo de `trashedField()`: cada
 * recurso ordena pelo que tem, e um conjunto global prometeria no OpenAPI
 * colunas que metade das listagens não conhece.
 */
export function sortFields<const TColumns extends readonly [string, ...string[]]>(
  columns: TColumns
) {
  return {
    sort: vine.enum(columns).optional(),
    direction: vine.enum(SORT_DIRECTIONS).optional(),
  }
}

/**
 * O identificador na URL. Vale para todo recurso: a PK é uuid em toda tabela.
 *
 * Existe para que um `:id` malformado seja 422 apontando o campo, e não um 500
 * do Postgres recusando o literal na cláusula `where`.
 */
export const IdentifierValidator = vine.create({
  id: vine.string().uuid(),
})

export const PaginationValidator = vine.create(vine.object(paginationFields()))

/**
 * A paginação dos recursos que têm lixeira. É o `PaginationValidator` mais o
 * `trashed`, e existe como schema próprio porque as listagens da vitrine
 * seguem sem ele.
 */
export const TrashablePaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
})

export type IdentifierPayload = Infer<typeof IdentifierValidator>

export type PaginationPayload = Infer<typeof PaginationValidator>

export type TrashablePaginationPayload = Infer<typeof TrashablePaginationValidator>

/**
 * Os tipos aceitos, e a extensão que cada um ganha na chave do objeto.
 *
 * O mapa existe porque o nome que o usuário enviou **não** é fonte confiável de
 * extensão - ele é rótulo, e `foto.png` pode ser um pdf. A extensão da chave
 * sai do `mimetype` declarado, que é o mesmo valor com que a URL é assinada e
 * que o bucket devolve na confirmação.
 *
 * `Record<StorageMimetype, string>` faz o compilador cobrar uma entrada por
 * tipo: acrescentar um mimetype na lista sem dizer que extensão ele tem quebra
 * a compilação, em vez de virar arquivo sem extensão no bucket.
 *
 * Áudio e vídeo entram porque o domínio os tem: um podcast guarda o arquivo de
 * áudio, e o `mp3` é o formato que `backend-old` já recebia.
 */
export const STORAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // `image/svg+xml` saiu da lista: SVG é HTML, carrega `<script>`, e o bucket é
  // público - `storage.service.ts` devolve a URL assinada com o `contentType`
  // gravado, então o navegador o executa na origem do storage. Era XSS
  // armazenado por upload. O academy já não o aceitava.
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
] as const

export type StorageMimetype = (typeof STORAGE_MIMETYPES)[number]

export const STORAGE_EXTENSIONS: Record<StorageMimetype, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

/**
 * O teto por arquivo, em bytes. Vem do ambiente e não tem default: sem a
 * variável a aplicação nem sobe (`start/env.ts`). A coluna `size` é
 * `bigint` justamente para não impor aqui um teto que o operador não pediu.
 */
export const UPLOAD_MAX_SIZE = env.get('UPLOAD_MAX_SIZE')

/** Os filtros da tabela de jogos, iguais no painel e no site. */
export function matchFilterFields() {
  return {
    bracketId: vine.string().uuid().optional(),
    sportId: vine.string().uuid().optional(),
    category: vine.enum(CATEGORIES).optional(),
    phase: vine.enum(MATCH_PHASES).optional(),
    status: vine.enum(MATCH_STATUSES).optional(),
  }
}

/** A lista de atletas de uma modalidade, inteira: substitui a anterior. */
export function athleteListFields() {
  return {
    sportId: vine.string().uuid(),
    studentIds: vine.array(vine.string().uuid()).distinct().maxLength(LIST_LIMITS.ATHLETES),
  }
}

/**
 * O identificador público de uma modalidade. O teto de 255 é o da coluna - sem
 * ele, uma URL absurdamente longa viraria uma consulta ao banco.
 */
export const SlugValidator = vine.create({
  slug: vine.string().trim().minLength(1).maxLength(255),
})

export type SlugPayload = Infer<typeof SlugValidator>

/*
|--------------------------------------------------------------------------
| Mensagens de validação
|--------------------------------------------------------------------------
|
| Sem isto o VineJS responde no default em inglês, e a 422 sai bilíngue: o
| envelope de `app/exceptions/handler.ts` é português ("Dados inválidos") e os
| valores de `errors` sairiam em inglês, porque o handler copia a mensagem
| verbatim. Todo erro de negócio dos use-cases já é pt-BR - só o erro de
| validação, que é o mais frequente, destoaria.
|
| Duas armadilhas, se for mexer:
|
| - `FIELD_LABELS` troca só o `{{ field }}` **exibido**. A chave do erro segue
|   sendo o nome do campo (`avatarId`), e é ela que o frontend usa para marcar
|   o input certo. Renomear chave quebra o formulário.
| - Não configure `vine.errorReporter`. O handler depende do formato de array
|   `{ field, rule, message }` do `SimpleErrorReporter`.
|
*/

/**
 * O nome amigável de cada campo, na forma que cai bem depois de "Informe".
 *
 * É exportado, e não escrito direto na chamada abaixo, porque
 * `tests/functional/validator.spec.ts` precisa importá-lo pelo nome - sem
 * depender da ordem dos argumentos do `SimpleMessagesProvider`. Esse mesmo
 * teste cobra rótulo para todo campo dos validators e acusa rótulo órfão, então
 * campo novo em `#core/validator` nasce vermelho até entrar aqui.
 */
export const FIELD_LABELS = {
  // Identidade e conta
  name: 'o nome',
  email: 'o e-mail',
  password: 'a senha',
  passwordConfirmation: 'a confirmação da senha',
  currentPassword: 'a senha atual',
  role: 'o papel',
  status: 'o status',
  avatarId: 'o avatar',
  id: 'o identificador',

  // Turma e aluno
  grade: 'o ano',
  category: 'a categoria',
  advisorId: 'o professor conselheiro',
  representativeId: 'o aluno representante',
  classroomId: 'a turma',

  // Modalidade e inscrição
  slug: 'o slug',
  minAthletes: 'o mínimo de atletas',
  maxAthletes: 'o máximo de atletas',
  sportId: 'a modalidade',
  studentIds: 'os atletas',

  // Aviso
  title: 'o título',
  body: 'o texto',
  pinned: 'o destaque',

  // Chave e partida
  bracketId: 'a chave',
  phase: 'a fase',
  scheduledAt: 'a data e hora',
  location: 'o local',
  homeScore: 'o placar do mandante',
  awayScore: 'o placar do visitante',
  winnerTeamId: 'o vencedor',

  // Arquivo. Estes não passam por formulário do painel.
  fileName: 'o nome do arquivo',
  mimetype: 'o tipo do arquivo',
  size: 'o tamanho',
  parts: 'as partes',
  partNumber: 'o número da parte',
  etag: 'o ETag',

  // Listagem
  page: 'a página',
  perPage: 'o total por página',
  search: 'a busca',
  sort: 'a ordenação',
  direction: 'a direção da ordenação',
  trashed: 'o filtro de arquivados',
}

/**
 * A frase de cada regra de validação.
 *
 * É exportado pelo mesmo motivo de `FIELD_LABELS`:
 * `tests/functional/mensagens.spec.ts` precisa importá-lo pelo nome para cobrar
 * que toda regra usada pelos validators tenha tradução e que nenhuma frase
 * tenha escapado em inglês.
 */
export const RULE_MESSAGES = {
  // Genéricas
  // O `{{ field }}` só aparece onde a frase começa por verbo. Os rótulos
  // carregam artigo ("o resumo"), então campo no início da frase sairia em
  // minúscula, e `'em {{ field }}'` sairia como "em a senha". Nas demais
  // regras o nome é omitido: o erro é renderizado sob o campo rotulado, e na
  // API vem indexado pelo nome dele.
  'required': 'Informe {{ field }}',
  'string': 'Informe {{ field }}',
  'enum': 'Selecione {{ field }}',
  'email': 'Informe um e-mail válido',
  'number': 'Informe um número válido',
  'boolean': 'Informe verdadeiro ou falso',
  'array': 'Informe uma lista',
  'object': 'Informe um objeto',
  'uuid': 'Selecione uma opção válida',
  'url': 'Informe um link válido',
  'minLength': 'Informe ao menos {{ min }} caracteres',
  'maxLength': 'Informe no máximo {{ max }} caracteres',
  'min': 'Informe um valor maior ou igual a {{ min }}',
  'max': 'Informe um valor menor ou igual a {{ max }}',
  'positive': 'Informe um valor maior que zero',
  'withoutDecimals': 'Informe um número inteiro',
  'array.maxLength': 'Informe no máximo {{ max }} itens',

  // Senha
  // Os quatro `.regex()` de `password()` reportam todos a chave
  // `password.regex`, e o VineJS para na primeira que falha - não há como dar
  // uma mensagem por classe de caractere. Daí a mensagem combinada.
  'password.regex': 'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
  'password.minLength': 'A senha deve ter ao menos {{ min }} caracteres',
  'password.maxLength': 'A senha deve ter no máximo {{ max }} caracteres',
  // `confirmed` roda em `password` mas reporta em `passwordConfirmation`.
  'passwordConfirmation.confirmed': 'As senhas não são iguais',
}

vine.messagesProvider = new SimpleMessagesProvider(RULE_MESSAGES, FIELD_LABELS)
