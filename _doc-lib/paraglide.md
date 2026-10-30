# Paraglide JS

> Conferido em 2026-10-14 contra 39 das 40 páginas, abertas em HTML: o site não serve `<url>.md`
> (404 em todas), o `llms-full.txt` responde 404 e o `llms.txt` só lista dez links. O fonte em
> markdown mora no repositório `opral/paraglide-js` (`docs/<página>.md`), não no domínio da doc.
> Tipo publicado conferido em `@inlang/paraglide-js@2.27.0` (`npm pack` + `.d.ts`, sem rodar
> código); `@inlang/cli@3.4.3` e `@inlang/paraglide-js-react@1.0.3` só por `npm view`.
>
> **A doc está à frente do pacote em um ponto**: a opção `redirect: "document" | "navigation"` do
> `paraglideMiddleware` aparece em `/middleware` e `/server`, mas o `.d.ts` da 2.27.0 só tem
> `effectiveRequestUrl` e `onRedirect`. Não use até sair numa versão publicada.
>
> **A 2.27.0 muda a escolha de variante** (ordem de preferência do MessageFormat 2, literal antes
> de `*`) e o formato padrão de `datetime` sem opções (`"Oct 9, 2026, 4:30 PM"` em vez de
> `"10/9/2026"`). Projeto que sobe de versão confere plural e data nos três idiomas.

Biblioteca de i18n por compilação: as mensagens de `messages/{locale}.json` viram funções ESM
tipadas (`m.nav_home()`), e o runtime gerado resolve o idioma por uma cadeia de estratégias (URL,
cookie, cabeçalho, `baseLocale`).

**O que é:** um compilador (plugin do Vite, CLI ou `compile()`) que lê o projeto inlang
(`project.inlang/settings.json`) e gera `src/paraglide/` com `messages.js` (uma função por
mensagem), `runtime.js` (`getLocale`, `setLocale`, `locales`, `localizeHref`, `localizeUrl`,
`deLocalizeUrl`) e `server.js` (`paraglideMiddleware`). Sem provider, sem contexto React: a
mensagem chama `getLocale()`, e no servidor o middleware isola o idioma por requisição com
`AsyncLocalStorage`.

**Para que serve:** o i18n obrigatório do frontend TanStack Start da casa (`i18n.md` §2):
chave inexistente não compila, parâmetro errado não compila, mensagem não usada sai do bundle por
tree-shaking, e o roteamento por idioma (`/es/...`, `/en/...`) vem pronto.

**Como usar:**

```bash
pnpm add -D @inlang/paraglide-js
pnpm dlx @inlang/paraglide-js@latest init   # cria project.inlang/, messages/ e o script check:i18n
```

```ts
// vite.config.ts: pt-BR sem prefixo, es e en com prefixo (padrão do urlPatterns)
paraglideVitePlugin({
  project: './project.inlang',
  outdir: './src/paraglide',
  emitTsDeclarations: true,
  strategy: ['url', 'baseLocale'],
})

// src/router.tsx: o router desfaz e refaz o prefixo, sem duplicar a árvore de rotas
const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),
    output: ({ url }) => localizeUrl(url),
  },
})

// src/server.ts: o request ORIGINAL vai para o handler, senão o rewrite e o middleware entram em laço
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}

// __root.tsx (shellComponent)
<html lang={getLocale()}>
```

**Quando adotar a biblioteca:** em todo frontend da casa, desde o primeiro texto visível. Não há
alternativa aceita (`DECISIONS.md` #109). No backend o i18n é o do framework (`@adonisjs/i18n`;
no Fastify, `i18n.md` §3), não o Paraglide.

**O que muda a experiência:**

1. **Trocar de idioma recarrega o documento.** `setLocale()` grava a estratégia e navega para a
   URL localizada (ou recarrega); não há re-render reativo. `setLocale(l, { reload: false })` é
   escape para superfície só-cliente sem estratégia `url`, nunca para o seletor de idioma.
   Link com `localizeHref(path, { locale })` também não troca o idioma num router de cliente.
