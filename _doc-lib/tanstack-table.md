# TanStack Table

Motor de tabela headless: toda a lógica de tabela, zero markup.

> Este arquivo descreve a **v9**, conferida contra `@tanstack/react-table@9.1.0` e
> `@tanstack/table-core@9.1.0` instalados. A v9 é reescrita, não evolução: o hook mudou de nome, as
> features passaram a ser opt-in e boa parte dos identificadores foi renomeada. **Código da v8 não
> compila aqui**, e é ele que a maior parte do material da internet mostra. Se você está migrando,
> comece por `framework/react/guide/migrating` e pelo guia que vem dentro do pacote
> (`node_modules/@tanstack/react-table/skills/migrate-v8-to-v9/SKILL.md`), que é mais completo que a
> página do site.

**O que é:** uma biblioteca que calcula linhas, colunas, ordenação, filtro, paginação, agrupamento,
agregação e seleção, e devolve isso como estado e funções. Ela **não** renderiza nada: você escreve
o `<table>` com o seu HTML e o seu CSS. O core é agnóstico (`@tanstack/table-core`) e o adaptador
React é `@tanstack/react-table`. Na v9 as features não vêm mais todas juntas — você declara quais
usa num `tableFeatures()`, e só o que foi declarado entra no bundle e existe na instância.

**Para que serve:** ter o comportamento de uma data grid completa sem herdar o visual de uma. Você
fica dono da marcação, da acessibilidade e do estilo, e ganha as partes chatas: qual linha está
visível na página 3 depois de filtrar e ordenar, quais linhas estão selecionadas, qual é a largura
de cada coluna quando o usuário arrasta a borda. E, na v9, sem carregar o código de agrupamento numa
tabela que só ordena.

**Como usar:**

```bash
pnpm add @tanstack/react-table
```

```tsx
import { tableFeatures, useTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'

type Post = { id: string; title: string; views: number }

// 1. declare as features. `{}` é válido: dá a tabela mínima, só o core.
const features = tableFeatures({})

// 2. o tipo das features entra na FRENTE do tipo da linha, em toda declaração pública
const columns: Array<ColumnDef<typeof features, Post>> = [
  { accessorKey: 'title', header: 'Título', cell: (info) => info.getValue() },
  { accessorKey: 'views', header: 'Views' },
]

// 3. `useTable`, não `useReactTable`
const table = useTable({ features, columns, data })
```

**Quando adotar a biblioteca:** quando a tabela precisar de comportamento (ordenar, filtrar, paginar,
selecionar) e o visual for seu. Para uma lista que só exibe dados, um `map` num `<table>` resolve e
não custa dependência nenhuma. Para planilha editável com fórmulas, o headless vira trabalho demais e
um data grid pronto sai mais barato.

**A ideia que organiza tudo na v9:** existem três coisas distintas, e confundi-las é a origem de
quase todo erro. **Feature** dá estado e API (`rowSortingFeature` faz `column.getIsSorted()`
existir). **Row model** processa os dados (`createSortedRowModel()` faz as linhas saírem ordenadas).
**Registry** diz qual função usar (`sortFns: { alphanumeric: sortFn_alphanumeric }`). Os três moram
no mesmo `tableFeatures()`, e uma API que "sumiu na v9" quase sempre é uma feature que não foi
registrada.

**Links:** 45.

---

## Fundamentos

