# Luxon

> Conferido em 2026-10-14 contra as 14 páginas do manual (versão `.md` servida pelo próprio site em
> `https://moment.github.io/luxon/docs/<página>.md`, a mesma pasta `docs/` do repositório
> `moment/luxon`), contra a referência da API (`api-docs/index.html`, aberta e lida por âncora) e
> contra o tipo publicado: `luxon@3.7.2` (JS, sem tipo próprio) e `@types/luxon@3.7.6`
> (`npm pack` + `.d.ts`). Comportamento de zona, locale e `throwOnInvalid` rodado em Node 22.
>
> **Não existe página de FAQ.** O sumário do site (`docs/_sidebar.md`) lista só as páginas abaixo;
> `docs/faq.md` responde 404. **Os tipos são de terceiros** (DefinitelyTyped): `@types/luxon` vai em
> `devDependencies` e a versão acompanha a do `luxon`.

Biblioteca de data e hora imutável sobre o `Intl` nativo: `DateTime` (um instante com zona e
locale), `Duration` (quantidade de tempo), `Interval` (trecho semiaberto entre dois `DateTime`),
`Info` (listas e capacidades do ambiente) e `Settings` (padrões globais).

**O que é:** um invólucro do `Date` com API explícita e encadeável, do projeto Moment. Todo método
que "muda" devolve uma instância nova. Zona IANA, locale BCP 47, sistema de numeração e calendário
de saída são propriedades do `DateTime`; a tradução e o fuso vêm do `Intl` do ambiente, não de
tabela embutida.

**Para que serve:** criar, converter, comparar, somar e formatar data e hora com zona explícita e no
idioma da requisição, e transportar o instante como ISO 8601 entre banco, API e frontend. É a
**única** biblioteca de data da casa, nos dois lados (`_standards/tooling.md` §0.1): o Lucid já
hidrata coluna de data como `DateTime` do Luxon (`_doc-lib/lucid.md#models`).

**Como usar:**

```bash
pnpm add luxon
pnpm add -D @types/luxon
```

```ts
// frontend: lib/i18n.ts (utilitário de tema, typescript.md §6)
import { DateTime } from 'luxon'

// fuso do negócio fixo: SSR e hidratação renderizam a mesma string (frontend.md §3.5)
const BUSINESS_ZONE = 'America/Manaus'

export function formatDateTime(iso: string, locale: string): string {
  const value = DateTime.fromISO(iso, { zone: BUSINESS_ZONE }).setLocale(locale)
  if (!value.isValid) {
    return ''
  }
  return value.toLocaleString(DateTime.DATETIME_MED)
}

// formatDateTime('2026-10-14T12:00:00Z', 'pt-BR') -> '14 de out. de 2026, 08:00'
```

**Quando adotar a biblioteca:** sempre que o código lida com data: regra de negócio, filtro por
período, exibição, prazo, expiração. `Date` cru só na borda que o exige (`DateTime.fromJSDate` /
`toJSDate`). `date-fns`, `dayjs` e `moment` estão fora (`tooling.md` §0.1); o `dayjs` interno do
VineJS e o `date-fns` do `react-day-picker` são dependência transitiva e não contam.

**O que muda a experiência:**

1. **Sem zona explícita, vale a zona do processo.** `DateTime.now()`, `fromISO('2026-10-14T09:00')`
   e `fromObject` nascem na zona do sistema: no servidor, a do container; no navegador, a do
   usuário. Passe `{ zone }` na criação ou `setZone` antes de exibir. String com offset
   (`...-04:00`) é lida certo, mas **convertida** para a zona do sistema, salvo `{ setZone: true }`.
2. **`toFormat` e `fromFormat` caem em `en-US`**, não no locale do sistema: mês por extenso sai em
   inglês. Para humano, `setLocale(locale)` + `toLocaleString(preset)`; para máquina, `toISO()`.