2. **`server.ts` passa o `req` original.** O TanStack Router já delocaliza pelo `rewrite`; passar o
   `request` do callback faz o middleware delocalizar de novo e gera laço de redirect. A página
   `/tanstack-router` ainda mostra a forma errada; vale a de `/middleware` e `/tanstack-start`.
3. **A ordem da estratégia é uma cadeia que para no primeiro acerto.** `url` com o padrão curinga
   sempre resolve, então nada depois dele roda. `localStorage` não existe na primeira requisição
   SSR; preferência persistida que precisa valer no SSR é `cookie`.
4. **Os `modules` do `settings.json` são URLs do jsDelivr** (`@inlang/plugin-message-format@4.5.0`).
   O compilador busca na rede: o CI precisa de saída para o CDN, e a versão vai fixada na URL.
5. **`getLocale()` fora do contexto do middleware devolve o idioma errado** (ou lança "No locale
   found" com `strategy: ['url']`). Mensagem chamada no topo de módulo no servidor não tem idioma.

**Links:** 40

**Skills:** `maiyu-frontend` (rota, `__root.tsx`, `pageHead()`), `superpowers:test-driven-development`
(meta-teste de chaves), `playwright-skill` (E2E que troca o idioma, `i18n.md` §4),
`web-accessibility` (`<html lang>`, `aria-label` por chave), `searchfit-seo:technical-seo`
(hreflang e canonical por idioma). Dispare junto com a leitura da entrada; a entrada é o contrato,
a skill executa (`SKILLS-MAP.md`).

---

## Overview

#### /
[doc](https://paraglidejs.com/)
**O que é:** a página de entrada: `m.*()` importado de `paraglide/messages.js`, `setLocale`
fazendo navegação de documento, e o plugin do Vite com `emitTsDeclarations: true`.
**Para que serve:** a visão de uma tela só do modelo (compilador, sem provider, tree-shaking).
**Quando usar:** primeira leitura antes de montar o i18n de um projeto novo.

#### /comparison
[doc](https://paraglidejs.com/comparison)
**O que é:** tabela contra i18next e react-intl: compilador, tree-shaking, roteamento por idioma,
SSR com `AsyncLocalStorage`, variantes, multi-tenancy. Carga preguiçosa por idioma só experimental.
**Para que serve:** saber o que a biblioteca não faz: abaixo de ~20 idiomas o bundle por mensagem
ganha da carga por idioma, então não há "lazy locale" estável.
**Quando usar:** ao justificar a escolha num `docs/DECISIONS.md` de projeto; três idiomas está
longe do limite.

#### /benchmark
[doc](https://paraglidejs.com/benchmark)
**O que é:** tamanho transferido contra i18next (47 KB contra 205 KB com 5 idiomas e 200
mensagens); o tamanho não cresce com o total de mensagens, só com as usadas na página.
**Para que serve:** número para o orçamento de bundle (`frontend.md` §9.10).
**Quando usar:** quando o orçamento de bundle apertar e alguém culpar o i18n.

#### /changelog
[doc](https://paraglidejs.com/changelog)
**O que é:** histórico do pacote. A 2.27.0 exige `@inlang/sdk` 4, falha a compilação de `local`
sem `input` declarado, muda a preferência de variantes e o padrão de `datetime`, e faz o `init`
adicionar `@inlang/cli` e o script `check:i18n`.
**Para que serve:** saber o que quebra ao subir de versão.
**Quando usar:** em toda atualização da dependência (`tooling.md`, "sempre a última versão").

## Getting Started

#### /sveltekit
[doc](https://paraglidejs.com/sveltekit)
Fora da stack: integração com SvelteKit (`npx sv add paraglide`, `hooks.server.ts`); a casa usa
TanStack Start.

#### /tanstack-router
[doc](https://paraglidejs.com/tanstack-router)
**O que é:** o exemplo espelhado do repositório TanStack para Router sem Start: plugin do Vite,
`rewrite` com `deLocalizeUrl`/`localizeUrl`, `shouldRedirect` no `beforeLoad` da raiz.
**Para que serve:** a parte do router (rewrite e pathname traduzido) é a mesma do Start.
**Quando usar:** só como apoio da entrada `/tanstack-start`. O `server.ts` desta página passa o
`request` do callback para o handler, o que a página `/middleware` aponta como causa de laço de
redirect: siga `/tanstack-start`.

#### /tanstack-start
[doc](https://paraglidejs.com/tanstack-start)
**O que é:** a integração oficial com TanStack Start (exemplo `start-i18n-paraglide` do repositório
TanStack): `paraglideVitePlugin` no `vite.config.ts`, `rewrite` no `createRouter`,
`paraglideMiddleware(req, () => handler.fetch(req))` em `server.ts`, `<html lang={getLocale()}>`
em `__root.tsx`, `shouldRedirect` para app offline e `localizeHref` para montar as rotas de
prerender.
**Para que serve:** é o desenho que `i18n.md` §2 adota.
**Quando usar:** ao montar o i18n de um frontend da casa. O exemplo usa `strategy: ['url',
'cookie', 'preferredLanguage', 'baseLocale']` e `urlPatterns` que prefixa só `en`; a casa usa
`['url', 'baseLocale']` sem `urlPatterns` (o padrão já deixa o idioma base sem prefixo,
`/i18n-routing`). O helper `createTranslatedPathnames` da página usa `locale as Locale`; na casa,
`isLocale()` ou `assertIsLocale()` do runtime fazem o narrowing sem `as`.

```ts
// src/server.ts
import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'

export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}
```

#### /react-router
[doc](https://paraglidejs.com/react-router)
Fora da stack: React Router v7 em modo framework; a casa usa TanStack Router.

#### /next-js
[doc](https://paraglidejs.com/next-js)
Fora da stack: Next.js App Router com `[locale]` na raiz; a casa usa TanStack Start.

#### /astro
[doc](https://paraglidejs.com/astro)
Fora da stack: Astro com middleware de servidor ou SSG; a casa usa TanStack Start.

#### /vite
[doc](https://paraglidejs.com/vite)
**O que é:** o setup genérico com Vite e a opção de mover as opções para
`project.inlang/paraglide.config.js` (ou `.ts`, com `defineConfig` exportado do pacote).
**Para que serve:** saber que o arquivo de config existe e que CLI e plugin leem o mesmo.
**Quando usar:** quando o CI compila pela CLI e o dev pelo plugin (`tooling.md` §7): uma config
só em `project.inlang/paraglide.config.ts` evita estratégia divergente entre os dois.

#### /vanilla-js-ts
[doc](https://paraglidejs.com/vanilla-js-ts)
**O que é:** compilação pela CLI (`paraglide-js compile --project --outdir`) sem bundler.
**Para que serve:** a forma do comando de compilação fora do Vite.
**Quando usar:** no passo 1 do CI do frontend (`tooling.md` §7), que compila antes de lint e
typecheck.

#### /standalone-servers
[doc](https://paraglidejs.com/standalone-servers)
**O que é:** `paraglideMiddleware` em Hono, Express, Fastify e Elysia, com compilação pela CLI.
**Para que serve:** usar as mesmas mensagens num servidor sem meta-framework.
**Quando usar:** não usado na casa: o backend tem i18n próprio (`i18n.md` §3). O exemplo Fastify
monta um `Request` a partir de `req.headers as Record<string, string>`, fora da régua.

## Usage

#### /basics
[doc](https://paraglidejs.com/basics)
**O que é:** `m.chave()`, parâmetros por objeto (`m.greeting({ name })`), `getLocale`,
`getTextDirection`, `setLocale` (navegação de documento), idioma forçado por chamada
(`m.x(inputs, { locale: 'es' })`), `localizeHref`, `project.inlang/settings.json` com `baseLocale`
e `locales`, mensagem dinâmica por mapa explícito, e o tipo `LocalizedString` que as mensagens
devolvem.
**Para que serve:** a API do dia a dia.
**Quando usar:** sempre. Na casa: `baseLocale: "pt-BR"`, `locales: ["pt-BR", "es", "en"]`; prop
que só aceita texto traduzido tipa como `LocalizedString`, e o literal solto deixa de compilar.

```ts
import type { LocalizedString } from '@/paraglide/runtime'

type PageTitleProps = Readonly<{ title: LocalizedString }>
```

#### /compiling-messages
[doc](https://paraglidejs.com/compiling-messages)
**O que é:** as três formas de compilar (CLI, plugin, `compile()`), `emitTsDeclarations` (exige
TypeScript 5.6+; sem ele, `allowJs: true`), a árvore gerada (`messages/`, `messages.js`,
`runtime.js`, `server.js`, `.gitignore`, `README.md`) e o `experimentalPerLocaleBuild`.
**Para que serve:** o comando do CI e o motivo de `src/paraglide/` não ser versionado (o próprio
compilador emite o `.gitignore`).
**Quando usar:** ao escrever o `check` do frontend. `emitTsDeclarations: true` é o caminho da casa
(sem `allowJs`). O build por idioma **não compõe** com TanStack Start: a página diz que o backend
falha em vez de inspecionar a saída do framework.

```bash
paraglide-js compile --project ./project.inlang --outdir ./src/paraglide --emit-ts-declarations
```

#### /message-keys
[doc](https://paraglidejs.com/message-keys)
**O que é:** a recomendação de chave: aleatória e legível (`penguin_purple_shoe`), plana, sem
significado; chave semântica é suportada mas convida a renomear. Não compartilhar uma mensagem
entre contextos não relacionados, mesmo com o mesmo texto. Chave dinâmica por mapa explícito de
funções.
**Para que serve:** decidir a forma da chave antes do primeiro arquivo de mensagens.
**Quando usar:** ao criar chave. **Diverge da régua**: `i18n.md` §2 adota chave semântica
prefixada por área (`posts_form_title`) e a chave comum `common_save` usada em toda tela; a doc
recomenda o contrário nos dois pontos. A régua é opinião registrável em `DECISIONS.md`, não
contradiz o que a biblioteca aceita. O mapa explícito (`{ email: m.email_label }`) é o que mantém
o tree-shaking e a checagem de mensagem não usada; `m[\`${x}_label\`]` quebra os dois.

#### /markup
[doc](https://paraglidejs.com/markup)
**O que é:** marcação dentro da mensagem (`{#link to=|/docs|}Leia{/link}`), renderizada por
`ParaglideMessage` de `@inlang/paraglide-js-react` com um renderer por nome de tag; `m.x()` devolve
texto sem as tags e `m.x.parts()` devolve as partes.
**Para que serve:** frase com link ou ênfase no meio sem partir a frase em três chaves.
**Quando usar:** quando a frase traduzida tem link ou negrito interno (a regra "nunca concatenar
pedaços traduzidos", `i18n.md` §2). Pacote extra, adotado por projeto.

```tsx
<ParaglideMessage
  message={m.terms_notice}
  inputs={{}}
  markup={{ link: ({ children, options }) => <Link to={options.to}>{children}</Link> }}
/>
```

#### /strategy
[doc](https://paraglidejs.com/strategy)
**O que é:** a cadeia de estratégias (`url`, `cookie`, `preferredLanguage`, `localStorage`,
`globalVariable`, `baseLocale`, `custom-*`), avaliada em ordem até a primeira que resolve;
`routeStrategies` por rota (`exclude: true` ou outra cadeia); `overwriteGetLocale` e
`defineCustomClientStrategy`/`defineCustomServerStrategy`.
**Para que serve:** decidir de onde sai o idioma de cada requisição.
**Quando usar:** ao configurar o plugin. `['url', 'baseLocale']` é o padrão "URL como fonte da
verdade" da própria página, o mesmo de `i18n.md` §2. O padrão do compilador sem `strategy` é
`['cookie', 'globalVariable', 'baseLocale']`, então a opção é obrigatória. `globalVariable` vaza
idioma entre requisições no servidor: nunca em produção. Rota privada sem prefixo que deve seguir
a preferência do usuário entra por `routeStrategies` com `cookie`.

```ts
routeStrategies: [{ match: '/api/:path(.*)?', exclude: true }],
```

#### /i18n-routing
[doc](https://paraglidejs.com/i18n-routing)
**O que é:** `urlPatterns` com `URLPattern`: `pattern` canônico e `localized` como tuplas
`[locale, caminho]`; padrão sem configuração = idioma base sem prefixo e os outros com
`/<locale>/`; pathname traduzido, domínio por idioma, base path, rota indisponível num idioma,
`shouldRedirect` no cliente e `trailingSlash`.
**Para que serve:** a forma da URL de cada idioma e o que `localizeHref`/`localizeUrl` devolvem.
**Quando usar:** ao configurar o roteamento. Sem `urlPatterns` a casa já tem `/sobre`, `/es/sobre`
e `/en/sobre`. Com `urlPatterns` próprio, a raiz exata vem antes do curinga (gera `/es` e não
`/es/`), o padrão com prefixo vem antes do sem prefixo dentro de `localized`, e `trailingSlash`
acompanha a política do framework, senão há laço de redirect.

#### /middleware
[doc](https://paraglidejs.com/middleware)
**O que é:** `paraglideMiddleware(request, resolve, options?)`: detecta o idioma, redireciona (307)
só requisição de documento (`Sec-Fetch-Dest: document`) cuja URL não bate com o idioma, delocaliza
a URL e abre o contexto de `AsyncLocalStorage`. Opções publicadas: `effectiveRequestUrl` (atrás de
proxy) e `onRedirect`.
**Para que serve:** o idioma certo por requisição no SSR, sem vazar entre requisições paralelas.
**Quando usar:** no `server.ts` do TanStack Start, passando o `req` original. Atrás do proxy do
deploy (TLS terminado antes do Nitro), `effectiveRequestUrl` montado de cabeçalho confiável, senão
redirect e `getUrlOrigin()` usam `http://` interno. O middleware **não grava cookie**: quem grava é
`setLocale()` no cliente. `disableAsyncLocalStorage` fica `false`.

#### /variants
[doc](https://paraglidejs.com/variants)
**O que é:** variantes por seletor (`declarations`, `selectors`, `match`): plural por
`local countPlural = count: plural` (usa `Intl.PluralRules`), número exato por um seletor-alias
sem função posto **antes** do plural, `offset`, ordinal com `type=ordinal`, e combinação de
seletores (plataforma, gênero). Preferência: literal antes de `*`, seletor por seletor.
**Para que serve:** plural e concordância dentro da mensagem, nos três idiomas.
**Quando usar:** toda frase com contagem (`frontend.md` §8, `i18n.md` §2). O seletor devolve
categoria (`one`, `other`), nunca número: `countPlural=0` nunca casa.

```json
{
  "posts_deleted": [{
    "declarations": ["input count", "local countPlural = count: plural"],
    "selectors": ["countPlural"],
    "match": {
      "countPlural=one": "{count} post excluído",
      "countPlural=*": "{count} posts excluídos"
    }
  }]
}
```

#### /formatting
[doc](https://paraglidejs.com/formatting)
**O que é:** formatadores dentro da mensagem: `number` (`Intl.NumberFormat`), `datetime`, `date`,
`time` (`Intl.DateTimeFormat`), `relativetime` (exige `unit`), `plural`, `icu:pound`. Opções vão
direto para o `Intl`; nome desconhecido é ignorado com aviso.
**Para que serve:** data, número e moeda no idioma da mensagem, sem montar string à mão.
**Quando usar:** quando o número ou a data fazem parte de uma frase traduzida. A página manda
passar o valor cru (número, `Date`), não a string já formatada; `timeZone` explícito quando a saída
precisa ser estável entre servidor e cliente (hidratação). Valor solto fora de frase continua com
`Intl` e `getLocale()` (`i18n.md` §2).

#### /objects-and-arrays
[doc](https://paraglidejs.com/objects-and-arrays)
**O que é:** lista que varia por idioma guardada como JSON dentro da string e lida com
`JSON.parse(m.x())`; lista com interpolação vira uma chave por item.
**Para que serve:** saber que não existe `returnObjects`.
**Quando usar:** evite: `JSON.parse` devolve `any`, e tradutor que quebra uma aspa derruba a tela.
Na casa, uma chave por item num mapa tipado.

#### /file-formats
[doc](https://paraglidejs.com/file-formats)
**O que é:** os formatos via plugin inlang (inlang message format, i18next, JSON simples),
declarados em `modules` do `settings.json` por URL do jsDelivr.
**Para que serve:** escolher o plugin; projeto novo usa `@inlang/plugin-message-format`
(`messages/{locale}.json`).
**Quando usar:** ao criar o projeto inlang. Versão fixada na URL do módulo, nunca `@latest`.

#### /checking-translations
[doc](https://paraglidejs.com/checking-translations)
**O que é:** `npx @inlang/cli check`: tradução faltando ou vazia, variável faltando ou desconhecida,
forma de plural faltando e mensagem não usada (com `@inlang/plugin-m-function-matcher` 2.3.0+);
sai com 1 quando acha algo; `--locales`, `--source`, `--format json`.
**Para que serve:** a rede automática de chave órfã e tradução faltando, no CI.
**Quando usar:** no `check` do frontend e no CI (`tooling.md` §7). Cobre boa parte do meta-teste de
`i18n.md` §4 (chave nos três arquivos, valor vazio, chave sem uso); o que é só da casa (travessão,
`...`) continua no `lib/messages.test.ts`. Chave dinâmica deixa o "não usado" incompleto.

#### /monorepo
[doc](https://paraglidejs.com/monorepo)
**O que é:** dois padrões: cada pacote compila do mesmo `project.inlang` com a própria estratégia
(recomendado), ou um pacote `i18n` compila uma vez e todos usam a mesma estratégia. Pacote de UI
compartilhado recebe texto já traduzido, ou compila com `baseLocale` e recebe `getLocale`/
`setLocale` do app por `overwriteGetLocale`/`overwriteSetLocale`.
**Para que serve:** onde mora a compilação quando há `shared/` no workspace.
**Quando usar:** no pnpm workspace da casa: só o `frontend/` compila Paraglide. O `shared/` não
detecta idioma nem compila mensagens: recebe o `Locale` (ou o texto pronto) de quem chama, que é o
que a página manda para pacote compartilhado. As mensagens de VineJS de `shared/src/validator.ts`
seguem fora do Paraglide (`i18n.md` §3).

#### /multi-tenancy
[doc](https://paraglidejs.com/multi-tenancy)
**O que é:** `urlPatterns` por domínio para dar a cada cliente um idioma padrão e um conjunto de
idiomas, com seletor de idioma por tenant.
**Para que serve:** SaaS com domínio por cliente.
**Quando usar:** só em projeto com domínio por tenant; a régua não prevê.

#### /server-side-rendering
[doc](https://paraglidejs.com/server-side-rendering)
**O que é:** SSR pelo middleware, `getLocale()` certo em código assíncrono aninhado e em streaming,
hidratação lendo o idioma da URL ou do cookie, `baseLocale` como último fallback.
**Para que serve:** evitar erro de hidratação: servidor e cliente com a mesma cadeia de
estratégias.
**Quando usar:** sempre (Start é SSR). HTML em cache com idioma velho é causa listada de erro de
hidratação: cache de página varia por idioma.

#### /static-site-generation
[doc](https://paraglidejs.com/static-site-generation)
**O que é:** SSG sem middleware: `generateStaticLocalizedUrls()` para descobrir as URLs de cada
idioma (também para sitemap e `hreflang`), idioma fixado antes de cada página, e prefixo em todos
os idiomas.
**Para que serve:** prerender e sitemap.
**Quando usar:** no `sitemap[.]xml.ts` (`frontend.md` §9.7), que lista as três versões de cada
página pública; e no prerender do Start, se o projeto adotar.

```ts
import { generateStaticLocalizedUrls } from '@/paraglide/runtime'

const urls: ReadonlyArray<URL> = generateStaticLocalizedUrls(['/', '/about'])
```

#### /incremental-migration
[doc](https://paraglidejs.com/incremental-migration)
**O que é:** Paraglide lendo os arquivos do i18next pelo plugin, as duas bibliotecas lado a lado.
**Para que serve:** migrar projeto que já tem i18next sem mover os arquivos.
**Quando usar:** só em projeto legado com i18next; a régua não tem segunda biblioteca de i18n no
estado final.

## Reference

#### /architecture
[doc](https://paraglidejs.com/architecture)
**O que é:** as quatro partes (compilador, `messages.js`, `runtime.js`, estratégia) e o fluxo
`m.x()` → `getLocale()` → estratégia.
**Para que serve:** entender por que não há provider e onde trocar o comportamento
(`overwriteGetLocale`).
**Quando usar:** antes de escrever estratégia própria.

#### /compiler-options
[doc](https://paraglidejs.com/compiler-options)
**O que é:** a referência de `CompilerOptions`: `project`, `outdir`, `strategy` (padrão
`['cookie', 'globalVariable', 'baseLocale']`), `urlPatterns`, `routeStrategies`, `trailingSlash`,
`cookieName`/`cookieDomain`/`cookieMaxAge`/`cookieSameSite`/`cookieSecure`, `emitTsDeclarations`,
`outputStructure` (`message-modules` padrão), `isServer`, `disableAsyncLocalStorage`,
`emitGitIgnore`, `includeEslintDisableComment` e as experimentais.
**Para que serve:** o contrato de cada opção do plugin e da CLI.
**Quando usar:** ao mexer em `vite.config.ts`. `cookieDomain` vazio deixa o cookie só no host;
app e API em subdomínios que precisam do mesmo idioma por cookie pedem `cookieDomain` (o mesmo
problema do `COOKIE_DOMAIN` da sessão). `isServer: "import.meta.env.SSR"` no Vite melhora o
tree-shaking. `includeEslintDisableComment` padrão `true` é o que tira o código gerado do lint
(`MIGRATIONS.md` registra os ternários do `runtime.js`).

#### /runtime
[doc](https://paraglidejs.com/runtime)
**O que é:** a referência do `runtime.js`: `getLocale`, `setLocale`, `locales`, `baseLocale`,
`isLocale`, `assertIsLocale`, `toLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`,
`deLocalizeUrl`, `shouldRedirect`, `generateStaticLocalizedUrls`, `getTextDirection`,
`getUrlOrigin`, `overwrite*` e `extractLocaleFrom*`.
**Para que serve:** a assinatura exata. `localizeUrl(url: string | URL, options?: { locale?:
Locale }): URL`: string precisa ser absoluta, o retorno é sempre `URL` absoluta. `localizeHref(href:
string, options?): string` aceita e devolve caminho relativo.
**Quando usar:** no `pageHead()` (`frontend.md` §9.7): `hreflang` com `localizeUrl(canonical,
{ locale }).href` para cada item de `locales`, e `x-default` com o `baseLocale`. Narrowing de
string externa por `isLocale()`, nunca `as Locale`.

```ts
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime'

const alternates = [
  ...locales.map((locale) => ({ rel: 'alternate', hrefLang: locale, href: localizeUrl(canonical, { locale }).href })),
  { rel: 'alternate', hrefLang: 'x-default', href: localizeUrl(canonical, { locale: baseLocale }).href },
]
```

#### /server
[doc](https://paraglidejs.com/server)
**O que é:** a referência de `paraglideMiddleware<T>(request, resolve, options?)` e o exemplo com
TanStack Start passando o `req` original.
**Para que serve:** a assinatura publicada. A opção `redirect` desta página não está no `.d.ts` da
2.27.0.
**Quando usar:** junto da entrada `/middleware`.

#### /errors
[doc](https://paraglidejs.com/errors)
**O que é:** "No locale found" (estratégia vazia, `overwrite*` chamado tarde, mensagem fora do
contexto de requisição, chamada de API só com `url`) e "trocar idioma por link não funciona" em
router de cliente.
**Para que serve:** diagnóstico dos dois erros mais comuns.
**Quando usar:** quando aparecer o erro. O seletor de idioma da casa chama `setLocale()`, não
renderiza `<Link>` para a outra versão.

## Ecosystem

#### /m/r7kp499g/app-inlang-ideExtension
[doc](https://inlang.com/m/r7kp499g/app-inlang-ideExtension)
**O que é:** Sherlock, extensão do VS Code: mostra o texto da mensagem em linha e no hover, extrai
string para mensagem e aponta tradução faltando.
**Para que serve:** ler `m.chave()` sem abrir o JSON.
**Quando usar:** opcional, de quem edita; não entra no repositório.

#### /m/2qj2w8pu/app-inlang-cli
[doc](https://inlang.com/m/2qj2w8pu/app-inlang-cli)
**O que é:** `@inlang/cli`: `check` (falha com 1 no CI), `machine translate` (serviço gratuito de
terceiro por padrão, ou Google/DeepL por chave) e `plugin`.
**Para que serve:** a checagem do CI e o rascunho de tradução.
**Quando usar:** `check` no CI do frontend. `machine translate` só gera rascunho que alguém revisa;
o serviço padrão é de terceiro sem garantia, e chave de API vai em `secrets`, nunca no repositório.

#### /m/tdozzpar/app-inlang-finkLocalizationEditor
[doc](https://inlang.com/m/tdozzpar/app-inlang-finkLocalizationEditor)
Página não conferida: redireciona para `fink.inlang.com`, bloqueado pelo proxy de saída desta
sessão. Fink é o editor web de traduções do inlang (citado no README gerado pela 2.27.0); uso
opcional, de tradutor.

## Appendix

#### /paraglide-vs-react-i18next
[doc](https://paraglidejs.com/paraglide-vs-react-i18next)
**O que é:** comparação com react-i18next: escolha Paraglide por bundle e tipo; escolha
react-i18next se a chave só é conhecida em runtime (CMS) ou o projeto depende de plugin do i18next.
**Para que serve:** o critério de exceção: chave que vem de dado não é caso de Paraglide.
**Quando usar:** ao avaliar conteúdo de registro; na casa ele fica no dado como `LocalizedText`
(`i18n.md` §2), não em mensagem.

#### /react-i18next-alternatives
[doc](https://paraglidejs.com/react-i18next-alternatives)
**O que é:** panorama das alternativas ao react-i18next em React + Vite.
**Para que serve:** material de decisão; não muda o uso.
**Quando usar:** só se a escolha de biblioteca for reaberta.