#### overview
[doc](https://tanstack.com/table/latest/docs/overview) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/overview.md)
**O que é:** a apresentação da biblioteca, a filosofia headless e a lista de frameworks suportados.
**Para que serve:** entender que você recebe lógica e estado, e entrega markup — e por que isso é
uma escolha, não uma limitação.
**Quando usar:** primeira leitura, antes de decidir entre isto e um data grid pronto.

```tsx
// O contrato inteiro da biblioteca: ela devolve grupos de header e um row model,
// você decide cada tag, cada classe e cada atributo de acessibilidade.
const table = useTable({ features, columns, data })

return (
  <table className="o-que-você-quiser">
    <thead>{table.getHeaderGroups().map(/* … */)}</thead>
    <tbody>{table.getRowModel().rows.map(/* … */)}</tbody>
  </table>
)
```

#### installation
[doc](https://tanstack.com/table/latest/docs/installation) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/installation.md)
**O que é:** o pacote por framework e o requisito de versão.
**Para que serve:** instalar o adaptador certo. O motor é o `@tanstack/table-core`, e você nunca o
instala direto.
**Quando usar:** na instalação, e ao investigar versão divergente entre adaptador e core.

```bash
pnpm add @tanstack/react-table    # requer React 18 ou mais novo
```

```bash
# O core vem junto, como dependência do adaptador. Quando um identificador não
# aparecer no autocomplete, é nele que se confere:
#   node_modules/@tanstack/table-core/dist/index.d.ts
```

#### devtools
[doc](https://tanstack.com/table/latest/docs/devtools) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/devtools.md)
**O que é:** o painel de inspeção da tabela, montado como plugin do devtools unificado do TanStack.
**Para que serve:** ver estado, row models e colunas sem espalhar `console.log`.
**Quando usar:** ao depurar "por que essa linha sumiu" ou "por que isso re-renderiza". Responde em
segundos o que leva meia hora no log.

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import { tableDevtoolsPlugin } from '@tanstack/react-table-devtools'

<TanStackDevtools plugins={[tableDevtoolsPlugin()]} />

// Em build de produção os adaptadores exportam no-op: o painel não vai junto, e
// não é preciso remover o componente. Para ligar em produção de propósito existe
// o entrypoint `/production` — e aí o custo volta.
```

#### agent-skills
[doc](https://tanstack.com/table/latest/docs/agent-skills) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/agent-skills.md)
**O que é:** arquivos `SKILL.md` que o pacote publica dentro do `node_modules`, escritos para agente
de IA usar a biblioteca corretamente.
**Para que serve:** ter documentação que **envelhece junto com a versão instalada**, em vez de
depender de site que descreve outra minor.
**Quando usar:** **antes de qualquer migração ou dúvida de API.** É a fonte mais confiável que existe
aqui, e a que este arquivo usou para se conferir.

```bash
# O guia de migração v8→v9 vive aqui, e é mais completo que a página do site:
node_modules/@tanstack/react-table/skills/migrate-v8-to-v9/SKILL.md

# Os outros que vêm no pacote:
#   getting-started/  table-state/  create-table-hook/
#   with-tanstack-query/  with-tanstack-virtual/
```

```bash
# Existe CLI para plugar as skills na configuração do agente, mas ler o arquivo
# direto funciona igual e não instala nada:
npx @tanstack/intent@latest list
```

#### framework/react/quick-start
[doc](https://tanstack.com/table/latest/docs/framework/react/quick-start) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/quick-start.md)
**O que é:** o exemplo mínimo completo da v9, de `tableFeatures` ao `<td>`.
**Para que serve:** ter a forma correta na tela antes de copiar qualquer coisa de fora.
**Quando usar:** **na primeira tabela.** Se você já sabe v8, leia mesmo assim: a diferença está em
cada linha.

```tsx
import { tableFeatures, useTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'

type Post = { title: string; author: string; views: number }

const features = tableFeatures({})

const columns: Array<ColumnDef<typeof features, Post>> = [
  { accessorKey: 'title', header: 'Título', cell: (info) => info.getValue() },
  { accessorFn: (row) => row.author, id: 'author', header: () => <span>Autor</span> },
  { accessorKey: 'views', header: () => 'Views' },
]

export function PostTable({ data }: { data: Array<Post> }) {
  // `key` é opcional e identifica a instância — útil com devtools e com várias
  // tabelas na mesma tela. Confirmado no TableOptions da 9.1.0.
  const table = useTable({ key: 'post-table', features, columns, data })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {/* substitui o flexRender(...) da v8 */}
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id}><table.FlexRender cell={cell} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Migração da v8

#### framework/react/guide/migrating
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/migrating) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/migrating.md)
**O que é:** o mapa de mudanças da v8 para a v9 no lado React.
**Para que serve:** traduzir uma tabela existente sem descobrir cada quebra pelo compilador.
**Quando usar:** **antes de encostar num arquivo de tabela da v8.** Leia junto com o `SKILL.md` do
pacote, que é o mesmo conteúdo em versão exaustiva e conferida contra a versão instalada.

```tsx
// O resumo do resumo, conferido em dist/:
//
// useReactTable(options)          →  useTable({ ...options, features })
// getCoreRowModel()               →  removido, o core é automático
// getSortedRowModel()             →  sortedRowModel: createSortedRowModel()
// sortingFns / filterFns opções   →  slots sortFns / filterFns em tableFeatures()
// table.getState()                →  table.state
// onStateChange (global)          →  onSortingChange, onPaginationChange, … por fatia
// flexRender(def, ctx)            →  <table.FlexRender header={…} /> (a função ainda existe)
// createColumnHelper<Post>()      →  createColumnHelper<typeof features, Post>()
// ColumnDef<Post>                 →  ColumnDef<typeof features, Post, TValue>
//
// Mais a classe inteira de renomes físico → lógico do pinning, que tem seção
// própria mais abaixo em column-pinning.
```

```tsx
// A armadilha que não é renome: métodos de row, cell, column e header agora vivem
// no PROTÓTIPO. Isto compila e falha em runtime:
// const { getValue } = cell
// const copia = { ...row }
//
// Sempre pelo dono:
cell.getValue()
row.getValue('title')
```

#### framework/react/guide/use-legacy-table
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/use-legacy-table) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/use-legacy-table.md)
**O que é:** uma ponte que aceita a API da v8 rodando v9 por baixo.
**Para que serve:** destravar a migração de uma tabela grande sem parar a entrega.
**Quando usar:** **como passo intermediário, nunca como destino.** Está marcada como deprecated no
próprio `.d.ts`, sai numa major futura, carrega todas as features (adeus tree-shaking), assina o
estado inteiro (adeus render fino) e não combina com `createTableHook`.

```tsx
// import de subpath separado — o pacote principal não exporta isto
import { useLegacyTable } from '@tanstack/react-table/legacy'

const table = useLegacyTable({ columns, data, getCoreRowModel: getCoreRowModel() })

// Serve para o build voltar a passar hoje. Se ficar, você tem os custos da v9 e
// nenhum dos ganhos: bundle maior que o da v8 e render igual ao da v8.
```

## Dados e processamento

