# Phosphor (React)

> Conferido em 2026-10-14 contra o README do pacote (cru, `raw.githubusercontent.com/phosphor-icons/react/master/README.md`),
> o README do projeto (`phosphor-icons/homepage`), o código de `src/lib/IconBase.tsx`, a página
> `docs/cli` do shadcn (versão `.md`) e o tipo publicado de `@phosphor-icons/react@2.1.10`
> (`npm pack` + `.d.ts` e o JS de `dist/lib/`, sem rodar no navegador).
>
> **O HTML do github.com responde 403 nesta rede**: os links `[doc]` para o GitHub apontam para a
> âncora certa do README, mas o texto foi lido pelo `[markdown]` cru. **`phosphoricons.com` é uma
> SPA**: o HTML servido é só a casca ("Enable JavaScript"), sem `llms.txt`; o catálogo de ícones só
> existe com JavaScript. O pacote antigo `phosphor-react` foi substituído por este, com a mesma API.

Família de ícones SVG para React: 1.512 componentes em seis pesos (`thin`, `light`, `regular`,
`bold`, `fill`, `duotone`), estilizáveis por prop ou por um contexto comum.

**O que é:** cada ícone é um componente `forwardRef` que renderiza um `<svg viewBox="0 0 256 256">`
e aceita toda prop de `<svg>` mais `color`, `size`, `weight`, `mirrored` e `alt`. O nome
canônico tem sufixo `Icon` (`HorseIcon`); o nome sem sufixo (`Horse`) ainda é exportado, marcado
`@deprecated` no `.d.ts`. `IconContext` aplica padrões a todos os ícones abaixo dele.

**Para que serve:** o único conjunto de ícones da casa (`_standards/tooling.md` §0.1), nos
componentes gerados pelo shadcn (`"iconLibrary": "phosphor"`, `_doc-lib/shadcn.md#docs/components-json`)
e no código das rotas. `lucide-react`, `react-icons`, `@tabler/icons-react` e SVG de ícone colado à
mão estão fora.

**Como usar:**

```bash
pnpm add @phosphor-icons/react
```

```tsx
// __root.tsx: um peso para o app inteiro, ícone decorativo por padrão (frontend.md §10)
import { IconContext } from '@phosphor-icons/react'

export function IconProvider({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <IconContext.Provider value={{ size: '1em', weight: 'regular', 'aria-hidden': true }}>
      {children}
    </IconContext.Provider>
  )
}

// uso: import nomeado, sufixo Icon; o nome acessível fica no botão, não no ícone
import { TrashIcon } from '@phosphor-icons/react'

<Button variant="ghost" size="icon" aria-label={m.post_delete()}>
  <TrashIcon />
</Button>
```

**Quando adotar a biblioteca:** em todo projeto com frontend, desde o primeiro componente do shadcn.
Projeto com outra biblioteca de ícones migra (`_standards/MIGRATIONS.md`), começando pelo
`shadcn migrate icons` (entrada `docs/cli#migrate-icons`, no fim).

**O que muda a experiência:**

1. **O `value` do `IconContext.Provider` substitui o padrão inteiro, não mescla.** O padrão do
   contexto traz `size: '1em'`; um Provider com `{ weight: 'bold' }` só zera o `size`, e o `<svg>`
   sai sem `width`/`height`, ocupando a largura do contêiner onde nenhuma classe o limita. Repita
   `size` no `value`.
2. **O ícone não é escondido do leitor de tela por padrão.** O componente não põe `aria-hidden`
   nem `role`; `alt` só acrescenta um `<title>` dentro do `<svg>`. A régua quer o decorativo com
   `aria-hidden` (`frontend.md` §10): ponha no `IconContext` (o contexto repassa props de SVG) e
   desligue com `aria-hidden={false}` + `alt` no raro ícone que carrega sentido sozinho.
3. **`color` padrão é `currentColor`** e o tamanho padrão é `1em`: o ícone herda a cor e o corpo do
   texto. Classe Tailwind (`size-4`, `text-muted-foreground`) no ícone vence os atributos, que é
   como o componente gerado pelo shadcn o dimensiona.
4. **TanStack Start não é RSC.** O import da raiz funciona no SSR e lê o `IconContext`. O subpath
   `@phosphor-icons/react/ssr` existe para Server Component, não lê contexto, e por isso perderia o
   peso e o `aria-hidden` comuns: não use na stack.
