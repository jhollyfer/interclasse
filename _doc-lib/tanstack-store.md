# TanStack Store

Store reativo minúsculo e sem opinião, base interna do Router, do Query e do Table.

> Conferido contra `@tanstack/store@0.11.1` e `@tanstack/react-store@0.11.1` instalados. Duas coisas
> mudaram em relação ao material mais antigo que circula: **`Derived` não existe mais** — o valor
> computado virou átomo, ou `createStore(fn)` — e **`useStore` está marcado como `@deprecated`**,
> alias de `useSelector`. As duas quebras são silenciosas para quem só lê blog post.

**O que é:** uma biblioteca de estado com duas primitivas. O **átomo** (`createAtom`) é a unidade
mínima: um valor que notifica quem o observa. O **store** (`createStore`, ou a classe `Store`) é um
átomo com `setState` e, opcionalmente, ações nomeadas. Framework-agnóstica em `@tanstack/store`, com
binding React em `@tanstack/react-store`. É o mesmo motor que Router, Query e Table usam por baixo
dos panos — e, no Table v9, ele aparece na superfície: `table.atoms.<fatia>` são átomos destes.

**Para que serve:** guardar estado de cliente que não vem do servidor e não cabe na URL, ou seja, o
que sobra depois que o Query cuida do que é do servidor e o Router cuida do que é search param.
Preferências de interface, estado de wizard de várias etapas, seleção acumulada entre telas.

**Como usar:**

```bash
pnpm add @tanstack/store @tanstack/react-store
```

```ts
import { createStore } from '@tanstack/store'
import { useSelector } from '@tanstack/react-store'

const uiStore = createStore({ sidebarOpen: true, theme: 'light' })

// no componente: seletor para não re-renderizar quando outra fatia mudar
const sidebarOpen = useSelector(uiStore, (s) => s.sidebarOpen)

// escrita
uiStore.setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))
```

**Quando usar a biblioteca:** só depois de descartar as alternativas mais baratas. Dado do servidor é
TanStack Query. Dado que precisa sobreviver a um F5 ou ser compartilhável por link é search param do
Router. Estado de um componente só é `useState`. O que sobra é Store — e, num projeto que já usa
Router ou Query, ele **já está no bundle**, então não custa dependência nova.

**A superfície inteira da 0.11.1**, conferida no `dist/index.d.ts` (é pequena de propósito):

| Pacote | Exporta |
|---|---|
| `@tanstack/store` | `createAtom`, `createAsyncAtom`, `createStore`, `Store`, `ReadonlyStore`, `batch`, `flush`, `shallow`, `toObserver` |
| `@tanstack/react-store` | `useSelector`, `useAtom`, `useCreateAtom`, `useCreateStore`, `createStoreContext`, `useStore` (deprecated) |

**Links:** 4. É a menor seção do índice, e a doc oficial é curta de propósito — boa parte do que
está anotado aqui veio do `.d.ts`, não do site.

---

## Fundamentos