#### guide/data
[doc](https://tanstack.com/table/latest/docs/guide/data) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/data.md)
**O que é:** o requisito de referência estável para `data` e `columns`.
**Para que serve:** evitar o bug mais comum e mais confuso da biblioteca, em qualquer versão.
**Quando usar:** **na primeira tabela, e sempre que aparecer loop de render.** Não é otimização: é
correção.

```tsx
// ERRADO: array novo a cada render invalida o core row model, e toda linha e toda
// célula são reconstruídas. Com feature que reseta estado ao recalcular, isso
// vira loop infinito de render.
// const columns = [ … ]
// const data = [ … ]

// CERTO: referência estável dos dois lados
const columns = useMemo(() => [ /* … */ ], [])
const [data, setData] = useState<Array<Post>>(() => [ /* … */ ])

const table = useTable({ features, columns, data })

// `data ?? []` no meio das opções recria o array quando `data` é undefined, e
// reintroduz o problema por uma porta lateral.
```

#### guide/client-side-vs-server-side
[doc](https://tanstack.com/table/latest/docs/guide/client-side-vs-server-side) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/client-side-vs-server-side.md)
**O que é:** quando deixar a tabela processar tudo no cliente e quando delegar ao servidor.
**Para que serve:** a decisão que define o resto da configuração — e que é cara de trocar depois.
**Quando usar:** **antes de escrever a primeira tabela paginada.** A doc estressa a biblioteca com
milhões de linhas no cliente, então "muitos dados" quase nunca é o motivo real para ir ao servidor;
permissão, custo de transferência e frescor do dado é que são.

```tsx
// Cada etapa é independente: dá para filtrar no servidor e ordenar no cliente.
const table = useTable({
  features,
  columns,
  data,
  manualPagination: true,       // também existem manualFiltering, manualSorting,
  rowCount: query.data?.total,  // manualGrouping, manualAggregation, manualExpanding
})

// Com manualPagination, informe `rowCount` ou `pageCount` — sem isso a tabela não
// sabe quantas páginas existem e a navegação trava na primeira.
// `pageCount: -1` é o valor para "desconhecido".
```

#### guide/features
[doc](https://tanstack.com/table/latest/docs/guide/features) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/features.md)
**O que é:** o sistema de features opt-in, o coração da v9.
**Para que serve:** entender por que um método "não existe", e por que o bundle encolheu.
**Quando usar:** **a página mais importante da v9.** Toda dúvida do tipo "isso sumiu?" se responde
aqui: não sumiu, não foi registrado.

```tsx
// As 17 features de fábrica:
//   cellSelectionFeature      cellSpanningFeature       columnFacetingFeature
//   columnFilteringFeature    columnGroupingFeature     columnOrderingFeature
//   columnPinningFeature      columnResizingFeature     columnSizingFeature
//   columnVisibilityFeature   globalFilteringFeature    rowAggregationFeature
//   rowExpandingFeature       rowPaginationFeature      rowPinningFeature
//   rowSelectionFeature       rowSortingFeature

import {
  tableFeatures, rowSortingFeature, createSortedRowModel, sortFn_alphanumeric,
} from '@tanstack/react-table'

const features = tableFeatures({
  rowSortingFeature,                              // a feature: estado e API
  sortedRowModel: createSortedRowModel(),         // o row model: processa os dados
  sortFns: { alphanumeric: sortFn_alphanumeric }, // o registry: qual função usar
})

// `tableFeatures()` valida as dependências em tempo de tipo: um `sortedRowModel`
// sem `rowSortingFeature` é erro de compilação que NOMEIA a feature faltante.
// Feature sem row model não é erro — só não processa nada, que é exatamente o
// caso de quem ordena no servidor.
```

```tsx
// `stockFeatures` liga tudo de uma vez. Serve para destravar migração e para
// protótipo; em produção anula o motivo de a v9 existir.
import { stockFeatures } from '@tanstack/react-table'
const features = tableFeatures(stockFeatures)
```

#### guide/row-models
[doc](https://tanstack.com/table/latest/docs/guide/row-models) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/row-models.md)
**O que é:** os oito row models opcionais, seus slots e a ordem em que processam os dados.
**Para que serve:** saber por que o filtro roda antes da paginação, e por que o total conta as linhas
filtradas.
**Quando usar:** ao ligar a segunda feature de processamento, e sempre que um número exibido não
bater com o esperado.

```tsx
// Fábrica → slot:
//   createFilteredRowModel()     → filteredRowModel
//   createSortedRowModel()       → sortedRowModel
//   createPaginatedRowModel()    → paginatedRowModel
//   createExpandedRowModel()     → expandedRowModel
//   createGroupedRowModel()      → groupedRowModel
//   createFacetedRowModel()      → facetedRowModel
//   createFacetedMinMaxValues()  → facetedMinMaxValues
//   createFacetedUniqueValues()  → facetedUniqueValues
//
// A ordem do pipeline, que explica quase todo número "errado" na tela:
//   core → filtrado → agrupado → ordenado → expandido → paginado
//
// `getCoreRowModel()` NÃO existe mais como opção: o core é automático.
```

#### guide/worker-row-models
[doc](https://tanstack.com/table/latest/docs/guide/worker-row-models) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/worker-row-models.md)
**O que é:** mover filtro, agrupamento e ordenação para um Web Worker. Novidade da v9, e
**experimental**.
**Para que serve:** manter a interface respondendo enquanto centenas de milhares de linhas são
reprocessadas.
**Quando usar:** só com 100 mil linhas ou mais no cliente **e** com a interface travando de forma
medida. Antes disso, o custo de manter três arquivos em sincronia não se paga.

```ts
// Entrypoint separado:
import { workerRowModelsFeature } from '@tanstack/react-table/experimental-worker-plugin'

// São três peças: um módulo de config compartilhado (colunas com acessores
// portáveis entre threads), um arquivo de worker que chama
// initTableWorker({ features, columns }), e o componente que troca os row models
// por createWorkerRowModel(tableWorker, stage).
```

```ts
// Os limites que decidem se vale: dados de origem PLANOS (sem getSubRows), as
// etapas movidas precisam ser um prefixo contíguo do pipeline, `expanded` nunca
// vai para o worker e a paginação fica na main thread. E nada encerra o worker
// sozinho — `tableWorker.terminate()` é responsabilidade sua.
```

## Colunas, headers e células

#### guide/column-defs
[doc](https://tanstack.com/table/latest/docs/guide/column-defs) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/column-defs.md)
**O que é:** os três tipos de coluna — accessor, display e group — e o `createColumnHelper`.
**Para que serve:** o arquivo onde 90% do trabalho de tabela acontece.
**Quando usar:** **em toda tabela.** Repare na regra que decide tudo: só coluna **accessor** tem dado
por trás, e por isso só ela ordena, filtra e agrupa.

```tsx
import { createColumnHelper, tableFeatures } from '@tanstack/react-table'

const features = tableFeatures({})

// Na v9 o helper recebe as FEATURES primeiro, depois o tipo da linha
const columnHelper = createColumnHelper<typeof features, Post>()

const columns = columnHelper.columns([
  // accessor: tem dado, então ordena e filtra
  columnHelper.accessor('title', { header: 'Título' }),
  columnHelper.accessor((row) => row.author, { id: 'author', header: 'Autor' }),

  // display: não tem dado, serve para botão e checkbox
  columnHelper.display({ id: 'actions', cell: (props) => <RowActions row={props.row} /> }),

  // group: agrupa outras colunas no cabeçalho, também sem dado
  columnHelper.group({ header: 'Métricas', columns: [columnHelper.accessor('views', {})] }),
])

// `columnHelper.columns([...])` em vez de um array cru: preserva o `TValue` de
// cada coluna aninhada, que um array literal achata.
```

#### guide/columns
[doc](https://tanstack.com/table/latest/docs/guide/columns) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/columns.md)
**O que é:** o objeto `Column` — o que ele carrega e como chegar até ele.
**Para que serve:** construir controles que agem sobre uma coluna: menu de ordenação, filtro,
visibilidade.
**Quando usar:** ao escrever qualquer UI de cabeçalho.

```tsx
const column = table.getColumn('title')

// as famílias de acesso, e a diferença que importa:
table.getAllLeafColumns()          // todas, IGNORA visibilidade
table.getVisibleLeafColumns()      // só as visíveis — é esta que o render usa
table.getStartVisibleLeafColumns() // as fixadas no início (v9: start, não left)

// propriedades: id, columnDef, columns (filhas), depth, parent
```

#### guide/headers
[doc](https://tanstack.com/table/latest/docs/guide/headers) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/headers.md)
**O que é:** o objeto `Header`, com `colSpan`, `rowSpan` e `isPlaceholder`.
**Para que serve:** montar cabeçalho de várias linhas sem buraco e sem célula sobrando.
**Quando usar:** ao usar coluna de grupo. Com cabeçalho de uma linha só, nada disso aparece.

```tsx
{headerGroup.headers.map((header) =>
  // rowSpan 0 é célula coberta por outra: renderizar gera coluna fantasma
  header.rowSpan === 0 ? null : (
    <th key={header.id} colSpan={header.colSpan} rowSpan={header.rowSpan}>
      {/* placeholder preenche a linha acima de uma coluna rasa, para toda linha
          de cabeçalho contemplar todas as colunas. Não tem conteúdo. */}
      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
    </th>
  ),
)}
```

#### guide/header-groups
[doc](https://tanstack.com/table/latest/docs/guide/header-groups) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/header-groups.md)
**O que é:** header group é simplesmente uma **linha** de cabeçalho.
**Para que serve:** iterar as linhas do `<thead>`.
**Quando usar:** em toda tabela — `getHeaderGroups()` é a primeira chamada de qualquer render.

```tsx
// Com coluna de grupo, o array tem mais de um item: uma linha por nível.
table.getHeaderGroups()   // { id, depth, headers[] }
table.getFooterGroups()

// Com pinning ligado, as variantes por região (v9: start/center/end):
table.getStartHeaderGroups()
table.getCenterHeaderGroups()
table.getEndHeaderGroups()
```

#### guide/rows
[doc](https://tanstack.com/table/latest/docs/guide/rows) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/rows.md)
**O que é:** o objeto `Row`: `getValue`, `original`, `subRows`, `depth`, `id`.
**Para que serve:** ler dado de uma linha do jeito que respeita accessor e transformação.
**Quando usar:** em toda renderização de corpo, e ao escrever ação de linha.

```tsx
row.getValue('title')  // passa pelo accessor da coluna — é o caminho recomendado
row.original           // o objeto cru que você passou em `data`
row.subRows            // filhas, quando existe getSubRows
row.getAllCells()      // todas as células
row.getVisibleCells()  // só as de colunas visíveis

// v9: o underscore saiu de `_getAllCellsByColumnId`, que agora é público
row.getAllCellsByColumnId()

// E o método precisa ser chamado pelo dono — ele vive no protótipo:
// const acao = row.getValue   ← perde o `this` e quebra em runtime
```

#### guide/cells
[doc](https://tanstack.com/table/latest/docs/guide/cells) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/cells.md)
**O que é:** o objeto `Cell` e as três formas de tirar valor dele.
**Para que serve:** renderizar o conteúdo de uma célula respeitando o `cell` definido na coluna.
**Quando usar:** em todo `<td>`.

```tsx
cell.getValue()      // o valor, ou undefined
cell.renderValue()   // o valor, ou o `renderFallbackValue` da tabela
cell.getContext()    // o contexto, para a forma antiga com flexRender

<tr>
  {row.getVisibleCells().map((cell) => (
    <td key={cell.id}><table.FlexRender cell={cell} /></td>
  ))}
</tr>
```

#### guide/table-and-column-meta
[doc](https://tanstack.com/table/latest/docs/guide/table-and-column-meta) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/table-and-column-meta.md)
**O que é:** o campo livre para pendurar informação sua na tabela e nas colunas — e as duas formas de
tipá-lo na v9.
**Para que serve:** passar callback de edição para a célula, marcar alinhamento, declarar o tipo de
filtro de cada coluna.
**Quando usar:** assim que uma célula precisar de algo que não está no dado. A forma por tabela é a
recomendada, e é nova na v9.

```ts
// Recomendada: escopo por tabela, via metaHelper() dentro do tableFeatures().
// Duas tabelas com `features` diferentes têm metas diferentes, sem conflito.
import { metaHelper, tableFeatures } from '@tanstack/react-table'

interface MinhaTableMeta {
  updateData: (rowIndex: number, columnId: string, value: unknown) => void
}
interface MinhaColumnMeta {
  filterVariant?: 'text' | 'range' | 'select'
}

const features = tableFeatures({
  tableMeta: metaHelper<MinhaTableMeta>(),
  columnMeta: metaHelper<MinhaColumnMeta>(),
})
```

```ts
// A forma global continua existindo, agora com TFeatures na frente. Vale para o
// projeto inteiro, o que é exatamente o problema quando há mais de uma tabela.
declare module '@tanstack/react-table' {
  interface TableMeta<TFeatures extends TableFeatures, TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }
}
```

## Instância, estado e composição

#### guide/tables
[doc](https://tanstack.com/table/latest/docs/guide/tables) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/tables.md)
**O que é:** a instância da tabela, o que ela coordena e como se lê estado nela.
**Para que serve:** saber o que existe em `table` além de `getRowModel()`.
**Quando usar:** ao precisar de algo global — resetar estado, ler uma fatia, disparar ação.

```tsx
const table = useTable({ features, columns, data })

table.state                   // o estado selecionado, para LER no render
table.atoms.pagination.get()  // snapshot de uma fatia, sem assinar
table.store                   // marcado @deprecated no .d.ts: fácil de usar errado no render

// `table.getState()` da v8 não existe mais.
```

#### guide/helpers
[doc](https://tanstack.com/table/latest/docs/guide/helpers) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/guide/helpers.md)
**O que é:** os cinco helpers de tipagem: `tableFeatures`, `tableOptions`, `createColumnHelper`,
`metaHelper` e `columnHelper.columns`.
**Para que serve:** compartilhar configuração entre tabelas sem perder inferência de tipo.
**Quando usar:** na segunda tabela do projeto, quando surgir a vontade de extrair opções comuns.

```ts
import { tableFeatures, tableOptions, useTable } from '@tanstack/react-table'

const features = tableFeatures({})

// `tableOptions` devolve o MESMO objeto em runtime: o valor dele está só nos
// overloads de tipo. Extrair as opções para uma constante crua perde a
// inferência e devolve `any` no lugar errado.
const opcoesPadrao = tableOptions({
  features,
  defaultColumn: { minSize: 80, maxSize: 400 },
})

const table = useTable({ ...opcoesPadrao, columns, data })
```

#### framework/react/guide/table-state
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/table-state) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/table-state.md)
**O que é:** as quatro formas de possuir estado na v9 — interno, controlado por fatia, seletor e
átomos externos — e a precedência entre elas.
**Para que serve:** decidir quem manda em cada fatia, que é o que determina quanto a tela
re-renderiza.
**Quando usar:** **ao ligar a primeira feature com estado.** Também é a página de "por que a tela
inteira pisca a cada clique".

```tsx
// 1. interno: a tabela cuida. O default.
const table = useTable({ features, columns, data })

// 2. controlado por fatia: valor + callback, sempre os DOIS. Só o valor congela a
//    fatia, e o sintoma é "o clique não faz nada".
const [sorting, setSorting] = useState<SortingState>([])
const table2 = useTable({ features, columns, data, state: { sorting }, onSortingChange: setSorting })

// `onStateChange` global da v8 não existe: é um callback por fatia.
```

```tsx
// 3. seletor: o 2º argumento de useTable decide o que dispara re-render. Sem
//    seletor, o componente assina TODAS as fatias registradas.
const table3 = useTable({ features, columns, data }, (state) => ({ pagination: state.pagination }))
table3.state.pagination

// 4. assinatura pontual, para não subir o render até o pai:
<table.Subscribe selector={(state) => state.pagination}>
  {(pagination) => <span>Página {pagination.pageIndex + 1}</span>}
</table.Subscribe>

// Precedência: átomo externo > `state` controlado > átomo interno. Fornecer os
// três para a mesma fatia funciona, e o resultado surpreende quem não leu isto.
// `table.reset()` não zera átomo externo.
```

#### framework/react/guide/composable-tables
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/composable-tables) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/composable-tables.md)
**O que é:** `createTableHook()`, que fabrica um `useAppTable` já com features, row models, defaults e
componentes registrados.
**Para que serve:** parar de repetir o mesmo `tableFeatures()` em dez telas.
**Quando usar:** **a partir da terceira tabela parecida.** Para uma tabela só é indireção pura — a
própria doc manda usar `useTable` direto.

```tsx
export const {
  createAppColumnHelper,
  useAppTable,
  useTableContext,
  useCellContext,
  useHeaderContext,
} = createTableHook({
  features,
  getRowId: (row) => row.id,
  tableComponents: { PaginationControls, RowCount },
  cellComponents: { TextCell, NumberCell, StatusCell },
  headerComponents: { SortIndicator, ColumnFilter },
})

// O ganho de tipo: os componentes registrados passam a ser conhecidos pelo helper
// de coluna, então errar o nome de um cell component vira erro de compilação em
// vez de célula vazia.
```

#### framework/react/guide/table-context
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/table-context) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/table-context.md)
**O que é:** os hooks de contexto que acompanham o `createTableHook`.
**Para que serve:** um componente de célula ou de cabeçalho ler a célula ou o header atual sem
receber tudo por prop.
**Quando usar:** junto do `createTableHook`, nunca sozinho — os hooks só funcionam dentro dos
providers que ele gera.

```tsx
function PaginationControls() {
  const table = useTableContext()
  return <button onClick={() => table.nextPage()}>Próxima</button>
}

function TextCell() {
  const cell = useCellContext<string>()
  return <span>{cell.getValue()}</span>
}

// Importe os hooks do módulo onde você chamou createTableHook: só lá eles
// conhecem os seus componentes registrados.
```

#### framework/react/guide/flex-render
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/flex-render) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/flex-render.md)
**O que é:** as três formas de renderizar header, cell e footer.
**Para que serve:** deixar a biblioteca escolher a definição certa, incluindo `aggregatedCell` em
linha agrupada.
**Quando usar:** em todo render. Prefira o componente: a função não faz essa escolha por você.

```tsx
// v9, recomendado — escolhe a columnDef correta e monta o contexto sozinho
<table.FlexRender header={header} />
<table.FlexRender cell={cell} />
<table.FlexRender footer={footer} />

// equivalente, importado direto
import { FlexRender } from '@tanstack/react-table'
<FlexRender cell={cell} />

// v8, ainda funciona: você monta o contexto e escolhe a definição na mão. Em
// tabela com agregação, é aqui que a célula agrupada renderiza o conteúdo errado.
flexRender(cell.column.columnDef.cell, cell.getContext())
```

#### framework/react/guide/custom-features
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/custom-features) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/custom-features.md)
**O que é:** escrever a sua própria feature, com estado, opções e métodos na instância.
**Para que serve:** guardar estado que é da tabela (densidade, modo de exibição) dentro da tabela, em
vez de num `useState` paralelo.
**Quando usar:** raramente, e só quando o estado for mesmo da tabela e precisar viajar junto do
`table`. Um `useState` no componente resolve a maioria dos casos com um décimo do código.

```ts
import { makeStateUpdater, assignTableAPIs } from '@tanstack/react-table'
import type { TableFeature } from '@tanstack/react-table'

export const densityFeature: TableFeature = {
  getInitialState: (initialState) => ({ density: 'md', ...initialState }),
  getDefaultTableOptions: (table) => ({
    enableDensity: true,
    onDensityChange: makeStateUpdater('density', table),
  }),
  constructTableAPIs: (table) => {
    assignTableAPIs('densityFeature', table, {
      table_setDensity: { fn: (updater) => { /* … */ } },
    })
  },
}

// registra igual às de fábrica
const features = tableFeatures({ densityFeature })
```

## Layout das colunas

#### framework/react/guide/column-visibility
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-visibility) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-visibility.md)
**O que é:** esconder e mostrar coluna, com estado de mapa `id → boolean`.
**Para que serve:** o menu de "colunas" que toda tabela grande acaba tendo.
**Quando usar:** ao passar de umas oito colunas. Atenção à pegadinha de render, que é silenciosa.

```tsx
const features = tableFeatures({ columnVisibilityFeature })

// coluna ausente do mapa conta como VISÍVEL; só `false` esconde
// { title: true, views: false }

column.getCanHide()
column.getIsVisible()
column.getToggleVisibilityHandler()
```

```tsx
// A pegadinha: `getAllLeafColumns()` e `row.getAllCells()` IGNORAM visibilidade.
// Ligar a feature e continuar renderizando com eles não esconde nada, e não
// avisa. No render, é sempre a família `getVisible*`:
table.getVisibleLeafColumns()
row.getVisibleCells()
```

#### framework/react/guide/column-ordering
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-ordering) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-ordering.md)
**O que é:** a ordem das colunas, e as três coisas que a alteram.
**Para que serve:** arrastar coluna, e entender por que a ordem que você definiu não foi respeitada.
**Quando usar:** ao implementar reordenação, e ao depurar coluna fora do lugar.

