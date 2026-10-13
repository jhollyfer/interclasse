# Tailwind CSS

> Conferido contra `tailwindcss@4.3.3` (última publicada no npm). `docs/text-color` virou
> `docs/color` (link já corrigido abaixo); o conteúdo não mudou, só o slug.

Framework CSS utility-first cuja configuração vive no próprio CSS, reescrito do zero na v4.

**O que é:** um gerador de CSS que varre os arquivos do projeto como **texto puro**, encontra tokens
que parecem nome de classe e emite só o CSS daquelas classes. Você não escreve regra CSS: compõe o
estilo na marcação com classes de propósito único (`flex`, `px-4`, `text-sm`, `hover:bg-sky-700`). A
v4 é uma reescrita — o anúncio oficial a chama de "ground-up rewrite" — com um motor novo (o projeto
o chama de Oxide), Lightning CSS por baixo para prefixo de fabricante e sintaxe moderna, e `@import`
resolvido pelo próprio Tailwind, sem `postcss-import`.

**Para que serve:** manter o CSS de uma aplicação num tamanho que não cresce junto com as telas.
Como o estilo mora ao lado da estrutura, um componente é copiável inteiro, e mexer numa tela nunca
quebra outra — o oposto do CSS global, em que ninguém apaga uma regra com confiança. A diferença
para `style` inline, que é a comparação que sempre aparece: com `style` **todo valor é um número
mágico**; com utilitário, você escolhe de um sistema de design declarado, e ganha variantes de
estado e de media query, que atributo `style` não tem.

**Como usar:**

```bash
npm install tailwindcss @tailwindcss/vite     # em projeto Vite (React, TanStack Start, SvelteKit…)
```

```css
/* src/styles.css — convenção sugerida; o nome é seu */
@import "tailwindcss";

@theme {
  /* cada variável aqui vira utilitário: --color-primary gera bg-primary, text-primary, border-primary… */
  --color-primary: oklch(0.55 0.21 264);
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

**Quando usar a biblioteca:** em qualquer projeto React × Node que renderize HTML. O plugin de Vite
é o caminho padrão da stack — é o próprio Tailwind que o chama de "the most seamless way to integrate
it with frameworks like Laravel, SvelteKit, React Router, Nuxt, and SolidJS". Use PostCSS só quando o
bundler não for Vite, e o CLI só quando não houver bundler nenhum.

**O que a v4 quebrou em relação à v3**, resumido do guia de upgrade:

| v3 | v4 |
|---|---|
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| `tailwind.config.js` | `@theme { --color-…: … }` no CSS (JS ainda dá, via `@config`) |
| Pacote `tailwindcss` no PostCSS | `@tailwindcss/postcss`, `@tailwindcss/vite` ou `@tailwindcss/cli` |
| `content: [...]` no config | detecção automática, ajustável com `@source` |
| `@layer utilities { .x {} }` | `@utility x { … }` |
| `border` usava `gray-200` | `border` usa `currentColor` |
| `ring` = 3px, cor `blue-500` | `ring` = 1px, cor `currentColor` (`ring-3` para o antigo) |
| `bg-[--var]` | `bg-(--var)` |
| `first:*:pt-0` (direita para esquerda) | `*:first:pt-0` (esquerda para direita) |
| `!flex` | `flex!` |
| `theme(spacing.12)` | `var(--spacing)`, `--spacing(12)` |

Há um codemod oficial, e vale rodá-lo antes de migrar à mão: `npx @tailwindcss/upgrade` (exige
Node 20+).

**Cor crua da paleta × token de tema — onde mais se erra.** A paleta padrão tem 22 famílias × 11
tons, e `bg-blue-500` funciona no primeiro dia. O problema aparece no segundo mês. `bg-blue-500`
significa literalmente "azul 500", então:

- **Trocar o tema vira busca e substituição.** A cor da marca não está declarada em lugar nenhum —
  está repetida em cada arquivo que a usou. Mudar de azul para violeta é um `grep` por todos os tons
  de `blue` e uma decisão caso a caso sobre cada ocorrência, porque nem todo azul da aplicação era a
  cor da marca.
- **O modo escuro dobra o trabalho.** Cor crua exige `dark:` em toda ocorrência —
  `bg-blue-500 dark:bg-blue-400` — e basta alguém esquecer um `dark:` para a tela ficar com um bloco
  claro no escuro. Bug silencioso: nada avisa.
- **Nada garante consistência.** `blue-500`, `blue-600` e `sky-500` convivem sem conflito nenhum, e
  três telas acabam com três azuis "da marca".

O token resolve os três de uma vez, porque o nome passa a descrever o **papel**, não o pigmento:

```css
@import "tailwindcss";

/* 1. valores por tema, em CSS puro — :root porque não devem gerar utilitário próprio */
:root {
  --brand-surface: oklch(1 0 0);
  --brand-accent: var(--color-blue-600);
}
[data-theme="dark"] {
  --brand-surface: oklch(0.21 0.03 264);
  --brand-accent: var(--color-blue-400);
}

/* 2. `inline` porque os tokens apontam para outras variáveis: o utilitário
      copia o valor em vez de referenciar a variável de tema, e a resolução
      por escopo funciona */
@theme inline {
  --color-surface: var(--brand-surface);
  --color-accent: var(--brand-accent);
}
```

```html
<!-- ERRADO: a cor está espalhada, e cada ocorrência precisa do seu dark: -->
<div class="bg-white dark:bg-gray-900">
  <button class="bg-blue-600 dark:bg-blue-400">Salvar</button>
</div>

<!-- CERTO: um nome de papel. O modo escuro já está no valor do token,
     e trocar o tema é editar duas linhas de CSS -->
<div class="bg-surface">
  <button class="bg-accent">Salvar</button>
