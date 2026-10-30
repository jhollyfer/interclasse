# Recharts

> Conferido em 2026-10-14 contra as 16 páginas de guia (`/en-US/guide/<nome>/`) e as 95 páginas de API
> do menu lateral de `/en-US/api/AreaChart/` (HTML baixado e reduzido a texto; o site não publica
> `.md` nem `llms.txt`, as tentativas deram 404) e contra o tipo publicado de `recharts@3.10.1`
> (`npm pack` + `types/index.d.ts`, sem rodar código). As 95 entradas de API são exportadas pelo
> `index.d.ts` da 3.10.1.
>
> **O site vai à frente do npm em dois pontos.** O guia de tema cita `autoTheme` e `emptyTheme`,
> que **não** estão no `index.d.ts` da 3.10.1 (só `lightTheme`, `darkTheme`, `legacyTheme` e
> `RechartsThemeProvider`); o canal `canary` está em 3.11.0. E a página `Global` renderiza só no
> cliente: o HTML servido não tem conteúdo, e o tipo diz que é um objeto `{ isSsr: boolean }`.
>
> **`Cell` e `Customized` estão depreciados** e saem na 4.0; `CartesianAxis` vira interno na 4.0.
> `activeIndex` saiu na 3.0 (guia `activeIndex`).

Biblioteca de gráficos para React sobre SVG e D3 (`victory-vendor`): gráficos cartesianos, polares
e hierárquicos montados por composição de componentes, com eixo, grade, tooltip, legenda e
animação.

**O que é:** cada gráfico é uma raiz (`BarChart`, `LineChart`, `AreaChart`, `PieChart`…) que
recebe `data` (array de objetos) e filhos que leem esse dado por `dataKey` (`<Bar dataKey="total" />`,
`<XAxis dataKey="month" />`). Tudo que é desenho é SVG e aceita atributo de apresentação como prop;
`Tooltip` e `Legend` são HTML. A versão 3 guarda o estado num store Redux interno, expõe hooks
(`useActiveTooltipLabel`, `usePlotArea`, `useXAxisScale`) e não precisa mais de `Customized` para
desenhar elemento próprio.

**Para que serve:** dashboard e relatório do painel: série no tempo, comparação por categoria,
proporção, funil, hierarquia (Treemap, Sunburst), fluxo (Sankey). Na casa, é a biblioteca por baixo
do componente `chart` do shadcn (`_doc-lib/shadcn.md#chart`): o shadcn **não embrulha** o Recharts,
só acrescenta `ChartContainer` (tamanho, tokens `--color-<chave>` a partir do `ChartConfig`),
`ChartTooltipContent` e `ChartLegendContent`. Os filhos continuam sendo `Bar`, `XAxis` e
`CartesianGrid` importados de `recharts`, e é aqui que se lê o que cada um aceita.

**Como usar:**

```bash
pnpm dlx shadcn@latest add chart   # traz recharts e components/ui/chart.tsx
# ou, sem o kit: pnpm add recharts
```