```tsx
const features = tableFeatures({ columnOrderingFeature })
table.setColumnOrder(['title', 'views', 'author'])
```

```txt
A ordem final sai da aplicação de três mecanismos, nesta sequência:
  1. pinning     → separa em start, centro e end
  2. columnOrder → aplica a ordem manual
  3. grouping    → com groupedColumnMode 'reorder' ou 'remove', move as agrupadas

Coluna que "não obedece" o columnOrder quase sempre está fixada ou agrupada.
```

#### framework/react/guide/column-pinning
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-pinning) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-pinning.md)
**O que é:** fixar coluna nas bordas. **É a feature com mais renomes da v9**: tudo que era
`left`/`right` virou `start`/`end`.
**Para que serve:** manter a coluna de identificação e a de ações visíveis na rolagem horizontal.
**Quando usar:** em tabela larga. E, se você vem da v8, **releia a lista de renomes**: é a maior
fonte de erro da migração, porque parte quebra no compilador e parte só no CSS.

```tsx
const features = tableFeatures({ columnPinningFeature })

// estado: { start: ['title'], end: ['actions'] }   (era left/right)
column.pin('start')      // 'start' | 'end' | false
column.getIsPinned()     // 'start' | 'end' | false

row.getStartVisibleCells()
row.getCenterVisibleCells()
row.getEndVisibleCells()

table.getStartLeafColumns()
column.getStart('start')  // offset para o CSS
column.getAfter('end')
```