</div>
```

A regra prática que sobrevive à revisão de código: **cor crua da paleta só em protótipo e em
one-off** — o gráfico de status, o destaque de um badge que nunca muda. Tudo que a marca pode querer
mudar entra em `@theme` com nome de papel (`primary`, `surface`, `muted`, `danger`). O mesmo vale
para raio (`--radius-*`), sombra (`--shadow-*`) e tipografia (`--text-*`, `--font-*`): quem escreve
`rounded-[7px]` em trinta arquivos acabou de criar um sistema de design que ninguém consegue ajustar.

**O detalhe que economiza horas:** o Tailwind **não interpreta seu código**, só procura tokens no
texto. Então `` className={`bg-${color}-600`} `` **nunca** gera CSS, porque a string `bg-red-600`
não existe em arquivo nenhum. A página `detecting-classes-in-source-files` é a que explica isso, e
ler cedo evita a tarde inteira perdida com "a classe está no DOM e o estilo não aplica". A saída é
sempre um mapa de classes completas:

```ts
const colorVariants = {
  blue: 'bg-blue-600 hover:bg-blue-500 text-white',
  red: 'bg-red-500 hover:bg-red-400 text-white',
}
```

**Três avisos que custam tempo:**

- **A v4 não roda com Sass, Less ou Stylus.** A doc é direta: "you shouldn't use Tailwind with Sass
  for the same reason you wouldn't use Sass with Stylus". Variável, aninhamento, `min()`/`max()` e
  `color-mix()` são nativos hoje.
- **Bloco `<style>` de componente (Vue, Svelte, Astro) e CSS Module não enxergam o tema.** Precisam
  de `@reference "../app.css"` para `@apply` funcionar, e cada módulo faz o Tailwind rodar mais uma
  vez — 50 módulos são 50 execuções. Usar `var(--color-*)` direto pula o processamento inteiro.
- **`@apply` é a saída mais tentadora e a que menos compensa.** Ela devolve o problema que o
  utilitário resolvia: uma classe global, com nome inventado, que ninguém apaga com confiança. A
  própria doc recomenda componente ou partial de template antes: "For anything that's more
  complicated than just a single HTML element, we highly recommend using template partials". Numa
  stack React, o componente já existe — `@apply` só faz sentido para estilizar marcação de terceiro
  que você não controla.

**Links:** 42.

**Skills:** `frontend-design`, `impeccable`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## A reescrita da v4

#### upgrade-guide
[doc](https://tailwindcss.com/docs/upgrade-guide)

**O que é:** o inventário completo das mudanças de v3 para v4, com o codemod oficial e a lista de
utilitários removidos, renomeados e com valor padrão diferente.
**Para que serve:** migrar sem descobrir cada quebra pelo visual da tela.
**Quando usar:** **antes de qualquer migração**, e depois como referência quando um estilo antigo
parar de funcionar. Leia a seção de mudanças de padrão mesmo em projeto novo: `border` sem cor e
`ring` de 1px surpreendem quem aprendeu na v3.

```bash
npx @tailwindcss/upgrade     # exige Node 20+; resolve a maior parte sozinho
```

```css
/* As duas mudanças de padrão que mais causam "sumiu a borda" / "sumiu o anel".
   Cole isto para reproduzir o comportamento da v3 enquanto migra. */
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentColor);
  }

  /* na v4 o botão passou a usar cursor: default */
  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

```tsx
// components/ui/button.tsx — na v4 a cor de border/ring não é mais cinza por padrão: declare explícito
import { cn } from '@/lib/utils'

type ButtonProps = {
  readonly variant?: 'default' | 'outline'
  readonly children: React.ReactNode
}

export function Button({ variant = 'default', children }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md px-4 py-2 ring-1 ring-gray-300 focus:ring-2',
        variant === 'outline' && 'border border-gray-300',
      )}
    >
      {children}
    </button>
  )
}
```

#### compatibility
[doc](https://tailwindcss.com/docs/compatibility)

**O que é:** os limites do que a v4 roda: versão mínima de navegador, incompatibilidade com
pré-processadores, e o custo de CSS Modules e de `<style>` de componente.
**Para que serve:** decidir entre v4 e v3.4 antes de escrever a primeira linha, e entender por que
`@apply` num `<style scoped>` não acha o tema.
**Quando usar:** **na escolha da versão** e sempre que `@apply` falhar fora do CSS principal. O piso
é Chrome 111, Safari 16.4 e Firefox 128 — projeto que precise ir abaixo disso fica na 3.4, porque a
v4 depende de `@property` e `color-mix()`.

```css
/* button.css — @reference não copia CSS, só dá ao @apply acesso às variáveis do tema.
   É o jeito oficial de usar @apply fora do CSS principal (CSS Modules, <style> de componente). */
@reference "../../app.css";

.button {
  @apply bg-blue-500 px-4 py-2 text-white;
}
```

```tsx
// -components/user-card.module.css ao lado de user-card.tsx — CSS Modules continua precisando de @reference
import styles from './user-card.module.css'

type UserCardProps = { readonly name: string }

export function UserCard({ name }: UserCardProps) {
  return <div className={styles.card}>{name}</div>
}
```

```vue
<template>
  <button><slot /></button>
</template>

<!-- Funciona, mas roda o Tailwind mais uma vez para este arquivo -->
<style scoped>
  @reference "../app.css";
  button {
    @apply bg-blue-500;
  }
</style>

<!-- Melhor: variável de tema direto, sem passar pelo Tailwind -->
<style scoped>
  button {
    background-color: var(--color-blue-500);
  }
</style>
```

#### preflight
[doc](https://tailwindcss.com/docs/preflight)

**O que é:** o reset de base, sobre o `modern-normalize`: margem zerada em tudo, título sem tamanho
próprio, lista sem marcador, imagem como bloco e limitada a 100%, `box-sizing: border-box` e
`border: 0 solid`.
**Para que serve:** partir do mesmo ponto em todo navegador, sem herdar decisão do user-agent.
**Quando usar:** ao ver `<h1>` sair do tamanho do corpo do texto ou `<ul>` sem bolinha — é o
Preflight, e é de propósito. Importa também ao encaixar Tailwind em CSS legado: o reset é global e
pode desmontar telas antigas, e aí vale desligá-lo.

```css
/* O que `@import "tailwindcss"` faz por baixo */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

/* Desligar o Preflight = omitir a linha do meio */

/* Estender é o caminho normal: @layer base, com variáveis de tema */
@layer base {
  h1 {
    font-size: var(--text-2xl);
  }
  a {
    color: var(--color-blue-600);
    text-decoration-line: underline;
  }
}
```

## Instalação e ferramentas

#### installation/using-vite
[doc](https://tailwindcss.com/docs/installation/using-vite)

**O que é:** a instalação pelo plugin dedicado de Vite, que é o caminho recomendado.
**Para que serve:** ligar o Tailwind sem PostCSS no meio, com rebuild incremental rápido.
**Quando usar:** **em todo projeto da stack** — React com Vite, TanStack Start, SvelteKit, Nuxt,
React Router. É a única opção que aproveita o motor novo sem intermediário.

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* src/styles.css — e importe este arquivo no entrypoint da aplicação */
@import "tailwindcss";
```

#### installation/using-postcss
[doc](https://tailwindcss.com/docs/installation/using-postcss)

**O que é:** a instalação via plugin de PostCSS, num pacote separado na v4.
**Para que serve:** bundler que não é Vite — Webpack, Next.js com Turbopack, Parcel, Rspack.
**Quando usar:** só quando o plugin de Vite não se aplica. O nome do pacote mudou: na v3 o próprio
`tailwindcss` era o plugin de PostCSS; na v4 é `@tailwindcss/postcss`, e manter o nome antigo no
`postcss.config` é erro de migração comum.

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

#### installation/tailwind-cli
[doc](https://tailwindcss.com/docs/installation/tailwind-cli)

**O que é:** o compilador de linha de comando, que lê um CSS de entrada e escreve um de saída.
**Para que serve:** gerar CSS sem bundler nenhum.
**Quando usar:** em página estática, em e-mail HTML, em template renderizado no servidor, e para
depurar — rodar o CLI à mão mostra o CSS final e resolve rápido a dúvida "essa classe foi gerada?".

```bash
npm install tailwindcss @tailwindcss/cli

# -i entrada, -o saída, --watch recompila a cada mudança
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```

#### installation/framework-guides
[doc](https://tailwindcss.com/docs/installation/framework-guides)

**O que é:** o índice de guias por framework — Next.js, Nuxt, SvelteKit, React Router, TanStack
Start, Astro, Angular, SolidJS, Qwik, Laravel, Rails, Phoenix, AdonisJS, Symfony e outros.
**Para que serve:** pegar o passo a passo exato em vez de adaptar o genérico.
**Quando usar:** ao montar projeto novo, **antes** de improvisar. Vale principalmente nos frameworks
com SSR, onde o ponto de importação do CSS não é óbvio e um import no lugar errado causa flash de
página sem estilo.

```bash
# Frameworks sem guia dedicado caem num dos três caminhos gerais:
#   Vite    -> @tailwindcss/vite     (preferido)
#   PostCSS -> @tailwindcss/postcss
#   nenhum  -> @tailwindcss/cli
```

```tsx
// ERRADO: import de CSS dentro de uma tela, não da raiz — a página pisca sem estilo (FOUC) em SSR
import '../../styles.css'

export function Dashboard() {
  return <div>...</div>
}
```

```tsx
// CERTO (caso real da stack: guia de TanStack Start) — import único na raiz, antes de qualquer render
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({ links: [{ rel: 'stylesheet', href: appCss }] }),
})
```

#### editor-setup
[doc](https://tailwindcss.com/docs/editor-setup)

**O que é:** a extensão IntelliSense do VS Code, o plugin de Prettier que ordena classes, e o
suporte nas IDEs da JetBrains.
**Para que serve:** autocompletar utilitário, ver o CSS gerado no hover, e parar de discutir ordem
de classe em revisão.
**Quando usar:** **no primeiro dia**, para o time inteiro. O `prettier-plugin-tailwindcss` é o que
mais rende: ordem de classe deixa de ser opinião e `class` gigante vira algo diffável.

```html
<!-- antes do prettier-plugin-tailwindcss -->
<button class="text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800">Enviar</button>

<!-- depois: base, depois estado, depois breakpoint -->
<button class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8 sm:py-3">Enviar</button>
```

```json
// .prettierrc — a configuração mínima que liga o plugin
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```jsonc
// .vscode/settings.json — caso real da stack: shadcn/Base UI concentram classe dentro de cn(),
// e o IntelliSense só completa dentro de className sem este regex
{
  "tailwindCSS.experimental.classRegex": [["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*)[\"'`]"]],
}
```

## Como se escreve estilo

#### styling-with-utility-classes
[doc](https://tailwindcss.com/docs/styling-with-utility-classes)

**O que é:** a página que fundamenta o método: por que utilitário em vez de CSS próprio, como lidar
com repetição, valores arbitrários entre colchetes, propriedade arbitrária, e o atalho `(--var)`.
**Para que serve:** o vocabulário base — tudo o mais se apoia aqui.
**Quando usar:** **na primeira leitura**, e de novo quando alguém propuser "extrair isso para uma
classe". A resposta da doc é componente ou partial, não classe nova.

```jsx
// Repetição em loop não é duplicação: é um lugar só, renderizado N vezes.
<div className="mt-3 flex -space-x-2 overflow-hidden">
  {contributors.map((user) => (
    <img key={user.handle} className="inline-block h-12 w-12 rounded-full ring-2 ring-white" src={user.avatarUrl} />
  ))}