5. **Um peso por tela.** `weight` misturado é antipadrão da casa (`frontend.md` §10, "famílias e
   espessuras de ícone misturadas"); o peso mora no `IconContext`, e `weight` por ícone só para
   estado (estrela vazia `regular`, cheia `fill`).

**Links:** 14

**Skills:** `maiyu-frontend`, `web-accessibility` (nome acessível de botão só de ícone),
`impeccable` (escolha e consistência de ícone). Dispare junto com a leitura da entrada; a entrada é
o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Começo

#### phosphoricons.com
[doc](https://phosphoricons.com/)
**O que é:** o catálogo navegável dos ícones, com busca, troca de peso e cópia do nome.
**Para que serve:** achar o nome do componente (`MagnifyingGlass` → `MagnifyingGlassIcon`).
**Quando usar:** ao escolher ícone. Página não conferida em texto: é SPA e o HTML servido não tem
conteúdo sem JavaScript; o nome final se confere no `.d.ts` (`dist/csr/<Nome>.d.ts`).

#### phosphor-icons/homepage
[doc](https://github.com/phosphor-icons/homepage) | [markdown](https://raw.githubusercontent.com/phosphor-icons/homepage/master/README.md)
**O que é:** a visão geral do projeto: seis pesos, desenho em grade de 16 px e os pacotes por
plataforma (web, React, Vue, Flutter, Elm...).
**Para que serve:** saber que o ícone foi desenhado para ler bem pequeno, e que existem portas para
outras plataformas.
**Quando usar:** leitura de contexto. A contagem "1,248 icons" desta página está atrás do pacote
(1.512 componentes em `dist/csr/` na 2.1.10). Os exemplos React dela usam o nome sem sufixo
(`Smiley`, `Horse`), hoje `@deprecated`. Os pacotes web, Vue, Flutter e Elm estão fora da stack.

#### react#installation
[doc](https://github.com/phosphor-icons/react#installation) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** a instalação do pacote `@phosphor-icons/react`.
**Para que serve:** o nome certo do pacote; `phosphor-react` é o antigo.
**Quando usar:** ao adicionar a dependência: `pnpm add @phosphor-icons/react` (o README mostra
`npm i`). Peer: `react` e `react-dom` `>= 16.8`.

## Uso

#### react#usage
[doc](https://github.com/phosphor-icons/react#usage) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** import nomeado do ícone e uso como componente, com `color`, `weight` e `size`.
**Para que serve:** o README afirma tree-shaking: o bundle leva só os ícones importados. O pacote
declara `"sideEffects": false` e é ESM (`"type": "module"`).
**Quando usar:** sempre: `import { HeartIcon } from '@phosphor-icons/react'`, um ícone por nome.

#### react#props
[doc](https://github.com/phosphor-icons/react#props) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** as props próprias: `color` (qualquer cor CSS, `currentColor` incluído), `size`
(número ou string com unidade), `weight` (`"thin" | "light" | "regular" | "bold" | "fill" |
"duotone"`), `mirrored` (espelha na horizontal) e `alt` (texto alternativo). Toda prop de `<svg>`
passa adiante (`className`, `style`, `onClick`).
**Para que serve:** o tipo é `IconProps extends ComponentPropsWithoutRef<"svg">`, com `IconWeight`
exportado para tipar prop de componente que repassa peso.
**Quando usar:** `className` para tamanho e cor (Tailwind, tokens do tema do projeto), em vez de
`color` com valor literal. `mirrored` para seta e "voltar" em idioma RTL; nenhum idioma da
casa (pt-BR, es, en) é RTL. `alt` renderiza `<title>`, o que não dispensa o `aria-label` do botão.

```tsx
import type { IconWeight } from '@phosphor-icons/react'
import { StarIcon } from '@phosphor-icons/react'

const weightByState = { on: 'fill', off: 'regular' } as const satisfies Record<'on' | 'off', IconWeight>

<StarIcon weight={weightByState[state]} className="size-4 text-primary" />
```

#### react#context
[doc](https://github.com/phosphor-icons/react#context) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** `IconContext.Provider` aplica padrões (`color`, `size`, `weight`, `mirrored`) a todos
os ícones abaixo; o mais próximo vence, e props de SVG no `value` (`aria-label`, `className`)
também descem para os ícones.
**Para que serve:** peso e acessibilidade decididos uma vez, na raiz.
**Quando usar:** um Provider em `__root.tsx` (exemplo no topo). O `value` substitui o padrão
inteiro: inclua `size`. Não ponha `aria-label` no contexto: daria o mesmo nome a todo ícone.

## Bundle e SSR

#### react#import-performance-optimization
[doc](https://github.com/phosphor-icons/react#import-performance-optimization) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** o aviso de que importar da raiz pode fazer o bundler transpilar os 9.000+ módulos em
desenvolvimento, e a alternativa por caminho: `@phosphor-icons/react/dist/csr/<Nome>`.
**Para que serve:** encurtar o tempo de compilação em dev; o build de produção já faz tree-shaking.
**Quando usar:** só se o dev do Vite ficar lento por causa do pacote: o Vite pré-empacota a
dependência uma vez (`optimizeDeps`, `_doc-lib/vitejs.md`). O caminho `dist/csr/` é público no
`exports` do pacote, mas acopla o código à estrutura de build; a casa importa da raiz.

#### react#nextjs-specific-optimizations
[doc](https://github.com/phosphor-icons/react#nextjs-specific-optimizations) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
Fora da stack: `optimizePackageImports` do `next.config.js`, específico do Next.js.

#### react#react-server-components-and-ssr
[doc](https://github.com/phosphor-icons/react#react-server-components-and-ssr) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** o subpath `@phosphor-icons/react/ssr`, para Server Component ou ambiente sem Context
API; essa variante (`SSRBase`) não herda o `IconContext`.
**Para que serve:** ícone em Server Component do Next.js.
**Quando usar:** nunca na stack. TanStack Start renderiza no servidor com React comum, onde o
contexto funciona, e não usa RSC (`components.json` com `"rsc": false`). Conferido no pacote: o
`exports["./ssr"]` existe, com `import` em `dist/ssr/index.es.js`.

#### react#imports
[doc](https://github.com/phosphor-icons/react#imports) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** import de todos os ícones como namespace (`import * as Icon`), com o aviso de que,
conforme o bundler, isso impede o tree-shaking.
**Para que serve:** ícone escolhido por nome em tempo de execução.
**Quando usar:** não use. Ícone dinâmico vem de um lookup object com os ícones importados por nome
(`satisfies Record<Chave, Icon>`), que mantém o bundle e o tipo.

```tsx
import type { Icon } from '@phosphor-icons/react'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@phosphor-icons/react'

const statusIcon = {
  PAID: CheckCircleIcon,
  PENDING: ClockIcon,
  CANCELLED: XCircleIcon,
} as const satisfies Record<OrderStatus, Icon>
```

## Extensão e acessibilidade

#### react#composability
[doc](https://github.com/phosphor-icons/react#composability) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** filhos SVG válidos (`<animate>`, forma de fundo, filtro) são inseridos **abaixo** do
desenho do ícone, no espaço de coordenadas 256 × 256.
**Para que serve:** compor ou animar o ícone sem copiar o SVG.
**Quando usar:** raramente. Animação de ícone respeita `prefers-reduced-motion` (`frontend.md`
§10), o que `<animate>` em SVG não faz sozinho; prefira classe CSS com `motion-safe:`.

#### react#custom-icons
[doc](https://github.com/phosphor-icons/react#custom-icons) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/README.md)
**O que é:** ícone próprio com `IconBase`, um `Map<IconWeight, ReactElement>` com o conteúdo do
SVG por peso (grade 256 × 256) e o tipo `Icon`; `SSRBase` para Server Component.
**Para que serve:** o logotipo ou o ícone de domínio que o Phosphor não tem, com o mesmo `size`,
`color`, peso e contexto.
**Quando usar:** é o único caminho para SVG de ícone próprio: "SVG de ícone colado à mão" está fora
(`tooling.md` §0.1). O componente mora em `components/common/` quando 2+ rotas o usam. O exemplo do
README usa `forwardRef`; no React 19, `ref` é prop comum e `IconProps` já a inclui
(`RefAttributes<SVGSVGElement>`).

#### react/src/lib/IconBase.tsx
[doc](https://github.com/phosphor-icons/react/blob/master/src/lib/IconBase.tsx) | [markdown](https://raw.githubusercontent.com/phosphor-icons/react/master/src/lib/IconBase.tsx)
**O que é:** o componente que todo ícone renderiza: lê o `IconContext`, resolve `size`, `color`,
`weight` e `mirrored`, espalha as props restantes do contexto e depois as do ícone no `<svg>`, e
põe `<title>{alt}</title>` quando há `alt`.
**Para que serve:** a fonte da regra de acessibilidade, que o README não descreve: não há
`aria-hidden`, `role` nem `focusable` automáticos, e a prop do ícone vence a do contexto.
**Quando usar:** ao decidir acessibilidade de ícone. Na casa: decorativo herda `aria-hidden` do
contexto; botão só de ícone tem `aria-label` por `m.*()` no `<button>` (`frontend.md` §10); ícone
com sentido próprio, raro, leva `aria-hidden={false}`, `role="img"` e `alt`.

## Integração com o shadcn

#### docs/cli#migrate-icons
[doc](https://ui.shadcn.com/docs/cli#migrate-icons) | [markdown](https://ui.shadcn.com/docs/cli.md)
**O que é:** `shadcn migrate icons` reescreve import e JSX de ícone nos componentes de `ui`,
instala a biblioteca de destino e grava `iconLibrary` no `components.json`. Aceita `lucide`,
`tabler`, `hugeicons`, `phosphor`, `remixicon` e `radix`; `--from`/`--to` sem perguntas; com
caminho ou glob, migra só aqueles arquivos e não toca o `components.json`.
**Para que serve:** o passo mecânico da migração de `lucide-react` para Phosphor.
**Quando usar:** na migração de `tooling.md` §0.1. Rode sem caminho primeiro (componentes de `ui`
e `components.json`) e depois com glob no resto do código; o ícone sem equivalente fica intocado e
listado no fim, para troca manual. Depois, `pnpm remove lucide-react` e o `no-restricted-imports`
do ESLint (`tooling.md` §4) fecham a porta.

```bash
pnpm dlx shadcn@latest migrate icons --from lucide --to phosphor --yes
pnpm dlx shadcn@latest migrate icons "src/**" --from lucide --to phosphor --yes
```