```css
/* start e end são regiões LÓGICAS, não direções físicas: em RTL, start é a
   direita. A biblioteca não estiliza nada — se o seu sticky usa `left`, ele
   continua físico e quebra em RTL. O par lógico é: */
.pinned-start { position: sticky; inset-inline-start: var(--offset); }
.pinned-end   { position: sticky; inset-inline-end: var(--offset); }
```

#### framework/react/guide/column-sizing
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-sizing) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-sizing.md)
**O que é:** as larguras calculadas de cada coluna.
**Para que serve:** aplicar largura no markup, já que a biblioteca não estiliza nada.
**Quando usar:** em tabela com largura fixa ou virtualizada. Na v9 esta feature é só o **cálculo**;
arrastar para redimensionar é a feature seguinte.

```tsx
const features = tableFeatures({ columnSizingFeature })

// defaults: size 150, minSize 20, maxSize Number.MAX_SAFE_INTEGER
// sobrescreva em `defaultColumn` ou na própria coluna

<th style={{ width: header.getSize() }} />
// column.getStart() e column.getAfter() dão os offsets, úteis com pinning
```

#### framework/react/guide/column-resizing
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-resizing) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-resizing.md)
**O que é:** arrastar a borda do cabeçalho para mudar a largura. Feature separada na v9, com estado
renomeado.
**Para que serve:** deixar o usuário ajustar a tabela.
**Quando usar:** junto do `columnSizingFeature` — sozinha ela não tem o que redimensionar.