```tsx
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/components/ui/chart'
import { m } from '#/paraglide/messages'

type MonthlyRevenue = { month: string; total: number }

const chartConfig = {
  total: { label: m.dashboard_revenue_label(), color: 'var(--chart-1)' },
} satisfies ChartConfig

export function RevenueChart({ data }: Readonly<{ data: MonthlyRevenue[] }>): React.JSX.Element {
  return (
    <ChartContainer config={chartConfig} className="aspect-video min-h-48 w-full">
      <BarChart data={data} title={m.dashboard_revenue_title()} desc={m.dashboard_revenue_desc()}>
        <CartesianGrid vertical={false} />
        <XAxis<MonthlyRevenue, string> dataKey="month" tickLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar<MonthlyRevenue, number> dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

**Quando adotar a biblioteca:** quando a tela mostra número que se lê melhor como forma (tendência,
comparação, proporção) e o projeto usa o kit shadcn: entra pelo `chart` do shadcn, não por outra
lib de gráfico. Indicador único é texto com `tabular-nums`, não gráfico. Gráfico fora do primeiro
quadro entra por `lazy` + `<Suspense>` (`frontend.md` §9.4); rota privada com `ssr: 'data-only'`
não renderiza gráfico no servidor (`frontend.md` §9).

**O que muda a experiência:**

1. **`dataKey` é `any` por padrão.** Sem genérico, erro de digitação em `dataKey` passa no
   typecheck. Desde a 3.8 há `<Bar<MyData, number>>` e os helpers `createHorizontalChart`,
   `createVerticalChart`, `createRadialChart`, `createCentricChart`, que amarram o tipo do dado a
   todos os filhos. Na casa (sem `any`, `typescript.md`) o genérico é obrigatório.
2. **Tamanho.** Gráfico sem largura e altura não desenha nada. Desde a 3.3 a raiz aceita
   `responsive`; o `ResponsiveContainer` (que o `ChartContainer` do shadcn usa) precisa de pai com
   altura definida, por isso `aspect-*` ou `min-h-*` no `ChartContainer`.
3. **Cor vem de token, nunca de hex.** Valor de tema e de prop vai para o DOM como está, então
   `var(--chart-1)` funciona e troca com o tema sem re-render. `Bar` e `Scatter` não têm cor
   padrão: sem `fill`, a barra sai preta.
4. **Animação respeita `prefers-reduced-motion` sozinha** com `isAnimationActive` em `'auto'`
   (padrão). `isAnimationActive={true}` passa por cima da preferência do sistema.
5. **`accessibilityLayer` é `true` por padrão na v3** (`@defaultValue true` no tipo): teclado e
   leitor de tela no tooltip. A página do shadcn ainda manda "ligar" o prop, herança da v2.

**Links:** 111

**Skills:** `maiyu-frontend`, `dataviz` (forma, cor e marca do gráfico), `web-accessibility`,
`impeccable`, `react-render-optimization` (dado grande, `dataKey` estável). Dispare junto com a
leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Guia

#### en-US/guide/installation
[doc](https://recharts.github.io/en-US/guide/installation/)
**O que é:** instalação por npm, build UMD por unpkg (`window.Recharts`, com React 18 UMD) e build
de desenvolvimento a partir do clone.
**Para que serve:** pôr o pacote no projeto.
**Quando usar:** só a parte npm vale; na casa é `pnpm add recharts` ou, com o kit,
`pnpm dlx shadcn@latest add chart`. UMD e script de CDN estão fora da stack (bundler Vite, nada de
`<script>` global).

#### en-US/guide/getting-started
[doc](https://recharts.github.io/en-US/guide/getting-started/)
**O que é:** o passo a passo: escolher a raiz, acrescentar `XAxis`/`YAxis`/`Legend`/
`CartesianGrid`, ajustar props, interação (tooltip) e componente próprio. Apresenta o
`RechartsDevtools` (`@recharts/devtools`), opcional, que todos os exemplos do site usam.
**Para que serve:** o modelo mental de composição: raiz com `data`, filhos com `dataKey`.
**Quando usar:** primeiro gráfico do projeto. Tire o `RechartsDevtools` dos exemplos ao copiar: é
ferramenta de depuração, não dependência.

```tsx
<LineChart style={{ width: '100%', aspectRatio: 1.618, maxWidth: 600 }} responsive data={data}>
  <CartesianGrid />
  <Line dataKey="uv" />
  <XAxis dataKey="name" />
  <YAxis />
  <Legend />
</LineChart>
```

#### en-US/guide/customize
[doc](https://recharts.github.io/en-US/guide/customize/)
**O que é:** personalização por gráfico: atributo de apresentação SVG como prop (`fill`, `stroke`,
`strokeDasharray`, `className`), texto por `label`/`tickFormatter`/`LabelList`, variante ativa
(`activeBar`, `activeDot`…) e `shape`/`content`/`tick` para desenhar a peça inteira.
**Para que serve:** o ajuste que vale para **este** gráfico. Prop explícita sempre vence o tema.
**Quando usar:** formatar tick com `Intl` do idioma atual (`tickFormatter`), destacar a barra
ativa, rótulo de dado. Os exemplos da página usam hex (`#0ea5e9`); na casa a cor é
`var(--color-<chave>)` do `ChartConfig`. A própria página diz: cor repetida em todo gráfico é
sinal de tema.