#### overview
[doc](https://tanstack.com/store/latest/docs/overview) | [markdown](https://raw.githubusercontent.com/tanstack/store/main/docs/overview.md)
**O que é:** a apresentação: store agnóstico de framework, com adaptadores para React, Solid, Vue,
Angular, Svelte, Lit e Octane.
**Para que serve:** entender que ele é infraestrutura interna do TanStack promovida a biblioteca
pública, e não um concorrente de Redux com opinião sobre arquitetura.
**Quando usar:** leia **antes de decidir** entre isto, Zustand, Context e `useState`. É a página que
responde "vale a pena usar isso aqui?" — e a resposta costuma ser "já está instalado".

```ts
// O contrato inteiro: um valor, uma leitura, uma escrita, um aviso.
import { createStore } from '@tanstack/store'

const store = createStore({ count: 0 })

const { unsubscribe } = store.subscribe(() => {
  console.info('mudou para', store.state.count)
})

store.setState((s) => ({ count: s.count + 1 })) // "mudou para 1"
unsubscribe()
```

#### installation
[doc](https://tanstack.com/store/latest/docs/installation) | [markdown](https://raw.githubusercontent.com/tanstack/store/main/docs/installation.md)
**O que é:** a instalação do core e do adaptador.
**Para que serve:** saber qual pacote instalar — o agnóstico, o binding React, ou os dois.
**Quando usar:** na primeira instalação, e para entender por que são dois pacotes.

```bash
# core agnóstico: usável fora de componente, em arquivo puro de lógica
pnpm add @tanstack/store

# adaptador React: os hooks. Reexporta tudo do core, então na prática
# `@tanstack/react-store` sozinho basta num app React.
pnpm add @tanstack/react-store
```

```ts
// O core rodar sem React é o que permite o store morar num módulo de lógica,
// e ser lido de dentro e de fora de componente com a mesma API.
import { createStore } from '@tanstack/store'
export const authStore = createStore({ token: null as string | null })
```

#### quick-start
[doc](https://tanstack.com/store/latest/docs/quick-start) | [markdown](https://raw.githubusercontent.com/tanstack/store/main/docs/quick-start.md)
**O que é:** a API agnóstica completa: criar, ler, escrever, assinar, derivar e agrupar escritas.
**Para que serve:** aprender a biblioteca inteira. Ela cabe numa página.
**Quando usar:** ao escrever o **primeiro store**, e ao precisar de valor computado — que é onde a
API mudou e o material antigo engana.

```ts
import { createStore, batch } from '@tanstack/store'

const count = createStore(0)
count.state          // 0
count.get()          // 0, equivalente
count.setState(() => 1)

const { unsubscribe } = count.subscribe((valor) => console.info(valor))
```

```ts
// VALOR COMPUTADO: era `new Derived({ deps, fn })` + `.mount()`. Isso não existe
// mais. Hoje `createStore` com FUNÇÃO devolve um ReadonlyStore que recalcula
// sozinho, sem deps declaradas e sem montar nada — a dependência é descoberta
// pela leitura.
const double = createStore(() => count.state * 2)

// A função recebe o valor anterior, o que dá acumulador sem estado extra:
const soma = createStore<number>((prev) => count.state + (prev ?? 0))

// `batch` segura as notificações até o fim do bloco: sem ele, cada setState
// avisa os assinantes, e duas escritas seguidas viram dois renders.
batch(() => {
  count.setState(() => 1)
  count.setState(() => 2)
})
```

```ts
// Ações nomeadas, para não espalhar `setState` com spread pelo código.
// Só a sobrecarga com valor inicial NÃO-função aceita a fábrica de ações.
const carrinho = createStore({ itens: [] as Array<string> }, ({ setState }) => ({
  adicionar: (item: string) => setState((s) => ({ itens: [...s.itens, item] })),
  limpar: () => setState(() => ({ itens: [] })),
}))

carrinho.actions.adicionar('a')
```

#### framework/react/quick-start
[doc](https://tanstack.com/store/latest/docs/framework/react/quick-start) | [markdown](https://raw.githubusercontent.com/tanstack/store/main/docs/framework/react/quick-start.md)
**O que é:** o lado React: `useSelector` e os hooks de átomo.
**Para que serve:** conectar um store a um componente lendo só a fatia que interessa.
**Quando usar:** ao consumir um store num componente. Preste atenção no **seletor**: é ele que
decide o que re-renderiza, e omiti-lo é a pegadinha mais comum da biblioteca.

```tsx
import { createStore } from '@tanstack/store'
import { useSelector } from '@tanstack/react-store'

// store FORA do componente: criar dentro do render zeraria o estado a cada render
const uiStore = createStore({ sidebarOpen: true, theme: 'light' })

function SidebarToggle() {
  // com seletor: só re-renderiza quando sidebarOpen mudar, ignora theme
  const open = useSelector(uiStore, (s) => s.sidebarOpen)

  return (
    <button onClick={() => uiStore.setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))}>
      {open ? 'Fechar menu' : 'Abrir menu'}
    </button>
  )
}

function ThemeLabel() {
  // este componente NÃO re-renderiza quando a sidebar abre ou fecha
  const theme = useSelector(uiStore, (s) => s.theme)
  return <span>{theme}</span>
}

// `useSelector(store)` sem seletor assina o valor inteiro — é o que faz a tela
// toda re-renderizar por causa de um booleano.
```

```tsx
import { createAtom } from '@tanstack/store'
import { useAtom, useSelector } from '@tanstack/react-store'

// Átomo: valor único, sem o envelope de store. Para um booleano ou um contador,
// é menos cerimônia que um store com um campo só.
const countAtom = createAtom(0)

const [count, setCount] = useAtom(countAtom)   // leitura + setter estável
const soLeitura = useSelector(countAtom)       // só leitura, sem seletor

// `useStore` continua funcionando e é alias de `useSelector`, mas está
// @deprecated no .d.ts: código novo usa `useSelector`.
//
// Para comparação customizada (evitar re-render com objeto recriado):
//   useSelector(store, (s) => s.filtros, { compare: shallow })
```