</div>
```

```jsx
// Valor vindo do banco: variável CSS no style, utilitário lendo com a sintaxe (--var).
// Isto NÃO quebra a detecção de classes, porque `bg-(--bg-color)` é literal no arquivo.
export function BrandedButton({ buttonColor, textColor, children }) {
  return (
    <button
      style={{ '--bg-color': buttonColor, '--text-color': textColor }}
      className="bg-(--bg-color) text-(--text-color) rounded-md px-4 py-2"
    >
      {children}
    </button>
  )
}
```

```css
/* ERRADO: "extrair para uma classe" reconstrói CSS próprio para evitar repetir utilitário */
.btn {
  @apply rounded-md bg-blue-500 px-4 py-2 text-white;
}
```

```tsx
// CERTO: a doc chama de multi-cursor editing — o componente é a reutilização, não um seletor novo
type ButtonProps = { readonly children: React.ReactNode }

export function Button({ children }: ButtonProps) {
  return <button className="rounded-md bg-blue-500 px-4 py-2 text-white">{children}</button>
}
```

#### hover-focus-and-other-states
[doc](https://tailwindcss.com/docs/hover-focus-and-other-states)

**O que é:** o catálogo de variantes: pseudoclasse (`hover`, `focus-visible`, `disabled`,
`first`, `nth-*`), `group-*` e `peer-*` com nome, `has-*`, filhos (`*:` e `**:`), pseudoelemento
(`before`, `placeholder`, `file`, `marker`, `selection`), media query (`dark`, `motion-reduce`,
`print`, `supports-*`), atributo (`aria-*`, `data-*`) e `not-*`.
**Para que serve:** expressar estado sem uma linha de JavaScript e sem CSS próprio.
**Quando usar:** o tempo todo. `group-*` e `peer-*` são os que mais economizam estado em React —
hover no card que muda o filho, e validação do input que revela a mensagem irmã, ambos sem `useState`.

```html
<!-- group: o filho reage ao estado do pai; o nome evita conflito quando há grupos aninhados -->
<li class="group/item flex items-center p-4">
  <span class="text-gray-900 group-hover/item:text-white">Ligar</span>
  <a class="group/edit invisible group-hover/item:visible" href="#">
    <span class="group-hover/edit:text-gray-700">Editar</span>
  </a>
</li>

<!-- peer: só funciona em irmão POSTERIOR, por causa do combinador ~ do CSS -->
<label class="block">
  <input type="email" class="peer border" />
  <p class="invisible peer-invalid:visible text-red-600">Informe um e-mail válido.</p>
</label>

<!-- data-* é a ponte com biblioteca de componente headless -->
<div data-state="open" class="opacity-0 data-[state=open]:opacity-100"></div>

<!-- empilhar lê da esquerda para a direita na v4 -->
<button class="dark:md:hover:bg-fuchsia-600">Salvar</button>
```

```html
<!-- ERRADO: `peer` depois do elemento que tenta reagir — o combinador ~ do CSS não alcança irmão anterior -->
<p class="peer-invalid:visible invisible text-red-600">Informe um e-mail válido.</p>
<input type="email" class="peer border" />

<!-- CERTO: `peer` vem primeiro, quem reage vem depois -->
<input type="email" class="peer border" />
<p class="invisible peer-invalid:visible text-red-600">Informe um e-mail válido.</p>
```

```tsx
// -components/user-row.tsx — grupo nomeado mostra a ação só no hover da própria linha
type UserRowProps = { readonly name: string }

