# Motion (React)

> Conferido em 2026-10-14 contra as 44 páginas (versão `.md` de cada uma) e contra o tipo publicado
> de `motion@14.2.0` / `framer-motion@14.2.0` (`npm pack` + `.d.ts`, sem rodar código).
>
> **Motion+ é pago** e vem de um registro privado (`api.motion.dev`), instalado como
> `"motion-plus": "npm:@motionplus/core@^2.12.0"` com token de membro. O `motion-plus` público do
> npm não é esse canal. `AnimateNumber`, `Carousel`, `Cursor`, `Gallery`, `ScrambleText`, `Ticker`,
> `Typewriter`, `AnimateActivity` e `splitText` são Motion+; as entradas estão marcadas.

Biblioteca de animação para React (antigo Framer Motion): componente `motion.*`, saída animada,
animação de layout, gesto, arraste, scroll e valores de movimento fora do ciclo de render.

**O que é:** o pacote `motion` reexporta o `framer-motion` em `motion/react` (`export * from
'framer-motion'`). O componente `motion.div` (e todo elemento HTML/SVG) aceita `initial`, `animate`,
`exit`, `whileHover`, `whileTap`, `whileInView`, `drag` e `layout`; os hooks (`useMotionValue`,
`useScroll`, `useSpring`, `useTransform`) produzem `MotionValue`, que muda o estilo sem re-render
do React.

**Para que serve:** o que o CSS e o Base UI **não** fazem bem: animação de layout (elemento que
muda de lugar ou de tamanho), saída de elemento que não é primitivo do Base UI, gesto e arraste com
física, reordenação por arraste, animação ligada ao scroll com valor intermediário, número que
conta. Hover, foco, abrir e fechar popup são do CSS e dos atributos `data-*` do Base UI
(`_doc-lib/base-ui.md#react/handbook/animation`), sem esta biblioteca.

**Como usar:**

```bash
pnpm add motion
```

```tsx
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'

// raiz (__root.tsx): carga mínima, preferência do sistema respeitada, nonce para a CSP
export function MotionProvider({ children, nonce }: Readonly<{ children: React.ReactNode; nonce: string }>): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" nonce={nonce}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}

// uso: m.div (não motion.div) dentro do LazyMotion strict
<AnimatePresence>
  {open && <m.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
</AnimatePresence>
```

**Quando adotar a biblioteca:** quando a tela precisa de animação de layout, gesto, arraste, scroll
com valor intermediário ou saída fora do Base UI, e o CSS nativo (transição, `@starting-style`,
scroll-driven, View Transitions) não resolve. Adoção é decisão do projeto, registrada em
`docs/DECISIONS.md` (`frontend.md` §6.4). Não use para o que o `data-starting-style`/
`data-ending-style` do Base UI já anima.

**O que muda a experiência:**

1. **`LazyMotion` + `m`** em vez de `motion`: o `motion.div` carrega todas as features; o `m.div`
   dentro de `LazyMotion features={domAnimation}` carrega só animação, saída e gesto. `strict` faz
   o `motion.div` esquecido lançar erro. `domMax` acrescenta arraste e layout.
2. **`MotionConfig reducedMotion="user"`** na raiz: transform e layout param quando o sistema pede
   menos movimento; opacidade e cor continuam. É o "caminho por componente" que `frontend.md` §10
   exige, sem `* { animation: none }`.
3. **`MotionValue` não re-renderiza.** `useScroll`, `useSpring`, `useTransform` atualizam o estilo
   direto; ler o valor com `useState` a cada quadro desfaz o ganho.
4. **TanStack Start não é RSC**: importe de `motion/react`. `motion/react-client` existe para quem
   tem Server Components, que a stack não usa.

**Links:** 44

**Skills:** `motion-design` (princípio de tempo e easing), `genjutsu:cast` (submódulo
`framer-motion`), `maiyu-frontend`, `impeccable`, `web-accessibility`. Dispare junto com a leitura
da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Começo

