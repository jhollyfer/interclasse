# dnd kit

> Conferido em 2026-10-14 contra as 21 páginas da lista (versão `.md` de cada uma, mais
> `https://dndkit.com/llms.txt`) e contra o tipo publicado de `@dnd-kit/react@0.5.0`,
> `@dnd-kit/dom@0.5.0` e `@dnd-kit/helpers@0.5.0` (`npm pack` + `.d.ts`, sem rodar código).
>
> **Duas gerações de pacote, uma doc só.** O site `dndkit.com` documenta a API nova
> (`@dnd-kit/react`, `DragDropProvider`, `useSortable` de `@dnd-kit/react/sortable`), ainda em
> `0.x` (0.5.0, publicada em 2026-09-12). Os projetos da casa usam a geração antiga:
> `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/modifiers@9.0.0` e
> `@dnd-kit/utilities@3.2.2` (`DndContext`, `SortableContext`, `useSensors`, `arrayMove`,
> `CSS.Transform`), sem versão nova desde dezembro de 2024. A API antiga não tem página no site
> atual; o mapa de um nome para o outro está só em [`react/guides/migration`](#reactguidesmigration).

Arrastar e soltar para React: elemento arrastável, alvo de soltura, lista reordenável (uma ou
várias, como kanban), sensor de ponteiro e de teclado, detecção de colisão, modificador de
movimento e anúncio para leitor de tela.

**O que é:** um núcleo independente de framework (`@dnd-kit/dom` sobre `@dnd-kit/abstract`) com
adaptadores finos para React, Vue, Svelte e Solid. No React, `DragDropProvider` cria o contexto e
os hooks `useDraggable`, `useDroppable` e `useSortable` devolvem um `ref` (callback) que liga o
elemento; o estado do arraste chega pelos eventos do provider (`onDragStart`, `onDragOver`,
`onDragEnd`) e por `useDragOperation`/`useDragDropMonitor`.

**Para que serve:** reordenar coluna de tabela, item de lista, nó de árvore, card de kanban; mover
item entre listas; soltar algo numa área. Não é para upload de arquivo arrastado do sistema
operacional (isso é `dragover`/`drop` nativo no input de arquivo).

**Como usar** (API nova, a da doc):

```bash
pnpm add @dnd-kit/react @dnd-kit/helpers
```

```tsx
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'
import { useState } from 'react'

type SortableItemProps = Readonly<{ id: string; index: number; label: string }>

function SortableItem({ id, index, label }: SortableItemProps): React.JSX.Element {
  const { ref } = useSortable({ id, index })
  return <li ref={ref}>{label}</li>
}

export function SortableList({ initial }: Readonly<{ initial: string[] }>): React.JSX.Element {
  const [items, setItems] = useState(initial)
  return (
    <DragDropProvider onDragEnd={(event) => setItems((current) => move(current, event))}>
      <ul>
        {items.map((id, index) => (
          <SortableItem key={id} id={id} index={index} label={id} />
        ))}
      </ul>
    </DragDropProvider>
  )
}
```

`PointerSensor` e `KeyboardSensor` já vêm registrados, junto com os plugins `Accessibility`,
`AutoScroller`, `Cursor`, `Feedback` e `PreventSelection` (`defaultPreset` em `@dnd-kit/dom`).

**Caminho de migração** (página `react/guides/migration`): trocar `@dnd-kit/core`,
`@dnd-kit/sortable` e `@dnd-kit/utilities` por `@dnd-kit/react` + `@dnd-kit/helpers`;
`DndContext` vira `DragDropProvider`; `active`/`over` viram `event.operation.source`/`target`;
`onDragCancel` vira `event.canceled` dentro do `onDragEnd`; `useSensor`/`useSensors` saem (sensores
padrão, configuração pela prop `sensors`); `MouseSensor` e `TouchSensor` viram um `PointerSensor`;
`SortableContext` e as estratégias (`verticalListSortingStrategy`…) somem; `arrayMove` vira `move`;
`setNodeRef` + `{...listeners}` + `{...attributes}` + `CSS.Transform.toString(transform)` viram só
`ref`; `restrictToVerticalAxis` vira `RestrictToVerticalAxis` de `@dnd-kit/abstract/modifiers`.
A régua manda estar na última versão publicada; aqui as duas linhas são "a última" de pacotes
diferentes, e a nova ainda é `0.x`. Migrar é decisão do projeto (`docs/DECISIONS.md`), feita de
uma vez por componente comum (`components/common/table/*-draggable-header.tsx`), com o teste de
teclado de pé antes.

**Quando adotar a biblioteca:** quando a tela precisa de reordenação ou transferência por arraste
que o HTML nativo (`draggable` + eventos `drag*`) não entrega com teclado, toque e leitor de tela.
Um único "subir/descer" de item não justifica a dependência: dois botões resolvem.

**O que muda a experiência:**

1. **Teclado vem de fábrica, mas o anúncio vem em inglês.** O `KeyboardSensor` (Espaço/Enter pega,
   setas movem, Espaço solta, Esc cancela) está no preset; o plugin `Accessibility` anuncia
   "Picked up draggable item…" e as instruções de leitor de tela em inglês. Configure
   `Accessibility.configure({ announcements, screenReaderInstructions })` com mensagens do
   catálogo i18n (`i18n.md` §2), na mesma prop `plugins` do provider, na forma de função.
2. **Teclado não é a alternativa de um ponteiro.** `frontend.md` §10.2 pede que arrastar tenha
   alternativa de **um ponteiro** (clique, toque). O `KeyboardSensor` cobre teclado, não isso:
   a lista reordenável precisa também de ação por clique (menu "Mover para cima/baixo" ou botões).
3. **Array no `sensors`/`plugins` substitui o padrão.** Passar `sensors={[PointerSensor]}` tira o
   teclado; passar `plugins={[...]}` tira acessibilidade e auto-scroll. Use sempre a forma de
   função `(defaults) => [...defaults, X]`.
4. **Ordenação otimista mexe no DOM.** Durante o arraste `source` e `target` são o mesmo elemento;
   leia `source.initialIndex`/`source.index` com `isSortable`. Com TanStack Query, sincronizar o
   estado local com o refetch no meio do arraste duplica item: só copie o dado do servidor quando
   não houver arraste em curso.
5. **API nova é `0.x`.** Pode quebrar entre minor. Fixe a versão e leia o changelog no upgrade.

**Links:** 21

**Skills:** `maiyu-frontend`, `web-accessibility`, `playwright-skill` (arraste por teclado e por
ponteiro no teste de UI, `frontend.md` §11.2), `superpowers:test-driven-development`. Dispare junto
com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Overview

#### /
[doc](https://dndkit.com/) | [markdown](https://dndkit.com/index.md)
**O que é:** a página de entrada: núcleo independente de framework, adaptadores para React, Vue,
Svelte e Solid, e os conceitos `DragDropManager`, `Draggable`, `Droppable`, `Sortable`.
**Para que serve:** o mapa do site; os conceitos (`/concepts/*`) e a extensão (`/extend/plugins`,
`/extend/sensors`, `/extend/modifiers`) são da camada vanilla e valem para o React.
**Quando usar:** primeira leitura antes de decidir a adoção ou a migração.

#### quickstart
[doc](https://dndkit.com/quickstart) | [markdown](https://dndkit.com/quickstart.md)
**O que é:** início rápido da camada vanilla (`@dnd-kit/dom`): `new DragDropManager()`,
`new Draggable({ id, element }, manager)`, `new Droppable(...)` e
`manager.monitor.addEventListener('dragend', ...)`.
**Para que serve:** entender o que os hooks do React embrulham.
**Quando usar:** só como leitura de fundo. Na stack o caminho é `@dnd-kit/react`; `new` de classe
da biblioteca dentro de componente não é o padrão da casa.

#### react/quickstart
[doc](https://dndkit.com/react/quickstart) | [markdown](https://dndkit.com/react/quickstart.md)
**O que é:** início rápido do React: `pnpm add @dnd-kit/react`, `useDraggable({ id })` e
`useDroppable({ id })` devolvendo `ref`, tudo dentro de `DragDropProvider` com `onDragEnd`. A nota
diz que `@dnd-kit/react` é o único pacote obrigatório; `@dnd-kit/helpers` entra para o `move` de
lista ordenável; `@dnd-kit/dom` e `@dnd-kit/abstract` chegam como dependência.
**Para que serve:** o esqueleto mínimo de arrastar e soltar.
**Quando usar:** ao montar o primeiro arraste com a API nova, ou como referência ao migrar.

```tsx
<DragDropProvider
  onDragEnd={(event) => {
    if (event.canceled) return
    setTarget(event.operation.target?.id)
  }}
>
```

## Components

#### react/components/drag-drop-provider
[doc](https://dndkit.com/react/components/drag-drop-provider) | [markdown](https://dndkit.com/react/components/drag-drop-provider.md)
**O que é:** o provider que cria o `DragDropManager`. Eventos `onBeforeDragStart` (cancelável com
`event.preventDefault()`), `onDragStart`, `onDragMove`, `onDragOver`, `onDragEnd`, `onCollision`,
todos recebendo `(event, manager)`. Props `sensors`, `plugins`, `modifiers` aceitam array
(substitui o padrão) ou função `(defaults) => [...]` (estende). Vários providers na mesma tela são
contextos independentes.
**Para que serve:** delimitar onde o arraste vale e receber o resultado.
**Quando usar:** um provider por área de arraste (a tabela, o kanban), dentro do componente dono
do estado. Configuração sempre na forma de função, para não perder `KeyboardSensor` e
`Accessibility`.

#### react/components/drag-overlay
[doc](https://dndkit.com/react/components/drag-overlay) | [markdown](https://dndkit.com/react/components/drag-overlay.md)
**O que é:** `DragOverlay` mostra outro elemento no lugar do arrastado enquanto o arraste dura.
Filho pode ser função `(source) => ReactNode`. `dropAnimation` aceita `null` (sem animação),
`{ duration, easing }` ou função; padrão 250 ms `ease`. Um por `DragDropProvider`.
**Para que serve:** prévia simplificada (card compacto, linha resumida) durante o arraste.
**Quando usar:** quando o item real é pesado ou não deve sair do lugar. Com
`prefers-reduced-motion`, passe `dropAnimation={null}` (`frontend.md` §10.5).

## Hooks

#### react/hooks/use-draggable
[doc](https://dndkit.com/react/hooks/use-draggable) | [markdown](https://dndkit.com/react/hooks/use-draggable.md)
**O que é:** `useDraggable({ id, type, handle, disabled, plugins, modifiers, sensors, alignment,
data })` devolve `ref`, `handleRef`, `isDragSource`, `isDragging`, `isDropping` e a instância
`draggable`. Com `handleRef` ligado, só a alça inicia o arraste.
**Para que serve:** tornar um elemento arrastável, com alça e restrição por modificador.
**Quando usar:** item solto que vai para uma área (não lista). Alça é um `<button>` com nome
acessível por chave i18n (`frontend.md` §10.2); é nele que o `KeyboardSensor` ativa.

```tsx
const { ref, handleRef } = useDraggable({ id })
return (
  <div ref={ref}>
    {label}
    <button ref={handleRef} type="button" aria-label={m.common_drag_handle()} />
  </div>
)
```

#### react/hooks/use-droppable
[doc](https://dndkit.com/react/hooks/use-droppable) | [markdown](https://dndkit.com/react/hooks/use-droppable.md)
**O que é:** `useDroppable({ id, accept, type, collisionDetector, collisionPriority, disabled,
data })` devolve `ref`, `isDropTarget` e `droppable`. `accept` filtra pelo `type` do arrastado (tipo,
lista de tipos ou predicado); o `type` do droppable não entra no `accept`.
**Para que serve:** área que recebe o arrastado, com destaque quando ele está em cima.
**Quando usar:** coluna vazia de kanban, lixeira, pasta de destino. Destaque por atributo
(`data-drop-target`) e classe Tailwind, não por estilo inline.

#### react/hooks/use-sortable
[doc](https://dndkit.com/react/hooks/use-sortable) | [markdown](https://dndkit.com/react/hooks/use-sortable.md)
**O que é:** `useSortable({ id, index, group, type, accept, transition, handle, target,
collisionDetector, collisionPriority, disabled, modifiers, sensors, plugins })`, importado de
`@dnd-kit/react/sortable`. Devolve `ref`, `targetRef`, `sourceRef`, `handleRef`, `isDropTarget`,
`isDragSource`, `isDragging`, `isDropping`. `disabled` aceita `{ draggable, droppable }` para
desligar um lado só. Substitui `SortableContext` + `useSortable` do `@dnd-kit/sortable`.
**Para que serve:** item de lista reordenável; com `group`, entre listas.
**Quando usar:** reordenar coluna de tabela, item de lista, card de kanban. `index` vem do `map`.

#### react/hooks/use-drag-drop-monitor
[doc](https://dndkit.com/react/hooks/use-drag-drop-monitor) | [markdown](https://dndkit.com/react/hooks/use-drag-drop-monitor.md)
**O que é:** `useDragDropMonitor({ onBeforeDragStart, onDragStart, onDragMove, onDragOver,
onCollision, onDragEnd })` dentro de um `DragDropProvider`. Tabela de eventos: canceláveis são
`beforeDragStart`, `dragMove`, `dragOver`, `collision`; `dragEnd` traz `canceled`, que substitui o
antigo `onDragCancel`.
**Para que serve:** ouvir o arraste num componente filho sem subir callback até o provider.
**Quando usar:** efeito colateral local (anúncio, telemetria) longe do dono do estado.

#### react/hooks/use-drag-operation
[doc](https://dndkit.com/react/hooks/use-drag-operation) | [markdown](https://dndkit.com/react/hooks/use-drag-operation.md)
**O que é:** `useDragOperation()` devolve `{ source, target }` reativos; o componente só
re-renderiza quando um dos dois muda, não a cada movimento do ponteiro.
**Para que serve:** saber, em qualquer lugar sob o provider, que há arraste e sobre o quê.
**Quando usar:** desligar ação concorrente durante o arraste, mostrar status `aria-live="polite"`.
Para posição a cada quadro, `useDragDropMonitor`.

#### react/hooks/use-drag-drop-manager
[doc](https://dndkit.com/react/hooks/use-drag-drop-manager) | [markdown](https://dndkit.com/react/hooks/use-drag-drop-manager.md)
**O que é:** `useDragDropManager()` devolve o `DragDropManager` do provider mais próximo. Fora do
provider devolve um gerenciador padrão compartilhado, mas o tipo é `DragDropManager | null`.
**Para que serve:** caso avançado: ouvinte direto em `manager.monitor`, consulta a
`manager.registry`, ação imperativa.
**Quando usar:** quase nunca; prefira os eventos do provider e os dois hooks acima. O `null` do
tipo pede guarda no topo (`if (!manager) return`), nunca `!`.

## Guides

#### react/guides/migration
[doc](https://dndkit.com/react/guides/migration) | [markdown](https://dndkit.com/react/guides/migration.md)
**O que é:** o passo a passo de `@dnd-kit/core`/`sortable`/`utilities` para `@dnd-kit/react` +
`@dnd-kit/helpers`, com tabela de equivalência: `DndContext` → `DragDropProvider`; `active`/`over`
→ `operation.source`/`target`; `onDragCancel` → `event.canceled`; `MouseSensor`/`TouchSensor` →
`PointerSensor` (de `@dnd-kit/dom`); `collisionDetection` no contexto → `collisionDetector` por
droppable; `pointerWithin` → `pointerIntersection`; `restrictToParentElement` →
`RestrictToElement`; `restrictToWindowEdges` → `RestrictToWindow`; `createSnapModifier` →
`SnapModifier`; `SortableContext` e as estratégias saem; `arrayMove` → `move`.
**Para que serve:** a única ponte documentada entre o código da casa e a doc atual.
**Quando usar:** ao migrar os componentes comuns de tabela e as telas de kanban e árvore. Um
componente por commit, com o teste de arraste por teclado verde antes e depois.

#### react/guides/multiple-sortable-lists
[doc](https://dndkit.com/react/guides/multiple-sortable-lists) | [markdown](https://dndkit.com/react/guides/multiple-sortable-lists.md)
**O que é:** kanban: `useSortable` com `group` (coluna), `type: 'item'`, `accept: 'item'`; cada
coluna também `useDroppable` com `collisionPriority: CollisionPriority.Low` para aceitar coluna
vazia; `onDragOver` chama `setItems((items) => move(items, event))`. Colunas reordenáveis com
`useSortable` na coluna e ordem atualizada só no `onDragEnd`. Arraste cancelado: guardar o estado
no `onDragStart` e restaurar quando `event.canceled`.
**Para que serve:** mover item dentro e entre listas.
**Quando usar:** visão kanban, quadro de etapas. A persistência é uma mutation no `onDragEnd`
(`frontend.md` §2.3), nunca a cada `onDragOver`.

#### react/guides/sortable-state-management
[doc](https://dndkit.com/react/guides/sortable-state-management) | [markdown](https://dndkit.com/react/guides/sortable-state-management.md)
**O que é:** estado da lista com ou sem `move`. O `OptimisticSortingPlugin` (ligado por padrão)
reordena o DOM durante o arraste, então `source` e `target` são o mesmo elemento: use
`isSortable(source)` e leia `initialIndex`/`index`/`initialGroup`/`group`. `isSortableOperation`
estreita os dois de uma vez. Com React Query/TanStack Query, só sincronize o dado buscado quando
não houver arraste em curso, senão o refetch duplica item.
**Para que serve:** ordem confiável para gravar no servidor.
**Quando usar:** sempre que a nova ordem vai para uma mutation. `isSortable` é a guarda de tipo:
nada de `as` para chegar em `index`.

```tsx
import { isSortable } from '@dnd-kit/react/sortable'

onDragEnd={(event) => {
  if (event.canceled) return
  const { source } = event.operation
  if (!isSortable(source)) return
  if (source.initialIndex === source.index) return
  reorder.mutate({ id: String(source.id), position: source.index })
}}
```

#### react/guides/collision-detection
[doc](https://dndkit.com/react/guides/collision-detection) | [markdown](https://dndkit.com/react/guides/collision-detection.md)
**O que é:** detectores de `@dnd-kit/collision` (dependência transitiva):
`defaultCollisionDetection` (ponteiro dentro, senão sobreposição), `pointerIntersection`,
`shapeIntersection`, `closestCenter`, `closestCorners`, `pointerDistance`, `directionBiased`.
Configurados **por droppable** (`collisionDetector`), não no provider. `collisionPriority` com o
enum `CollisionPriority` (`Lowest` a `Highest`) de `@dnd-kit/abstract` decide entre alvos
sobrepostos. Detector próprio tem o tipo `CollisionDetector`.
**Para que serve:** escolher qual alvo "ganha" quando o arrastado toca vários.
**Quando usar:** grade ou kanban com alvo aninhado. O padrão serve à lista simples; não troque sem
um caso que falhe.

#### react/guides/sensors
[doc](https://dndkit.com/react/guides/sensors) | [markdown](https://dndkit.com/react/guides/sensors.md)
**O que é:** `PointerSensor` (mouse, toque, caneta) e `KeyboardSensor` registrados por padrão em
todo provider, importados de `@dnd-kit/dom`. `PointerSensor.configure({ activationConstraints,
activatorElements, preventActivation })`, com `PointerActivationConstraints.Distance` e `.Delay`
e ramificação por `event.pointerType`. `KeyboardSensor.configure({ keyboardCodes, offset,
preventActivation })`: padrão Espaço/Enter pega, setas movem, Espaço/Enter/Tab soltam, Esc cancela;
Shift multiplica o deslocamento por 5; o teclado só ativa com foco na alça (ou no elemento, sem
alça). Sensor por arrastável sobrepõe o global. A página avisa: array no `sensors` sem
`KeyboardSensor` remove a acessibilidade por teclado.
**Para que serve:** o arraste por teclado que `frontend.md` §10 cobra, e o ajuste de toque para não
roubar a rolagem.
**Quando usar:** em todo arraste. Mantenha o `KeyboardSensor` (forma de função), alça focável, e
`Delay` no toque quando a lista rola. Lembre que teclado não substitui a alternativa de um
ponteiro (§10.2): a ação "mover" por clique continua necessária.

```tsx
import { PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'

<DragDropProvider
  sensors={(defaults) => [
    ...defaults.filter((sensor) => sensor !== PointerSensor),
    PointerSensor.configure({
      activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
    }),
  ]}
>
```

#### react/guides/modifiers
[doc](https://dndkit.com/react/guides/modifiers) | [markdown](https://dndkit.com/react/guides/modifiers.md)
**O que é:** `RestrictToElement` e `RestrictToWindow` de `@dnd-kit/dom/modifiers`;
`RestrictToVerticalAxis`, `RestrictToHorizontalAxis` e `SnapModifier` de
`@dnd-kit/abstract/modifiers`. Aplicados na ordem do array, no provider ou por arrastável.
`RestrictToElement.configure({ element: () => container.current })`: a função é avaliada no início
do arraste; passar `container.current` direto captura `null` e não restringe nada, sem erro.
**Para que serve:** travar eixo (lista vertical, cabeçalho horizontal), conter na área, grade.
**Quando usar:** reordenação de coluna de tabela usa `RestrictToHorizontalAxis`; lista vertical,
`RestrictToVerticalAxis`.

#### react/guides/feedback
[doc](https://dndkit.com/react/guides/feedback) | [markdown](https://dndkit.com/react/guides/feedback.md)
**O que é:** o plugin `Feedback` (padrão) promove o elemento à top layer e anima a soltura.
`Feedback.configure({ feedback, dropAnimation })`: modos `'default'`, `'clone'`, `'move'`, `'none'`
(este com `DragOverlay` próprio); `dropAnimation: null` desliga a animação. Solução de problemas:
item duplicado após refetch e animação dupla na soltura (resolver com `move` no `onDragEnd` ou
`dropAnimation: null`).
**Para que serve:** controlar o que o usuário vê enquanto arrasta e ao soltar.
**Quando usar:** desligar a animação de soltura sob `prefers-reduced-motion` (`frontend.md`
§10.5). Configure no provider pela forma de função; array tira auto-scroll e acessibilidade.

## Fora da stack

| Página | O que é | Por que fica fora |
|---|---|---|
| [vue/quickstart](https://dndkit.com/vue/quickstart) | `@dnd-kit/vue`, composables e componentes para Vue 3.5+ | fora da stack: o frontend da casa é React (TanStack Start) |
| [svelte/quickstart](https://dndkit.com/svelte/quickstart) | `@dnd-kit/svelte`, primitivas para Svelte | fora da stack: Svelte não é framework da casa |
| [solid/quickstart](https://dndkit.com/solid/quickstart) | `@dnd-kit/solid`, hooks e componentes para SolidJS | fora da stack: Solid não é framework da casa |