export function UserRow({ name }: UserRowProps) {
  return (
    <li className="group/row flex items-center justify-between p-3">
      <span>{name}</span>
      <button className="invisible group-hover/row:visible text-sm text-blue-600">Editar</button>
    </li>
  )
}
```

#### responsive-design
[doc](https://tailwindcss.com/docs/responsive-design)

**O que é:** os cinco breakpoints padrão (`sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl`
96rem), o modelo mobile-first, as variantes `max-*`, e as container queries (`@container`, `@md:`,
`@max-md:`, container nomeado).
**Para que serve:** uma tela só que serve telefone e desktop.
**Quando usar:** em todo layout. A armadilha número um: **classe sem prefixo não é "só mobile"** —
ela vale em toda largura, e `sm:` significa "de 640px para cima".

```html
<!-- ERRADO: isto só centraliza de 640px para cima; no telefone fica alinhado à esquerda -->
<div class="sm:text-center"></div>

<!-- CERTO: sem prefixo é a base, o breakpoint é a exceção -->
<div class="text-center sm:text-left"></div>
```

```html
<!-- Container query: o filho responde à largura do CONTAINER, não do viewport.
     É o que faz um card funcionar tanto na sidebar quanto no conteúdo principal,
     sem saber onde foi colocado — algo que breakpoint de viewport não resolve. -->
<div class="@container">
  <div class="flex flex-col @md:flex-row"></div>
</div>

<!-- Faixa fechada: só entre md e xl -->
<div class="md:max-xl:flex"></div>
```

```tsx
// -components/user-grid.tsx — uma coluna no telefone, três a partir de lg
type UserGridProps = { readonly children: React.ReactNode }

export function UserGrid({ children }: UserGridProps) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{children}</div>
}
```

#### dark-mode
[doc](https://tailwindcss.com/docs/dark-mode)

**O que é:** a variante `dark:`, ligada por padrão a `prefers-color-scheme`, e como trocá-la por
classe ou por atributo de dado com `@custom-variant`.
**Para que serve:** dois temas na mesma marcação.
**Quando usar:** desde o início, porque acrescentar depois é caro. E note a conexão com a seção de
tokens do cabeçalho: **com token de tema, quase nenhum `dark:` é necessário** — o valor troca na
variável, e o utilitário fica igual nos dois temas. `dark:` fica para o que realmente muda de forma,
como inverter uma sombra ou trocar um ícone.

```css
@import "tailwindcss";

/* Sem isto, `dark:` obedece só ao sistema operacional e não há como o usuário escolher */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```js
// Inline no <head>, antes de pintar: fora dali, a página pisca no tema errado (FOUC)
document.documentElement.classList.toggle(
  'dark',
  localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

localStorage.theme = 'dark'      // escolha explícita
localStorage.removeItem('theme') // voltar a seguir o sistema
```

```ts
// hooks/use-theme.ts — lê o tema sem duplicar estado: useSyncExternalStore, nunca useState + effect
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getSnapshot() {
  return localStorage.theme ?? 'system'
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
```