3. **Inválido não lança, a menos que você peça.** `fromISO('2026-02-30')` devolve um `DateTime` com
   `isValid === false`, e `toISO()` devolve `null`. Os tipos refletem isso: `toISO()` é
   `string | null` até o `isValid` estreitar a instância para `DateTime<true>`. Como a casa proíbe
   `!`, o caminho é estreitar ou ligar `throwOnInvalid` (ver [validity](#validity)).
4. **`plus({ days: 1 })` não é `plus({ hours: 24 })`.** Dia, mês e ano são matemática de
   calendário e respeitam horário de verão; hora, minuto e segundo são matemática de tempo.
5. **`Interval` é semiaberto**: o fim não está dentro. `Interval.fromDateTimes(d.startOf('day'),
   d.endOf('day'))` perde o último milissegundo; use `d.startOf('day').plus({ days: 1 })` como fim.

**Links:** 69

**Skills:** `maiyu-backend` (coluna `DateTime` do Lucid, use-case com prazo), `maiyu-frontend`
(formatador de `lib/i18n.ts`), `superpowers:test-driven-development` (relógio fixo com
`Settings.now`). Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa
(`SKILLS-MAP.md`).

---

## Começo

#### home
[doc](https://moment.github.io/luxon/#/) | [markdown](https://moment.github.io/luxon/docs/home.md)
**O que é:** a capa do manual: o que a biblioteca cobre (DateTime, Interval, Duration, parse,
formatação, Intl, matemática, zonas, calendários) e o caminho de leitura.
**Para que serve:** saber que o manual é o sumário à esquerda mais a API gerada por anotação.
**Quando usar:** primeira leitura ao adotar. O exemplo da capa resume o estilo:
`DateTime.now().setZone('America/New_York').minus({ weeks: 1 }).endOf('day').toISO()`.

#### install
[doc](https://moment.github.io/luxon/#/install) | [markdown](https://moment.github.io/luxon/docs/install.md)
**O que é:** os builds (global, AMD, ES6, Node), os tipos e o requisito de ICU.
**Para que serve:** saber que o TypeScript vem de `@types/luxon` (DefinitelyTyped) e que o locale
depende dos dados de ICU do runtime.
**Quando usar:** ao adicionar a dependência. Na stack: `pnpm add luxon` e `pnpm add -D
@types/luxon`, import nomeado `import { DateTime } from 'luxon'`. A página diz que **Node 13+ já
traz ICU completo**, sem ação; `full-icu`, `--icu-data-dir` e `NODE_ICU_DATA` são para Node 12, fora
da stack (`engines.node >= 24`). A seção de React Native é fora da stack.

#### tour
[doc](https://moment.github.io/luxon/#/tour) | [markdown](https://moment.github.io/luxon/docs/tour.md)
**O que é:** o passeio pela API: criar (`now`, `local`, `fromObject`, `fromISO`), ler componentes
(`year`, `month`, `weekday`, `daysInMonth`), formatar, transformar (`plus`, `minus`, `set`,
`startOf`), Intl, zonas, `Duration` e `Interval`.
**Para que serve:** o mapa do que existe antes de abrir a referência.
**Quando usar:** antes da primeira tarefa com data. Guarde o aviso do fim: `Interval` é semiaberto,
então `endOf('day')` como fim deixa o último milissegundo de fora.

#### upgrading
[doc](https://moment.github.io/luxon/#/upgrading) | [markdown](https://moment.github.io/luxon/docs/upgrading.md)
**O que é:** as quebras de 1.x → 2.0 e 2.x → 3.0.
**Para que serve:** a 3.0 tem uma: `'system'` é sempre a zona do sistema, e `'default'` é a de
`Settings.defaultZone`. A 2.0 separou objeto e opções em `fromObject(obj, opts)` e em
`toLocaleString(formatOpts, opts)`, trocou `'local'` por `'system'` e removeu
`Settings.defaultZoneName`.
**Quando usar:** ao migrar projeto em versão antiga, ou ao achar código com `fromObject({ zone })`
num argumento só, que é a forma da 1.x.

## Conceitos

#### intl
[doc](https://moment.github.io/luxon/#/intl) | [markdown](https://moment.github.io/luxon/docs/intl.md)
**O que é:** como o locale funciona: propriedade do `DateTime` (`{ locale }` na criação,
`setLocale`, `reconfigure`), padrão global `Settings.defaultLocale`, `resolvedLocaleOptions()`,
`numberingSystem` e semana por locale (`localWeekday`, `useLocaleWeeks`,
`Settings.defaultWeekSettings`).
**Para que serve:** saída em pt-BR, es ou en sem tabela de tradução: o texto vem do `Intl`.
**Quando usar:** em toda data exibida. O locale vem do idioma da requisição
(`_standards/i18n.md`), aplicado por instância com `setLocale`, não por `Settings.defaultLocale`
global: no servidor, o global vale para todas as requisições ao mesmo tempo. Atenção: o padrão sem
locale é o do sistema (no Node, em geral `en-US`), e `toFormat`/`fromFormat` caem em `en-US` mesmo
assim. A frase "Node não traz ICU por padrão" desta página está desatualizada; a `install` diz o
contrário para Node 13+.

```ts
DateTime.fromISO(iso, { zone: 'America/Manaus' }).setLocale('es').toLocaleString(DateTime.DATE_FULL)
// '14 de octubre de 2026'
```

#### zones
[doc](https://moment.github.io/luxon/#/zones) | [markdown](https://moment.github.io/luxon/docs/zones.md)
**O que é:** zona como metadado do instante: formas de indicar (`'America/Sao_Paulo'`, `'system'`,
`'default'`, `'utc'`, `'UTC-4'`, instância de `Zone`), criação numa zona (`{ zone }`), offset na
string, `{ setZone: true }` para manter a zona da string, `setZone` para converter,
`keepLocalTime`, horário de verão (hora inexistente avança, hora ambígua é indefinida) e
`Settings.defaultZone`.
**Para que serve:** criar e exibir o instante na zona do negócio, independentemente da máquina.
**Quando usar:** em toda criação a partir de dado sem offset e em toda exibição. Zona inexistente
dá `DateTime` inválido (`invalidReason: 'unsupported zone'`), não erro. `Settings.defaultZone` é
global do processo; num backend que atende vários fusos, passe `{ zone }` por chamada. Num projeto
de fuso único, `Settings.defaultZone` no boot do servidor e do cliente fecha o SSR com a mesma
zona; `keepLocalTime` a página manda evitar.

```ts
DateTime.fromISO('2026-10-14T09:00', { zone: 'America/Manaus' }) // 09:00 em Manaus
DateTime.fromISO('2026-10-14T09:00-04:00', { setZone: true }).zoneName // 'UTC-4'
```

#### calendars
[doc](https://moment.github.io/luxon/#/calendars) | [markdown](https://moment.github.io/luxon/docs/calendars.md)
**O que é:** suporte completo a gregoriano e semana ISO; outros calendários (hebraico, islâmico,
budista...) só como calendário de **saída** (`outputCalendar`), via `Intl`.
**Para que serve:** exibir a data noutro calendário mantendo a conta em gregoriano.
**Quando usar:** raramente. Nenhum projeto da casa pede calendário não gregoriano; se pedir, a conta
continua gregoriana e só a exibição muda.

## Parse e formatação

#### formatting
[doc](https://moment.github.io/luxon/#/formatting) | [markdown](https://moment.github.io/luxon/docs/formatting.md)
**O que é:** três saídas: formato técnico (`toISO`, `toISODate`, `toISOTime`, `toRFC2822`,
`toHTTP`, `toMillis`, `toSeconds`, `toUnixInteger`), texto para humano (`toLocaleString` com
preset `DateTime.DATE_SHORT`...`DATETIME_HUGE_WITH_SECONDS` ou opções do `Intl.DateTimeFormat`) e
tokens (`toFormat`, com escape por aspas simples e macros como `D`, `ff`).
**Para que serve:** a página manda: para máquina, ISO 8601; para humano, `toLocaleString`; token só
quando os dois não servem.
**Quando usar:** transporte na API e no banco sai de `toISO()` (ou `toISODate()` para data sem
hora); tela sai de `toLocaleString(preset)` depois de `setLocale` e zona fixa. `toFormat` com token
de mês ou dia por extenso sai em inglês sem `setLocale`.

```ts
const dt = DateTime.fromISO(iso, { zone: 'UTC' })
dt.toISO()                                                     // transporte
dt.setLocale('pt-BR').toLocaleString(DateTime.DATE_MED)        // tela: '14 de out. de 2026'
dt.toLocaleString(DateTime.DATE_FULL, { locale: 'en' })        // locale só nesta chamada
```

#### parsing
[doc](https://moment.github.io/luxon/#/parsing) | [markdown](https://moment.github.io/luxon/docs/parsing.md)
**O que é:** leitura de ISO 8601 (`fromISO`, com dezenas de variações), RFC 2822 e HTTP
(`fromRFC2822`, `fromHTTP`), SQL (`fromSQL`), epoch (`fromMillis`, `fromSeconds`), `Date`
(`fromJSDate`) e formato livre (`fromFormat`, `fromFormatExplain` para depurar), com o limite de
ano de dois dígitos (`Settings.twoDigitCutoffYear`).
**Para que serve:** a página desaconselha parse de formato livre: string de máquina é ISO; string
digitada por gente raramente bate com o formato.
**Quando usar:** `fromISO` para o que vem da API; `fromSQL` só no SQL cru (o Lucid já hidrata
`DateTime`); `fromJSDate(value, { zone })` para a saída de `vine.date()`, que é `Date`
(`_doc-lib/vinejs.md#types/date`). Valor sem offset é lido na zona do sistema: passe `{ zone }`.

## Matemática e validade

#### math
[doc](https://moment.github.io/luxon/#/math) | [markdown](https://moment.github.io/luxon/docs/math.md)
**O que é:** matemática de calendário (ano, trimestre, mês, semana, dia) contra matemática de tempo
(hora, minuto, segundo); comparação (`<`, `>`, `equals`, `hasSame`, `startOf`); `Duration`
(`as`, `shiftTo`, `diff` com várias unidades, precisão `casual` ou `longterm`).
**Para que serve:** prazo, vencimento, idade, "faltam N dias", agrupar por dia ou mês.
**Quando usar:** em regra de negócio com data. `===` compara identidade de objeto, inútil em tipo
imutável: use `equals` (instante + zona + locale) ou `toMillis()` dos dois lados. "Mesmo dia" é
`hasSame(outro, 'day')`, e o dia é o **da zona** de quem chama: alinhe as zonas antes.

```ts
const expired = order.createdAt.plus({ minutes: 120 }) < DateTime.now()
const daysLeft = deadline.diff(DateTime.now().setZone(deadline.zone), 'days').days
```

#### validity
[doc](https://moment.github.io/luxon/#/validity) | [markdown](https://moment.github.io/luxon/docs/validity.md)
**O que é:** `DateTime`, `Duration` e `Interval` inválidos falham em silêncio: `isValid` falso,
getter numérico `NaN`, `toISO()` `null`, `invalidReason` e `invalidExplanation` dizem o motivo.
`Settings.throwOnInvalid = true` faz a criação lançar `Error`.
**Para que serve:** decidir entre checar `isValid` e lançar.
**Quando usar:** dado externo é validado pelo VineJS antes de virar `DateTime`; o inválido que
sobra é erro de programação. A página sugere deixar `throwOnInvalid` ligado em produção "com
try/catch apropriado", e a casa trata falha de negócio por `left(HTTPException)`, não `throw`
(`AGENTS.md`). Os tipos oferecem a amarração: com `Settings.throwOnInvalid = true` no boot **e** a
augmentação abaixo, `toISO()` passa a `string` e `DateTimeMaybeValid` vira `DateTime`, sem `!` e
sem estreitar a cada uso. Sem as duas, estreite com `isValid`. A escolha é do projeto, registrada
em `docs/DECISIONS.md`; não ligue só uma das duas metades (o tipo mentiria).

```ts
// types/luxon.d.ts: interface só aqui, onde declare module exige (backend.md §5)
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true
  }
}
```

## Ambiente e contexto

#### api-docs
[doc](https://moment.github.io/luxon/api-docs/index.html)
**O que é:** a referência gerada das classes, com cada método e opção. Página única, navegada por
âncora; sem versão markdown.
**Para que serve:** assinatura e opções exatas; o catálogo abaixo aponta a âncora de cada membro.
**Quando usar:** quando o manual não responde. Para o tipo, o contrato é o `.d.ts` de
`@types/luxon` (`DateTime<IsValid>`, `DateTimeMaybeValid`).

#### matrix
[doc](https://moment.github.io/luxon/#/matrix) | [markdown](https://moment.github.io/luxon/docs/matrix.md)
**O que é:** suporte oficial (duas últimas versões dos navegadores, Node 12+) e o único recurso
parcial: `toRelative`/`toRelativeCalendar` dependem de `Intl.RelativeTimeFormat` e caem para inglês
sem ele. `Info.features()` diz o que o ambiente tem.
**Para que serve:** saber o que pode faltar no navegador do usuário.
**Quando usar:** nada a fazer na stack: Node 24 e navegadores atuais têm tudo. React Native está
fora da stack.

#### moment
[doc](https://moment.github.io/luxon/#/moment) | [markdown](https://moment.github.io/luxon/docs/moment.md)
**O que é:** guia para quem vem do Moment: imutabilidade, diferenças de API e tabela de
equivalência método a método (criação, getters, transformação, consulta, saída, `Duration`,
`Interval`).
**Para que serve:** migrar código de `moment` (e, por analogia, de `dayjs`) sem adivinhar o nome.
**Quando usar:** nas migrações de `tooling.md` §0.1 (`_standards/MIGRATIONS.md`). Para `date-fns`
não há guia oficial: troque função por método do `DateTime` pela tabela desta página e pelo
catálogo abaixo.

#### why
[doc](https://moment.github.io/luxon/#/why) | [markdown](https://moment.github.io/luxon/docs/why.md)
**O que é:** a origem da biblioteca e as ideias dela: imutável, API explícita, Intl para tradução
e zona, `Duration` e `Interval` de primeira classe.
**Para que serve:** entender o custo assumido: o comportamento de locale e zona varia com a
implementação de `Intl` do ambiente.
**Quando usar:** leitura de contexto, sem decisão de código. É a razão de a casa testar data com
locale e zona explícitos, nunca com o padrão da máquina do CI.

## API (catálogo)

Âncoras da página única `api-docs/index.html`. Assinaturas conferidas também em `@types/luxon@3.7.6`.

### Classes

| Link | O que faz | Quando usar na casa |
|---|---|---|
| [DateTime](https://moment.github.io/luxon/api-docs/index.html#datetime) | instante imutável com zona, locale, sistema de numeração e calendário de saída | o tipo de toda data: coluna do Lucid, campo de DTO, valor de formulário depois do parse |
| [Duration](https://moment.github.io/luxon/api-docs/index.html#duration) | quantidade de tempo por unidade (`{ days: 3, hours: 6 }`), sem âncora no calendário | prazo configurável, janela de expiração, resultado de `diff` |
| [Interval](https://moment.github.io/luxon/api-docs/index.html#interval) | trecho semiaberto `[início, fim)` entre dois `DateTime` | filtro por período, sobreposição de agenda, "está dentro da janela" |
| [Info](https://moment.github.io/luxon/api-docs/index.html#info) | métodos estáticos: nomes de mês e dia por locale, zona com horário de verão, recursos do ambiente | rótulo de mês e dia da semana num seletor, no idioma atual |
| [Zone](https://moment.github.io/luxon/api-docs/index.html#zone) | contrato abstrato de zona (`name`, `offset`, `isUniversal`, `isValid`) | tipo de parâmetro quando o código aceita zona como objeto |
| [IANAZone](https://moment.github.io/luxon/api-docs/index.html#ianazone) | zona por identificador IANA (`America/Manaus`) | a zona do negócio; validar zona vinda de configuração |
| [FixedOffsetZone](https://moment.github.io/luxon/api-docs/index.html#fixedoffsetzone) | zona de offset fixo, sem horário de verão | UTC (`utcInstance`) ou string com offset lida com `setZone: true` |
| [SystemZone](https://moment.github.io/luxon/api-docs/index.html#systemzone) | a zona do ambiente que executa | evitar: é o que o SSR não pode depender |
| [InvalidZone](https://moment.github.io/luxon/api-docs/index.html#invalidzone) | zona que falhou no parse; "nunca instancie" | só aparece em diagnóstico de `DateTime` inválido |
| [Settings](https://moment.github.io/luxon/api-docs/index.html#settings) | getters e setters estáticos do comportamento global | configuração no boot (zona, `throwOnInvalid`) e relógio de teste |

### DateTime

| Link | O que faz | Quando usar na casa |
|---|---|---|
| [DateTime.now](https://moment.github.io/luxon/api-docs/index.html#datetimenow) | o instante atual na zona padrão | "agora" em regra de negócio; em teste, fixado por `Settings.now` |
| [DateTime.utc](https://moment.github.io/luxon/api-docs/index.html#datetimeutc) | cria por componentes, interpretados e devolvidos em UTC | data fixa de teste e de seeder sem depender da máquina |
| [DateTime.fromISO](https://moment.github.io/luxon/api-docs/index.html#datetimefromiso) | lê ISO 8601; opções `zone`, `setZone`, `locale` | todo valor de data que chega da API ou do `search` da rota |
| [DateTime.fromSQL](https://moment.github.io/luxon/api-docs/index.html#datetimefromsql) | lê data, hora ou data-hora no formato SQL | resultado de `db.rawQuery`, que não passa pela hidratação do model |
| [DateTime.fromJSDate](https://moment.github.io/luxon/api-docs/index.html#datetimefromjsdate) | converte `Date` nativo; opção `zone` | saída de `vine.date()` e de biblioteca que só fala `Date` |
| [DateTime.fromFormat](https://moment.github.io/luxon/api-docs/index.html#datetimefromformat) | lê string por tokens; cai em `en-US` sem `locale` | só legado em formato fixo (importação de planilha); nunca entrada de formulário |
| [DateTime#setZone](https://moment.github.io/luxon/api-docs/index.html#datetimesetzone) | mesma marca de tempo expressa noutra zona; `keepLocalTime` muda o instante | antes de exibir ou de comparar "mesmo dia" |
| [DateTime#setLocale](https://moment.github.io/luxon/api-docs/index.html#datetimesetlocale) | nova instância com outro locale (atalho de `reconfigure`) | idioma da requisição (pt-BR, es, en) antes de `toLocaleString` |
| [DateTime#reconfigure](https://moment.github.io/luxon/api-docs/index.html#datetimereconfigure) | troca locale, sistema de numeração ou calendário de saída | quando muda mais de uma dessas propriedades de uma vez |
| [DateTime#toISO](https://moment.github.io/luxon/api-docs/index.html#datetimetoiso) | ISO 8601 completo com offset | o formato de transporte: resposta da API, `search` da URL |
| [DateTime#toISODate](https://moment.github.io/luxon/api-docs/index.html#datetimetoisodate) | só a data, `YYYY-MM-DD` | campo "data" sem hora (nascimento, vencimento) e `<input type="date">` |
| [DateTime#toJSON](https://moment.github.io/luxon/api-docs/index.html#datetimetojson) | ISO 8601 para `JSON.stringify` | é o que a serialização do model devolve; não chame à mão |
| [DateTime#toSQL](https://moment.github.io/luxon/api-docs/index.html#datetimetosql) | string SQL; `includeZone`, `includeOffset` | `update` pelo query builder (`deleted_at: DateTime.now().toSQL()`, `_doc-lib/lucid.md`) |
| [DateTime#toLocaleString](https://moment.github.io/luxon/api-docs/index.html#datetimetolocalestring) | texto localizado por preset ou opções do `Intl.DateTimeFormat` | toda data mostrada ao usuário, depois de zona e locale fixos |
| [DateTime#toFormat](https://moment.github.io/luxon/api-docs/index.html#datetimetoformat) | texto por tokens; `en-US` sem `setLocale` | nome de arquivo e chave técnica (`yyyy-MM`); nunca texto de tela |
| [DateTime#toRelative](https://moment.github.io/luxon/api-docs/index.html#datetimetorelative) | "há 2 dias", "em 3 horas", via `Intl.RelativeTimeFormat` | rótulo relativo; no SSR depende de "agora" e diverge na hidratação, renderize no cliente |
| [DateTime#toJSDate](https://moment.github.io/luxon/api-docs/index.html#datetimetojsdate) | `Date` nativo equivalente | borda com biblioteca que exige `Date` (o `calendar` do shadcn) |
| [DateTime#toMillis](https://moment.github.io/luxon/api-docs/index.html#datetimetomillis) | epoch em milissegundos | comparar instantes com `===`; chave de ordenação |
| [DateTime#isValid](https://moment.github.io/luxon/api-docs/index.html#datetimeisvalid) | se a instância é válida; estreita o tipo para `DateTime<true>` | depois de todo parse, quando `throwOnInvalid` está desligado |
| [DateTime#equals](https://moment.github.io/luxon/api-docs/index.html#datetimeequals) | mesmo milissegundo, mesma zona e mesmo locale | igualdade estrita em teste; para "mesmo instante", `toMillis()` |
| [DateTime#hasSame](https://moment.github.io/luxon/api-docs/index.html#datetimehassame) | mesma unidade de calendário (`'day'`, `'month'`) | "é hoje", "mesmo mês", com as zonas alinhadas antes |
| [DateTime#startOf](https://moment.github.io/luxon/api-docs/index.html#datetimestartof) | início da unidade (`'day'`, `'week'`, `'month'`); `useLocaleWeeks` | limite inferior de filtro por período |
| [DateTime#diff](https://moment.github.io/luxon/api-docs/index.html#datetimediff) | diferença como `Duration`, em uma ou várias unidades | "faltam N dias", idade, tempo decorrido |
| [DateTime#plus](https://moment.github.io/luxon/api-docs/index.html#datetimeplus) | soma `Duration` ou objeto; dia é calendário, hora é tempo | vencimento, expiração de cobrança, janela de sessão |

### Settings

| Link | O que faz | Quando usar na casa |
|---|---|---|
| [Settings.defaultZone](https://moment.github.io/luxon/api-docs/index.html#settingsdefaultzone) | zona das instâncias novas; `'system'` volta ao padrão | boot de projeto de fuso único, igual no servidor e no cliente |
| [Settings.defaultLocale](https://moment.github.io/luxon/api-docs/index.html#settingsdefaultlocale) | locale das instâncias novas; afeta também `toFormat`/`fromFormat` | não no servidor multi-idioma: é global ao processo; prefira `setLocale` por requisição |
| [Settings.throwOnInvalid](https://moment.github.io/luxon/api-docs/index.html#settingsthrowoninvalid) | lança ao criar `DateTime`, `Duration` ou `Interval` inválido | decisão do projeto, sempre junto da augmentação de `TSSettings` (ver [validity](#validity)) |
| [Settings.now](https://moment.github.io/luxon/api-docs/index.html#settingsnow) | função que devolve o epoch atual | relógio fixo em teste de expiração e prazo; restaure no `teardown` |
| [Settings.twoDigitCutoffYear](https://moment.github.io/luxon/api-docs/index.html#settingstwodigitcutoffyear) | corte de século para ano de dois dígitos (`yy`) | importação de legado com ano curto |
| [Settings.defaultWeekSettings](https://moment.github.io/luxon/api-docs/index.html#settingsdefaultweeksettings) | primeiro dia da semana, mínimo de dias e fim de semana | quando o negócio fixa a semana independentemente do locale |
| [Settings.resetCaches](https://moment.github.io/luxon/api-docs/index.html#settingsresetcaches) | limpa os caches globais | só em teste que troca zona ou locale padrão |

### Zonas

| Link | O que faz | Quando usar na casa |
|---|---|---|
| [IANAZone.create](https://moment.github.io/luxon/api-docs/index.html#ianazonecreate) | instância (em cache) de zona IANA | zona do negócio como objeto, reutilizada |
| [IANAZone.isValidZone](https://moment.github.io/luxon/api-docs/index.html#ianazoneisvalidzone) | se a string é uma zona real no ambiente | validar a zona lida da ENV ou da configuração no boot |
| [FixedOffsetZone.utcInstance](https://moment.github.io/luxon/api-docs/index.html#fixedoffsetzoneutcinstance) | a zona UTC como singleton | comparar com `zone.equals` sem depender de string |

### Info, Duration e Interval

| Link | O que faz | Quando usar na casa |
|---|---|---|
| [Info.features](https://moment.github.io/luxon/api-docs/index.html#infofeatures) | recursos de `Intl` disponíveis (`relative`, `localeWeek`) | diagnóstico de ambiente sem ICU completo |
| [Info.months](https://moment.github.io/luxon/api-docs/index.html#infomonths) | nomes de mês por locale (`'long'`, `'short'`, `'numeric'`) | opções de um seletor de mês no idioma atual |
| [Info.weekdays](https://moment.github.io/luxon/api-docs/index.html#infoweekdays) | nomes de dia da semana por locale | cabeçalho de agenda e grade de horário |
| [Duration.fromObject](https://moment.github.io/luxon/api-docs/index.html#durationfromobject) | cria por unidades | janela de expiração como constante (`{ minutes: 120 }`) |
| [Duration.fromISO](https://moment.github.io/luxon/api-docs/index.html#durationfromiso) | lê duração ISO (`PT2H7M`) | duração vinda da API ou da configuração |
| [Duration#toHuman](https://moment.github.io/luxon/api-docs/index.html#durationtohuman) | texto da duração por `Intl.NumberFormat`, no locale | "2 horas e 7 minutos" na tela, depois de `shiftTo` |
| [Interval.fromDateTimes](https://moment.github.io/luxon/api-docs/index.html#intervalfromdatetimes) | cria `[início, fim)` | período de filtro e de agenda |
| [Interval.fromISO](https://moment.github.io/luxon/api-docs/index.html#intervalfromiso) | lê `início/fim`, `início/duração` ou `duração/fim` | período no `search` da URL num parâmetro só |
| [Interval#contains](https://moment.github.io/luxon/api-docs/index.html#intervalcontains) | se o instante está no intervalo (fim excluído) | "está dentro da janela de inscrição" |
| [Interval#toLocaleString](https://moment.github.io/luxon/api-docs/index.html#intervaltolocalestring) | período localizado, por preset ou opções do `Intl.DateTimeFormat`; saída depende do navegador | "14 a 18 de out. de 2026" na tela |