#### react
[doc](https://motion.dev/docs/react) | [markdown](https://motion.dev/docs/react.md)
**O que é:** a página de entrada do Motion para React.
**Para que serve:** o mapa do que existe (componente, hooks, utilitários) e onde cada um mora.
**Quando usar:** primeira leitura antes de adotar a biblioteca num projeto.

#### react-installation
[doc](https://motion.dev/docs/react-installation) | [markdown](https://motion.dev/docs/react-installation.md)
**O que é:** instalação do pacote `motion` e o import `motion/react`.
**Para que serve:** saber o caminho de import certo (`motion/react`, `motion/react-m`,
`motion/react-mini`); o pacote expõe esses subpaths no `exports`.
**Quando usar:** ao adicionar a dependência. Na stack: `pnpm add motion` e import de
`motion/react`, nunca de `framer-motion` direto.

#### react-motion-ui-installation
[doc](https://motion.dev/docs/react-motion-ui-installation) | [markdown](https://motion.dev/docs/react-motion-ui-installation.md)
**O que é:** instalação do Motion UI (Motion+) pelo registro privado: `.npmrc` com
`@motionplus:registry=https://api.motion.dev/npm/` e `_authToken=${MOTION_TOKEN}`, e a dependência
`"motion-plus": "npm:@motionplus/core@^2.12.0"`.
**Para que serve:** trazer os componentes pagos, importados de `motion-plus/react`.
**Quando usar:** só se o projeto decidir assinar o Motion+ (`docs/DECISIONS.md`). O custo vai junto:
o `.npmrc` pode ser commitado (só referencia a variável), mas a doc avisa que o npm falha **em todo
comando** sem `MOTION_TOKEN` definido, para todo mundo do time e para o CI. O token vai em
`secrets` (`tooling.md` §7) e no ENV de quem instala; pnpm não lê `.env`.

#### base-ui
[doc](https://motion.dev/docs/base-ui) | [markdown](https://motion.dev/docs/base-ui.md)
**O que é:** como animar primitivos do Base UI com Motion: a prop `render` recebe um `motion.*`.
Para saída de quem controla a própria montagem (`Popover`, `ContextMenu`): estado `open`
controlado, `keepMounted` no `Portal` e o `Portal` dentro de `AnimatePresence`.
**Para que serve:** mola, gesto ou layout num primitivo do Base UI.
**Quando usar:** só quando `data-starting-style`/`data-ending-style` em CSS não resolve
(`_doc-lib/base-ui.md#react/handbook/animation`). Os exemplos da página importam de
`@base-ui-components/react`, nome antigo; na stack o pacote é `@base-ui/react`.

```tsx
<Menu.Trigger render={<m.button whilePress={{ scale: 0.95 }} />} />
```

#### react-accessibility
[doc](https://motion.dev/docs/react-accessibility) | [markdown](https://motion.dev/docs/react-accessibility.md)
**O que é:** `MotionConfig reducedMotion` (`"user"`, `"always"`, `"never"`) e `useReducedMotion`.
Com `"user"`, transform e layout desligam quando o sistema pede; opacidade e cor continuam.
**Para que serve:** o caminho manual troca transform por opacidade, como o iOS faz, e desliga
vídeo automático e paralaxe.
**Quando usar:** sempre que adotar a biblioteca: `reducedMotion="user"` na raiz é obrigatório na
casa (`frontend.md` §10). `"always"`/`"never"` só vindo de preferência salva do usuário.

#### react-reduce-bundle-size
[doc](https://motion.dev/docs/react-reduce-bundle-size) | [markdown](https://motion.dev/docs/react-reduce-bundle-size.md)
**O que é:** `LazyMotion`, o componente `m` e os pacotes de feature (`domAnimation`, `domMax`).
**Para que serve:** carregar só o que a tela usa; `LazyMotion` aceita `features` e `strict`.
**Quando usar:** em toda adoção. Orçamento de bundle da casa: `frontend.md` §9.10.

## Componente e animação

#### react-motion-component
[doc](https://motion.dev/docs/react-motion-component) | [markdown](https://motion.dev/docs/react-motion-component.md)
**O que é:** a referência do `motion.<elemento>`: props de animação, gesto, arraste, layout e
eventos.
**Para que serve:** saber o que cada prop aceita antes de escrever.
**Quando usar:** ao escrever qualquer `m.div`. Dentro do `LazyMotion strict`, use `m`, não
`motion`.

#### react-animation
[doc](https://motion.dev/docs/react-animation) | [markdown](https://motion.dev/docs/react-animation.md)
**O que é:** `initial`, `animate`, `exit`, variantes e propagação para filhos.
**Para que serve:** o modelo de estado de animação: o componente anima até o alvo do `animate`.
**Quando usar:** antes de qualquer animação declarativa; variantes resolvem coreografia de lista
sem um `delay` por item.

#### react-transitions
[doc](https://motion.dev/docs/react-transitions) | [markdown](https://motion.dev/docs/react-transitions.md)
**O que é:** a prop `transition`: tipo (`tween`, `spring`, `inertia`), duração, easing, atraso,
`staggerChildren`.
**Para que serve:** controlar o tempo e a curva de cada animação.
**Quando usar:** ao ajustar sensação. Defina as transições da casa num objeto tipado do projeto e
reuse, em vez de número mágico por componente.

#### react-animate-presence
[doc](https://motion.dev/docs/react-animate-presence) | [markdown](https://motion.dev/docs/react-animate-presence.md)
**O que é:** `AnimatePresence`, que mantém o elemento montado até o `exit` terminar.
**Para que serve:** animar a saída de quem é removido da árvore.
**Quando usar:** saída de elemento que **não** é popup do Base UI (o Base UI já segura a saída pelo
`data-ending-style`). Todo filho direto precisa de `key` estável.

#### react-layout-animations
[doc](https://motion.dev/docs/react-layout-animations) | [markdown](https://motion.dev/docs/react-layout-animations.md)
**O que é:** a prop `layout` e `layoutId` para elemento que muda de posição, tamanho ou de
componente.
**Para que serve:** a animação que o CSS não faz: reordenar, expandir card, indicador de aba que
desliza.
**Quando usar:** é o motivo número um para adotar Motion. Exige `domMax` no `LazyMotion`.

#### react-layout-group
[doc](https://motion.dev/docs/react-layout-group) | [markdown](https://motion.dev/docs/react-layout-group.md)
**O que é:** `LayoutGroup`, que agrupa componentes cujo layout afeta um ao outro.
**Para que serve:** irmãos que não se re-renderizam juntos animarem o layout em conjunto.
**Quando usar:** quando um item anima e o vizinho "pula" em vez de acompanhar.

#### react-motion-config
[doc](https://motion.dev/docs/react-motion-config) | [markdown](https://motion.dev/docs/react-motion-config.md)
**O que é:** `MotionConfig`, configuração para a subárvore: `transition`, `reducedMotion`, `nonce`.
**Para que serve:** padrão único de transição e de movimento reduzido; o `nonce` é o atributo que
a CSP exige para o `<style>` que a biblioteca injeta.
**Quando usar:** uma vez, na raiz. Com a CSP da casa (`frontend.md` §3.3), passe o `nonce`.

#### react-lazy-motion
[doc](https://motion.dev/docs/react-lazy-motion) | [markdown](https://motion.dev/docs/react-lazy-motion.md)
**O que é:** `LazyMotion` com `features` síncronas ou carregadas por `import()`.
**Para que serve:** tirar as features do bundle inicial.
**Quando usar:** sempre, com `strict`. `domAnimation` para animação e gesto; `domMax` quando há
arraste ou layout.

#### react-svg-animation
[doc](https://motion.dev/docs/react-svg-animation) | [markdown](https://motion.dev/docs/react-svg-animation.md)
**O que é:** animação de SVG: `pathLength`, atributos, `viewBox`.
**Para que serve:** desenho de linha, ícone que se monta, ilustração animada.
**Quando usar:** ilustração de vitrine. Ícone de interface continua estático ou em CSS.

#### text-animation
[doc](https://motion.dev/docs/text-animation) | [markdown](https://motion.dev/docs/text-animation.md)
**O que é:** visão geral de animação de texto: quebra, escalonamento, revelação recortada, rolagem,
embaralhar, digitar, número e palavra ligada ao scroll. A quebra é o `splitText` do Motion+, que
move o texto original para o `aria-label` do contêiner e devolve `chars`, `words` e `lines`.
**Para que serve:** título que se monta na vitrine.
**Quando usar:** só vitrine. Sem Motion+, não há `splitText`: quebra à mão perde o `aria-label` e o
leitor de tela lê letra por letra.

## Gesto e interação

#### react-gestures
[doc](https://motion.dev/docs/react-gestures) | [markdown](https://motion.dev/docs/react-gestures.md)
**O que é:** `whileHover`, `whileTap`, `whileFocus`, `whileDrag`, `whileInView` e os eventos de
gesto.
**Para que serve:** estado visual de interação com física e cancelamento.
**Quando usar:** quando a resposta precisa de mola ou de saída animada. Hover e foco simples são
CSS (`hover:`, `focus-visible:`).

#### react-hover-animation
[doc](https://motion.dev/docs/react-hover-animation) | [markdown](https://motion.dev/docs/react-hover-animation.md)
**O que é:** hover com Motion (`whileHover`, e a função `hover` do pacote `motion`). Os eventos só
disparam em dispositivo que tem hover de verdade, nunca por toque.
**Para que serve:** evitar o hover "grudado" do `:hover` do CSS em tela de toque.
**Quando usar:** quando o hover grudado do CSS incomoda ou o hover precisa de mola. Nunca esconda
informação ou ação atrás de hover.

#### react-drag
[doc](https://motion.dev/docs/react-drag) | [markdown](https://motion.dev/docs/react-drag.md)
**O que é:** a prop `drag`, limites (`dragConstraints`), elasticidade e inércia.
**Para que serve:** arrastar com física.
**Quando usar:** quando arrastar é a interação (bottom sheet, slider custom). Toda ação por arraste
tem alternativa por teclado ou botão (`frontend.md` §10).

#### react-use-drag-controls
[doc](https://motion.dev/docs/react-use-drag-controls) | [markdown](https://motion.dev/docs/react-use-drag-controls.md)
**O que é:** `useDragControls`, para iniciar o arraste a partir de outro elemento.
**Para que serve:** "alça" de arraste separada do conteúdo.
**Quando usar:** quando o arraste começa por um puxador e não pelo elemento inteiro.

#### react-reorder
[doc](https://motion.dev/docs/react-reorder) | [markdown](https://motion.dev/docs/react-reorder.md)
**O que é:** `Reorder.Group` e `Reorder.Item`, lista reordenável por arraste.
**Para que serve:** reordenar com animação de layout pronta.
**Quando usar:** lista curta reordenável. Persistir a ordem é mutação (TanStack Query); a lista
também precisa de reordenação por teclado.

## Scroll e visibilidade

#### react-scroll-animations
[doc](https://motion.dev/docs/react-scroll-animations) | [markdown](https://motion.dev/docs/react-scroll-animations.md)
**O que é:** animação disparada pelo scroll (`whileInView`) e ligada ao scroll (`useScroll`).
**Para que serve:** revelar seção, barra de progresso de leitura, paralaxe.
**Quando usar:** quando o CSS scroll-driven (`animation-timeline`) não serve, por suporte ou por
precisar de valor intermediário em JavaScript.

#### react-use-scroll
[doc](https://motion.dev/docs/react-use-scroll) | [markdown](https://motion.dev/docs/react-use-scroll.md)
**O que é:** `useScroll({ container, target, ... })`, que devolve `scrollX`, `scrollY`,
`scrollXProgress` e `scrollYProgress` como `MotionValue`.
**Para que serve:** ligar estilo ao progresso de scroll sem re-render.
**Quando usar:** progresso e paralaxe. Combine com `useTransform`, não com `useState`.

#### react-use-in-view
[doc](https://motion.dev/docs/react-use-in-view) | [markdown](https://motion.dev/docs/react-use-in-view.md)
**O que é:** `useInView(ref, { root, margin, amount, once, initial })`, que devolve `boolean`.
**Para que serve:** saber se o elemento está visível.
**Quando usar:** disparar lógica (carregar, iniciar vídeo). Para só animar, `whileInView` basta.

#### react-use-page-in-view
[doc](https://motion.dev/docs/react-use-page-in-view) | [markdown](https://motion.dev/docs/react-use-page-in-view.md)
**O que é:** `usePageInView()`, que devolve se a aba está visível.
**Para que serve:** pausar animação contínua com a aba em segundo plano.
**Quando usar:** em todo loop contínuo (ticker, fundo animado): poupa bateria e CPU.

#### react-animate-view
[doc](https://motion.dev/docs/react-animate-view) | [markdown](https://motion.dev/docs/react-animate-view.md)
**O que é:** `AnimateView` (`motion/react-animate-view`), transição de entrada, saída, troca e
compartilhada sobre a View Transitions API e o `ViewTransition` do React. **Exige React e React
DOM 19.3 ou superior** (página e tipo). Saiu do Motion+: import antigo `motion-plus/animate-view`
vira `motion/react-animate-view`.
**Para que serve:** transição entre telas ou estados.
**Quando usar:** só com React 19.3+ no projeto. Transição de rota do TanStack Router tem caminho
próprio; confira antes de sobrepor.

#### react-animate-activity
[doc](https://motion.dev/docs/react-animate-activity) | [markdown](https://motion.dev/docs/react-animate-activity.md)
**O que é:** `AnimateActivity`, versão animada do `<Activity>` do React: esconde com
`display: none` **depois** da animação de saída e preserva o estado. **Motion+ early access**,
import de `motion-plus/animate-activity`; exige `react@19.2.0`+. Vai para o `motion` quando sair do
alpha.
**Para que serve:** aba ou painel que some com animação sem perder estado.
**Quando usar:** só com Motion+ e aceitando API instável. Sem ele, `AnimatePresence` (desmonta) ou
CSS com o `hidden` do Base UI.

## Valores de movimento e hooks

#### react-motion-value
[doc](https://motion.dev/docs/react-motion-value) | [markdown](https://motion.dev/docs/react-motion-value.md)
**O que é:** `MotionValue` e `useMotionValue`: valor observável que atualiza o estilo sem
re-render.
**Para que serve:** a base de todos os hooks abaixo.
**Quando usar:** quando um valor muda a cada quadro (posição, progresso). Valor que muda por
evento discreto continua em `useState`.

#### react-use-motion-template
[doc](https://motion.dev/docs/react-use-motion-template) | [markdown](https://motion.dev/docs/react-use-motion-template.md)
**O que é:** `useMotionTemplate`, string de template com `MotionValue` dentro.
**Para que serve:** montar `transform`, `filter` ou gradiente a partir de valores de movimento.
**Quando usar:** quando o estilo combina mais de um `MotionValue` numa string.

#### react-use-motion-value-event
[doc](https://motion.dev/docs/react-use-motion-value-event) | [markdown](https://motion.dev/docs/react-use-motion-value-event.md)
**O que é:** `useMotionValueEvent(value, evento, callback)`, que assina mudança de um
`MotionValue` com limpeza automática.
**Para que serve:** reagir ao valor sem `useEffect` manual.
**Quando usar:** ao disparar lógica num limiar de scroll ou de arraste.

#### react-use-spring
[doc](https://motion.dev/docs/react-use-spring) | [markdown](https://motion.dev/docs/react-use-spring.md)
**O que é:** `useSpring(origem, opções)`, que aceita número, string ou `MotionValue` e devolve
`MotionValue` com mola.
**Para que serve:** suavizar um valor que pula (cursor, scroll).
**Quando usar:** quando o movimento cru parece duro.

#### react-use-transform
[doc](https://motion.dev/docs/react-use-transform) | [markdown](https://motion.dev/docs/react-use-transform.md)
**O que é:** `useTransform`, que mapeia faixa de entrada para faixa de saída ou aplica função.
**Para que serve:** progresso de scroll virar opacidade, escala ou cor.
**Quando usar:** sempre que um `MotionValue` deriva de outro.

#### react-use-velocity
[doc](https://motion.dev/docs/react-use-velocity) | [markdown](https://motion.dev/docs/react-use-velocity.md)
**O que é:** `useVelocity`, a velocidade de um `MotionValue`.
**Para que serve:** efeito que depende de quão rápido se rola ou arrasta.
**Quando usar:** raro; vitrine.

#### react-use-time
[doc](https://motion.dev/docs/react-use-time) | [markdown](https://motion.dev/docs/react-use-time.md)
**O que é:** `useTime`, `MotionValue` com o tempo decorrido.
**Para que serve:** animação contínua dirigida pelo tempo.
**Quando usar:** loop contínuo; pause com `usePageInView`.

#### react-use-animate
[doc](https://motion.dev/docs/react-use-animate) | [markdown](https://motion.dev/docs/react-use-animate.md)
**O que é:** `useAnimate()`, que devolve `[escopo, animate]` para animação imperativa com seletor
dentro do escopo.
**Para que serve:** sequência imperativa (ao clicar, ao terminar uma mutação).
**Quando usar:** quando a animação é consequência de evento e não de estado. A sequência termina no
desmontar; não guarde a promessa fora do componente.

#### react-use-animation-frame
[doc](https://motion.dev/docs/react-use-animation-frame) | [markdown](https://motion.dev/docs/react-use-animation-frame.md)
**O que é:** `useAnimationFrame`, callback a cada quadro.
**Para que serve:** animação custom que nenhum hook cobre.
**Quando usar:** último recurso; escreva em `MotionValue`, nunca em `useState`.

#### react-use-reduced-motion
[doc](https://motion.dev/docs/react-use-reduced-motion) | [markdown](https://motion.dev/docs/react-use-reduced-motion.md)
**O que é:** `useReducedMotion()`, que lê a preferência do sistema.
**Para que serve:** trocar a animação por outra, não só desligar (ex.: fade no lugar de deslize).
**Quando usar:** quando o `reducedMotion="user"` da raiz não basta para aquele componente.

## Motion+ (pago)

#### react-animate-number
[doc](https://motion.dev/docs/react-animate-number) | [markdown](https://motion.dev/docs/react-animate-number.md)
**O que é:** `AnimateNumber` de `motion-plus/react` (Motion+): número que anima ao mudar.
**Para que serve:** contador, preço, métrica do painel.
**Quando usar:** só com Motion+ adotado. Sem ele, o número muda sem animação; nunca escreva contador
com `setInterval`.

#### react-carousel
[doc](https://motion.dev/docs/react-carousel) | [markdown](https://motion.dev/docs/react-carousel.md)
**O que é:** `Carousel` de `motion-plus/react` (Motion+), com navegação por ponteiro, roda e
teclado.
**Para que serve:** carrossel com arraste e física.
**Quando usar:** só com Motion+. Carrossel precisa de controle por teclado e de pausa.

#### cursor
[doc](https://motion.dev/docs/cursor) | [markdown](https://motion.dev/docs/cursor.md)
**O que é:** `Cursor` de `motion-plus/react` (Motion+): cursor customizado, cursor que segue e
atração magnética, sobre animação de layout.
**Para que serve:** cursor de vitrine e atração magnética.
**Quando usar:** só vitrine com Motion+; nunca esconda o cursor do sistema em área de formulário.

#### react-gallery
[doc](https://motion.dev/docs/react-gallery) | [markdown](https://motion.dev/docs/react-gallery.md)
**O que é:** `Gallery` de `motion-plus/gallery` (Motion+): imagem e vídeo em 2D e 3D (lista,
grade, barril, coverflow, hélice, anel, esfera, pilha), com arraste, scroll e teclado.
**Para que serve:** galeria de vitrine.
**Quando usar:** só com Motion+.

#### react-scramble-text
[doc](https://motion.dev/docs/react-scramble-text) | [markdown](https://motion.dev/docs/react-scramble-text.md)
**O que é:** `ScrambleText` de `motion-plus/react` (Motion+): texto que embaralha antes de
revelar.
**Para que serve:** efeito de título.
**Quando usar:** só vitrine com Motion+; o texto final precisa estar no DOM para o leitor de tela.

#### react-ticker
[doc](https://motion.dev/docs/react-ticker) | [markdown](https://motion.dev/docs/react-ticker.md)
**O que é:** `Ticker` de `motion-plus/react` (Motion+): faixa que rola sem fim, por tempo,
arraste ou scroll.
**Para que serve:** faixa de logos, letreiro.
**Quando usar:** só com Motion+; pausa no hover e no foco, e para com movimento reduzido.

#### react-typewriter
[doc](https://motion.dev/docs/react-typewriter) | [markdown](https://motion.dev/docs/react-typewriter.md)
**O que é:** `Typewriter` de `motion-plus/react` (Motion+): digitação com variação humana e
cursor estilizável, acessível a leitor de tela.
**Para que serve:** efeito de digitação.
**Quando usar:** só vitrine com Motion+.