```tsx
const features = tableFeatures({ columnSizingFeature, columnResizingFeature })

// v8 → v9, os três renomes:
//   columnSizingInfo         → columnResizing        (estado)
//   setColumnSizingInfo()    → setColumnResizing()
//   onColumnSizingInfoChange → onColumnResizingChange

<div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} />

// `columnResizeMode` é 'onEnd' por default (atualiza ao soltar) ou 'onChange' (a
// cada pixel). 'onChange' com tabela grande derruba o FPS: é caso de medir antes
// de trocar.
```

## Filtro e busca

#### framework/react/guide/column-filtering
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-filtering) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-filtering.md)
**O que é:** filtro por coluna, com registry de funções na v9.
**Para que serve:** o filtro de cada cabeçalho.
**Quando usar:** **é a primeira feature que a maioria liga.** Repare que as funções embutidas agora
são importadas uma a uma.

```tsx
import {
  columnFilteringFeature, createFilteredRowModel,
  filterFn_includesString, filterFn_inNumberRange,
} from '@tanstack/react-table'

const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  // registre só o que usa. O objeto `filterFns` inteiro funciona e traz tudo junto.
  filterFns: { includesString: filterFn_includesString, inNumberRange: filterFn_inNumberRange },
})

// estado: Array<{ id: string; value: unknown }>
```

```tsx
// na coluna, por nome registrado…
{ accessorKey: 'title', filterFn: 'includesString' }

// …ou função inline, quando a regra é específica demais para virar registro
{ accessorKey: 'title', filterFn: (row, columnId, filterValue) => true }
```

#### framework/react/guide/global-filtering
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/global-filtering) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/global-filtering.md)
**O que é:** um campo de busca só, aplicado a todas as colunas.
**Para que serve:** a caixa de "buscar" no topo da tabela.
**Quando usar:** quase sempre junto com o filtro por coluna. **Depende dele**: registrar
`globalFilteringFeature` sem `columnFilteringFeature` é erro de tipo.

```tsx
const features = tableFeatures({
  columnFilteringFeature,     // pré-requisito, e nesta ordem
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
})

const table = useTable({ features, columns, data, globalFilterFn: 'includesString' })

// tirar uma coluna da busca (id, url, campo interno):
{ accessorKey: 'id', enableGlobalFilter: false }
```

#### framework/react/guide/fuzzy-filtering
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/fuzzy-filtering) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/fuzzy-filtering.md)
**O que é:** busca tolerante a erro de digitação, com ranking, via `@tanstack/match-sorter-utils`.
**Para que serve:** que "titulo" encontre "Título" e que o resultado mais parecido venha primeiro.
**Quando usar:** em busca global sobre texto. O detalhe que quase todo mundo esquece é a segunda
metade: sem a função de ordenação, o ranking é calculado e jogado fora.