#### detecting-classes-in-source-files
[doc](https://tailwindcss.com/docs/detecting-classes-in-source-files)

**O que é:** como o Tailwind acha as classes: lê os arquivos como texto puro, respeita o
`.gitignore`, pula `node_modules`, binários e lock files. E as ferramentas para corrigir o que a
heurística não alcança: `@source`, `@source not`, `@source inline()` e `source(none)`.
**Para que serve:** garantir que a classe existe no CSS final.
**Quando usar:** **na primeira classe que não aplica**. Duas causas cobrem quase tudo: nome montado
em runtime, e classe que só existe em pacote fora do escopo varrido.

```css
@import "tailwindcss";

/* biblioteca interna de componentes: fica em node_modules, que é ignorado por padrão */
@source "../node_modules/@acme/ui-lib";

/* pasta legada que não deve contribuir com classe nenhuma */
@source not "../src/legacy";

/* safelist: classe que só aparece em HTML vindo do banco.
   A expansão de chaves gera as 11 variações de uma vez. */
@source inline("{hover:,}bg-red-{50,{100..900..100},950}");
```

```jsx
// A regra que explica 90% dos casos: o nome precisa existir INTEIRO no arquivo.
// ERRADO — nem `bg-red-600` nem `bg-green-600` existem como token
<div className={`bg-${color}-600`} />

// CERTO
const tone = { red: 'bg-red-600', green: 'bg-green-600' }
<div className={tone[color]} />
```

```css
/* app.css — HTML de Post vindo do banco pode usar classe de prose que nunca aparece
   literalmente no código-fonte da aplicação; sem isto, o build apaga a classe */
@source inline("prose prose-img:rounded-lg prose-a:underline");
```

## Tema, cor e customização

#### theme
[doc](https://tailwindcss.com/docs/theme)

**O que é:** a diretiva `@theme` — o substituto do `tailwind.config.js`. Cada variável declarada ali
é ao mesmo tempo uma custom property CSS e uma instrução para gerar utilitários, organizada em
namespaces: `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`,
`--spacing-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*`, `--container-*`, `--ease-*`,
`--animate-*`, `--aspect-*`.
**Para que serve:** declarar o sistema de design num lugar só, em CSS, e ter os utilitários de graça.
**Quando usar:** **na definição do design system, antes da primeira tela**. É aqui que a seção de
tokens do cabeçalho se concretiza. Use `@theme` para o que deve virar utilitário; use `:root` para
variável CSS comum que não deve gerar classe.

```css
@import "tailwindcss";

@theme {
  /* nome de papel, não de pigmento */
  --color-primary: oklch(0.55 0.21 264);
  --color-danger: oklch(0.58 0.22 27);

  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);

  /* animação própria: os keyframes moram dentro do próprio @theme */
  --animate-fade-in-scale: fade-in-scale 0.3s ease-out;
  @keyframes fade-in-scale {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
}

/* Fechar a paleta: apaga TODAS as cores padrão e deixa só as suas.
   Vale quando o design system precisa ser obedecido, porque impede
   `bg-blue-500` de compilar — o erro deixa de ser questão de disciplina. */
@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-primary: oklch(0.55 0.21 264);
  --color-surface: oklch(0.98 0.005 264);
}
```

```css
/* básico — exatamente como a doc mostra: declarar e usar um tom novo */
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

```html
<div class="bg-mint-500">Mint</div>
```

```css
/* caso real da stack — paleta do projeto extraída por amostragem de cor, não escolhida à mão */
@theme {
  --color-primary: oklch(0.64 0.14 176); /* jade-vivo: acento, não superfície */
  --color-bg-base: oklch(0.17 0.03 185); /* verde-profundo: fundo padrão do app */
  --font-display: "Fraunces", serif;
}
```

#### colors
[doc](https://tailwindcss.com/docs/colors)

**O que é:** a paleta padrão — 22 famílias × 11 tons (50 a 950) em OKLCH — a lista de utilitários que
aceitam cor (`bg-`, `text-`, `border-`, `outline-`, `shadow-`, `ring-`, `accent-`, `caret-`, `fill-`,
`stroke-`) e o modificador de opacidade com barra.
**Para que serve:** ter um ponto de partida coerente sem escolher cor à mão.
**Quando usar:** ao montar a paleta. E é o lugar de reler a distinção do cabeçalho: a paleta é
**matéria-prima do tema**, não vocabulário da aplicação. `--color-primary: var(--color-blue-600)` é
certo; `bg-blue-600` espalhado em quarenta componentes é o que impede trocar o tema depois.

```css
@import "tailwindcss";

/* Desligar famílias que ninguém deve usar reduz ruído no autocomplete
   e dá erro de compilação em vez de revisão de código */
@theme {
  --color-lime-*: initial;
  --color-fuchsia-*: initial;
}

/* Opacidade em CSS próprio: --alpha() vira color-mix() */
@layer components {
  .overlay {
    background-color: --alpha(var(--color-gray-950) / 10%);
  }
}
```

```html
<!-- Na marcação, a barra faz o mesmo, e aceita valor arbitrário ou variável -->
<div class="bg-sky-500/10"></div>
<div class="bg-pink-500/[71.37%]"></div>
<div class="bg-cyan-400/(--my-alpha-value)"></div>
```

```tsx
// básico — escala completa num componente: hover troca o tom, não a família
type ButtonProps = { readonly children: React.ReactNode }

export function Button({ children }: ButtonProps) {
  return (
    <button className="bg-violet-500 px-4 py-2 text-white hover:bg-violet-600">{children}</button>
  )
}
```

#### adding-custom-styles
[doc](https://tailwindcss.com/docs/adding-custom-styles)

**O que é:** as quatro saídas quando o utilitário pronto não basta: valor arbitrário, `@layer base` e
`@layer components`, utilitário próprio com `@utility` (inclusive funcional, com `--value()` e
`--modifier()`), e variante própria com `@custom-variant`.
**Para que serve:** estender o framework sem sair dele.
**Quando usar:** na ordem em que a página apresenta — valor arbitrário resolve o caso único,
`@utility` resolve o caso que se repete, e `@layer components` fica por último. `@utility` é
estritamente melhor que o antigo `@layer utilities`: só ele funciona com variante (`hover:`, `lg:`).

```css
/* Utilitário simples: composto com variante normalmente */
@utility content-auto {
  content-visibility: auto;
}

/* Utilitário funcional: aceita valor do tema, valor nu e valor arbitrário */
@utility tab-* {
  tab-size: --value(--tab-size-*, integer, [integer]);
}

/* Variante própria: o tema por atributo de dado, sem tocar no JavaScript */
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

```html
<div class="hover:content-auto tab-4 theme-midnight:bg-black"></div>
```

```css
/* ERRADO (padrão v3): @layer utilities não compõe com variante */
@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}
```

```html
<!-- hover:content-auto não existe — @layer utilities não gera variante nenhuma -->
<div class="hover:content-auto"></div>
```

#### functions-and-directives
[doc](https://tailwindcss.com/docs/functions-and-directives)

**O que é:** a referência de todas as diretivas (`@import`, `@theme`, `@source`, `@utility`,
`@variant`, `@custom-variant`, `@apply`, `@reference`, `@config`, `@plugin`, `@layer`) e das funções
(`--alpha()`, `--spacing()`, e o `theme()` obsoleto).
**Para que serve:** a página de consulta quando você viu uma diretiva e não sabe o que ela faz.
**Quando usar:** como referência. Vale marcar `@variant` — é o inverso de `@custom-variant`: aplica
uma variante existente dentro de CSS próprio, o que evita duplicar seletor de tema à mão.

```css
/* @variant: usar a variante dark dentro de uma regra CSS comum */
.my-element {
  background: white;
  @variant dark {
    background: black;
  }
}

/* --spacing(): mesma escala dos utilitários, dentro de calc() */
.my-element {
  margin: --spacing(4);
}

/* @config e @plugin são as pontes com o ecossistema JavaScript da v3.
   corePlugins, safelist e separator NÃO são suportados. */
@config "../../tailwind.config.js";
@plugin "@tailwindcss/typography";
```

```css
/* básico — @apply, a diretiva mais usada da lista */
.btn {
  @apply rounded-md bg-blue-500 px-4 py-2 text-white;
}
```

```tsx
// caso real da stack — --spacing() mantém a altura de linha na mesma escala do tema,
// nunca um número solto, mesmo quando o valor precisa ir para um style inline
type StyleWithVars = React.CSSProperties & { '--row-height'?: string }

type UserListProps = { readonly children: React.ReactNode }

export function UserList({ children }: UserListProps) {
  const style: StyleWithVars = { '--row-height': 'calc(var(--spacing) * 14)' }
  return <div style={style}>{children}</div>
}
```

## Layout

#### display
[doc](https://tailwindcss.com/docs/display)

**O que é:** `block`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `inline-grid`,
`contents`, a família `table-*`, `hidden`, `sr-only` e `not-sr-only`.
**Para que serve:** decidir a caixa antes de qualquer outra coisa.
**Quando usar:** em todo layout. Guarde `sr-only`: é o jeito de dar nome acessível a botão só com
ícone, e `hidden` não serve para isso — `display: none` esconde do leitor de tela também.

```html
<!-- Botão de ícone com nome acessível: visível para o leitor de tela, invisível na tela -->
<button>
  <svg aria-hidden="true"><!-- ... --></svg>
  <span class="sr-only">Configurações</span>
</button>
```

#### position
[doc](https://tailwindcss.com/docs/position)

**O que é:** `static`, `relative`, `absolute`, `fixed` e `sticky`, e como cada um interpreta os
deslocamentos `top-*`, `right-*`, `bottom-*`, `left-*` e `inset-*`.
**Para que serve:** tirar um elemento do fluxo de propósito.
**Quando usar:** em dropdown, badge sobre avatar, cabeçalho fixo. A regra que resolve quase todo bug
de posicionamento: filho `absolute` se mede pelo ancestral **não estático** mais próximo — sem
`relative` no pai, ele escapa até o topo da página.

```html
<div class="relative">
  <p>Pai relativo</p>
  <div class="absolute bottom-0 left-0">Filho absoluto</div>
</div>
```

#### flex-direction
[doc](https://tailwindcss.com/docs/flex-direction)

**O que é:** `flex-row`, `flex-row-reverse`, `flex-col`, `flex-col-reverse`.
**Para que serve:** o eixo do flex container.
**Quando usar:** junto com `flex`. `flex flex-col gap-4` é o padrão que a própria doc de upgrade
recomenda no lugar de `space-y-4`, e ele funciona com quebra de linha e com ordem customizada, o que
`space-*` não faz.

```html
<!-- empilhado no telefone, lado a lado a partir de md -->
<div class="flex flex-col gap-4 md:flex-row"></div>
```

#### flex
[doc](https://tailwindcss.com/docs/flex)

**O que é:** o atalho da propriedade `flex`: `flex-<número>`, `flex-<fração>`, `flex-auto`,
`flex-initial`, `flex-none`, e as formas arbitrária e com variável.
**Para que serve:** decidir quem cresce, quem encolhe e quem fica firme.
**Quando usar:** sempre que um filho de flex se comportar mal. `flex-1` no conteúdo e `flex-none` no
que tem largura fixa (ícone, avatar, botão) resolve a maioria dos layouts de linha.

```html
<div class="flex items-center gap-3">
  <img class="flex-none size-10 rounded-full" src="..." alt="" />
  <p class="flex-1 truncate">Nome que pode ser muito longo</p>
  <button class="flex-none">Abrir</button>
</div>
```

#### justify-content
[doc](https://tailwindcss.com/docs/justify-content)

**O que é:** `justify-start`, `justify-end`, `justify-center`, `justify-between`, `justify-around`,
`justify-evenly`, `justify-stretch`, `justify-normal`, `justify-baseline`, mais as variantes
`-safe`.
**Para que serve:** distribuir no eixo principal.
**Quando usar:** em barra de topo, rodapé de card, grupo de botões. `justify-between` com dois filhos
é o padrão de "título à esquerda, ação à direita" e não precisa de margem nenhuma.

```html
<header class="flex items-center justify-between">
  <h1>Relatórios</h1>
  <button>Novo</button>
</header>
```

#### align-items
[doc](https://tailwindcss.com/docs/align-items)

**O que é:** `items-start`, `items-end`, `items-center`, `items-baseline`, `items-baseline-last`,
`items-stretch`.
**Para que serve:** alinhar no eixo transversal.
**Quando usar:** junto de `flex`. `items-center` alinha pelo centro da caixa; `items-baseline`
alinha pela linha de base do texto, e é o certo quando os itens têm tamanhos de fonte diferentes —
um preço grande ao lado de "por mês" só fica correto com baseline.

```html
<div class="flex items-baseline gap-1">
  <span class="text-4xl font-bold">R$ 49</span>
  <span class="text-sm text-gray-500">/mês</span>
</div>
```

#### grid-template-columns
[doc](https://tailwindcss.com/docs/grid-template-columns)

**O que é:** `grid-cols-<número>` (que expande para `repeat(n, minmax(0, 1fr))`), `grid-cols-none`,
`grid-cols-subgrid` e os valores arbitrários.
**Para que serve:** grade de verdade, em duas dimensões.
**Quando usar:** em listagem de cards e em formulário de múltiplas colunas. O `minmax(0, 1fr)` do
padrão é o detalhe que importa: sem ele, conteúdo longo estoura a coluna em vez de truncar.

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"></div>

<!-- Arbitrário usa sublinhado no lugar do espaço; na v4 vírgula não é mais aceita -->
<div class="grid grid-cols-[200px_minmax(900px,1fr)_100px]"></div>
```

#### gap
[doc](https://tailwindcss.com/docs/gap)

**O que é:** `gap-<número>`, `gap-x-*` e `gap-y-*`, todos derivados de `--spacing`.
**Para que serve:** espaço entre filhos de flex ou grid, sem margem.
**Quando usar:** **como primeira opção de espaçamento entre irmãos**. Ele não vaza para fora do
container, não colapsa, e funciona com quebra de linha — os três defeitos de margem que custam mais
tempo. A própria doc de margem manda preferir `gap` a `space-*`.

```html
<div class="grid grid-cols-3 gap-x-8 gap-y-4"></div>
```

```html
<!-- básico -->
<div class="flex gap-4">
  <div>01</div>
  <div>02</div>
</div>
```

```tsx
// caso real da stack — flex flex-col gap-4 é o padrão que a própria doc de upgrade recomenda
type FormFieldsProps = { readonly children: React.ReactNode }

export function FormFields({ children }: FormFieldsProps) {
  return <div className="flex flex-col gap-4">{children}</div>
}
```

#### max-width
[doc](https://tailwindcss.com/docs/max-width)

**O que é:** `max-w-3xs` a `max-w-7xl` ligados às variáveis `--container-*`, mais `max-w-full`,
`max-w-none`, `max-w-screen` e as unidades de viewport dinâmico.
**Para que serve:** limitar largura de leitura e centralizar conteúdo.
**Quando usar:** em todo container de página e em todo bloco de texto corrido. Atenção à mudança de
hábito da v4: `container` **não centraliza nem tem padding** — a doc é explícita, e o certo é
`container mx-auto px-4`. Na prática, `max-w-7xl mx-auto px-4` costuma ser mais previsível.

```html
<div class="mx-auto max-w-7xl px-4">
  <article class="max-w-prose">Texto com largura de leitura confortável.</article>
</div>
```

## Espaçamento e dimensionamento

#### padding
[doc](https://tailwindcss.com/docs/padding)

**O que é:** `p-*`, `px-*`/`py-*` (que emitem `padding-inline`/`padding-block`), `pt/pr/pb/pl`, os
lógicos `ps-*`/`pe-*` e `pbs-*`/`pbe-*`, e a escala derivada de `--spacing`.
**Para que serve:** respiro interno.
**Quando usar:** o tempo todo. Em aplicação que pode virar árabe ou hebraico, prefira `ps-`/`pe-` a
`pl-`/`pr-`: eles seguem a direção do texto e dispensam duplicar tudo com `rtl:`.

```css
/* A escala inteira sai de uma variável só: mudar aqui reescala o produto inteiro */
@theme {
  --spacing: 0.25rem;
}
```

```html
<div class="p-6 md:p-8">
  <button class="px-4 py-2">Salvar</button>
</div>
```

#### margin
[doc](https://tailwindcss.com/docs/margin)

**O que é:** `m-*`, `mx/my`, `mt/mr/mb/ml`, os lógicos `ms-*`/`me-*`, margem negativa (`-mt-8`),
`m-auto`, e os utilitários `space-x-*`/`space-y-*`.
**Para que serve:** espaço externo e centralização horizontal com `mx-auto`.
**Quando usar:** para empurrar **um** elemento. Para espaçar uma lista, `gap` é melhor, e a doc diz
por quê: `space-*` é atalho de margem em todos menos o último e "aren't designed to handle complex
cases like grids, layouts that wrap, or situations where the children are rendered in a complex
custom order".

```html
<!-- Evite: quebra quando a lista embrulha ou muda de ordem -->
<div class="flex space-x-4"></div>

<!-- Prefira -->
<div class="flex gap-4"></div>

<!-- Margem negativa tem um uso legítimo: sobreposição controlada -->
<div class="flex -space-x-2">
  <img class="size-10 rounded-full ring-2 ring-white" src="..." alt="" />
  <img class="size-10 rounded-full ring-2 ring-white" src="..." alt="" />
</div>
```

```html
<!-- básico -->
<div class="mx-auto w-32">mx-auto</div>
```

```tsx
// caso real da stack
type PageContainerProps = { readonly children: React.ReactNode }

export function PageContainer({ children }: PageContainerProps) {
  return <div className="mx-auto max-w-3xl px-4">{children}</div>
}
```

#### width
[doc](https://tailwindcss.com/docs/width)

**O que é:** `w-<número>` pela escala de `--spacing`, frações (`w-1/2`), `w-full`, `w-screen`,
`w-min`/`w-max`/`w-fit`, a escala de container (`w-sm` a `w-7xl`), as unidades `dvw`/`lvw`/`svw`, e
o atalho `size-*`.
**Para que serve:** largura.
**Quando usar:** com parcimônia. Largura fixa é a causa mais comum de quebra de responsividade —
`w-full` dentro de um pai com `max-w-*` dá o mesmo resultado e sobrevive a qualquer viewport.

```html
<!-- size-* evita a dupla w-10 h-10, que dessincroniza quando alguém edita só uma -->
<img class="size-10 rounded-full" src="..." alt="" />

<input class="w-full rounded-md border px-3 py-2" />
```

#### height
[doc](https://tailwindcss.com/docs/height)

**O que é:** `h-<número>`, frações, `h-full`, `h-screen`, `h-dvh`/`h-lvh`/`h-svh`, `h-min`/`h-max`/
`h-fit`, `h-lh` e o `size-*`.
**Para que serve:** altura.
**Quando usar:** raramente, e com cuidado no full screen. **`h-screen` é `100vh`, que no navegador
móvel ignora a barra de endereço** e corta o conteúdo; `h-dvh` acompanha a barra e é o que se quer
em tela cheia de telefone.

```html
<!-- ERRADO em telefone: 100vh não desconta a barra do navegador -->
<div class="h-screen"></div>

<!-- CERTO: viewport dinâmico -->
<div class="h-dvh"></div>
```

```html
<!-- básico -->
<div class="h-32 w-32 bg-sky-500"></div>
```

```tsx
// caso real da stack — conteúdo do dialog ocupa a tela em mobile sem cortar atrás da barra do navegador
type DialogContentProps = { readonly children: React.ReactNode }

export function DialogContent({ children }: DialogContentProps) {
  return (
    <div className="h-dvh w-full overflow-y-auto p-4 sm:h-auto sm:max-h-[85vh]">{children}</div>
  )
}
```

## Tipografia

#### font-family
[doc](https://tailwindcss.com/docs/font-family)

**O que é:** `font-sans`, `font-serif`, `font-mono`, a forma arbitrária, a sintaxe
`font-(family-name:--var)` e as variáveis `--font-*`, com `--font-*--font-feature-settings` e
`--font-*--font-variation-settings`.
**Para que serve:** declarar as famílias do projeto uma vez.
**Quando usar:** ao conectar a fonte do projeto. O par `@theme inline` + `--font-sans` é o encaixe
com carregadores que geram uma variável (como o de fontes do Next.js): sem `inline`, a resolução por
escopo pode falhar.

```css
@theme {
  --font-display: "Oswald", sans-serif;
  --font-display--font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  --font-display--font-variation-settings: "opsz" 32;
}

/* A fonte carregada pelo framework expõe uma variável; inline copia o valor */
@theme inline {
  --font-sans: var(--font-inter);
}
```

#### font-size
[doc](https://tailwindcss.com/docs/font-size)

**O que é:** `text-xs` a `text-9xl`, cada um com uma altura de linha padrão embutida, o modificador
`text-sm/6`, e as variáveis `--text-*` com os sufixos `--line-height`, `--letter-spacing` e
`--font-weight`.
**Para que serve:** uma escala tipográfica fechada, em vez de tamanho ad hoc.
**Quando usar:** em todo texto. O detalhe que poucos usam: um degrau da escala pode carregar altura
de linha, espaçamento de letra e peso juntos — o que transforma `text-tiny` num token completo em
vez de só um tamanho.

```css
@theme {
  --text-tiny: 0.625rem;
  --text-tiny--line-height: 1.5rem;
  --text-tiny--letter-spacing: 0.125rem;
  --text-tiny--font-weight: 500;
}
```

```html
<p class="text-sm/6">Tamanho e altura de linha numa classe só.</p>
<p class="text-tiny">Quatro propriedades numa classe só.</p>
```

#### font-weight
[doc](https://tailwindcss.com/docs/font-weight)

**O que é:** `font-thin` (100) a `font-black` (900), valores arbitrários, e as variáveis
`--font-weight-*`.
**Para que serve:** hierarquia sem mudar tamanho.
**Quando usar:** em título, rótulo e ênfase. Cuidado com fonte que não tem o peso pedido: o navegador
sintetiza um negrito falso e o resultado fica sujo — declare só os pesos que a fonte realmente
entrega.

```css
@theme {
  --font-weight-extrablack: 1000;
}
```

```html
<h2 class="text-xl font-semibold">Título de seção</h2>
```

#### line-height
[doc](https://tailwindcss.com/docs/line-height)

**O que é:** o atalho `text-<tamanho>/<número>`, `leading-none` e `leading-<número>` derivado de
`--spacing`, além das formas arbitrária e com variável.
**Para que serve:** ritmo vertical do texto.
**Quando usar:** em texto corrido e em título grande. Título com a altura padrão fica frouxo —
`leading-none` ou `leading-tight` é quase sempre o certo acima de `text-4xl`; o atalho
`text-4xl/tight` faz as duas coisas numa classe.

```html
<h1 class="text-5xl leading-none font-bold">Título</h1>
<p class="text-base/7">Parágrafo com respiro maior para leitura longa.</p>
```

#### text-color
[doc](https://tailwindcss.com/docs/color)

**O que é:** `text-<cor>`, `text-inherit`/`text-current`/`text-transparent`, o modificador de
opacidade com barra, as formas arbitrária e `text-(--var)`.
**Para que serve:** cor de texto.
**Quando usar:** em todo texto que não herda. É onde a distinção do cabeçalho mais dói: o par
`text-gray-900 dark:text-white` se repete em toda a aplicação e alguém sempre esquece o `dark:`. Com
token (`text-foreground`, `text-muted`), o esquecimento deixa de ser possível.

```html
<!-- Espalhado, e cada ocorrência precisa do seu par escuro -->
<p class="text-gray-900 dark:text-white">Título</p>
<p class="text-gray-500 dark:text-gray-400">Descrição</p>

<!-- Com token de papel, o tema mora na variável -->
<p class="text-foreground">Título</p>
<p class="text-muted">Descrição</p>
```

## Cor, borda e sombra

#### background-color
[doc](https://tailwindcss.com/docs/background-color)

**O que é:** `bg-<cor>`, `bg-transparent`/`bg-current`/`bg-inherit`, opacidade com barra, forma
arbitrária e `bg-(--var)`.
**Para que serve:** fundo.
**Quando usar:** o tempo todo, e é o utilitário em que a regra do token mais rende — fundo é o que
muda em peso quando o tema muda. Vale conhecer `bg-sky-500/10` para estado sutil: em vez de uma cor
clara nova na paleta, é a mesma cor com alfa, que funciona sobre qualquer fundo.

```html
<button class="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white">Salvar</button>

<div class="bg-sky-500/10 text-sky-700 rounded-md p-3">Aviso informativo</div>
```

#### border-radius
[doc](https://tailwindcss.com/docs/border-radius)

**O que é:** `rounded-xs` a `rounded-4xl`, `rounded-none`, `rounded-full`, por lado (`rounded-t-*`),
por canto (`rounded-tl-*`), os lógicos (`rounded-s-*`, `rounded-ss-*`) e as variáveis `--radius-*`.
**Para que serve:** arredondamento.
**Quando usar:** em card, botão, input e avatar. Padronize num token cedo: `--radius-*` no `@theme`
faz o produto inteiro mudar de personalidade numa linha, e `rounded-[7px]` espalhado impede isso.

```css
@theme {
  --radius-5xl: 3rem;
}
```

```html
<!-- Filho com raio calculado a partir do pai, descontando a borda -->
<div class="relative rounded-xl border p-px">
  <div class="rounded-[calc(var(--radius-xl)-1px)] bg-white"></div>
</div>
```

#### border-width
[doc](https://tailwindcss.com/docs/border-width)

**O que é:** `border`, `border-<número>`, por lado (`border-t`), `border-x`/`border-y`, os lógicos
(`border-s`, `border-e`, `border-bs`, `border-be`) e `divide-x`/`divide-y` para separar filhos.
**Para que serve:** borda e divisor.
**Quando usar:** em card, tabela e lista. Lembre da mudança da v4: **`border` sozinho usa
`currentColor`**, não mais `gray-200`. Borda que "sumiu" ou saiu da cor do texto na migração é
sempre isto.

```html
<!-- v4: a cor é obrigatória se você não quer a cor do texto -->
<div class="rounded-lg border border-gray-200 p-4"></div>

<!-- divide-y aplica a borda entre os filhos, sem uma no fim da lista -->
<ul class="divide-y divide-gray-200">
  <li class="py-3">Um</li>
  <li class="py-3">Dois</li>
</ul>
```

```html
<!-- básico -->
<div class="border-2 border-indigo-500"></div>
```

```tsx
// caso real da stack — usa o token de borda do tema (--color-border), não um cinza fixo
type CardProps = { readonly children: React.ReactNode }

export function Card({ children }: CardProps) {
  return <div className="rounded-lg border border-border bg-background p-4">{children}</div>
}
```

#### box-shadow
[doc](https://tailwindcss.com/docs/box-shadow)

**O que é:** `shadow-2xs` a `shadow-2xl` e `shadow-none`, a cor da sombra (`shadow-indigo-500`), os
`inset-shadow-*`, e a relação com `ring-*` e `inset-ring-*`.
**Para que serve:** elevação e contorno.
**Quando usar:** em card, dropdown e estado de foco. Note o deslocamento de nomes na v4: o `shadow`
da v3 virou `shadow-sm`, e o `shadow-sm` virou `shadow-xs` — projeto migrado à mão fica com sombra
um degrau mais forte em toda parte. `ring` também mudou: 1px e `currentColor`, contra 3px e
`blue-500` da v3.

```html
<div class="rounded-lg bg-white shadow-md">Card</div>

<!-- Foco visível sem deslocar layout: ring é box-shadow, não ocupa espaço -->
<input class="rounded-md border px-3 py-2 focus:ring-3 focus:ring-primary focus:outline-none" />
```

## Movimento

#### transition-property
[doc](https://tailwindcss.com/docs/transition-property)

**O que é:** `transition` (um conjunto curado de propriedades), `transition-all`,
`transition-colors`, `transition-none`, com duração padrão de 150ms e curva
`cubic-bezier(0.4, 0, 0.2, 1)`.
**Para que serve:** suavizar mudança de estado.
**Quando usar:** em hover, foco e abertura de painel. Prefira `transition` ou `transition-colors` a
`transition-all`: `all` anima propriedade que você não pediu — inclusive `height` e `width`, que
disparam layout a cada quadro. E respeite `prefers-reduced-motion`, que não é detalhe de
acessibilidade opcional.

```html
<button class="bg-primary transition-colors duration-200 hover:bg-primary/90">Salvar</button>

<button class="transition hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none">
  Sobe no hover, quieto para quem pediu menos movimento
</button>
```

#### animation
[doc](https://tailwindcss.com/docs/animation)

**O que é:** `animate-spin`, `animate-ping`, `animate-pulse`, `animate-bounce`, `animate-none`, e a
criação de animação própria pelas variáveis `--animate-*` com `@keyframes` dentro do `@theme`.
**Para que serve:** as animações repetitivas que toda aplicação precisa.
**Quando usar:** `animate-spin` em botão carregando, `animate-pulse` em esqueleto de carregamento.
Use `motion-safe:` em vez de `animate-` cru: quem configurou menos movimento no sistema operacional
costuma ter motivo vestibular para isso.

```css
@theme {
  --animate-wiggle: wiggle 1s ease-in-out infinite;
  @keyframes wiggle {
    0%, 100% { transform: rotate(-3deg); }
    50%      { transform: rotate(3deg); }
  }
}
```

```html
<svg class="mr-3 size-5 motion-safe:animate-spin"><!-- ... --></svg>
<div class="h-4 w-32 rounded bg-gray-200 motion-safe:animate-pulse"></div>
```

## Plugins

#### typography-plugin
[doc](https://github.com/tailwindlabs/tailwindcss-typography)

**O que é:** o plugin `@tailwindcss/typography`, que dá a classe `prose` — um conjunto de estilos
tipográficos para HTML que você **não** controla.
**Para que serve:** renderizar Markdown, conteúdo de CMS ou HTML de editor de texto com aparência
decente, sem poder pôr classe em cada tag.
**Quando usar:** exatamente nesse caso, e **só nele**. `prose` é o oposto do método do framework —
estiliza por elemento — e é por isso que resolve o problema que o utilitário não resolve. Aplicá-lo
em marcação própria devolve todos os defeitos do CSS global.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

```html
<!-- prose-invert é o tema escuro desenhado à mão do plugin -->
<article class="prose dark:prose-invert lg:prose-xl prose-headings:underline prose-a:text-blue-600">
  <!-- HTML vindo do Markdown -->
</article>

<!-- not-prose isola um trecho: o que está aqui dentro não recebe estilo de prose -->
<div class="not-prose">
  <table><!-- tabela com utilitários próprios --></table>
</div>
```

```tsx
// caso real da stack — HTML de Markdown vindo do campo `body` do Post
type PostContentProps = { readonly html: string }

export function PostContent({ html }: PostContentProps) {
  return (
    <article className="prose dark:prose-invert lg:prose-lg" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
```