#### en-US/guide/activeIndex
[doc](https://recharts.github.io/en-US/guide/activeIndex/)
**O que é:** a remoção do prop `activeIndex` na 3.0 e o substituto: o `Tooltip` controla a
interação, com `defaultIndex`, `active`, `content`, `cursor` e `trigger="click"`.
**Para que serve:** migrar gráfico da v2 e destacar um item inicial.
**Quando usar:** gráfico que nasce com um ponto destacado (`<Tooltip defaultIndex={2} />`) ou
seleção por clique sem caixa de tooltip (`content={() => null}`, `cursor={false}`). Estado
persistente de seleção fica no estado do componente (a página do shadcn diz o mesmo).

#### en-US/guide/domainAndTicks
[doc](https://recharts.github.io/en-US/guide/domainAndTicks/)
**O que é:** eixo de categoria (texto, discreto) contra eixo numérico (contínuo), `domain`
personalizado, `allowDataOverflow`, `scale` (`log`, função D3) e formatação de tick.
**Para que serve:** entender por que o eixo começa ou termina onde termina e corrigir escala de
valores muito díspares.
**Quando usar:** valores com ordens de grandeza diferentes (escala `log`, que exige `domain`
explícito) ou eixo que precisa começar em zero. Data no eixo é número (timestamp) com
`type="number"` e `scale="time"`, formatada no `tickFormatter`; o Recharts não depende de
biblioteca de data.

#### en-US/guide/axisTicks
[doc](https://recharts.github.io/en-US/guide/axisTicks/)
**O que é:** o prop `niceTicks` (desde 3.8): `'none'`, `'auto'` (padrão), `'adaptive'`,
`'snap125'`, e como `tickCount` e `domain` interagem; `ticks` para valores fixos.
**Para que serve:** escolher entre ocupar o espaço do gráfico e ter rótulos redondos.
**Quando usar:** eixo de valor monetário ou percentual que precisa de marcos legíveis
(`niceTicks="snap125"`) ou marcos de negócio fixos (`ticks={[0, 50, 100]}`).

#### en-US/guide/sizes
[doc](https://recharts.github.io/en-US/guide/sizes/)
**O que é:** tamanho por número, percentual ou `style` CSS (`width: 100%`, `aspectRatio`,
`maxHeight`), redimensionamento com `responsive` (desde 3.3), uso em flexbox e grid, e o
`ResponsiveContainer` das versões anteriores.
**Para que serve:** gráfico que acompanha o contêiner e o giro da tela.
**Quando usar:** todo gráfico. Com o shadcn, o `ChartContainer` já põe o `ResponsiveContainer`;
dê `aspect-*` ou `min-h-*` a ele. Sem shadcn, `responsive` + `style={{ width: '100%',
aspectRatio: 1.618 }}`. Celular sem rolagem horizontal a 320 px (`frontend.md` §10.4).

#### en-US/guide/zIndex
[doc](https://recharts.github.io/en-US/guide/zIndex/)
**O que é:** ordem de pintura por camada (desde 3.4): prop `zIndex` nos componentes,
`ZIndexLayer` para o que não tem o prop, `DefaultZIndexes` com os valores padrão. SVG não tem
z-index; a implementação usa portal por camada e só vale dentro de um gráfico.
**Para que serve:** pôr linha de referência por cima da área, rótulo por cima da barra.
**Quando usar:** quando a ordem visual importa e há renderização condicional (a ordem do DOM não é
a do JSX).

#### en-US/guide/coordinateSystems
[doc](https://recharts.github.io/en-US/guide/coordinateSystems/)
**O que é:** os três sistemas de coordenada: domínio (valor do dado, em `ReferenceLine`,
`ReferenceDot`, `ReferenceArea`), pixel do gráfico (`Dot`, `Rectangle`, hooks `useOffset`,
`usePlotArea`) e evento do navegador (`getRelativeCoordinate`), mais os hooks de escala que
convertem entre eles.
**Para que serve:** anotação, marcador próprio e interação que sabe em qual dado o usuário clicou.
**Quando usar:** meta no gráfico (`<ReferenceLine y={meta} />`), faixa de período, clique que
abre o detalhe do ponto (`useXAxisInverseDataSnapScale`).

#### en-US/guide/performance
[doc](https://recharts.github.io/en-US/guide/performance/)
**O que é:** isolar o que muda em componente próprio, manter referência estável (`useMemo`,
`useCallback`, sobretudo em `dataKey` função), `eslint-plugin-react-perf`, reduzir pontos
(agregação, `d3.bin`), debounce no mouse e medir com o profiler.
**Para que serve:** gráfico com muito ponto ou que reage a movimento do mouse.
**Quando usar:** série longa: agregue no backend (o endpoint devolve o resumo, não 50 mil linhas).
O plugin `eslint-plugin-react-perf` é sugestão da página, fora do conjunto de `tooling.md` §4;
adoção é decisão do projeto. Com React Compiler, memo à mão é desnecessário.

#### en-US/guide/roundedBars
[doc](https://recharts.github.io/en-US/guide/roundedBars/)
**O que é:** `radius` num número (todos os cantos) ou em quatro (por canto) e `BarStack` para
arredondar a pilha inteira.
**Para que serve:** a barra arredondada do visual do kit.
**Quando usar:** `radius={4}` como no exemplo do shadcn; em barra empilhada, `BarStack` em vez de
raio em cada `Bar` (valor pequeno some sob o raio).

#### en-US/guide/barAlignment
[doc](https://recharts.github.io/en-US/guide/barAlignment/)
**O que é:** `barSize`, `barGap`, `barCategoryGap` e escala de banda própria no `XAxis`
(`paddingInner`, `paddingOuter`, `align`).
**Para que serve:** espessura e espaçamento das barras.
**Quando usar:** gráfico com poucas categorias em que a barra fica larga demais, ou barras
agrupadas.

#### en-US/guide/cell
[doc](https://recharts.github.io/en-US/guide/cell/)
**O que é:** o aviso de depreciação do `Cell` (sai na 4.0) e a troca por `shape`/`content`.
**Para que serve:** cor por item sem `Cell`.
**Quando usar:** nunca escreva `Cell` em código novo; cor por item vem de campo `fill` no dado ou
de `shape`.

#### en-US/guide/typescript
[doc](https://recharts.github.io/en-US/guide/typescript/)
**O que é:** tipos no próprio pacote; `data` e `dataKey` caem em `any` por padrão; genérico por
componente (`<Area<MyData, number>>`, desde 3.8) e helpers de gráfico tipado.
**Para que serve:** pegar `dataKey` errado no typecheck e ter autocompletar.
**Quando usar:** sempre. Um gráfico com vários filhos usa o helper:

```tsx
import { Area, Tooltip, XAxis, YAxis, createHorizontalChart } from 'recharts'

type Visits = { day: string; total: number }

const VisitsChart = createHorizontalChart<Visits, string, number>()({ XAxis, YAxis, Area })

<VisitsChart.AreaChart data={data} responsive>
  <VisitsChart.XAxis dataKey="day" />
  <VisitsChart.YAxis />
  <Tooltip />
  <VisitsChart.Area dataKey="total" fill="var(--color-total)" />
</VisitsChart.AreaChart>
```

#### en-US/guide/animations
[doc](https://recharts.github.io/en-US/guide/animations/)
**O que é:** quais componentes animam por padrão, os props comuns (`isAnimationActive`,
`animationBegin`, `animationDuration`, `animationEasing`, callbacks), easing (`ease`…`spring`,
`cubic-bezier`), acessibilidade e, desde 3.9, casamento de itens (`matchByIndex`,
`matchByDataKey`, `matchAppend`) e forma animada própria.
**Para que serve:** entrada e transição do gráfico quando o dado muda.
**Quando usar:** deixe `isAnimationActive` em `'auto'`, que desliga a animação quando o sistema
pede menos movimento (`frontend.md` §10.5). Série temporal que recebe ponto novo usa
`matchByDataKey` para o ponto manter identidade. Em teste, `isAnimationActive={false}` ou
`AnimationControllerProvider`.

#### en-US/guide/theming
[doc](https://recharts.github.io/en-US/guide/theming/)
**O que é:** `RechartsThemeProvider` com objeto `RechartsTheme` (tipografia, cores por série,
grade, eixo, tooltip, legenda, fundo). Experimental: a forma do tipo pode mudar em versão menor.
Valor do tema vai ao DOM como está, então `var(--token)` funciona e a troca claro/escuro fica no
CSS, sem re-render nem flash no SSR.
**Para que serve:** padrão visual de todos os gráficos num lugar só.
**Quando usar:** com o shadcn, o `ChartConfig` + `--chart-N` já fazem esse papel por gráfico;
tema do Recharts só se o projeto tiver gráfico fora do `ChartContainer`, e então com
`var(--chart-N)`, nunca `darkTheme` trocado por estado. `autoTheme` e `emptyTheme` da página não
existem na 3.10.1.

---

## API

Uma linha por página. A coluna do meio resume a página; a última diz o gatilho na casa.

### Charts

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [AreaChart](https://recharts.github.io/en-US/api/AreaChart/) | raiz cartesiana de área; aceita `Area`, eixos, grade, `Brush`, referências, `Tooltip` | volume no tempo, série acumulada ou empilhada |
| [BarChart](https://recharts.github.io/en-US/api/BarChart/) | raiz cartesiana de barras, com `barGap`, `barCategoryGap`, `layout` | comparação por categoria; o gráfico mais comum do painel |
| [LineChart](https://recharts.github.io/en-US/api/LineChart/) | raiz cartesiana de linhas | tendência no tempo, várias séries |
| [ComposedChart](https://recharts.github.io/en-US/api/ComposedChart/) | raiz que mistura `Area`, `Bar`, `Line` e `Scatter` | barra de realizado com linha de meta |
| [PieChart](https://recharts.github.io/en-US/api/PieChart/) | raiz polar de pizza e rosca | proporção com poucas fatias; acima de cinco, prefira barra |
| [RadarChart](https://recharts.github.io/en-US/api/RadarChart/) | raiz polar de radar | perfil de várias dimensões; raro no painel |
| [RadialBarChart](https://recharts.github.io/en-US/api/RadialBarChart/) | raiz polar de barras radiais | progresso de poucas metas |
| [ScatterChart](https://recharts.github.io/en-US/api/ScatterChart/) | raiz cartesiana de dispersão | correlação entre duas medidas |
| [FunnelChart](https://recharts.github.io/en-US/api/FunnelChart/) | raiz de funil | etapas de conversão (cadastro, aprovação, venda) |
| [Treemap](https://recharts.github.io/en-US/api/Treemap/) | dado hierárquico em retângulos aninhados | participação por categoria e subcategoria |
| [Sankey](https://recharts.github.io/en-US/api/Sankey/) | fluxo com largura proporcional à vazão | caminho de origem a destino (ex.: canal até pedido) |
| [SunburstChart](https://recharts.github.io/en-US/api/SunburstChart/) | hierarquia em anéis polares | hierarquia com proporção por nível; prefira Treemap se couber |

### General Components

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [ResponsiveContainer](https://recharts.github.io/en-US/api/ResponsiveContainer/) | contêiner que mede o pai (ResizeObserver) e repassa largura e altura | já vem dentro do `ChartContainer`; direto só fora do shadcn, ou use `responsive` (3.3+) |
| [Legend](https://recharts.github.io/en-US/api/Legend/) | legenda HTML das séries | com shadcn, `ChartLegend` + `ChartLegendContent`; legenda é o texto que tira da cor o papel de único sinal |
| [DefaultLegendContent](https://recharts.github.io/en-US/api/DefaultLegendContent/) | conteúdo padrão da `Legend`, não se usa direto | só como base de legenda própria |
| [Tooltip](https://recharts.github.io/en-US/api/Tooltip/) | caixa flutuante com os valores no ponto ativo; `defaultIndex`, `trigger`, `content`, `cursor` | com shadcn, `ChartTooltip content={<ChartTooltipContent />}` |
| [DefaultTooltipContent](https://recharts.github.io/en-US/api/DefaultTooltipContent/) | conteúdo padrão do `Tooltip`, não se usa direto | substituído pelo `ChartTooltipContent` |
| [useIsTooltipActive](https://recharts.github.io/en-US/api/useIsTooltipActive/) | hook: o tooltip está visível? | painel lateral que mostra detalhe só durante a interação |
| [useActiveTooltipCoordinate](https://recharts.github.io/en-US/api/useActiveTooltipCoordinate/) | hook: x e y do ponto ativo | marcador próprio que segue o tooltip |
| [useActiveTooltipDataPoints](https://recharts.github.io/en-US/api/useActiveTooltipDataPoints/) | hook: pontos de dado ativos no tooltip | detalhe do ponto fora do gráfico (cartão ao lado) |
| [useActiveTooltipLabel](https://recharts.github.io/en-US/api/useActiveTooltipLabel/) | hook: rótulo ativo (valor da categoria) | título do detalhe sincronizado com o gráfico |
| [Cell](https://recharts.github.io/en-US/api/Cell/) | cor e estilo por item; **depreciado**, sai na 4.0 | nunca; use `shape` ou `fill` no dado |
| [Text](https://recharts.github.io/en-US/api/Text/) | texto SVG com quebra de linha e rotação | tick ou rótulo próprio com texto longo (es e en são mais longos) |
| [Label](https://recharts.github.io/en-US/api/Label/) | rótulo posicionado no viewBox (título de eixo, de referência) | título de eixo traduzido por `m.*()` |
| [LabelList](https://recharts.github.io/en-US/api/LabelList/) | rótulo em cada ponto de uma série | valor escrito na barra, com `formatter` em `Intl` |
| [Layer](https://recharts.github.io/en-US/api/Layer/) | grupo SVG `<g>` | agrupar desenho próprio para transformar junto |
| [Customized](https://recharts.github.io/en-US/api/Customized/) | **depreciado**: na v3 todo gráfico desenha filho arbitrário | nunca; renderize o componente direto |
| [ZIndexLayer](https://recharts.github.io/en-US/api/ZIndexLayer/) | camada por portal com `zIndex` (3.4+) | desenho próprio que precisa ficar acima ou abaixo de série |
| [DefaultZIndexes](https://recharts.github.io/en-US/api/DefaultZIndexes/) | valores padrão de `zIndex` de cada peça | referência ao escolher `zIndex` próprio |
| [Surface](https://recharts.github.io/en-US/api/Surface/) | o elemento `<svg>`; todo gráfico já tem | só em desenho SVG solto fora de gráfico |
| [useMargin](https://recharts.github.io/en-US/api/useMargin/) | hook: margem declarada do gráfico | posicionar anotação fora da área de plotagem |
| [useOffset](https://recharts.github.io/en-US/api/useOffset/) | hook: espaço ocupado por margem, eixos, `Brush` e legenda | anotação em pixel relativa à área |
| [usePlotArea](https://recharts.github.io/en-US/api/usePlotArea/) | hook: a área onde o dado é desenhado | marca d'água, faixa de fundo própria |
| [useChartWidth](https://recharts.github.io/en-US/api/useChartWidth/) | hook: largura do gráfico em pixel | decidir densidade de rótulo pelo tamanho |
| [useChartHeight](https://recharts.github.io/en-US/api/useChartHeight/) | hook: altura do gráfico em pixel | idem, no eixo vertical |
| [useChartLayout](https://recharts.github.io/en-US/api/useChartLayout/) | hook: layout configurado (`horizontal`, `vertical`…) | componente próprio que serve aos dois layouts |
| [getNiceTickValues](https://recharts.github.io/en-US/api/getNiceTickValues/) | calcula ticks "redondos" de um intervalo | gerar `ticks` fora do gráfico (ex.: mesma escala em dois gráficos) |
| [Global](https://recharts.github.io/en-US/api/Global/) | página sem conteúdo no HTML servido (renderiza só no cliente); pelo tipo, objeto `{ isSsr }` | não se usa; página não conferida além do tipo |
| [getRelativeCoordinate](https://recharts.github.io/en-US/api/getRelativeCoordinate/) | converte evento de mouse ou toque em coordenada relativa ao elemento | clique ou arraste próprio sobre o gráfico |

### Cartesian Components

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Area](https://recharts.github.io/en-US/api/Area/) | série de área; `type`, `stackId`, `connectNulls`, forma animada | dentro de `AreaChart`/`ComposedChart`, `fill="var(--color-<chave>)"` |
| [Bar](https://recharts.github.io/en-US/api/Bar/) | série de barras; `radius`, `stackId`, `activeBar`, `shape` | dentro de `BarChart`; sem `fill` sai preta |
| [BarStack](https://recharts.github.io/en-US/api/BarStack/) | contexto de pilha de barras (3.6+), raio da pilha inteira | barra empilhada arredondada |
| [Line](https://recharts.github.io/en-US/api/Line/) | série de linha; `type`, `dot`, `activeDot`, `strokeDasharray` | tendência; tracejado para projeção, além da cor |
| [Scatter](https://recharts.github.io/en-US/api/Scatter/) | série de pontos | dentro de `ScatterChart`/`ComposedChart` |
| [XAxis](https://recharts.github.io/en-US/api/XAxis/) | eixo X: `dataKey`, `type`, `scale`, `domain`, `tickFormatter`, `niceTicks` | categoria ou tempo; `tickFormatter` com `Intl` do idioma e fuso fixo |
| [useXAxisDomain](https://recharts.github.io/en-US/api/useXAxisDomain/) | hook: domínio calculado do eixo X | mostrar o intervalo visível (ex.: depois do `Brush`) |
| [useXAxisTicks](https://recharts.github.io/en-US/api/useXAxisTicks/) | hook: ticks do eixo X | desenho próprio alinhado aos ticks |
| [YAxis](https://recharts.github.io/en-US/api/YAxis/) | eixo Y, com `width="auto"` | valor; formatação monetária no `tickFormatter` |
| [useYAxisDomain](https://recharts.github.io/en-US/api/useYAxisDomain/) | hook: domínio calculado do eixo Y | idem, eixo Y |
| [useYAxisTicks](https://recharts.github.io/en-US/api/useYAxisTicks/) | hook: ticks do eixo Y | idem, eixo Y |
| [ZAxis](https://recharts.github.io/en-US/api/ZAxis/) | eixo virtual que dimensiona o ponto do `Scatter` | bolha com tamanho por terceira medida |
| [Brush](https://recharts.github.io/en-US/api/Brush/) | barra de zoom e deslocamento no eixo X, operável por teclado | série longa no tempo |
| [CartesianAxis](https://recharts.github.io/en-US/api/CartesianAxis/) | eixo genérico; vira interno na 4.0 | nunca; use `XAxis`/`YAxis` |
| [CartesianGrid](https://recharts.github.io/en-US/api/CartesianGrid/) | grade de fundo | `vertical={false}` como no shadcn |
| [ReferenceLine](https://recharts.github.io/en-US/api/ReferenceLine/) | linha em valor do domínio | meta, média, limite |
| [ReferenceDot](https://recharts.github.io/en-US/api/ReferenceDot/) | círculo num ponto do domínio | destacar pico ou evento |
| [ReferenceArea](https://recharts.github.io/en-US/api/ReferenceArea/) | retângulo entre valores do domínio | período destacado (campanha, feriado) |
| [ErrorBar](https://recharts.github.io/en-US/api/ErrorBar/) | barra de erro (margem) | dado com intervalo de confiança; raro |
| [Funnel](https://recharts.github.io/en-US/api/Funnel/) | série do `FunnelChart` | etapas de conversão |
| [useCartesianScale](https://recharts.github.io/en-US/api/useCartesianScale/) | hook: dado para pixel nos dois eixos | marcador próprio num ponto do dado |
| [useCartesianChartLayout](https://recharts.github.io/en-US/api/useCartesianChartLayout/) | hook: layout, só em gráfico cartesiano | componente próprio cartesiano |
| [useXAxisScale](https://recharts.github.io/en-US/api/useXAxisScale/) | hook: dado do X para pixel | anotação horizontal |
| [useYAxisScale](https://recharts.github.io/en-US/api/useYAxisScale/) | hook: dado do Y para pixel | anotação vertical |
| [useXAxisInverseScale](https://recharts.github.io/en-US/api/useXAxisInverseScale/) | hook: pixel para dado do X | posição do mouse em valor |
| [useYAxisInverseScale](https://recharts.github.io/en-US/api/useYAxisInverseScale/) | hook: pixel para dado do Y | idem, eixo Y |
| [useXAxisInverseDataSnapScale](https://recharts.github.io/en-US/api/useXAxisInverseDataSnapScale/) | hook: pixel para o ponto de dado mais próximo no X | clique que abre o detalhe do ponto |
| [useYAxisInverseDataSnapScale](https://recharts.github.io/en-US/api/useYAxisInverseDataSnapScale/) | hook: idem, no Y | idem, layout vertical |
| [useXAxisInverseTickSnapScale](https://recharts.github.io/en-US/api/useXAxisInverseTickSnapScale/) | hook: pixel para o tick mais próximo no X | seleção por marco do eixo |
| [useYAxisInverseTickSnapScale](https://recharts.github.io/en-US/api/useYAxisInverseTickSnapScale/) | hook: idem, no Y | idem, eixo Y |
| [createHorizontalChart](https://recharts.github.io/en-US/api/createHorizontalChart/) | helper tipado (3.8+) que amarra dado e eixos ao layout horizontal | todo gráfico cartesiano com mais de uma série; elimina o `any` de `dataKey` |
| [createVerticalChart](https://recharts.github.io/en-US/api/createVerticalChart/) | idem, layout vertical | barra horizontal com rótulo longo |

### Polar Components

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Pie](https://recharts.github.io/en-US/api/Pie/) | série de pizza/rosca; `innerRadius`, `outerRadius`, `activeShape` | dentro de `PieChart`; rótulo de fatia além da cor |
| [Radar](https://recharts.github.io/en-US/api/Radar/) | série de radar | dentro de `RadarChart` |
| [RadialBar](https://recharts.github.io/en-US/api/RadialBar/) | série de barra radial | dentro de `RadialBarChart` |
| [PolarAngleAxis](https://recharts.github.io/en-US/api/PolarAngleAxis/) | eixo angular | categorias do radar |
| [PolarGrid](https://recharts.github.io/en-US/api/PolarGrid/) | grade polar | fundo do radar |
| [PolarRadiusAxis](https://recharts.github.io/en-US/api/PolarRadiusAxis/) | eixo radial | escala do radar |
| [createRadialChart](https://recharts.github.io/en-US/api/createRadialChart/) | helper tipado para gráfico polar radial | `RadialBarChart` tipado |
| [createCentricChart](https://recharts.github.io/en-US/api/createCentricChart/) | helper tipado para gráfico polar cêntrico | `PieChart`/`RadarChart` tipado |
| [usePolarChartLayout](https://recharts.github.io/en-US/api/usePolarChartLayout/) | hook: layout, só em gráfico polar | componente próprio polar |

### Shapes

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Cross](https://recharts.github.io/en-US/api/Cross/) | cruz em pixel | cursor próprio |
| [Curve](https://recharts.github.io/en-US/api/Curve/) | curva SVG (base de `Line`/`Area`) | `shape` próprio de linha |
| [Dot](https://recharts.github.io/en-US/api/Dot/) | ponto | `dot`/`activeDot` próprio |
| [Polygon](https://recharts.github.io/en-US/api/Polygon/) | polígono de pontos, com `connectNulls` | forma própria em radar |
| [Rectangle](https://recharts.github.io/en-US/api/Rectangle/) | retângulo com canto arredondado e animação (desligada por padrão) | `shape` de barra no lugar de `Cell` |
| [Sector](https://recharts.github.io/en-US/api/Sector/) | setor de pizza ou rosca | `shape`/`activeShape` de fatia |
| [Trapezoid](https://recharts.github.io/en-US/api/Trapezoid/) | trapézio (base do funil), animação desligada por padrão | `shape` de etapa de funil |
| [Symbols](https://recharts.github.io/en-US/api/Symbols/) | símbolo pré-definido (círculo, cruz, diamante…) | marcador por série no `Scatter`: forma além da cor |

### Animation

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [matchByIndex](https://recharts.github.io/en-US/api/matchByIndex/) | casa itens antigos e novos pela posição (padrão, 3.9+) | troca do conjunto inteiro de dados |
| [matchByDataKey](https://recharts.github.io/en-US/api/matchByDataKey/) | casa itens por uma chave do dado | série temporal que ganha ponto novo: cada ponto mantém identidade |
| [matchAppend](https://recharts.github.io/en-US/api/matchAppend/) | casa em sequência; o excedente entra animado | dado que só cresce no fim |
| [interpolate](https://recharts.github.io/en-US/api/interpolate/) | interpola entre dois números pelo tempo decorrido (0 a 1) | forma animada própria |
| [AreaRevealShape](https://recharts.github.io/en-US/api/AreaRevealShape/) | forma padrão da `Area`, revela por clip-path na entrada | base de `shape` próprio de área |
| [LineDrawShape](https://recharts.github.io/en-US/api/LineDrawShape/) | forma padrão da `Line`, desenha por `strokeDasharray` | base de `shape` próprio de linha |
| [AnimationControllerProvider](https://recharts.github.io/en-US/api/AnimationControllerProvider/) | troca o controlador de animação (padrão `requestAnimationFrame`) | teste de componente determinístico; animação controlada manualmente |