```ts
import { rankItem, compareItems } from '@tanstack/match-sorter-utils'

const fuzzyFilter: FilterFn<typeof features, Post> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta?.({ itemRank })  // guarda o ranking no filterMeta da linha
  return itemRank.passed
}

// A outra metade: ler o ranking guardado e ordenar por ele.
const fuzzySort: SortFn<typeof features, Post> = (rowA, rowB, columnId) => {
  let dir = 0
  if (rowA.columnFiltersMeta[columnId]) {
    dir = compareItems(
      rowA.columnFiltersMeta[columnId].itemRank!,
      rowB.columnFiltersMeta[columnId].itemRank!,
    )
  }
  return dir === 0 ? sortFn_alphanumeric(rowA, rowB, columnId) : dir
}
```

#### framework/react/guide/column-faceting
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/column-faceting) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/column-faceting.md)
**O que é:** os valores possíveis de uma coluna, com contagem, calculados a partir das linhas que
passaram nos **outros** filtros.
**Para que serve:** montar o filtro que mostra as opções que existem de fato, com quantas linhas cada
uma tem — e sem zerar a si mesmo.
**Quando usar:** em filtro de seleção ou faixa. É o que separa um filtro decente de um `<select>` com
opções que não retornam nada.

```tsx
const features = tableFeatures({
  columnFacetingFeature,
  facetedRowModel: createFacetedRowModel(),          // linhas sem o filtro DESTA coluna
  facetedUniqueValues: createFacetedUniqueValues(),  // Map<valor, contagem>
  facetedMinMaxValues: createFacetedMinMaxValues(),  // [min, max] | undefined
})

const opcoes = Array.from(column.getFacetedUniqueValues().entries())
  .sort(([a], [b]) => String(a).localeCompare(String(b)))

<select>
  {opcoes.map(([valor, contagem]) => (
    <option key={String(valor)}>{String(valor)} ({contagem})</option>
  ))}
</select>
```

## Ordenação, agrupamento e agregação

#### framework/react/guide/sorting
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/sorting) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/sorting.md)
**O que é:** ordenação por uma ou várias colunas. Na v9 tudo que era `sorting*` virou `sort*`.
**Para que serve:** clicar no cabeçalho e ordenar.
**Quando usar:** na maioria das tabelas. Se você vem da v8, os renomes pegam quase todo o arquivo.

```tsx
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

// v8 → v9:
//   sortingFn (coluna)         → sortFn
//   sortingFns (opção)         → slot sortFns
//   column.getSortingFn()      → column.getSortFn()
//   column.getAutoSortingFn()  → column.getAutoSortFn()
//   tipos SortingFn/SortingFns → SortFn/SortFns
//
// estado: Array<{ id: string; desc: boolean }>  (este não mudou)
```

```tsx
// O handler manteve o nome antigo — ele trata shift+clique para multi-ordenação
{header.column.getCanSort() && (
  <button onClick={header.column.getToggleSortingHandler()}>
    {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
  </button>
)}
```

#### framework/react/guide/aggregation
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/aggregation) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/aggregation.md)
**O que é:** somar, contar e tirar média de valores. **Na v9 é independente do agrupamento.**
**Para que serve:** total de rodapé, média por linha agrupada.
**Quando usar:** quando precisar de número derivado. A independência é a novidade: dá para agregar
sem agrupar nada, o que na v8 não era possível.

```tsx
import {
  rowAggregationFeature, aggregationFn_sum, aggregationFn_mean,
  aggregationFn_count, aggregationFn_extent,
} from '@tanstack/react-table'

const features = tableFeatures({
  rowAggregationFeature,  // sozinho basta — columnGroupingFeature é outra coisa
  aggregationFns: { sum: aggregationFn_sum, mean: aggregationFn_mean },
})

// na coluna: como agregar, e como renderizar o resultado
{
  accessorKey: 'views',
  aggregationFn: 'sum',
  aggregatedCell: ({ getValue }) => getValue<number>().toLocaleString(),
}
```

#### framework/react/guide/grouping
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/grouping) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/grouping.md)
**O que é:** juntar linhas por valor de coluna, criando linhas-pai.
**Para que serve:** "posts por autor", com subtotal.
**Quando usar:** junto de `rowAggregationFeature` e de `rowExpandingFeature` — sozinho ele agrupa mas
não soma nem abre.

```tsx
const features = tableFeatures({
  columnGroupingFeature,
  groupedRowModel: createGroupedRowModel(),
})

table.setGrouping(['author'])

// `groupedColumnMode`: 'reorder' move a coluna agrupada para o início, 'remove' a
// tira da tabela, `false` deixa onde está.
```

```tsx
// No render, cada célula de linha agrupada é um de três casos:
cell.getIsGrouped()      // é a célula do valor agrupado → mostre o valor e o toggle
cell.getIsAggregated()   // é um agregado → renderize com aggregatedCell
cell.getIsPlaceholder()  // é buraco de célula agrupada → não renderize conteúdo
```

#### framework/react/guide/expanding
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/expanding) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/expanding.md)
**O que é:** abrir e fechar linha, tanto para sub-linhas quanto para painel de detalhe.
**Para que serve:** hierarquia (linha com filhas) e detalhe (painel com conteúdo livre).
**Quando usar:** com agrupamento, e em tabela mestre-detalhe. São dois usos diferentes, e a página os
separa bem.

```tsx
const features = tableFeatures({
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
})

// estado: `true` (tudo aberto) ou Record<string, boolean>
const table = useTable({ features, columns, data, getSubRows: (row) => row.children })

<button onClick={row.getToggleExpandedHandler()}>{row.getIsExpanded() ? '▾' : '▸'}</button>
```

```tsx
// Painel de detalhe: o conteúdo não segue as colunas, então `getRowCanExpand`
// libera a linha e você renderiza um <tr> extra com colSpan.
const table2 = useTable({ features, columns, data, getRowCanExpand: () => true })
```

## Linhas

#### framework/react/guide/pagination
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/pagination) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/pagination.md)
**O que é:** paginação no cliente ou no servidor.
**Para que serve:** a barra de navegação embaixo da tabela.
**Quando usar:** em quase toda tabela de listagem. O ponto que trava gente é o modo manual.

```tsx
const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),  // NÃO registre no modo manual
})

// estado: { pageIndex: number; pageSize: number }
table.nextPage()
table.setPageIndex(0)
table.getPageCount()
table.getCanNextPage()
```

```tsx
// Servidor: sem row model de paginação, `data` já é a página, e a tabela precisa
// saber o tamanho do conjunto. Sem `rowCount` nem `pageCount` a navegação
// simplesmente não avança — `pageCount: -1` é o "não sei ainda".
const table = useTable({
  features,
  columns,
  data: query.data?.rows ?? [],
  manualPagination: true,
  rowCount: query.data?.total,
})
```

#### framework/react/guide/row-selection
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/row-selection) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/row-selection.md)
**O que é:** seleção de linha por checkbox, com estado `id → boolean`.
**Para que serve:** ação em lote.
**Quando usar:** sempre com `getRowId`. E leia a semântica nova de "algumas selecionadas": **ela
mudou e não quebra o build.**

```tsx
const features = tableFeatures({ rowSelectionFeature })

// O estado é chaveado por id da linha. Sem getRowId o id é o ÍNDICE, e aí ordenar
// ou filtrar move a seleção para outras linhas.
const table = useTable({ features, columns, data, getRowId: (row) => row.id })
```

```tsx
// A mudança silenciosa da v9: getIsSomeRowsSelected() e getIsSomePageRowsSelected()
// agora significam "ao menos uma", INCLUSIVE quando todas estão selecionadas. Na
// v8 significavam "algumas, mas não todas".
//
// O exemplo da própria doc traz a forma ingênua, que deixa a caixa indeterminada
// mesmo com tudo marcado:
//   indeterminate={table.getIsSomeRowsSelected()}
//
// A forma correta, que é a do SKILL.md do pacote:
<Checkbox
  checked={table.getIsAllRowsSelected()}
  indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
  onChange={table.getToggleAllRowsSelectedHandler()}
/>
```

#### framework/react/guide/row-pinning
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/row-pinning) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/row-pinning.md)
**O que é:** fixar linha no topo ou no rodapé.
**Para que serve:** manter à vista a linha que está sendo editada, ou uma linha de total.
**Quando usar:** pouco — é a feature mais nichada da lista. Diferente do pinning de coluna, aqui os
nomes são `top`/`bottom` e não mudaram.

```tsx
const features = tableFeatures({ rowPinningFeature })

// estado: { top: string[]; bottom: string[] }
row.pin('top')          // 'top' | 'bottom' | false
row.getIsPinned()

// v9: o interno `table._getPinnedRows()` virou três métodos públicos
table.getTopRows()
table.getCenterRows()
table.getBottomRows()
```

#### framework/react/guide/cell-selection
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/cell-selection) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/cell-selection.md)
**O que é:** seleção retangular de células, estilo planilha. Novidade da v9.
**Para que serve:** copiar um bloco, aplicar ação a uma faixa.
**Quando usar:** quando a tabela precisar mesmo se comportar como planilha. É a feature mais cara em
markup: cada `<td>` ganha handlers.

```tsx
const features = tableFeatures({ cellSelectionFeature })

// O estado é uma lista ordenada de faixas. `anchor` é o canto onde a seleção
// começou e não se move; `focus` é o que acompanha o arraste ou o shift.
// { anchorRowId, anchorColumnId, focusRowId, focusColumnId, operation?: 'include' | 'exclude' }

table.getSelectedCellIds()
table.getSelectedCellRangesData()  // valores em grade, linha a linha
table.moveCellSelection(direcao)   // navegação por teclado
```

```tsx
<td
  onMouseDown={cell.getSelectionStartHandler()}
  onMouseEnter={cell.getSelectionExtendHandler()}
>
  <table.FlexRender cell={cell} />
</td>
```

#### framework/react/guide/cell-spanning
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/cell-spanning) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/cell-spanning.md)
**O que é:** mesclar células adjacentes, como `rowspan` e `colspan`. Novidade da v9.
**Para que serve:** não repetir o mesmo valor em vinte linhas seguidas, e montar linha de resumo que
atravessa a tabela.
**Quando usar:** em relatório. O detalhe que decide o render é que célula coberta tem span **0**.

```tsx
const features = tableFeatures({ cellSpanningFeature })

// mescla linhas adjacentes de mesmo valor
columnHelper.accessor('author', { spanRows: true })

// ou com regra própria
columnHelper.accessor('date', { spanRows: ({ anchorValue, value }) => mesmoMes(anchorValue, value) })

// linha de resumo que ocupa a tabela toda
columnHelper.accessor('title', { spanColumns: ({ row }) => (row.original.isSummary ? Infinity : 1) })
```

```tsx
// Span 0 quer dizer "coberta por outra célula": renderizar cria coluna a mais.
const rowSpan = cell.getRowSpan()
const colSpan = cell.getColSpan()
if (rowSpan === 0 || colSpan === 0) return null

<td rowSpan={rowSpan} colSpan={colSpan}><table.FlexRender cell={cell} /></td>

// Os spans saem do row model FINAL e não são guardados: ordenar, filtrar ou
// paginar recalcula tudo, e é por isso que a mesclagem "muda sozinha".
```

#### framework/react/guide/virtualization
[doc](https://tanstack.com/table/latest/docs/framework/react/guide/virtualization) | [markdown](https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/virtualization.md)
**O que é:** renderizar só as linhas visíveis, com `@tanstack/react-virtual`.
**Para que serve:** rolar milhares de linhas sem travar o navegador.
**Quando usar:** quando a lista for longa **e** a paginação não servir ao caso de uso. Não substitui
paginação de servidor: o dado inteiro continua vindo pela rede.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const { rows } = table.getRowModel()

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 33,
  overscan: 5,
})

{rowVirtualizer.getVirtualItems().map((virtualRow) => {
  const row = rows[virtualRow.index]   // o índice virtual indexa ESTA lista
  return <tr key={row.id}>{row.getVisibleCells().map(/* … */)}</tr>
})}

// A regra que evita a classe inteira de bug: o índice virtual sempre indexa a
// lista ATUAL da tabela. Ordenou, filtrou, paginou ou escondeu coluna? A lista
// mudou, e o virtualizador precisa recalcular a partir dela.
```
