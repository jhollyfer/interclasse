# Tiptap

> Conferido contra `@tiptap/core@3.31.4` (última publicada no npm).
>
> Ampliado em 2026-10-14 com a navegação inteira do site (índice `https://tiptap.dev/docs/llms.txt`
> conferido contra o menu lateral de cada área): 493 páginas novas, todas baixadas na versão `.md`.
> Tipos conferidos em `@tiptap/core`, `@tiptap/react`, `@tiptap/markdown` e `@tiptap/suggestion`
> 3.32.0 (`npm pack` + `.d.ts`). Áreas Pro/Cloud e UI Components entram como catálogo marcado
> "Pro/Cloud (pago, exige conta Tiptap)", com a visão geral de cada área aberta.

Editor de texto rico headless para a web, construído sobre o ProseMirror.

**O que é:** um framework de edição de texto rico que, nas palavras da própria documentação, "permite
construir um editor completamente sob medida". Ele embrulha o ProseMirror — a biblioteca de edição
estruturada que roda debaixo de metade dos editores sérios da web — e expõe três mecanismos:
**eventos, comandos e extensões**. É headless: não vem barra de ferramentas, não vem CSS, não vem
botão. Vem o modelo do documento, e o resto é seu.

**Para que serve:** guardar texto formatado como **estrutura**, e não como uma string de HTML que
alguém digitou. O documento é uma árvore de nós (parágrafo, título, lista) com marcas (negrito, link)
aplicadas ao conteúdo inline, e um **schema** declara o que pode existir e onde. O que não está no
schema é descartado na entrada — colar `<strong>importante</strong>` sem a extensão correspondente
deixa só `importante`, diz a página de schema. Essa recusa é a característica mais valiosa da
biblioteca, e a fonte da maior parte da confusão de quem chega nela.

**Como usar:**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Olá mundo!</p>',
    // obrigatório em SSR: sem isto o editor tenta renderizar no servidor
    immediatelyRender: false,
  })

  return <EditorContent editor={editor} />
}
```

Os três pacotes têm papéis distintos, segundo a página de instalação: `@tiptap/react` traz as
ligações do React mais o core, `@tiptap/pm` traz as dependências do ProseMirror ("necessárias para o
editor funcionar"), e `@tiptap/starter-kit` traz o conjunto de extensões mais usadas.

**Quando usar a biblioteca:** quando o campo de texto precisa **guardar estrutura** e você quer a UI
inteira sob seu controle. Numa stack React × Node isso é quase sempre o caso: descrição de produto,
corpo de artigo, anotação com menção, comentário com link. Duas situações em que **não** vale:

- **Só Markdown, sempre.** Um `<textarea>` mais um renderizador de Markdown custa um décimo do peso
  e não traz árvore de sintaxe nenhuma para manter. O suporte a Markdown do Tiptap existe (veja
  `markdown` abaixo) e é declarado "early release" pela própria doc.
- **Você quer um editor pronto, com barra e ícones.** Tiptap é headless por decisão de projeto: a
  página de estilo diz que "as extensões core vêm sem estilo nem componentes de UI — só lógica pura".
  Botão, menu, ícone e CSS de tabela são trabalho seu. Isso é vantagem quando o design system é seu,
  e custo de semanas quando você só queria um campo de texto bonito.

**Quatro coisas que você aprende do jeito caro:**

| O quê | Por quê |
|---|---|
| `immediatelyRender: false` em SSR | A página de instalação do React manda desligar. Com SSR ligado e esta flag no default, o editor tenta montar no servidor e o cliente hidrata diferente |
| `shouldRerenderOnTransaction` é `false` por padrão no v3 | O guia de migração diz isso com todas as letras. O sintoma é uma barra de ferramentas que para de acender depois do upgrade, porque `editor.isActive('bold')` não força mais re-render. Use `useEditorState` |
| `@tiptap/pm` é uma cópia só do ProseMirror | A página de ProseMirror explica que o pacote existe justamente para garantir que "Tiptap e todas as extensões sejam compatíveis entre si". Instalar `prosemirror-state` direto do npm coloca duas cópias na página, e duas cópias quebram `instanceof` |
| StarterKit já inclui `Link` | E extensão com nome repetido é erro. A própria página do StarterKit mostra a saída: `StarterKit.configure({ link: false })` antes de registrar a sua |

**O detalhe que economiza horas:** `renderHTML` e `parseHTML` são as **duas metades de um round-trip**,
e quem escreve só uma quebra o ciclo em silêncio. Se um atributo é emitido por `renderHTML` mas não é
lido de volta por `parseHTML`, ele sobrevive ao `getHTML()` e some no `setContent()` seguinte —
exatamente quando o usuário recarrega a página. A página `extend-existing` mostra o par completo por
atributo, e é o padrão a copiar sempre.

---

**Aviso que vale mais que o resto desta página: o schema protege a edição, não a exibição.**

O schema decide o que **o seu editor** aceita montar. Ele não decide nada sobre o que **o seu
visualizador** recebe: o atacante não passa pelo seu editor, ele faz `POST` do que quiser no seu
endpoint. A página `output-json-html` é explícita, e a frase merece ser lida duas vezes: "você deve
sempre validar a entrada do usuário", e "não importa se é JSON ou HTML". `editor.getHTML()` é uma
**serialização**, nunca uma sanitização.

Onde fica a fronteira, na prática:

- **Guardar JSON estreita o ataque, não o elimina.** Re-renderizar JSON com `generateHTML` ou
  `renderToHTMLString` passa o conteúdo pelo schema de novo, e um nó ou marca que você não declarou
  desaparece. Mas um atributo que o **seu próprio** schema declara passa legitimamente. Se o seu
  parágrafo tem `style`, o JSON do atacante carrega `style`.
- **`style` e `class` são vetores diferentes, e a defesa de um não serve para o outro.** `style`
  entrega CSS arbitrário direto — `position:fixed` cobre a tela, `opacity:0` esconde o botão real.
  `class` sozinha não entrega nada: ela só **nomeia** uma regra. O que a torna perigosa é o CSS que
  **você** publica na página de leitura. Num projeto com utilitário atômico (Tailwind e parentes),
  uma classe vinda do usuário como `fixed inset-0 z-50` encontra a regra viva já carregada, e cobre a
  tela sem uma linha de JavaScript nem de `style`. Bloquear `<script>` e `onclick` não toca nisso.
- **A lista de permissão é por atributo, não por tag.** `<span>` é inofensivo; `<span class>` com
  utilitário atômico na página não é. Sanitize na **exibição**, com uma lista de permissão explícita
  de tags e de atributos, e trate `class` como campo fechado: ou você remove, ou aceita só um
  conjunto de classes que você mesmo definiu.
- **O que o Tiptap dá de graça, e é pouco:** a extensão `Link` já emite
  `rel="noopener noreferrer nofollow"` por padrão e oferece `isAllowedUri` para recusar URI por
  protocolo e por domínio. Isso cobre o link **criado dentro do editor**. Não cobre um `href` que
  chegou pronto no payload, e não cobre nenhum outro atributo.
- **Se o alvo é React, renderize JSON com o static renderer.** `renderToReactElement` devolve
  elementos React, não uma string para `dangerouslySetInnerHTML` — a injeção deixa de ser possível
  por construção, em vez de depender de você lembrar de filtrar.

**Links:** 538.

**Skills:** `maiyu-frontend`, `compound-pattern`, `react-composition-patterns`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### getting-started/overview
[doc](https://tiptap.dev/docs/editor/getting-started/overview)

**O que é:** a apresentação do editor: headless, construído sobre o ProseMirror, com eventos,
comandos e extensões como mecanismos centrais.
**Para que serve:** entender o recorte antes de instalar — o que vem pronto e o que é trabalho seu.
**Quando usar:** primeira leitura, e ao decidir entre Tiptap e um editor com UI embutida. A doc diz
que o núcleo é MIT e que há extensões pagas à parte; separar as duas coisas cedo evita descobrir no
meio do sprint que a funcionalidade escolhida é comercial.

```tsx
// O recorte da biblioteca em três linhas:
// 1. o modelo do documento e as regras -> Tiptap
// 2. o botão, o ícone, o CSS         -> você
// 3. a compatibilidade dos pacotes    -> @tiptap/pm

// "Plugue o Tiptap em React, Vue, Svelte, JS puro ou qualquer outro framework."
// Modularidade é o argumento: só as extensões que você registrar entram no bundle.
```

#### getting-started/install/react
[doc](https://tiptap.dev/docs/editor/getting-started/install/react)

**O que é:** a instalação no React, com `useEditor` e `EditorContent`.
**Para que serve:** sair do zero até um editor funcionando na tela.
**Quando usar:** no primeiro uso. **Leia o parágrafo de SSR mesmo que você ache que não tem SSR** —
qualquer framework React com renderização no servidor precisa de `immediatelyRender: false`.

```jsx
// básico — exemplo oficial de SSR (doc oficial)
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function MyEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello World!</p>',
    // Disable immediate rendering to prevent SSR issues
    immediatelyRender: false,
  })

  if (!editor) {
    return null // Prevent rendering until the editor is initialized
  }

  return <EditorContent editor={editor} />
}
```

```tsx
// caso real — TanStack Start + shadcn: editor isolado num componente client-only
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '@/lib/utils'

type RichEditorProps = { content: string; className?: string }

export function RichEditor({ content, className }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
  })

  if (!editor) return null

  return <EditorContent editor={editor} className={cn('prose', className)} />
}
```

```tsx
// armadilha: useEditor com dependency array implícito recria o editor a cada render
// errado — passar extensions inline sem memoizar fora do useEditor recria tudo
function Bad({ draft }: { draft: string }) {
  const editor = useEditor({ extensions: [StarterKit], content: draft })
  return <EditorContent editor={editor} />
}

// certo — deps do useEditor controlam quando recriar; conteúdo entra via effect
function Good({ draft }: { draft: string }) {
  const editor = useEditor({ extensions: [StarterKit], content: draft }, [])
  return <EditorContent editor={editor} />
}
```

#### getting-started/configure
[doc](https://tiptap.dev/docs/editor/getting-started/configure)

**O que é:** as opções do editor (`element`, `extensions`, `content`, `editable`, `autofocus`,
`injectCSS`) e o `.configure()` das extensões.
**Para que serve:** ajustar comportamento sem escrever extensão nenhuma.
**Quando usar:** ao ligar a segunda extensão. A parte que mais rende é a de **desligar** o que vem no
StarterKit: extensão nomeada com `false` sai do kit.

```js
// básico — doc oficial (Editor class)
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

new Editor({
  // bind Tiptap to the `.element`
  element: document.querySelector('.element'),
  // register extensions
  extensions: [Document, Paragraph, Text],
  // set the initial content
  content: '<p>Example Text</p>',
  // place the cursor in the editor after initialization
  autofocus: true,
  // make the text editable (default is true)
  editable: true,
  // prevent loading the default ProseMirror CSS that comes with Tiptap
  // should be kept as `true` for most cases as it includes styles
  // important for Tiptap to work correctly
  injectCSS: false,
})
```

```tsx
// caso real — React + StarterKit configurado/desligado parcialmente
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function useRichEditor(content: string) {
  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // desliga: obrigatório ao usar Collaboration, que traz o próprio histórico
        undoRedo: false,
      }),
    ],
    content,
    editable: true,
    immediatelyRender: false,
  })
}
```

```ts
// armadilha: Collaboration tem histórico próprio, conflita com o do StarterKit
// errado — dois sistemas de undo/redo competindo pela mesma seleção
new Editor({ extensions: [StarterKit, Collaboration.configure({ document: ydoc })] })

// certo — desliga o undoRedo do StarterKit quando usar Collaboration
new Editor({
  extensions: [StarterKit.configure({ undoRedo: false }), Collaboration.configure({ document: ydoc })],
})
```

#### getting-started/style-editor
[doc](https://tiptap.dev/docs/editor/getting-started/style-editor)

**O que é:** como estilizar um editor que não vem com estilo: a classe `.tiptap`,
`editorProps.attributes.class` e o `HTMLAttributes` de cada extensão.
**Para que serve:** fazer o editor parecer com o resto do produto.
**Quando usar:** logo depois do primeiro render, quando tudo estiver sem espaçamento. A armadilha
está no fim da página: **CSS Modules não alcança `.tiptap`** — use estilo global ou `:global(.tiptap)`.

```css
/* global: a área editável é a .tiptap */
.tiptap p {
  @apply my-4 first:mt-0 last:mb-0 leading-relaxed;
}
```

```tsx
const editor = useEditor({
  extensions: [StarterKit],
  editorProps: {
    // classes no elemento editável em si
    attributes: { class: 'prose mx-auto focus:outline-none' },
  },
  immediatelyRender: false,
})

// Terceira via: classe na saída de uma extensão específica.
// Paragraph.configure({ HTMLAttributes: { class: 'meu-paragrafo' } })
// Ela vai para o HTML SERIALIZADO também, não só para a tela.
```

#### core-concepts/introduction
[doc](https://tiptap.dev/docs/editor/core-concepts/introduction)

**O que é:** o mapa dos conceitos: estrutura e schema, estado e transações, formato do conteúdo,
extensões e comandos.
**Para que serve:** o vocabulário sobre o qual todo o resto se apoia.
**Quando usar:** **antes da segunda funcionalidade**. Quem pula esta página trata o Tiptap como um
campo de HTML e bate no schema na primeira customização.

```json
// básico — doc oficial: exemplo de documento Tiptap JSON
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": {
        "textAlign": "center"
      },
      "content": [
        { "type": "text", "text": "Hello, " },
        {
          "type": "text",
          "text": "world",
          "marks": [{ "type": "bold" }, { "type": "italic" }]
        },
        { "type": "text", "text": "!" }
      ]
    }
  ]
}
```

```tsx
// caso real — lendo o JSON do editor para salvar no backend (TanStack Start action)
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function useDraftSync(onSave: (json: object) => void) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onSave(currentEditor.getJSON()),
  })

  return editor
}
```

```ts
// armadilha: guardar HTML como fonte de verdade em vez do Tiptap JSON
// errado — HTML perde atributos que não são padrão do navegador (ex.: textAlign custom)
const draft = editor.getHTML()

// certo — a doc recomenda o Tiptap JSON como formato de armazenamento
const draft = editor.getJSON()
```

## ProseMirror e o schema

#### core-concepts/prosemirror
[doc](https://tiptap.dev/docs/editor/core-concepts/prosemirror)

**O que é:** o que o Tiptap acrescenta ao ProseMirror, e como chegar na API de baixo nível quando
precisar.
**Para que serve:** entender que o Tiptap **não substitui** o ProseMirror — ele empacota, versiona e
dá uma fachada moderna.
**Quando usar:** quando a resposta não estiver na doc do Tiptap. Metade das dúvidas avançadas se
responde na doc do ProseMirror, e o caminho para lá é `@tiptap/pm`.

```js
// básico — doc oficial
// this example loads the EditorState class from the ProseMirror state package
import { EditorState } from '@tiptap/pm/state'
```

```ts
// caso real — plugin ProseMirror próprio registrado via Extension (React + TanStack Start)
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const ReadOnlyBanner = Extension.create({
  name: 'readOnlyBanner',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('readOnlyBanner'),
        props: {
          decorations: (state) => DecorationSet.create(state.doc, []),
        },
      }),
    ]
  },
})
```

```ts
// armadilha: instalar prosemirror-state direto, por fora do @tiptap/pm
// errado — pode puxar uma versão diferente da que o Tiptap usa internamente
import { EditorState } from 'prosemirror-state'

// certo — a doc garante a MESMA versão usada pelo Tiptap, evitando "version clashes"
import { EditorState } from '@tiptap/pm/state'
```

#### core-concepts/schema
[doc](https://tiptap.dev/docs/editor/core-concepts/schema)

**O que é:** a página mais importante da biblioteca. Define como o conteúdo é estruturado: nós,
marcas, expressões de `content`, `group`, `inline`, `atom`, atributos, `parseHTML` e `renderHTML`.
**Para que serve:** a regra que decide o que entra no documento e o que é jogado fora.
**Quando usar:** **antes de qualquer customização**. A doc é direta: só os elementos e atributos
definidos no schema são permitidos, e conteúdo que não casa é descartado.

```js
// básico — doc oficial: a API de schema do Tiptap (doc/paragraph/text)
import { Node } from '@tiptap/core'

const Document = Node.create({
  name: 'doc',
  topNode: true,
  content: 'block+',
})

const Paragraph = Node.create({
  name: 'paragraph',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'p' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', HTMLAttributes, 0]
  },
})

const Text = Node.create({
  name: 'text',
  group: 'inline',
})
```

```ts
// caso real — node custom próprio, registrado no array de extensions (React)
import { Node } from '@tiptap/core'

export const Callout = Node.create({
  name: 'callout',
  // expressões de conteúdo: 'block+', 'block*', 'inline*', '(paragraph|list?)+'
  content: 'block+',
  // o group permite que outros nós digam content: 'block+' e alcancem este
  group: 'block',
  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0] // o 0 é o "buraco" onde o conteúdo entra
  },
})
```

```ts
// armadilha: conteúdo fora do schema é descartado sem aviso (silencioso)
// errado — nenhuma forma de saber que um documento antigo perdeu conteúdo
const editor = new Editor({ content: contentDeUmaVersaoAntigaDoApp })

// certo — doc oficial: enableContentCheck + onContentError avisam da perda
const editor = new Editor({
  enableContentCheck: true,
  content: contentDeUmaVersaoAntigaDoApp,
  onContentError({ editor, error, disableCollaboration }) {
    // conteúdo salvo por uma versão antiga do app cai aqui
  },
})
```

#### core-concepts/nodes-and-marks
[doc](https://tiptap.dev/docs/editor/core-concepts/nodes-and-marks)

**O que é:** a distinção entre nó e marca.
**Para que serve:** escolher certo na hora de criar uma extensão — e a escolha errada só aparece
semanas depois, quando a estrutura já tem conteúdo em produção.
**Quando usar:** antes de escrever `Node.create` ou `Mark.create`. A regra é curta: **nó muda a
estrutura, marca não**.

```ts
// Nó: bloco (parágrafo, título, code block) ou inline (menção).
// Define hierarquia. Ocupa uma posição na árvore.

// Marca: negrito, itálico, tachado, LINK.
// Se aplica a um trecho de texto dentro de um nó, sem alterar a árvore.

// O teste prático:
// "isso pode envolver só metade de uma palavra?"  -> marca
// "isso tem conteúdo próprio e filhos?"           -> nó
//
// Link é marca. É o exemplo que mais gente erra, porque "parece" um elemento.
```

#### core-concepts/extensions
[doc](https://tiptap.dev/docs/editor/core-concepts/extensions)

**O que é:** o que é uma extensão, os três tipos (`Extension`, `Node`, `Mark`) e o que uma extensão
consegue fazer.
**Para que serve:** saber qual dos três você precisa antes de escrever a primeira linha.
**Quando usar:** ao planejar qualquer funcionalidade nova. A doc recomenda explicitamente
**customizar uma extensão existente antes de criar uma do zero**.

```ts
import { Extension } from '@tiptap/core'

// Extension: funcionalidade sem conteúdo próprio (atalho, atributo global, plugin)
const MinhaExtensao = Extension.create({
  name: 'minhaExtensao',
})

// Node : adiciona um tipo de conteúdo renderizável
// Mark : aplica formatação a conteúdo existente
//
// Uma extensão pode: adicionar atributos, atributos globais em várias extensões,
// comandos próprios, reagir a eventos (focus, blur, update), registrar atalhos,
// e criar decorations.

// Scaffold oficial, quando for um pacote de verdade:
// npm init tiptap-extension
```

#### core-concepts/keyboard-shortcuts
[doc](https://tiptap.dev/docs/editor/core-concepts/keyboard-shortcuts)

**O que é:** os atalhos que já vêm ligados e como sobrescrevê-los com `addKeyboardShortcuts`.
**Para que serve:** a sintaxe de tecla (`Mod-`, `Shift-`, ordem dos modificadores) e a lista do que
já está ocupado.
**Quando usar:** antes de escolher um atalho novo. `Mod` é a forma portátil: Cmd no Mac, Control no
resto — escrever `Cmd-b` na mão quebra no Windows.

```ts
import { BulletList } from '@tiptap/extension-list'

const CustomBulletList = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      // Mod = Cmd no Mac, Control nos outros
      'Mod-l': () => this.editor.commands.toggleBulletList(),
    }
  },
})

// Letra minúscula; maiúscula só se Shift for intencional.
// Modificadores em qualquer ordem: 'Shift-Control-Enter'.
```

## Extensões prontas

#### extensions/overview
[doc](https://tiptap.dev/docs/editor/extensions/overview)

**O que é:** o índice das extensões, organizadas em nós, marcas e funcionalidade, com o lema da
biblioteca: "não force, estenda".
**Para que serve:** conferir se o que você precisa já existe antes de escrever.
**Quando usar:** **sempre antes de criar extensão própria**. A chance de já existir é alta, e uma
extensão oficial já resolveu o `parseHTML` que você ia esquecer.

```ts
// básico — a página de overview é um índice (sem exemplo de código); isto
// só nomeia os pacotes reais de cada categoria, para orientar a busca:
//   nodes/          -> paragraph, heading, image, table, codeBlock, mention…
//   marks/          -> bold, italic, link, highlight, code, underline…
//   functionality/  -> placeholder, characterCount, bubbleMenu, dragHandle,
//                      collaboration, focus, typography, undoRedo…
//
// Existem kits além do StarterKit: TableKit, ListKit, TextStyleKit —
// cada um agrupa as extensões de uma família.
```

```ts
// caso real — conferindo o catálogo antes de escrever uma extensão própria
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import { TableKit } from '@tiptap/extension-table'

const editor = useEditor({
  // StarterKit já cobre parágrafo, heading, bold, itálico, undo/redo…
  // Typography e TableKit resolvem o resto sem precisar de extensão própria.
  extensions: [StarterKit, Typography, TableKit],
  immediatelyRender: false,
})
```

```ts
// armadilha: registrar de novo uma extensão que o StarterKit já inclui
// errado — Bold duplicado gera conflito de nome no schema
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
const editor = useEditor({ extensions: [StarterKit, Bold] })

// certo — configure a extensão já embutida em vez de reimportá-la
const editorOk = useEditor({ extensions: [StarterKit.configure({ bold: { HTMLAttributes: {} } })] })
```

#### extensions/functionality/starterkit
[doc](https://tiptap.dev/docs/editor/extensions/functionality/starterkit)

**O que é:** o pacote com as extensões mais usadas, em uma importação só.
**Para que serve:** não registrar vinte extensões à mão para ter um editor comum.
**Quando usar:** em praticamente todo editor. Saiba o que vem dentro: **nós** Blockquote,
BulletList, CodeBlock, Document, HardBreak, Heading, HorizontalRule, ListItem, OrderedList,
Paragraph, Text; **marcas** Bold, Code, Italic, Link, Strike, Underline; **funcionalidade**
Dropcursor, Gapcursor, UndoRedo, ListKeymap, TrailingNode.

```js
// básico — exemplo oficial da doc (configurar e desligar extensão do kit)
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

const editor = new Editor({
  content: '<p>Example Text</p>',
  extensions: [
    StarterKit.configure({
      // Disable an included extension
      undoRedo: false,

      // Configure an included extension
      heading: {
        levels: [1, 2],
      },
    }),
  ],
})
```

```tsx
// caso real — hook do rich-editor da casa, com Link próprio no lugar do da StarterKit
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

export function useRichEditor() {
  return useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Link.configure({ openOnClick: false }),
    ],
    immediatelyRender: false,
  })
}
```

```ts
// armadilha: StarterKit (v3) já inclui o Link — registrar outro com o
// mesmo nome não sobrescreve, é erro de extensão duplicada
// errado:
extensions: [StarterKit, Link.configure({ openOnClick: false })]

// certo: desligue a versão do kit ANTES de registrar a sua
extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })]
```

#### extensions/marks/link
[doc](https://tiptap.dev/docs/editor/extensions/marks/link)

**O que é:** a marca de link, com `protocols`, `defaultProtocol`, `autolink`, `linkOnPaste`,
`openOnClick`, `enableClickSelection`, `isAllowedUri` e `shouldAutoLink`.
**Para que serve:** a única extensão do conjunto padrão que tem superfície de segurança própria.
**Quando usar:** **em todo editor que aceita conteúdo de terceiro**. O padrão já traz
`rel="noopener noreferrer nofollow"`; a doc mostra como removê-lo, e você quase nunca quer isso.
`isAllowedUri` é o ponto de recusa por protocolo e por domínio.

```ts
import Link from '@tiptap/extension-link'

Link.configure({
  // defaultValidate é a checagem embutida; componha em vez de substituir
  isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && !url.startsWith('./'),

  // decide se uma URL válida vira link sozinha enquanto se digita
  shouldAutoLink: (url) => url.startsWith('https://'),

  defaultProtocol: 'https',
  openOnClick: false, // num editor, clicar deve posicionar o cursor
})

// Isto protege o link CRIADO NO EDITOR.
// Um href que chegou pronto no payload não passou por aqui:
// a validação na exibição continua sendo obrigatória.
```

```tsx
// caso real — bubble de link da casa, lendo o href ativo com getAttributes
import type { Editor } from '@tiptap/core'

type LinkInfoProps = {
  editor: Editor
}

export function LinkInfo({ editor }: LinkInfoProps) {
  const rawHref = editor.getAttributes('link').href

  return typeof rawHref === 'string' && <span className="truncate text-xs">{rawHref}</span>
}
```

```ts
// armadilha: openOnClick é true por padrão — no editor, clicar num link
// navega em vez de posicionar o cursor
// errado:
Link.configure({})

// certo: desligue para poder editar o texto do link normalmente
Link.configure({ openOnClick: false })
```

#### extensions/nodes/image
[doc](https://tiptap.dev/docs/editor/extensions/nodes/image)

**O que é:** o nó de imagem, com `inline`, `allowBase64`, `HTMLAttributes`, `resize` e o comando
`setImage`.
**Para que serve:** exibir imagem no documento — e só isso. A doc é explícita: "esta extensão só
exibe imagens, ela não faz upload para o seu servidor".
**Quando usar:** junto de um fluxo de upload próprio (ou do FileHandler). Deixe `allowBase64`
desligado: base64 no `src` transforma o corpo do documento no armazenamento de arquivos, e um
parágrafo com três fotos vira um payload de megabytes.

```ts
import Image from '@tiptap/extension-image'

Image.configure({
  inline: false,
  allowBase64: false, // default, e é o certo: o src deve ser uma URL sua
  HTMLAttributes: { class: 'rounded-md' },
})

// editor.commands.setImage({ src, alt, title })
// O src vem do SEU upload. Se ele puder vir do usuário, valide o
// protocolo e o host na exibição, do mesmo jeito que num href.
```

```ts
// caso real — extensão da casa, estendendo o Image com atributo próprio
import TiptapImage from '@tiptap/extension-image'

export const HouseImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      border: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-border'),
      },
    }
  },
})
```

```ts
// armadilha: allowBase64 não é false por acidente — é o default documentado
// errado: ligar para "simplificar" o upload
Image.configure({ allowBase64: true })
// um parágrafo com três fotos em base64 no src vira payload de megabytes

// certo: upload de verdade, src é só a URL que volta dele
Image.configure({ allowBase64: false })
```

#### extensions/functionality/placeholder
[doc](https://tiptap.dev/docs/editor/extensions/functionality/placeholder)

**O que é:** o texto de dica no editor vazio, via classes `is-editor-empty` / `is-empty` e o atributo
`data-placeholder`.
**Para que serve:** o "escreva algo…" que todo campo de texto tem.
**Quando usar:** em todo editor. Ele **não desenha nada sozinho** — sem o CSS da doc, a extensão
funciona e nada aparece na tela, que é o bug mais reportado dela.

```ts
import { Placeholder } from '@tiptap/extensions'

Placeholder.configure({
  placeholder: 'Escreva algo …',
  // ou por nó: ({ node }) => node.type.name === 'heading' ? 'Título' : 'Texto'
  showOnlyWhenEditable: true,
  showOnlyCurrent: true,
  includeChildren: false,
})
```

```css
/* sem isto, o placeholder não aparece */
.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #adb5bd;
  float: left;
  height: 0;
  pointer-events: none;
}
```

```ts
// caso real — placeholder por tipo de nó, lookup object em vez de ternário
import { Placeholder } from '@tiptap/extensions'

const PLACEHOLDER_BY_NODE: Record<string, string> = {
  heading: 'Título',
  paragraph: 'Escreva algo …',
}

Placeholder.configure({
  placeholder: ({ node }) => PLACEHOLDER_BY_NODE[node.type.name] ?? 'Escreva algo …',
})
```

#### extensions/functionality/character-count
[doc](https://tiptap.dev/docs/editor/extensions/functionality/character-count)

**O que é:** contagem de caracteres e palavras, com limite opcional, em
`editor.storage.characterCount`.
**Para que serve:** o "280/500" abaixo do campo, e o limite duro de tamanho.
**Quando usar:** em campo com limite. O limite bloqueia transações que aumentam o conteúdo — é
prevenção real, não só aviso visual. Mas continua sendo **cliente**: o mesmo limite tem que existir
no validador do servidor.

```tsx
import { CharacterCount } from '@tiptap/extensions'

const editor = useEditor({
  extensions: [StarterKit, CharacterCount.configure({ limit: 240 })],
  immediatelyRender: false,
})

// mode: 'textSize' (default) conta caracteres de texto;
// 'nodeSize' conta o tamanho dos nós, que é o que o ProseMirror mede.
const caracteres = editor?.storage.characterCount.characters()
const palavras = editor?.storage.characterCount.words()
```

```tsx
// caso real — contador "n/limite" abaixo do campo, lido do storage
import type { Editor } from '@tiptap/core'

type CharCounterProps = {
  editor: Editor | null
  limit: number
}

export function CharCounter({ editor, limit }: CharCounterProps) {
  const count = editor?.storage.characterCount.characters() ?? 0

  return <span className="text-xs text-muted-foreground">{count}/{limit}</span>
}
```

```ts
// armadilha: o limit do CharacterCount só bloqueia transações no EDITOR —
// não é validação de servidor
// errado: confiar só no limite do editor
app.post('/posts', async ({ request }) => {
  const { body } = request.body()
  await Post.create({ body })
})

// certo: o mesmo limite validado de novo no servidor
app.post('/posts', async ({ request }) => {
  const { body } = request.body()
  if (body.length > 240) throw new Error('corpo excede o limite')
  await Post.create({ body })
})
```

#### extensions/functionality/bubble-menu
[doc](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)

**O que é:** o menu flutuante que aparece **sobre a seleção**, como componente React em
`@tiptap/react/menus`.
**Para que serve:** negrito, itálico e link onde a mão já está, sem subir até uma barra fixa.
**Quando usar:** em editor de texto corrido. No React use o **componente**, não a extensão: a doc diz
que ele "tem uma API mais conveniente e cuida do elemento do DOM".

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

function Editor() {
  const editor = useEditor({ extensions: [StarterKit], immediatelyRender: false })

  return (
    <>
      <BubbleMenu
        editor={editor}
        updateDelay={250}
        // aparece só onde faz sentido
        shouldShow={({ editor }) => !editor.state.selection.empty}
      >
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </>
  )
}

// Mais de um menu na mesma tela? Cada um precisa do seu pluginKey.
```

```tsx
// caso real — bubble de texto da casa, shouldShow recusando nó por nó
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/react/menus'

type TextBubbleProps = {
  editor: Editor
}

export function TextBubble({ editor }: TextBubbleProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubble"
      shouldShow={(props) => {
        const { from, to } = props.state.selection
        if (from === to) return false
        if (props.editor.isActive('image')) return false
        return true
      }}
    >
      <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
    </BubbleMenu>
  )
}
```

```ts
// armadilha: sem pluginKey explícito, o componente cria a sua própria
// PluginKey — nada de fora consegue referenciá-la depois
// errado: não dá pra disparar updatePosition/show/hide por fora
<BubbleMenu editor={editor}>...</BubbleMenu>

// certo: pluginKey explícito, para o setMeta de fora alcançar este menu
<BubbleMenu editor={editor} pluginKey="textBubble">...</BubbleMenu>
editor.commands.setMeta('textBubble', 'hide')
```

#### extensions/functionality/floatingmenu
[doc](https://tiptap.dev/docs/editor/extensions/functionality/floatingmenu)

**O que é:** o menu que aparece **na linha vazia**, também em `@tiptap/react/menus`.
**Para que serve:** o "+" de inserir bloco que todo editor moderno tem.
**Quando usar:** junto do bubble menu, para cobrir os dois momentos: bloco novo e texto selecionado.

```tsx
import { FloatingMenu } from '@tiptap/react/menus'

<FloatingMenu
  editor={editor}
  shouldShow={({ editor }) => editor.isActive('paragraph')}
>
  <button onClick={() => editor?.chain().focus().setHeading({ level: 1 }).run()}>H1</button>
  <button onClick={() => editor?.chain().focus().setBulletList().run()}>Lista</button>
</FloatingMenu>

// Usando o componente do framework, você NÃO registra a extensão
// separadamente no editor.
// Depende de @floating-ui/dom@^1.6.0 — o v3 trocou Tippy.js por Floating UI.
```

## Extensão própria

#### extensions/custom-extensions
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions)

**O que é:** a porta de entrada das extensões próprias: estender existente, criar do zero, node
views.
**Para que serve:** escolher o caminho mais barato para o que você quer.
**Quando usar:** antes de escrever. A doc sugere ler primeiro **como se cria** uma extensão, porque o
conhecimento é o mesmo usado para estender — mas na hora de implementar, tente estender antes.

**básico:** a página oficial é um índice de links (overview/extend-existing/create-new/node-views) — não tem exemplo de código próprio.

```ts
// ordem de custo, do mais barato ao mais caro (síntese da própria estrutura da página):
// 1. .configure()      -> a opção já existe
// 2. .extend()         -> muda atributo, atalho ou renderização de algo pronto
// 3. Node/Mark.create  -> tipo de conteúdo que não existe
// 4. addNodeView()     -> o nó precisa de UI interativa dentro do editor
//
// Pular direto para 3 quando 2 resolveria é o erro mais comum,
// e o preço é manter parseHTML/renderHTML/comandos que já existiam.
```

```ts
// caso real — components/common/rich-editor/extensions/index.ts
// agrega as extensões próprias ao lado das oficiais, cada uma no seu arquivo
import StarterKit from '@tiptap/starter-kit'
import Image from './image'
import Mention from './mention'

export const extensions = [StarterKit, Image, Mention]
```

```ts
// armadilha: criar do zero o que já existe pronto
// errado — reimplementa parseHTML/renderHTML da extensão oficial
const ImagemCustom = Node.create({ name: 'image' /* ...tudo de novo */ })

// certo — estende e preserva o que a extensão oficial já resolvia
const ImagemCustom = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), rounded: { default: false } }
  },
})
```

#### extensions/custom-extensions/create-new/node
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)

**O que é:** criar um nó do zero: `name`, `group`, `content`, `parseHTML`, `renderHTML`,
`addAttributes`, `addCommands`, `addKeyboardShortcuts`, `addInputRules`.
**Para que serve:** tipos de conteúdo que não existem nas extensões oficiais.
**Quando usar:** quando o conteúdo tem **estrutura própria** — um bloco de aviso, um card, um
embed.

```ts
// básico — exemplo da doc oficial: o nó mais simples possível
import { Node } from '@tiptap/core'

const CustomNode = Node.create({
  name: 'customNode',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0]
  },
})
```

```ts
// caso real — components/common/rich-editor/extensions/callout.ts
import { Node, mergeAttributes } from '@tiptap/core'

type CalloutOptions = { HTMLAttributes: Record<string, string> }

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  addOptions() {
    return { HTMLAttributes: {} }
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },
})
```

```ts
// armadilha: Node para algo que não muda a estrutura do documento
// errado — bloco inteiro só para colorir um trecho de texto
const Destaque = Node.create({ name: 'destaque', group: 'block' })

// certo — formatação de parte de um texto é Mark, não Node
const Destaque = Mark.create({ name: 'destaque' })
```

#### extensions/custom-extensions/create-new/mark
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/mark)

**O que é:** criar uma marca do zero, com `inclusive`, `excludes`, `spanning` e o trio de comandos
`set` / `toggle` / `unset`.
**Para que serve:** formatação de trecho que não existe pronta.
**Quando usar:** quando o efeito se aplica a **parte** de um texto. As três flags de comportamento
valem leitura: `excludes` é como você impede duas marcas contraditórias de coexistirem.

```ts
// básico — exemplo da doc oficial: a marca mais simples possível
import { Mark } from '@tiptap/core'

const HighlightMark = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0]
  },
})
```

```ts
// caso real — components/common/rich-editor/extensions/destaque.ts
import { Mark, mergeAttributes } from '@tiptap/core'

type DestaqueOptions = { HTMLAttributes: Record<string, string> }

export const Destaque = Mark.create<DestaqueOptions>({
  name: 'destaque',
  excludes: 'code',
  addOptions() {
    return { HTMLAttributes: {} }
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-destaque': '' }), 0]
  },
})
```

```ts
// armadilha: Mark para algo que muda a estrutura do documento
// errado — uma marca não pode conter outros blocos
const Callout = Mark.create({ name: 'callout' })

// certo — estrutura própria (pode conter parágrafos) é Node, não Mark
const Callout = Node.create({ name: 'callout', group: 'block', content: 'block+' })
```

#### extensions/custom-extensions/extend-existing
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing)

**O que é:** o `.extend()`, com `addOptions`, `addAttributes`, `addGlobalAttributes`,
`addKeyboardShortcuts` e `priority` nas regras de parse.
**Para que serve:** o caminho barato, e o que você deve tentar primeiro.
**Quando usar:** em 80% das customizações. Duas coisas para não esquecer: **`...this.parent?.()`**
preserva o que já existia (sem ele você apaga os atributos da extensão original), e **renomear
extensão é caro** — a doc avisa que o nome aparece em muitos lugares e, se você guarda JSON, está
guardado lá também.

```js
// básico — exemplo da doc oficial: trocar o atalho de teclado da bullet list
// 1. Import the extension
import BulletList from '@tiptap/extension-bullet-list'

// 2. Overwrite the keyboard shortcuts
const CustomBulletList = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-l': () => this.editor.commands.toggleBulletList(),
    }
  },
})

// 3. Add the custom extension to your editor
new Editor({
  extensions: [
    CustomBulletList,
    // …
  ],
})
```

```ts
// caso real — components/common/rich-editor/extensions/bullet-list.ts
import BulletList from '@tiptap/extension-bullet-list'

export const BulletListComAtalho = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
    }
  },
})
```

```ts
// armadilha: extend() sem addKeyboardShortcuts some com o atalho original
// errado — o atalho padrão da extensão some ao sobrescrever sem o parent
const Negrito = Bold.extend({
  addKeyboardShortcuts() {
    return { 'Mod-Shift-b': () => this.editor.commands.toggleBold() }
  },
})

// certo — mantém o atalho oficial e soma o novo
const Negrito = Bold.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-Shift-b': () => this.editor.commands.toggleBold(),
    }
  },
})
```

#### extensions/custom-extensions/node-views
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views)

**O que é:** o conceito de node view: um componente interativo dentro do editor, independente do que
sai no HTML.
**Para que serve:** o ponto que a doc destaca — "controle total sobre a experiência **no editor** *e*
sobre a saída", porque as duas são separadas.
**Quando usar:** quando o nó precisa de UI: player com controles, card com formulário, bloco com
botão. Se é só aparência, `renderHTML` mais CSS resolve e custa muito menos.

```ts
// A separação que a página faz, e que vale internalizar:
//
//   node view  -> o que o AUTOR vê e manipula enquanto edita
//   renderHTML -> o que sai no getHTML(), e o que o LEITOR recebe
//
// Um vídeo pode ter, no editor, controles de legenda, autoplay e recorte;
// na saída, virar um <figure> com um <video src>. Nada da UI vaza.

// Três tipos de nó, pelo comportamento do cursor:
// texto editável | contenteditable="false" | misto (cuidado com o cursor)
```

#### extensions/custom-extensions/node-views/react
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react)

**O que é:** node view com componente React: `ReactNodeViewRenderer`, `NodeViewWrapper`,
`NodeViewContent` e as props recebidas.
**Para que serve:** o encontro do Tiptap com o seu design system — dentro do nó você está em React
normal, com hooks e tudo.
**Quando usar:** em nó interativo numa stack React. Duas regras da doc: a tag do `NodeViewContent`
(`div` para bloco, `span` para inline) **não muda em runtime**, e arrastar exige `draggable: true` na
extensão mais `data-drag-handle` no elemento que serve de alça.

```tsx
import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'

function CalloutView(props) {
  return (
    <NodeViewWrapper className="callout">
      {/* UI fora do conteúdo editável precisa de contentEditable={false} */}
      <button
        contentEditable={false}
        onClick={() => props.updateAttributes({ variant: 'warning' })}
      >
        {props.node.attrs.variant}
      </button>

      {/* onde o conteúdo editável do nó vive */}
      <NodeViewContent className="content" />
    </NodeViewWrapper>
  )
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },
})

// Props: node, updateAttributes, deleteNode, selected, editor, getPos.
// Opções: { as: 'main' }, { contentDOMElementTag: 'header' },
//         { selectedOnTextSelection: true }, { trackNodeViewPosition: true }.
// trackNodeViewPosition re-renderiza muito: use com parcimônia.
```

#### extensions/custom-extensions/mark-views/react
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-views/react)

**O que é:** o equivalente das node views para **marcas**: `ReactMarkViewRenderer`,
`MarkViewContent`, `addMarkView`.
**Para que serve:** renderizar uma marca com componente React — novidade do v3, não existia no v2.
**Quando usar:** quando o link, o comentário ou a menção precisam de UI própria. O conteúdo marcado
fica dentro de `MarkViewContent`; tudo que for controle recebe `contentEditable={false}`.

```tsx
import { Mark } from '@tiptap/core'
import { ReactMarkViewRenderer, MarkViewContent } from '@tiptap/react'
import type { MarkViewRendererProps } from '@tiptap/react'

function ComentarioView(props: MarkViewRendererProps) {
  return (
    <span>
      <MarkViewContent />
      <label contentEditable={false}>
        <button onClick={() => props.updateAttributes({ id: Date.now() })}>↻</button>
      </label>
    </span>
  )
}

export const Comentario = Mark.create({
  name: 'comentario',
  addMarkView() {
    return ReactMarkViewRenderer(ComentarioView)
  },
})
```

## Comandos e API

#### api/commands
[doc](https://tiptap.dev/docs/editor/api/commands)

**O que é:** como comandos funcionam, o encadeamento com `.chain()...run()`, o ensaio com `.can()` e
o contexto (`tr`, `state`, `dispatch`, `commands`, `chain`) dentro de comando próprio.
**Para que serve:** toda ação programática no editor passa por aqui.
**Quando usar:** ao ligar o primeiro botão. A pegadinha que custa tempo: **dentro de um comando
próprio use o `chain` injetado**, não `editor.chain()` — o segundo abre uma transação nova e quebra a
atomicidade.

```ts
// Uma transação só, e o foco volta para o editor depois do clique no botão:
editor.chain().focus().toggleBold().run()

// Ensaio: responde se daria, sem alterar nada. É assim que se desabilita botão.
const podeNegritar = editor.can().chain().toggleBold().run()

// Dentro de addCommands, o chain vem do contexto:
addCommands() {
  return {
    inserirAssinatura: () => ({ chain }) =>
      chain().insertContent('—').insertContent(' Equipe').run(),
  }
}

// Comando de baixo nível: dispatch ausente significa "só teste se dá"
const insertText = (value: string) => ({ tr, dispatch }) => {
  if (dispatch) tr.insertText(value)
  return true
}
```

```tsx
// caso real — toolbar.tsx (botão de negrito)
type ToolbarButtonProps = { editor: Editor }

export function BoldButton({ editor }: ToolbarButtonProps) {
  const ativo = editor.isActive('bold')
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={!editor.can().chain().toggleBold().run()}
      onClick={() => editor.chain().focus().toggleBold().run()}
    >
      Negrito
    </button>
  )
}
```

```ts
// armadilha: editor.chain() fresco dentro de um comando próprio
addCommands() {
  return {
    // errado — abre uma segunda transação, quebra a atomicidade
    assinar: () => () => editor.chain().insertContent('—time').run(),

    // certo — usa o chain já injetado no contexto do comando
    assinar: () => ({ chain }) => chain().insertContent('—time').run(),
  }
}
```

#### api/commands/content/set-content
[doc](https://tiptap.dev/docs/editor/api/commands/content/set-content)

**O que é:** o comando que substitui o documento inteiro, com `emitUpdate`, `parseOptions` e
`errorOnInvalidContent`.
**Para que serve:** carregar conteúdo salvo de volta no editor.
**Quando usar:** ao abrir um registro para edição. Cuidado com o `emitUpdate`, que é `true` por
padrão: carregar o conteúdo salvo dispara `onUpdate` e, num formulário com autosave, marca o registro
como sujo sem o usuário ter tocado em nada.

```ts
// v3: a assinatura é (content, options)
editor.commands.setContent(conteudoSalvo, {
  emitUpdate: false,          // carga inicial não é edição do usuário
  errorOnInvalidContent: true, // falhe alto em vez de perder conteúdo calado
  parseOptions: { preserveWhitespace: 'full' },
})

// setContent SUBSTITUI o documento; insertContent ACRESCENTA na seleção.
// Os dois passam pelo schema: o que não está declarado é descartado.
```

#### api/editor
[doc](https://tiptap.dev/docs/editor/api/editor)

**O que é:** a instância: opções de criação e métodos (`getHTML`, `getJSON`, `getText`, `isActive`,
`can`, `chain`, `setEditable`, `destroy`, `mount`, `unmount`) mais propriedades (`isEditable`,
`isEmpty`, `isFocused`, `isDestroyed`).
**Para que serve:** a referência do dia a dia.
**Quando usar:** ao procurar "como eu leio X do editor". Duas opções que quase ninguém acha e
deveriam ser conhecidas: `injectNonce`, para o editor funcionar sob CSP com nonce, e `textDirection`,
para conteúdo RTL.

```tsx
editor.getHTML()                 // string HTML
editor.getJSON()                 // documento ProseMirror em JSON
editor.getText({ blockSeparator: '\n\n' })

editor.isActive('bold')          // a marca sob o cursor está ativa?
editor.isActive('heading', { level: 2 })
editor.isEmpty
editor.setEditable(false)        // modo leitura sem desmontar nada

// Sob Content-Security-Policy com nonce:
new Editor({ injectNonce: 'o-nonce-da-resposta' })

// React: o useEditor cuida do destroy. Fora dele, destrua você,
// ou o editor sobrevive à tela e vaza listeners.
```

```tsx
// caso real — -components/post-editor.tsx (React 19 + TanStack Start)
export function PostEditor() {
  const editor = useEditor({ extensions: [StarterKit], immediatelyRender: false })

  if (!editor) return null

  return <EditorContent editor={editor} />
}
```

```tsx
// armadilha: ler o editor antes do null-check do useEditor
// errado — immediatelyRender: false faz o primeiro render vir null (SSR)
export function PostEditor() {
  const editor = useEditor({ extensions: [StarterKit], immediatelyRender: false })
  return <div>{editor.isEmpty && 'vazio'}</div>
}

// certo — sai antes de tocar no editor
export function PostEditor() {
  const editor = useEditor({ extensions: [StarterKit], immediatelyRender: false })
  if (!editor) return null
  return <div>{editor.isEmpty && 'vazio'}</div>
}
```

#### api/events
[doc](https://tiptap.dev/docs/editor/api/events)

**O que é:** os eventos do ciclo de vida — `beforeCreate`, `create`, `update`, `selectionUpdate`,
`transaction`, `focus`, `blur`, `destroy`, `paste`, `drop`, `delete`, `contentError` — e as três
formas de assinar.
**Para que serve:** autosave, contador, sincronização com formulário.
**Quando usar:** ao ligar o editor a um estado externo. `onUpdate` dispara **a cada tecla**: jogue o
salvamento num debounce, não no evento cru.

```tsx
const editor = useEditor({
  extensions: [StarterKit],
  immediatelyRender: false,

  onUpdate({ editor }) {
    salvarComDebounce(editor.getJSON())
  },
  onSelectionUpdate({ editor }) {
    // trocar estado do React aqui re-renderiza a cada movimento do cursor
  },
  onContentError({ editor, error }) {
    // conteúdo salvo por uma versão antiga do schema
  },
})

// Em tempo de execução: editor.on('update', fn) / editor.off('update', fn)
// Dentro de extensão: Extension.create({ onUpdate({ editor }) {} })
```

```ts
// caso real — hooks/use-autosave-editor.ts
export function useAutosaveEditor(postId: string) {
  const salvar = useDebouncedCallback((json: JSONContent) => {
    mutatePost({ id: postId, content: json })
  }, 800)

  return { onUpdate: ({ editor }: { editor: Editor }) => salvar(editor.getJSON()) }
}
```

```ts
// armadilha: onUpdate dispara a cada tecla
// errado — um request HTTP por caractere digitado
onUpdate({ editor }) {
  mutatePost({ id: postId, content: editor.getJSON() })
}

// certo — debounce antes de qualquer chamada de rede
onUpdate({ editor }) {
  salvarComDebounce(editor.getJSON())
}
```

#### api/input-rules
[doc](https://tiptap.dev/docs/editor/api/input-rules)

**O que é:** as regras que transformam o texto **enquanto se digita**: `markInputRule`,
`nodeInputRule`, registradas em `addInputRules()`.
**Para que serve:** o `**negrito**` que vira negrito e o `# ` que vira título.
**Quando usar:** na extensão própria, para dar a ela o mesmo atalho de digitação que as oficiais têm.
Sem isso, a sua extensão parece de segunda classe ao lado do StarterKit.

```ts
import { Mark, markInputRule } from '@tiptap/core'

const Destaque = Mark.create({
  name: 'destaque',

  addInputRules() {
    return [
      markInputRule({
        // ==texto== vira destaque no momento em que se fecha o segundo ==
        find: /(?:==)((?:[^=]+))(?:==)$/,
        type: this.type,
      }),
    ]
  },
})

// nodeInputRule faz o mesmo para nós, com getAttributes para extrair
// os grupos da regex e virarem atributos do nó.
// A regex termina em $ porque a regra casa contra o que acabou de ser digitado.
```

#### api/paste-rules
[doc](https://tiptap.dev/docs/editor/api/paste-rules)

**O que é:** o equivalente para **colar**: `markPasteRule`, `nodePasteRule`, em `addPasteRules()`.
**Para que serve:** texto colado passar pela mesma transformação que o texto digitado.
**Quando usar:** sempre que criar uma input rule. Colar é o caminho de entrada mais comum de conteúdo
real, e uma extensão que só trata digitação ignora metade do uso.

```ts
import { Node, nodePasteRule } from '@tiptap/core'

const Figura = Node.create({
  name: 'figura',

  addPasteRules() {
    return [
      nodePasteRule({
        // ![alt](src "title") colado vira nó
        find: /!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/g,
        type: this.type,
        getAttributes: (match) => ({ alt: match[1], src: match[2], title: match[3] }),
      }),
    ]
  },
})

// Diferença de escala: input rule roda contra alguns caracteres,
// paste rule roda contra o documento inteiro que foi colado.
// Regex custosa aqui trava a aba em um Ctrl+V de artigo grande.
```

#### api/node-positions
[doc](https://tiptap.dev/docs/editor/api/node-positions)

**O que é:** a API `NodePos` — `editor.$doc`, `$node`, `$nodes`, `$pos` — com uma interface que
lembra o DOM: `closest`, `querySelector`, `querySelectorAll`, `setAttribute`.
**Para que serve:** navegar e alterar o documento sem escrever aritmética de posição do ProseMirror.
**Quando usar:** em qualquer manipulação programática — numerar títulos, achar todas as menções,
reescrever um bloco. É a diferença entre código legível e contas com `pos + node.nodeSize`.

```ts
// todos os títulos de nível 1
const $titulos = editor.$nodes('heading', { level: 1 })

// o primeiro bloco de código, e o irmão anterior a ele
const $codigo = editor.$node('codeBlock')
const $anterior = $codigo?.before
if ($anterior) $anterior.content = '<p>Exemplo:</p>'

// navegação como no DOM
const $lista = editor.$node('bulletList')
const $itens = $lista?.querySelectorAll('listItem')

// leitura: node, content, textContent, attributes, children, parent,
//          before, after, range, depth
// escrita: setAttribute({ level: 2 })
```

#### core-concepts/decorations
[doc](https://tiptap.dev/docs/editor/core-concepts/decorations)

**O que é:** decorations: mudam como o conteúdo **aparece**, sem tocar no documento. Três tipos —
node, inline e widget — via `addDecorations()`.
**Para que serve:** destaque de busca, marcação de erro de ortografia, indicador de comentário.
**Quando usar:** sempre que a marcação visual **não deve ser salva**. A frase da doc resolve a
dúvida: decorations "não são incluídas quando você salva o editor como JSON ou HTML". Se precisa
persistir, é marca ou nó, não decoration.

```ts
// básico — exemplo da doc oficial
import { Decoration, Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',

  addDecorations() {
    return {
      create: ({ editor, state, view }) => [Decoration.Inline(1, 5, { class: 'highlight' })],
    }
  },
})
```

```ts
// caso real — destacar resultado de busca num editor React isolado
import { Decoration, Extension } from '@tiptap/core'

type SearchStorage = { term: string }

const SearchHighlight = Extension.create<object, SearchStorage>({
  name: 'searchHighlight',

  addStorage() {
    return { term: '' }
  },

  addDecorations() {
    return {
      create: ({ state }) => {
        const term = this.storage.term
        if (!term) return []

        const decorations: Decoration[] = []
        state.doc.descendants((node, pos) => {
          const index = node.isText && node.text ? node.text.indexOf(term) : -1
          index >= 0 && decorations.push(Decoration.Inline(pos + index, pos + index + term.length, { class: 'is-match' }))
        })
        return decorations
      },
    }
  },
})
```

```ts
// armadilha: decoration não é salva — não é onde guardar estado do negócio
// errado
editor.storage.comentario = { texto: 'revisar isto', nodeId }
// ao recarregar a página, a marcação visual simplesmente não existe mais:
// a doc diz que decorations "não são incluídas quando você salva como JSON ou HTML"

// certo
// o comentário vira atributo persistido numa marca própria (addAttributes),
// e a decoration só destaca visualmente o texto que já tem essa marca
```

#### api/utilities/html
[doc](https://tiptap.dev/docs/editor/api/utilities/html)

**O que é:** `generateHTML` e `generateJSON`, a conversão entre os dois formatos **sem instância de
editor**.
**Para que serve:** renderizar no servidor o que foi salvo, e migrar conteúdo em lote.
**Quando usar:** em toda tela de leitura, e em script de migração. Repare na escolha de pacote:
`@tiptap/core` é só navegador; **`@tiptap/html` funciona no servidor**, com DOM virtual. É essa a
importação de um endpoint Node.

```ts
import { generateHTML, generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'

// JSON salvo -> HTML, no servidor
const html = generateHTML(documentoSalvo, [StarterKit])

// HTML legado -> JSON, para migrar uma base antiga
const json = generateJSON('<p>Olá</p>', [StarterKit])

// A lista de extensões passada aqui É o schema desta conversão.
// Nó ou marca fora dela é descartado: mantenha esta lista e a do
// editor na MESMA constante, ou a leitura perde formatação da edição.
```

#### api/utilities/static-renderer
[doc](https://tiptap.dev/docs/editor/api/utilities/static-renderer)

**O que é:** o renderizador estático: `renderToHTMLString`, `renderToReactElement`,
`renderToMarkdown`, sem navegador, sem DOM e sem editor.
**Para que serve:** exibir conteúdo salvo com o mínimo de custo e o mínimo de risco.
**Quando usar:** **é o caminho preferido para a tela de leitura numa stack React**.
`renderToReactElement` devolve elementos React — a injeção de HTML deixa de ser possível por
construção, em vez de depender de você lembrar de sanitizar uma string.

```js
// básico — exemplo da doc oficial
import StarterKit from '@tiptap/starter-kit'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'

renderToHTMLString({
  extensions: [StarterKit],
  content: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello World!' }] },
    ],
  },
})
// retorna: '<p>Hello World!</p>'
```

```tsx
// caso real — tela de leitura em TanStack Start, sem dangerouslySetInnerHTML
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/core'

type LeituraProps = {
  content: JSONContent
}

export function Leitura({ content }: LeituraProps) {
  return <article>{renderToReactElement({ extensions: [StarterKit], content })}</article>
}
```

```ts
// armadilha: extensão com efeito em onCreate/onUpdate não roda no static renderer
// errado
// UniqueID ou TableOfContents dependendo do hook de transação para gerar
// o id/sumário só na hora de renderizar estaticamente
renderToHTMLString({ extensions: [StarterKit, UniqueId], content })
// o id simplesmente não é adicionado: a doc avisa que addProseMirrorPlugins,
// onCreate, onUpdate e os hooks de transação NÃO rodam aqui

// certo
// pré-processar o JSON (gerar os ids) antes de chamar o static renderer,
// e só então renderizar o documento já completo
```

**Acréscimo (2026-10-14), conteúdo rico é só Tiptap** (`frontend.md` §8, `DECISIONS.md` #196): o
mesmo renderizador fecha os três caminhos. JSON gravado pelo editor vai direto para
`renderToReactElement`; Markdown de fora (resposta de IA, importação, legado) vira JSON pelo
`MarkdownManager.parse()` sem editor (entrada `markdown/api/markdown-manager`) e segue pelo mesmo
`renderToReactElement`; exportar Markdown é `renderToMarkdown` (`@tiptap/static-renderer/pm/markdown`,
que recebe o JSON, a lista de extensões e opções). Nenhuma outra lib de Markdown entra
(`react-markdown`, `remark-*`, `rehype-*`). Editor, `MarkdownManager` e renderizador recebem a mesma
constante de extensões, senão um nó lido de um lado some do outro.

```ts
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'

const markdown = renderToMarkdown({ extensions: richTextExtensions, content })
```

## Conteúdo, persistência e formato

#### core-concepts/persistence
[doc](https://tiptap.dev/docs/editor/core-concepts/persistence)

**O que é:** onde e como guardar o conteúdo — navegador, banco, arquivo — e a comparação JSON contra
HTML.
**Para que serve:** a decisão que você toma uma vez e vive com ela.
**Quando usar:** antes da primeira migração de banco. A recomendação da doc é **JSON**: "mais
flexível, mais fácil de percorrer, e permite edições externas sem rodar um parser de HTML por cima".

```js
// básico — exemplo da doc oficial, persistindo em LocalStorage
// Save the editor content to LocalStorage
localStorage.setItem('editorContent', JSON.stringify(editor.getJSON()))

// Restore the editor content from LocalStorage
const savedContent = localStorage.getItem('editorContent')
if (savedContent) {
  editor.setContent(JSON.parse(savedContent))
}
```

```ts
// caso real — mutation do TanStack Query gravando no banco
import { useMutation } from '@tanstack/react-query'
import type { Editor } from '@tiptap/core'

async function salvarConteudo(editor: Editor) {
  await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: editor.getJSON() }),
  })
}

function useSalvarDocumento() {
  return useMutation({ mutationFn: salvarConteudo })
}
```

```ts
// armadilha: guardar HTML em vez de JSON na coluna do banco
// errado
await api.post('/documents', { content: editor.getHTML() })
// toda consulta ("quais documentos mencionam @fulano?") vira regex sobre
// markup, e toda mudança de schema vira reescrita com parser de HTML

// certo
await api.post('/documents', { content: editor.getJSON() })
// a doc recomenda JSON: "mais flexível, mais fácil de percorrer, e permite
// edições externas sem rodar um parser de HTML por cima"
```

#### guides/output-json-html
[doc](https://tiptap.dev/docs/guides/output-json-html)

**O que é:** o guia de saída: `getJSON` contra `getHTML`, e como renderizar sem instanciar editor.
**Para que serve:** escolher o formato com os dois critérios certos — o que é fácil de percorrer e o
que é fácil de exibir.
**Quando usar:** **leia esta antes de criar a coluna do banco**. E leia até o fim: é aqui que está a
frase de segurança mais importante da documentação inteira — "você deve sempre validar a entrada do
usuário", e "não importa se é JSON ou HTML".

```js
// básico — exemplo da doc oficial
const json = editor.getJSON()
const html = editor.getHTML()

// Restaurar JSON na criação:
new Editor({ content: { type: 'doc', content: [] } })

// Restaurar HTML na criação:
new Editor({ content: '<p>Example Text</p>' })
```

```ts
// caso real — mutation salva JSON, loader de rota restaura
import type { Editor, JSONContent } from '@tiptap/core'

type SalvarDocumentoInput = {
  editor: Editor
}

async function salvarDocumento({ editor }: SalvarDocumentoInput) {
  const content: JSONContent = editor.getJSON()
  await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

// no loader da rota: editor.commands.setContent(documento.content)
```

```ts
// armadilha: achar que o formato (JSON ou HTML) já é segurança
// errado
// "uso JSON, então não preciso sanitizar a entrada do usuário"

// certo
// a doc é explícita: "it doesn't matter if it's JSON or HTML... you
// should always validate user input" — sanitização é etapa separada,
// com lista de permissão por atributo, nunca por confiar no formato
```

#### guides/invalid-schema
[doc](https://tiptap.dev/docs/guides/invalid-schema)

**O que é:** o que acontece quando o conteúdo salvo não cabe mais no schema atual, com
`enableContentCheck`, `emitContentError` e o evento `contentError`.
**Para que serve:** transformar perda silenciosa de conteúdo em erro visível.
**Quando usar:** **em todo editor que já tem dado em produção**. É o cenário real: você remove uma
extensão, sobe a versão, e documentos antigos perdem um pedaço sem ninguém notar por semanas.

```jsx
// básico — exemplo da doc oficial
new Editor({
  enableContentCheck: true,
  content: potentiallyInvalidContent,
  onContentError({ editor, error, disableCollaboration }) {
    // Your error handling logic here
  },
  // ... other options
})
```

```tsx
// caso real — editor React que bloqueia edição em conteúdo corrompido
const editor = useEditor({
  extensions: [StarterKit],
  content: conteudoSalvo,
  immediatelyRender: false,

  enableContentCheck: true, // valida contra o schema e emite erro
  onContentError({ editor, error, disableCollaboration }) {
    // recomendação da doc em colaboração: desligue a sincronização
    // e bloqueie a edição, para não propagar conteúdo corrompido
    disableCollaboration()
    editor.setEditable(false)
  },
})

// Só quero ser avisado, sem bloquear o conteúdo:
//   enableContentCheck: false, emitContentError: true
```

```ts
// armadilha: subir a versão da extensão sem tratar contentError
// errado
useEditor({ extensions: [StarterKit], content: conteudoSalvo })
// sem enableContentCheck, o nó que a extensão removida criava simplesmente
// desaparece do documento ao carregar — perda silenciosa, sem log, sem aviso

// certo
useEditor({
  extensions: [StarterKit],
  content: conteudoSalvo,
  enableContentCheck: true,
  onContentError: ({ error }) => reportarErro(error),
})
// a checagem é "100% precisa para conteúdo em JSON"; em HTML pode escapar
// coisa de marca — mais um argumento para guardar JSON (core-concepts/persistence)
```

#### markdown
[doc](https://tiptap.dev/docs/editor/markdown)

**O que é:** o suporte bidirecional a Markdown do v3: converte Markdown para o JSON do Tiptap e de
volta, usando o MarkedJS como parser.
**Para que serve:** aceitar Markdown colado, exportar Markdown, ou guardar Markdown em vez de JSON.
**Quando usar:** com cautela. A própria página chama o recurso de **early release**, sujeito a mudança
e a casos de borda, e lista limitações concretas: comentários se perdem na conversão, e célula de
tabela fica restrita a um filho por limitação da sintaxe.

```js
// básico — exemplo da doc oficial
import { Markdown } from '@tiptap/markdown'

// Set initial content
const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: '# Hello World\n\nThis is **Markdown**!',
  contentType: 'markdown',
})

// Insert content
editor.commands.insertContent('# Hello World\n\nThis is **Markdown**!')
```

```ts
// caso real — editor com modo Markdown/HTML alternável (rich-editor da casa)
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'

type EditorMode = 'rich' | 'markdown'

function useRichEditor(modo: EditorMode, conteudo: string) {
  return useEditor({
    extensions: [StarterKit, Markdown],
    content: conteudo,
    contentType: modo === 'markdown' ? 'markdown' : 'html',
    immediatelyRender: false,
  })
}
```

```ts
// armadilha: editor com comentário salvo + conversão pra Markdown
// errado
editor.commands.setContent(conteudoComComentario, { contentType: 'markdown' })
// a doc avisa: comments "are not supported yet" — eles se perdem na
// conversão, e o produto descobre isso só quando o comentário já foi embora

// certo
// manter comentários fora do fluxo Markdown (guardar/exibir à parte), ou
// não converter documentos com comentário pendente para Markdown
```

## React, colaboração e migração

#### guides/performance
[doc](https://tiptap.dev/docs/guides/performance)

**O que é:** o guia de desempenho no React: isolar o editor em componente próprio, `useEditorState`,
`immediatelyRender` e `shouldRerenderOnTransaction`.
**Para que serve:** o problema número um do Tiptap com React, nas palavras da doc: "o editor é
re-renderizado vezes demais".
**Quando usar:** **na primeira barra de ferramentas**. Um `editor.isActive('bold')` lido direto no
corpo do componente re-renderiza a árvore inteira a cada tecla.

```jsx
// básico — exemplo da doc oficial: isole o editor num componente próprio
import { EditorContent, useEditor } from '@tiptap/react'

const TiptapEditor = () => {
  const editor = useEditor({
    extensions,
    content,
  })

  return (
    <>
      <EditorContent editor={editor} />
      {/* Other components that depend on the editor instance */}
      <MenuComponent editor={editor} />
    </>
  )
}

export default TiptapEditor
```

```tsx
// caso real — toolbar que assina só o que interessa via useEditorState
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'

type ToolbarProps = {
  editor: Editor
}

function Toolbar({ editor }: ToolbarProps) {
  // assina só o que interessa: re-renderiza quando ESTES valores mudam
  const { isBold, isItalic } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor.isActive('bold'),
      isItalic: editor.isActive('italic'),
    }),
  })

  return <button data-active={isBold} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
}

// Outras alavancas:
// - shouldRerenderOnTransaction: false em documento grande
// - aviso de flushSync? envolva a atualização em queueMicrotask()
```

```tsx
// armadilha: sidebar sem relação com o editor no MESMO componente
// errado (exemplo da doc)
const App = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const editor = useEditor({ extensions, content })

  return (
    <>
      <UnrelatedSidebar onChange={setSidebarOpen} />
      <EditorContent editor={editor} />
    </>
  )
}
// abrir a sidebar re-renderiza o editor: "these unrelated components will
// cause the editor to re-render more often than necessary"

// certo: o editor fica isolado em TiptapEditor (exemplo acima), e a
// sidebar vive num componente separado que não compartilha render
```

#### guides/react-composable-api
[doc](https://tiptap.dev/docs/guides/react-composable-api)

**O que é:** a API composta do React: o componente `Tiptap` como provider, `Tiptap.Content`, e os
hooks `useTiptap` e `useTiptapState`.
**Para que serve:** eliminar o prop drilling do `editor` por toolbar, menu e sidebar.
**Quando usar:** quando a UI do editor passar de um componente. Para uma toolbar simples, passar o
`editor` por prop continua mais direto. `useCurrentEditor` segue existindo por compatibilidade.

```tsx
import { Tiptap, useEditor, useTiptap, useTiptapState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function Editor() {
  const editor = useEditor({ extensions: [StarterKit], immediatelyRender: false })
  if (!editor) return null

  return (
    <Tiptap editor={editor}>
      <Toolbar />
      <Tiptap.Content />
    </Tiptap>
  )
}

function Toolbar() {
  const { editor } = useTiptap() // sem prop, sem contexto próprio
  if (!editor) return null
  return <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
}

// useTiptapState assina uma fatia do estado, para o componente
// não re-renderizar a cada transação.
```

#### collaboration/getting-started/overview
[doc](https://tiptap.dev/docs/collaboration/getting-started/overview)

**O que é:** a visão geral da edição colaborativa: sincronização pelo CRDT do Yjs, presença e cursor
por awareness, rodando sobre o backend Hocuspocus.
**Para que serve:** entender a arquitetura **antes** de avaliar custo, porque aqui a fronteira entre
grátis e pago importa.
**Quando usar:** ao decidir entre self-host e nuvem. O Hocuspocus é open source e você hospeda;
histórico de versões, comparação de snapshot e a nuvem gerenciada são produto pago. A troca entre
`HocuspocusProvider` e `TiptapCollabProvider` é declarada como direta, o que mantém a porta aberta
nos dois sentidos.

```ts
// As três camadas, e quem é responsável por cada uma:
//
//   Y.Doc        -> o CRDT: resolve conflito sem servidor autoritativo
//   provider     -> o transporte: HocuspocusProvider (seu) ou
//                   TiptapCollabProvider (nuvem paga)
//   Collaboration-> a extensão que liga o documento do Tiptap ao Y.Doc
//
// Colaboração muda o modelo de persistência: o Y.Doc passa a ser
// a fonte da verdade, e o seu banco vira destino de snapshot.
// Não é uma flag — é uma decisão de arquitetura.
```

#### extensions/functionality/collaboration
[doc](https://tiptap.dev/docs/editor/extensions/functionality/collaboration)

**O que é:** a extensão de colaboração em si: `document`, `field`, `fragment`, e os comandos de
desfazer e refazer que ela traz.
**Para que serve:** ligar o editor a um `Y.Doc`.
**Quando usar:** quando já houver provider. A pegadinha está na doc, e derruba a primeira tentativa
de todo mundo: **desligue o `UndoRedo` do StarterKit** — a colaboração traz o próprio histórico, e
dois históricos disputando a mesma pilha desfazem edição alheia.

```ts
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import * as Y from 'yjs'

const ydoc = new Y.Doc()

const editor = new Editor({
  extensions: [
    StarterKit.configure({ undoRedo: false }), // obrigatório
    Collaboration.configure({ document: ydoc }),
  ],
})

// Usando UniqueID junto: monte o editor SÓ depois do provider sincronizar,
// ou você acumula parágrafos vazios que não somem mais.
```

#### guides/upgrade-tiptap-v2
[doc](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)

**O que é:** o guia de migração do v2 para o v3, com as mudanças que quebram.
**Para que serve:** o roteiro do upgrade, e a explicação do bug mais confuso do pós-migração.
**Quando usar:** **antes de subir a versão, inteiro**. A mudança que mais assusta é silenciosa:
`shouldRerenderOnTransaction` passou a ser `false` por padrão no `@tiptap/react`, e o sintoma é uma
toolbar que compila, roda e simplesmente não acende mais.

```diff
// básico — exemplo da doc oficial, consolidação do pacote de tabela
Table packages
- import Table from '@tiptap/extension-table'
- import TableRow from '@tiptap/extension-table-row'
- import TableCell from '@tiptap/extension-table-cell'
- import TableHeader from '@tiptap/extension-table-header'
+ import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
```

```ts
// caso real — checklist mínimo pra migrar um editor da casa
// Pacotes consolidados
// '@tiptap/extension-table-row' etc.  -> '@tiptap/extension-table'
// listas separadas                    -> '@tiptap/extension-list'
// novo bundle @tiptap/extensions: CharacterCount, Dropcursor,
//   Gapcursor, Focus, Placeholder

// Menus: Tippy.js saiu, Floating UI entrou
// npm i @floating-ui/dom@^1.6.0 ; npm rm tippy.js
import { BubbleMenu } from '@tiptap/react/menus' // antes: '@tiptap/react'

// Renomeações
// History             -> UndoRedo     (StarterKit: history:false -> undoRedo:false)
// CollaborationCursor -> CollaborationCaret
// CollaborationHistory-> Snapshot

// Assinatura e comportamento
// setContent(content, options)        — options agora é o 2º argumento
// getPos() na node view pode devolver undefined: proteja o uso
```

```ts
// armadilha: toolbar que para de reagir depois do upgrade pro v3
// errado
const editor = useEditor({ extensions, content })
// compila, roda, e editor.isActive('bold') lido na toolbar simplesmente
// não atualiza mais a cada tecla

// certo
// shouldRerenderOnTransaction agora é false por padrão no @tiptap/react:
const editor = useEditor({ extensions, content, shouldRerenderOnTransaction: true })
// ou migre a toolbar pra useEditorState (guides/performance), que não
// depende dessa flag pra re-renderizar
```

#### guides/typescript
[doc](https://tiptap.dev/docs/guides/typescript)

**O que é:** como tipar extensão própria: opções por generic, `Storage` e o `Commands` por
`declare module '@tiptap/core'`.
**Para que serve:** o comando que você criou aparecer no autocomplete de
`editor.commands.` em vez de dar erro de tipo.
**Quando usar:** ao criar o primeiro comando próprio. Sem a declaração de módulo, ou o TypeScript
recusa, ou alguém resolve com um cast e apaga a verificação inteira.

```ts
import { Extension } from '@tiptap/core'

export type MinhasOpcoes = { limite: number }
export type MeuStorage = { total: number }

declare module '@tiptap/core' {
  interface Storage {
    minhaExtensao: MeuStorage
  }
  interface Commands<ReturnType> {
    minhaExtensao: {
      /** Este comentário aparece no autocomplete do editor. */
      inserirAssinatura: (texto: string) => ReturnType
    }
  }
}

export const MinhaExtensao = Extension.create<MinhasOpcoes, MeuStorage>({
  name: 'minhaExtensao',
  addOptions() {
    return { limite: 100 }
  },
  addStorage() {
    return { total: 0 }
  },
  addCommands() {
    return {
      inserirAssinatura: (texto) => ({ commands }) => commands.insertContent(texto),
    }
  },
})

// editor.storage.minhaExtensao.total  -> tipado
// editor.commands.inserirAssinatura('—') -> tipado
```

## Instalação e menus

#### editor/getting-started/install
[doc](https://tiptap.dev/docs/editor/getting-started/install) | [markdown](https://tiptap.dev/docs/editor/getting-started/install.md)

**O que é:** o índice de instalação por ambiente: JavaScript puro, React, Next, Vue 3, Vue 2, Nuxt,
Svelte, Alpine.js e PHP, mais os adaptadores da comunidade para Angular e Solid.
**Para que serve:** achar a página do framework; a do React (`getting-started/install/react`, acima)
é a única que vale na stack.
**Quando usar:** ao abrir a doc pela primeira vez. As outras instalações estão em "Fora da stack",
uma linha cada.

#### editor/getting-started/style-editor/custom-menus
[doc](https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus) | [markdown](https://tiptap.dev/docs/editor/getting-started/style-editor/custom-menus.md)

**O que é:** como montar a barra do editor: menu fixo (um `<div>` seu acima do editor), bubble menu,
floating menu e o experimento de slash command. O botão chama a cadeia
`editor.chain().focus().toggleBold().run()`; `focus()` devolve o foco que o clique no botão tirou.
O estado ativo vem de `editor.isActive('bold')`, com atributo (`isActive('highlight', { color })`),
expressão regular ou só atributo (`isActive({ textAlign: 'right' })`). Seleção que cobre marcas
mistas devolve `false`.
**Para que serve:** a barra de ferramentas, que o Tiptap não entrega.
**Quando usar:** ao montar `components/common/rich-editor/`. A página avisa que no React o
`isActive()` **não é reativo**: a barra lê pelo `useEditorState` (entrada
`getting-started/install/react`), senão o botão não acende. Os botões são `<button>` do kit
(`components/ui`), com `aria-label` por chave i18n e navegação por teclado (`frontend.md` §10.2);
a própria página lista teclado, ARIA e atalhos visíveis como requisito.

```tsx
const state = useEditorState({
  editor,
  selector: ({ editor: current }) => ({ bold: current.isActive('bold') }),
})

<Button
  type="button"
  aria-pressed={state.bold}
  aria-label={m.editor_bold()}
  onClick={() => editor.chain().focus().toggleBold().run()}
/>
```

## Extensão própria: criar, views e estrutura

#### editor/extensions/custom-extensions/create-new
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new) | [markdown](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new.md)

**O que é:** a porta de entrada para criar do zero: `Extension.create` (funcionalidade, sem schema),
`Node.create` (conteúdo da árvore, bloco ou inline) e `Mark.create` (formatação inline). Os três
aceitam objeto ou função que devolve o objeto (útil para guardar variável e handler fechados).
Termina no CLI para publicar extensão avulsa.
**Para que serve:** escolher o tipo certo antes de escrever.
**Quando usar:** antes de toda extensão da casa. Nó e marca mudam o JSON gravado; extensão pura não.
Os detalhes de cada um estão em `create-new/node`, `create-new/mark` (acima) e `create-new/extension`.

#### editor/extensions/custom-extensions/create-new/extension
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension) | [markdown](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension.md)

**O que é:** a referência da Extension API: `name` (vira o nome no JSON quando é nó ou marca),
`priority` (padrão 100; maior carrega antes e ordena plugin e schema), `addOptions`, `addStorage`,
`addCommands`, `addKeyboardShortcuts`, `addInputRules`, `addPasteRules`, `transformPastedHTML`
(limpa HTML colado antes do parse, em cadeia por prioridade), eventos, `dispatchTransaction`
(middleware sobre a transação, com `next`), `addProseMirrorPlugins`, `addDecorations`,
`addGlobalAttributes`, `addExtensions`, `extendNodeSchema`, `extendMarkSchema`, e o que existe em
`this`.
**Para que serve:** o contrato de tudo o que uma extensão pode fazer.
**Quando usar:** ao escrever extensão. Tipagem de opção, storage e comando por `declare module
'@tiptap/core'` (exemplo na entrada `guides/typescript`), nunca `as`. `transformPastedHTML` é o
lugar de tirar estilo colado do Word ou do Google Docs; não é sanitização de exibição (o aviso do
topo continua valendo).

#### editor/extensions/custom-extensions/mark-views
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-views) | [markdown](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-views.md)

**O que é:** visão geral de mark view: a versão mais simples do node view, para marcas. Não tem
relação com o HTML de saída, por desenho. Para renderizar componente de verdade fora do editor, a
página manda para o Static Renderer.
**Para que serve:** marca interativa dentro do editor (link com prévia, marcação com menu).
**Quando usar:** só para a experiência dentro do editor. A leitura continua no
`renderToReactElement` (`frontend.md` §8); a variante React está em `mark-views/react` (acima).

#### editor/extensions/custom-extensions/node-views/examples
[doc](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/examples) | [markdown](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/examples.md)

**O que é:** exemplos de node view (alça de arraste, desenho em SVG) que a página declara "não
oficialmente suportados": sem teste e sem a manutenção das extensões oficiais. O de desenho manda
o dado inteiro a cada mudança e "derrete" o backend de WebSocket com Collaboration.
**Para que serve:** ponto de partida para nó interativo.
**Quando usar:** como leitura. Para arrastar bloco, a extensão oficial é `DragHandleReact`
(catálogo de extensões), não este exemplo.

#### guides/create-mark
[doc](https://tiptap.dev/docs/guides/create-mark) | [markdown](https://tiptap.dev/docs/guides/create-mark.md)

**O que é:** passo a passo de uma marca (`HighlightMark`): estrutura com `Mark.create`, `parseHTML`
e `renderHTML`, atributos, comandos, atalho de teclado, input rule com `markInputRule` e teste com
`new Editor` no próprio teste.
**Para que serve:** o roteiro completo de uma marca, do schema ao teste.
**Quando usar:** ao criar marca da casa. O teste da página instancia `Editor` sem DOM de navegador;
na casa ele roda no Vitest com jsdom (`frontend.md` §11.1).

#### guides/nested-node-view-content
[doc](https://tiptap.dev/docs/guides/nested-node-view-content) | [markdown](https://tiptap.dev/docs/guides/nested-node-view-content.md)

**O que é:** nó pai com filhos, cada um com seu node view e seu `NodeViewContent`. A regra central é
de schema: o pai declara em `content` exatamente quais filhos aceita, e a inserção cria a estrutura
inteira de uma vez. Versão Vue e versão React (`ReactNodeViewRenderer`, `NodeViewWrapper`,
`NodeViewContent` de `@tiptap/react`).
**Para que serve:** bloco composto editável (cartão com título e corpo, pergunta e resposta).
**Quando usar:** quando um bloco tem partes editáveis separadas. Siga a metade React; a de Vue é
fora da stack.

## API: decorações, node views e utilitários

#### editor/api/decorations
[doc](https://tiptap.dev/docs/editor/api/decorations) | [markdown](https://tiptap.dev/docs/editor/api/decorations.md)

**O que é:** a referência de `addDecorations` (hook de toda extensão, devolve um `DecorationSpec`
ou `null`; o Tiptap junta todas num único plugin), as estratégias de atualização (`document` é a
padrão e sempre correta), `Decoration.Node`, `Decoration.Inline`, `Decoration.Widget`, o comando
`updateDecorations` (reconstrói tudo, para quando um valor fora do documento muda, como o termo de
busca), `ReactWidgetRenderer` (widget como componente React no mesmo portal do editor, com contexto
e hooks), `liveWidgetKeys` e `createWidgetDecoration`. Conferido no tipo de `@tiptap/core@3.32.0`.
**Para que serve:** marcar visualmente sem mudar o documento: busca, erro de ortografia, contador.
**Quando usar:** sempre que o destaque não deve ir para o JSON gravado. O conceito está em
`core-concepts/decorations` (acima); esta é a API.

#### editor/api/resizable-nodeviews
[doc](https://tiptap.dev/docs/editor/api/resizable-nodeviews) | [markdown](https://tiptap.dev/docs/editor/api/resizable-nodeviews.md)

**O que é:** `ResizableNodeView`, node view independente de framework que embrulha um elemento e
acrescenta alças de redimensionamento: `directions`, limites, proporção travada, callbacks
`onResize`/`onCommit`. Não injeta estilo: o CSS de `[data-resize-handle]` e `.is-resizing` é seu.
**Para que serve:** imagem ou bloco redimensionável no editor.
**Quando usar:** imagem com largura escolhida pelo autor. Estilo das alças em Tailwind; alça sem
alternativa por teclado precisa de controle de tamanho por campo (`frontend.md` §10.2).

#### editor/api/utilities
[doc](https://tiptap.dev/docs/editor/api/utilities) | [markdown](https://tiptap.dev/docs/editor/api/utilities.md)

**O que é:** o índice dos utilitários: HTML (JSON e HTML no servidor), JSX, Position, Static
Renderer, Suggestion e Tiptap for PHP.
**Para que serve:** saber o que existe fora da API do editor.
**Quando usar:** consulta. Na casa, o que importa é o Static Renderer (leitura) e o Suggestion
(menção, comando de barra).

#### editor/api/utilities/jsx
[doc](https://tiptap.dev/docs/editor/api/utilities/jsx) | [markdown](https://tiptap.dev/docs/editor/api/utilities/jsx.md)

**O que é:** escrever o `renderHTML` em JSX com `/** @jsxImportSource @tiptap/core */`; `<slot />`
marca o buraco do conteúdo editável. A página avisa que não é React: sem hook, sem estado.
**Para que serve:** `renderHTML` legível em nó com muita marcação.
**Quando usar:** raramente. Num projeto React o pragma por arquivo confunde quem lê; o array
`['div', attrs, 0]` da doc de nós continua sendo o padrão.

#### editor/api/utilities/position
[doc](https://tiptap.dev/docs/editor/api/utilities/position) | [markdown](https://tiptap.dev/docs/editor/api/utilities/position.md)

**O que é:** `createMappablePosition` e `getUpdatedPosition` (de `@tiptap/core`) para guardar uma
posição e mapeá-la pelas transações; `toJSON`/`fromJSON` para gravar. `CollaborationMappablePosition`
(de `@tiptap/extension-collaboration`) usa posição relativa do Y.js. Limite documentado: quando a
colaboração parte um parágrafo, a posição depois do corte vai para o fim do primeiro pedaço.
**Para que serve:** âncora que sobrevive à edição (comentário próprio, marcador).
**Quando usar:** ao guardar posição fora do documento. Posição como número cru quebra na primeira
edição antes dela.

#### editor/api/utilities/suggestion
[doc](https://tiptap.dev/docs/editor/api/utilities/suggestion) | [markdown](https://tiptap.dev/docs/editor/api/utilities/suggestion.md)

**O que é:** o motor de autocompletar por caractere (`@tiptap/suggestion`), base de Mention e
Emoji: `char`, `allow`, `shouldShow`, `minQueryLength`, `debounce`, `initialItems`, `items` (recebe
`AbortSignal`, cancelado a cada tecla), `command`, `render` (`onStart`, `onUpdate`, `onKeyDown`,
`onExit`), posição pelo Floating UI com `props.mount(element)` (`placement`, `offset`, `flip`,
`container`), `exitSuggestion` e, em colaboração, `shouldShow` com `isChangeOrigin` para o popup
não abrir em todos os clientes.
**Para que serve:** menção, comando de barra, emoji, hashtag.
**Quando usar:** ao montar menção. A busca é `queryOptions` do TanStack Query chamado de dentro de
`items` com o `signal` repassado; `debounce` evita uma requisição por tecla. Popup dentro de Dialog
vai com `container`. Lista com `role="listbox"` e navegação por seta no `onKeyDown`.

## Markdown (`@tiptap/markdown`)

A casa grava JSON e lê pelo `renderToReactElement`; Markdown de fora (resposta de IA, importação,
conteúdo legado) entra pelo `MarkdownManager.parse()` sem editor e segue pelo mesmo renderizador
(`frontend.md` §8, "Conteúdo rico é só Tiptap"). Nenhuma outra lib de Markdown entra
(`react-markdown`, `remark-*`, `rehype-*`, `marked` direto). A página `markdown` (acima) declara o
pacote *early release*: fixe a versão. Conferido contra `@tiptap/markdown@3.32.0`.

#### editor/markdown/getting-started/installation
[doc](https://tiptap.dev/docs/editor/markdown/getting-started/installation) | [markdown](https://tiptap.dev/docs/editor/markdown/getting-started/installation.md)

**O que é:** `@tiptap/markdown` com a extensão `Markdown` no editor; conteúdo inicial em Markdown
com `contentType: 'markdown'`; opções de indentação, instância própria do `marked` e opções do
`marked`; problemas comuns (pacote não achado, Markdown que não é lido, erro de TypeScript).
**Para que serve:** ligar o Markdown no editor ou no gerenciador avulso.
**Quando usar:** quando o projeto recebe Markdown de fora. `pnpm add @tiptap/markdown`; o `marked`
vem como dependência dele e não se instala nem se importa direto.

#### editor/markdown/getting-started/basic-usage
[doc](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage) | [markdown](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage.md)

**O que é:** `editor.getMarkdown()`, `setContent`/`insertContent` com `contentType: 'markdown'`,
`editor.markdown` (o `MarkdownManager`), GFM (tabela e lista de tarefa precisam das extensões
registradas) e a seção **Handling HTML in Markdown**: HTML embutido no Markdown é lido pelas regras
`parseHTML` das extensões registradas. Boa prática da página: sempre `contentType: 'markdown'`, senão
o texto é lido como HTML.
**Para que serve:** entrada e saída de Markdown pelo editor.
**Quando usar:** "Handling HTML in Markdown" é a base da regra da casa: o schema das extensões é a
lista de permissão do HTML embutido, sem schema de sanitização à mão. Tag que nenhuma extensão
reconhece não vira nó. Conferido no código de `@tiptap/markdown@3.32.0` (`parseHTMLToken`): HTML não
reconhecido vira **texto literal**, e **sem `window.DOMParser` (SSR) todo HTML embutido vira texto
literal**, mesmo o que o schema aceitaria no navegador. Converta num lado só (no servidor, no
loader ou na gravação) e mande JSON para a tela; converter no SSR e de novo no cliente dá saída
diferente e erro de hidratação.

#### editor/markdown/api/editor
[doc](https://tiptap.dev/docs/editor/markdown/api/editor) | [markdown](https://tiptap.dev/docs/editor/markdown/api/editor.md)

**O que é:** o que a extensão acrescenta ao editor: `getMarkdown()`, a propriedade `markdown`, as
opções `content` e `contentType` (padrão `json`; combinação inválida cai para o tipo detectado), os
comandos de conteúdo com `contentType`, e as chaves novas de extensão: `markdownTokenName`,
`parseMarkdown`, `renderMarkdown`, `markdownTokenizer`, `markdownOptions`.
**Para que serve:** a API de Markdown dentro do editor.
**Quando usar:** ao dar suporte a Markdown numa extensão própria (`parseMarkdown` e
`renderMarkdown` são o par de ida e volta, como `parseHTML` e `renderHTML`).

#### editor/markdown/api/extension
[doc](https://tiptap.dev/docs/editor/markdown/api/extension) | [markdown](https://tiptap.dev/docs/editor/markdown/api/extension.md)

**O que é:** `Markdown.configure({ indentation, marked, markedOptions })`.
**Para que serve:** configurar a extensão `Markdown` no editor.
**Quando usar:** só se a indentação de lista exportada precisar de tab ou de outro tamanho.

#### editor/markdown/api/markdown-manager
[doc](https://tiptap.dev/docs/editor/markdown/api/markdown-manager) | [markdown](https://tiptap.dev/docs/editor/markdown/api/markdown-manager.md)

**O que é:** a classe `MarkdownManager`, motor de parse e serialização que funciona **sem editor**:
construtor com `extensions` (no tipo publicado é obrigatório dentro de `options`), `marked`,
`markedOptions` e `indentation`; `registerExtension()`, `parse(markdown)` (devolve JSON do
Tiptap), `serialize(json)` (devolve Markdown), `renderNodeToMarkdown()`, `renderNodes()`,
`hasMarked()`, `instance`, `indentCharacter`, `indentString`.
**Para que serve:** converter Markdown em JSON (e o contrário) fora do editor.
**Quando usar:** é a entrada da casa para Markdown de fora (`frontend.md` §8). O componente único
de `components/common/rich-text/` recebe JSON ou Markdown; o Markdown passa por `parse()` com as
**mesmas extensões** que o renderizador usa, e o JSON resultante vai para `renderToReactElement`.
Lista de extensões em uma constante só, compartilhada pelo editor, pelo manager e pelo renderizador.

```tsx
import type { JSONContent } from '@tiptap/core'
import { MarkdownManager } from '@tiptap/markdown'
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'
import { richTextExtensions } from '@/lib/rich-text-extensions'

const markdownManager = new MarkdownManager({ extensions: richTextExtensions })

type RichTextProps = Readonly<{ content: JSONContent }>

export function RichText({ content }: RichTextProps): React.JSX.Element {
  return <article>{renderToReactElement({ extensions: richTextExtensions, content })}</article>
}

// Markdown de fora vira JSON uma vez (no loader ou na gravação), não a cada render:
// const content = markdownManager.parse(markdown)
```

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Custom Markdown Parsing](https://tiptap.dev/docs/editor/markdown/advanced-usage/custom-parsing) | `parseMarkdown` próprio: de token do `marked` para nó do Tiptap | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Custom Markdown Serializing](https://tiptap.dev/docs/editor/markdown/advanced-usage/custom-serializing) | `renderMarkdown` próprio: de nó para texto Markdown | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Custom Markdown Tokenizers](https://tiptap.dev/docs/editor/markdown/advanced-usage/custom-tokenizer) | Tokenizador próprio para sintaxe que o `marked` não conhece | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Markdown Types API](https://tiptap.dev/docs/editor/markdown/api/types) | Tipos do pacote (`MarkdownToken`, helpers de parse e render) | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Markdown Utilities](https://tiptap.dev/docs/editor/markdown/api/utilities) | Funções auxiliares para escrever parse e render de Markdown | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Markdown Examples](https://tiptap.dev/docs/editor/markdown/examples) | Exemplos de Markdown no editor | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Markdown Glossary for Tiptap](https://tiptap.dev/docs/editor/markdown/glossary) | Glossário: token, tokenizer, parse, serialize | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Create a Admonition Block with Markdown Support](https://tiptap.dev/docs/editor/markdown/guides/create-a-admonition-block) | Bloco de aviso (admonition) com sintaxe Markdown própria | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Create an Emoji Inline Node with Markdown Support](https://tiptap.dev/docs/editor/markdown/guides/create-a-emoji-inline-block) | Nó inline de emoji com suporte a Markdown | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Create a Highlight Mark with Markdown Support](https://tiptap.dev/docs/editor/markdown/guides/create-a-highlight-mark) | Marca de destaque (`==texto==`) com suporte a Markdown | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |
| [Integration Markdown in Custom Extensions](https://tiptap.dev/docs/editor/markdown/guides/integrate-markdown-in-your-extension) | Dar suporte a Markdown numa extensão própria | ao dar suporte a Markdown em nó ou marca própria, para o `parse()` da casa reconhecer |

## Guias

#### guides/accessibility
[doc](https://tiptap.dev/docs/guides/accessibility) | [markdown](https://tiptap.dev/docs/guides/accessibility.md)

**O que é:** orientação de acessibilidade: tudo operável por teclado (editor, seleção, menus), as
extensões padrão produzem HTML semântico, a interface (contraste, área de clique) é sua. Pegadinhas:
o VoiceOver junta palavras de blocos diferentes, e menu ou modal aberto por teclado não pode virar
armadilha de foco.
**Para que serve:** a lista do que o Tiptap resolve e do que fica com você.
**Quando usar:** junto de `frontend.md` §10 ao montar a barra e os menus. O editor precisa de nome
acessível (`editorProps.attributes` com `aria-label` vindo do i18n) e o Tab precisa sair dele.

#### guides/faq
[doc](https://tiptap.dev/docs/guides/faq) | [markdown](https://tiptap.dev/docs/guides/faq.md)

**O que é:** perguntas frequentes: copiar gera linha em branco dupla (trocar
`clipboardTextSerializer.blockSeparator` para `'\n'`); `react-dnd` e `react-beautiful-dnd`
registram arraste global e quebram o arraste do editor; por que existem `parseHTML` e `renderHTML`;
o Tiptap não edita HTML arbitrário (o que o schema não conhece sai); contexto React em NodeView
exige o provider em volta do `EditorContent`; as `div` extras do React Node View existem porque o
ProseMirror quer o view síncrono.
**Para que serve:** atalho para os defeitos que todo projeto encontra.
**Quando usar:** antes de abrir issue. Biblioteca de arraste na mesma tela (`_doc-lib/dnd-kit.md`)
fica restrita ao seu provider, longe do editor.

#### guides/spellcheck
[doc](https://tiptap.dev/docs/guides/spellcheck) | [markdown](https://tiptap.dev/docs/guides/spellcheck.md)

**O que é:** ligar o corretor do navegador com `spellcheck: 'true'` e `lang` em
`editorProps.attributes` (string, porque é atributo de DOM), mudar em tempo de execução com
`setOptions()`, e montar corretor próprio com `nspell` e decorações (`addDecorations`), ou com
LanguageTool. Aviso de privacidade: serviço remoto recebe só o texto necessário e a credencial fica
no servidor.
**Para que serve:** correção ortográfica no idioma certo.
**Quando usar:** sempre: `lang` do editor igual ao locale ativo do Paraglide (`i18n.md` §2),
`spellcheck: 'true'`. Corretor próprio só com decisão do projeto.

#### guides/decorations-react
[doc](https://tiptap.dev/docs/guides/decorations-react) | [markdown](https://tiptap.dev/docs/guides/decorations-react.md)

**O que é:** tutorial em React de destaque de termo com os três tipos de decoração: inline (a
palavra), node (o bloco que contém) e widget (contador numerado com `ReactWidgetRenderer` e
`ReactWidgetDecorationProps`). O termo fica no storage da extensão e `updateDecorations` reconstrói;
explica por que usar a estratégia de atualização manual.
**Para que serve:** o exemplo completo de decoração com componente React.
**Quando usar:** ao montar busca dentro do texto ou marcação de revisão própria.

#### guides/find-and-replace
[doc](https://tiptap.dev/docs/guides/find-and-replace) | [markdown](https://tiptap.dev/docs/guides/find-and-replace.md)

**O que é:** UI de localizar e substituir sobre `@tiptap/extension-find-and-replace` (público, MIT,
3.32.0 no npm): comandos para buscar, navegar e trocar, estado em
`editor.storage.findAndReplace`, lido no React por `useEditorState` só nos campos que a UI usa.
**Para que serve:** busca dentro de texto longo.
**Quando usar:** editor de artigo longo. Abrir por `Ctrl/Cmd+F` sobrepõe o atalho do navegador:
só com foco no editor, e com rótulo e atalho visíveis.

#### guides/pro-extensions
[doc](https://tiptap.dev/docs/guides/pro-extensions) | [markdown](https://tiptap.dev/docs/guides/pro-extensions.md)

**O que é:** como instalar extensão Pro: token pessoal da conta Tiptap, registro privado
`@tiptap-pro:registry=https://registry.tiptap.dev/` e `//registry.tiptap.dev/:_authToken=${TIPTAP_PRO_TOKEN}`
no `.npmrc` do projeto (ou configuração global, para CI), depois `@tiptap-pro/extension-*`.
**Para que serve:** o canal de tudo o que está marcado Pro/Cloud abaixo.
**Quando usar:** só com decisão do projeto (`docs/DECISIONS.md`). O `.npmrc` pode ser commitado (só
referencia a variável); o token vai em `secrets` do CI (`tooling.md` §7) e no ambiente de quem
instala, e sem ele o `pnpm install` falha para todo o time.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Tiptap Guides](https://tiptap.dev/docs/guides) | O índice dos guias (acessibilidade, colaboração, decorações, migração de outros editores, Pro) | consulta |
| [How to upgrade Tiptap v1 to v2](https://tiptap.dev/docs/guides/upgrade-tiptap-v1) | Migração do Tiptap v1 para o v2 | não se aplica: a casa já está no v3; o caminho atual é `guides/upgrade-tiptap-v2` (acima) |
| [Migrate from CKEditor 4 to Tiptap](https://tiptap.dev/docs/guides/migrate-from-ckeditor4) | Migração do CKEditor 4: mapa de plugin para extensão e conversão do HTML salvo | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from CKEditor 5 to Tiptap](https://tiptap.dev/docs/guides/migrate-from-ckeditor5) | Migração do CKEditor 5: equivalência de recursos e de API | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from Draft.js to Tiptap](https://tiptap.dev/docs/guides/migrate-from-draftjs) | Migração do Draft.js: do modelo de blocos e entidades para nós e marcas | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from Editor.js to Tiptap](https://tiptap.dev/docs/guides/migrate-from-editorjs) | Migração do Editor.js: do JSON de blocos dele para o JSON do Tiptap | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from Lexical to Tiptap](https://tiptap.dev/docs/guides/migrate-from-lexical) | Migração do Lexical: nós, comandos e plugins equivalentes | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from Quill to Tiptap](https://tiptap.dev/docs/guides/migrate-from-quill) | Migração do Quill: do Delta para o JSON do Tiptap | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from Slate to Tiptap](https://tiptap.dev/docs/guides/migrate-from-slate) | Migração do Slate: do modelo de nós dele para o schema do Tiptap | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |
| [Migrate from TinyMCE to Tiptap](https://tiptap.dev/docs/guides/migrate-from-tinymce) | Migração do TinyMCE: do HTML livre para conteúdo com schema | só se o projeto vier desse editor; o destino é o JSON do Tiptap e o renderizador da casa (`frontend.md` §8) |

## Catálogo: comandos (`api/commands`)

Cada linha é uma página da referência de comandos; a visão geral (`api/commands`) e
`content/set-content` têm entrada própria acima. Todos rodam em `editor.commands.x()` ou em cadeia
`editor.chain().focus().x().run()`, e `editor.can().x()` testa sem aplicar (é o que desabilita botão).

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Content Editor commands](https://tiptap.dev/docs/editor/api/commands/content) | Índice dos comandos de conteúdo | consulta |
| [clearContent command](https://tiptap.dev/docs/editor/api/commands/content/clear-content) | Apaga todo o conteúdo do documento | botão "limpar" com confirmação; `emitUpdate` decide se o `onUpdate` dispara |
| [cut command](https://tiptap.dev/docs/editor/api/commands/content/cut) | Recorta um intervalo e o insere em outra posição | botão, atalho ou extensão própria que precisa desse efeito |
| [insertContent command](https://tiptap.dev/docs/editor/api/commands/content/insert-content) | Insere conteúdo (texto, HTML, JSON) na seleção | inserir bloco pronto; com `@tiptap/markdown`, `contentType: 'markdown'` |
| [insertContentAt command](https://tiptap.dev/docs/editor/api/commands/content/insert-content-at) | Insere conteúdo numa posição ou intervalo | colar resultado de upload ou de IA no ponto certo |
| [forEach command](https://tiptap.dev/docs/editor/api/commands/for-each) | Percorre uma lista executando comandos para cada item | inserir vários nós numa transação só |
| [List commands](https://tiptap.dev/docs/editor/api/commands/lists) | Índice dos comandos de lista | consulta |
| [liftListItem command](https://tiptap.dev/docs/editor/api/commands/lists/lift-list-item) | Sobe o item de lista um nível | Shift+Tab na lista |
| [sinkListItem command](https://tiptap.dev/docs/editor/api/commands/lists/sink-list-item) | Desce o item de lista um nível | Tab na lista |
| [splitListItem command](https://tiptap.dev/docs/editor/api/commands/lists/split-list-item) | Divide o item de lista em dois | Enter dentro do item |
| [toggleList command](https://tiptap.dev/docs/editor/api/commands/lists/toggle-list) | Liga ou desliga um tipo de lista | botão de lista |
| [wrapInList command](https://tiptap.dev/docs/editor/api/commands/lists/wrap-in-list) | Envolve o bloco numa lista | botão, atalho ou extensão própria que precisa desse efeito |
| [Nodes and marks commands](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks) | Índice dos comandos de nós e marcas | consulta |
| [clearNodes command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/clear-nodes) | Converte os blocos selecionados no bloco padrão | botão "texto normal" |
| [createParagraphNear command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/create-paragraph-near) | Cria parágrafo ao lado do bloco selecionado | botão, atalho ou extensão própria que precisa desse efeito |
| [deleteNode command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/delete-node) | Apaga o nó de um tipo | botão, atalho ou extensão própria que precisa desse efeito |
| [exitCode command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/exit-code) | Sai do bloco de código para um bloco padrão novo | botão, atalho ou extensão própria que precisa desse efeito |
| [extendMarkRange command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/extend-mark-range) | Estende a seleção até o fim da marca | editar link inteiro antes de `setLink` |
| [insertDefaultBlock command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/insert-default-block) | Insere o bloco padrão do schema numa posição | botão, atalho ou extensão própria que precisa desse efeito |
| [joinBackward command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-backward) | Junta o bloco com o anterior | botão, atalho ou extensão própria que precisa desse efeito |
| [joinDown command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-down) | Junta o bloco com o de baixo | botão, atalho ou extensão própria que precisa desse efeito |
| [joinForward command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-forward) | Junta o bloco com o seguinte | botão, atalho ou extensão própria que precisa desse efeito |
| [joinTextblockBackward command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-textblock-backward) | Junta o bloco de texto com o anterior | botão, atalho ou extensão própria que precisa desse efeito |
| [joinTextblockForward command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-textblock-forward) | Junta o bloco de texto com o seguinte | botão, atalho ou extensão própria que precisa desse efeito |
| [joinUp command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/join-up) | Junta o bloco com o de cima | botão, atalho ou extensão própria que precisa desse efeito |
| [lift command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/lift) | Tira o bloco de dentro do pai (citação, lista) | botão, atalho ou extensão própria que precisa desse efeito |
| [liftEmptyBlock command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/lift-empty-block) | Sobe um bloco vazio um nível | botão, atalho ou extensão própria que precisa desse efeito |
| [newlineInCode command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/newline-in-code) | Quebra de linha dentro do bloco de código | botão, atalho ou extensão própria que precisa desse efeito |
| [resetAttributes command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/reset-attributes) | Volta atributos de nó ou marca ao padrão | botão, atalho ou extensão própria que precisa desse efeito |
| [setMark command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/set-mark) | Aplica uma marca com atributos | botão, atalho ou extensão própria que precisa desse efeito |
| [setNode command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/set-node) | Troca o tipo do bloco | seletor de título |
| [setTextDirection command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/set-text-direction) | Define direção do texto (`ltr`, `rtl`, `auto`) nos nós | conteúdo em idioma da direita para a esquerda |
| [splitBlock command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/split-block) | Divide o bloco na seleção | botão, atalho ou extensão própria que precisa desse efeito |
| [toggleMark command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/toggle-mark) | Liga ou desliga uma marca | botão de negrito, itálico, etc. |
| [toggleNode command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/toggle-node) | Alterna entre dois tipos de bloco | botão, atalho ou extensão própria que precisa desse efeito |
| [toggleWrap command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/toggle-wrap) | Envolve ou desembrulha o bloco num nó | botão, atalho ou extensão própria que precisa desse efeito |
| [undoInputRule command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/undo-input-rule) | Desfaz a última input rule aplicada | Backspace logo depois de um atalho Markdown |
| [unsetAllMarks command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/unset-all-marks) | Remove todas as marcas da seleção | botão "limpar formatação" |
| [unsetMark command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/unset-mark) | Remove uma marca | botão, atalho ou extensão própria que precisa desse efeito |
| [unsetTextDirection command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/unset-text-direction) | Remove o atributo de direção dos nós | botão, atalho ou extensão própria que precisa desse efeito |
| [updateAttributes command](https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/update-attributes) | Atualiza atributos de nó ou marca | `alt` de imagem, nível de título |
| [selectTextblockEnd command](https://tiptap.dev/docs/editor/api/commands/select-textblock-end) | Move o cursor para o fim do bloco de texto | botão, atalho ou extensão própria que precisa desse efeito |
| [selectTextblockStart command](https://tiptap.dev/docs/editor/api/commands/select-textblock-start) | Move o cursor para o início do bloco de texto | botão, atalho ou extensão própria que precisa desse efeito |
| [Selection commands](https://tiptap.dev/docs/editor/api/commands/selection) | Índice dos comandos de seleção | consulta |
| [blur command](https://tiptap.dev/docs/editor/api/commands/selection/blur) | Tira o foco do editor | botão, atalho ou extensão própria que precisa desse efeito |
| [deleteRange commands](https://tiptap.dev/docs/editor/api/commands/selection/delete-range) | Apaga um intervalo | botão, atalho ou extensão própria que precisa desse efeito |
| [deleteSelection command](https://tiptap.dev/docs/editor/api/commands/selection/delete-selection) | Apaga a seleção | botão, atalho ou extensão própria que precisa desse efeito |
| [enter command](https://tiptap.dev/docs/editor/api/commands/selection/enter) | Dispara o comportamento da tecla Enter | botão, atalho ou extensão própria que precisa desse efeito |
| [focus command](https://tiptap.dev/docs/editor/api/commands/selection/focus) | Foca o editor (`start`, `end`, `all` ou posição) | toda cadeia de botão começa com `focus()` |
| [keyboardShortcut command](https://tiptap.dev/docs/editor/api/commands/selection/keyboard-shortcut) | Dispara um atalho de teclado por código | botão, atalho ou extensão própria que precisa desse efeito |
| [scrollIntoView command](https://tiptap.dev/docs/editor/api/commands/selection/scroll-into-view) | Rola até a seleção | botão, atalho ou extensão própria que precisa desse efeito |
| [selectAll command](https://tiptap.dev/docs/editor/api/commands/selection/select-all) | Seleciona o documento inteiro | botão, atalho ou extensão própria que precisa desse efeito |
| [selectNodeBackward command](https://tiptap.dev/docs/editor/api/commands/selection/select-node-backward) | Seleciona o nó anterior | botão, atalho ou extensão própria que precisa desse efeito |
| [selectNodeForward command](https://tiptap.dev/docs/editor/api/commands/selection/select-node-forward) | Seleciona o nó seguinte | botão, atalho ou extensão própria que precisa desse efeito |
| [selectParentNode command](https://tiptap.dev/docs/editor/api/commands/selection/select-parent-node) | Seleciona o nó pai | botão, atalho ou extensão própria que precisa desse efeito |
| [setNodeSelection command](https://tiptap.dev/docs/editor/api/commands/selection/set-node-selection) | Seleciona um nó numa posição | botão, atalho ou extensão própria que precisa desse efeito |
| [setTextSelection command](https://tiptap.dev/docs/editor/api/commands/selection/set-text-selection) | Define a seleção de texto (posição ou intervalo) | botão, atalho ou extensão própria que precisa desse efeito |
| [setMeta command](https://tiptap.dev/docs/editor/api/commands/set-meta) | Grava metadado na transação atual | marcar transação vinda de fora para o `onUpdate` ignorar |

## Catálogo: extensões

As extensões de StarterKit, Link, Image, Placeholder, CharacterCount, BubbleMenu, FloatingMenu e
Collaboration têm entrada própria acima. Todas as linhas abaixo sem marca Pro são pacotes públicos
`@tiptap/extension-*` (MIT) conferidos no npm em 3.32.0. Extensão nova só entra no editor se o
renderizador de leitura receber a mesma lista (`frontend.md` §8): extensão fora da lista some na
leitura.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Nodes extensions](https://tiptap.dev/docs/editor/extensions/nodes) | Índice das extensões de nó | consulta |
| [Audio extension](https://tiptap.dev/docs/editor/extensions/nodes/audio) | Nó `<audio>` nativo, com colar de URL de áudio | podcast ou áudio no corpo do texto |
| [Blockquote extension](https://tiptap.dev/docs/editor/extensions/nodes/blockquote) | Citação (`<blockquote>`), no StarterKit | já vem no StarterKit |
| [BulletList extension](https://tiptap.dev/docs/editor/extensions/nodes/bullet-list) | Lista com marcadores (`@tiptap/extension-list`), no StarterKit | já vem no StarterKit |
| [CodeBlock extension](https://tiptap.dev/docs/editor/extensions/nodes/code-block) | Bloco de código sem realce, no StarterKit | já vem no StarterKit |
| [CodeBlockLowlight extension](https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight) | Bloco de código com realce pelo lowlight | artigo técnico; troca o `codeBlock` do StarterKit (`codeBlock: false`) |
| [Details extension](https://tiptap.dev/docs/editor/extensions/nodes/details) | Bloco recolhível (`<details>`) | FAQ e conteúdo opcional dentro do texto |
| [DetailsContent extension](https://tiptap.dev/docs/editor/extensions/nodes/details-content) | Conteúdo do `details` | junto com `details` |
| [DetailsSummary extension](https://tiptap.dev/docs/editor/extensions/nodes/details-summary) | Resumo clicável do `details` | junto com `details` |
| [Document extension](https://tiptap.dev/docs/editor/extensions/nodes/document) | Nó raiz do documento, no StarterKit | trocar só para forçar estrutura (exemplo `forced-content-structure`) |
| [Emoji extension](https://tiptap.dev/docs/editor/extensions/nodes/emoji) | Emoji por `:nome:` com sugestão | comentário e post informal |
| [HardBreak extension](https://tiptap.dev/docs/editor/extensions/nodes/hard-break) | Quebra de linha (`<br>`), no StarterKit | já vem no StarterKit |
| [Heading extension](https://tiptap.dev/docs/editor/extensions/nodes/heading) | Títulos de nível 1 a 6, no StarterKit | limite `levels` ao que a página permite (o H1 é da página) |
| [HorizontalRule extension](https://tiptap.dev/docs/editor/extensions/nodes/horizontal-rule) | Linha horizontal, no StarterKit | já vem no StarterKit |
| [ListItem extension](https://tiptap.dev/docs/editor/extensions/nodes/list-item) | Item de lista, no StarterKit | já vem no StarterKit |
| [Mathematics extension](https://tiptap.dev/docs/editor/extensions/nodes/mathematics) | Fórmula LaTeX inline e em bloco pelo KaTeX | conteúdo de ensino com fórmula |
| [Mention extension](https://tiptap.dev/docs/editor/extensions/nodes/mention) | Menção por `@` com o utilitário Suggestion | marcar pessoa em comentário |
| [OrderedList extension](https://tiptap.dev/docs/editor/extensions/nodes/ordered-list) | Lista numerada, no StarterKit | já vem no StarterKit |
| [Paragraph extension](https://tiptap.dev/docs/editor/extensions/nodes/paragraph) | Parágrafo, no StarterKit | já vem no StarterKit |
| [Table extension](https://tiptap.dev/docs/editor/extensions/nodes/table) | Tabela (redimensionável), parte do TableKit | conteúdo com tabela; prefira o TableKit |
| [TableCell extension](https://tiptap.dev/docs/editor/extensions/nodes/table-cell) | Célula de tabela | via TableKit |
| [TableHeader extension](https://tiptap.dev/docs/editor/extensions/nodes/table-header) | Célula de cabeçalho de tabela | via TableKit |
| [TableRow extension](https://tiptap.dev/docs/editor/extensions/nodes/table-row) | Linha de tabela | via TableKit |
| [TaskItem extension](https://tiptap.dev/docs/editor/extensions/nodes/task-item) | Item de lista de tarefas com caixa de seleção | checklist no texto |
| [TaskList extension](https://tiptap.dev/docs/editor/extensions/nodes/task-list) | Lista de tarefas | checklist no texto |
| [Text extension](https://tiptap.dev/docs/editor/extensions/nodes/text) | Nó de texto, no StarterKit | já vem no StarterKit |
| [Twitch extension](https://tiptap.dev/docs/editor/extensions/nodes/twitch) | Vídeo da Twitch incorporado | só com CSP liberando o domínio (`frame-src`) |
| [Youtube extension](https://tiptap.dev/docs/editor/extensions/nodes/youtube) | Vídeo do YouTube incorporado | só com CSP liberando `youtube-nocookie.com` (`frame-src`) |
| [Mark extensions](https://tiptap.dev/docs/editor/extensions/marks) | Índice das extensões de marca | consulta |
| [Bold extension](https://tiptap.dev/docs/editor/extensions/marks/bold) | Negrito, no StarterKit | já vem no StarterKit |
| [Code extension](https://tiptap.dev/docs/editor/extensions/marks/code) | Código inline, no StarterKit | já vem no StarterKit |
| [Highlight extension](https://tiptap.dev/docs/editor/extensions/marks/highlight) | Marca-texto, com cor opcional | destaque em texto de estudo |
| [Italic extension](https://tiptap.dev/docs/editor/extensions/marks/italic) | Itálico, no StarterKit | já vem no StarterKit |
| [Ruby Text extension](https://tiptap.dev/docs/editor/extensions/marks/ruby-text) | Anotação ruby (furigana) | texto em japonês ou chinês; raro na casa |
| [Strike extension](https://tiptap.dev/docs/editor/extensions/marks/strike) | Tachado, no StarterKit | já vem no StarterKit |
| [Subscript extension](https://tiptap.dev/docs/editor/extensions/marks/subscript) | Subscrito | fórmula química simples |
| [Superscript extension](https://tiptap.dev/docs/editor/extensions/marks/superscript) | Sobrescrito | nota, potência |
| [TextStyle extension](https://tiptap.dev/docs/editor/extensions/marks/text-style) | Marca `<span>` com estilo, base de cor, fonte e tamanho | só junto de Color, FontFamily, FontSize, LineHeight |
| [Underline extension](https://tiptap.dev/docs/editor/extensions/marks/underline) | Sublinhado, no StarterKit | já vem no StarterKit; na web sublinhado parece link |
| [Functionality extensions](https://tiptap.dev/docs/editor/extensions/functionality) | Índice das extensões de funcionalidade | consulta |
| [Integrate basic AI workflows into your editor](https://tiptap.dev/docs/editor/extensions/functionality/ai-generation) | **Pro/Cloud (pago, exige conta Tiptap)**: geração por IA básica, documentada na área AI | fora do pedido; só com decisão do projeto |
| [Build AI agents with document awareness and editing](https://tiptap.dev/docs/editor/extensions/functionality/ai-toolkit) | **Pro/Cloud (pago, exige conta Tiptap)**: AI Toolkit para agentes que leem e editam o documento | fora do pedido; só com decisão do projeto |
| [Background Color extension](https://tiptap.dev/docs/editor/extensions/functionality/background-color) | Cor de fundo no texto (via TextStyle) | raro: cor livre foge do tema; prefira Highlight com cores fixas |
| [CollaborationCaret extension](https://tiptap.dev/docs/editor/extensions/functionality/collaboration-caret) | Cursor e seleção dos outros participantes em colaboração | junto com Collaboration |
| [Color extension](https://tiptap.dev/docs/editor/extensions/functionality/color) | Cor do texto (via TextStyle) | só com paleta fechada do tema, contraste conferido |
| [Integrate Comments into your editor](https://tiptap.dev/docs/editor/extensions/functionality/comments) | **Pro/Cloud (pago, exige conta Tiptap)**: comentários em thread, ver área Comments | só com decisão do projeto |
| [Drag Handle extension](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle) | Alça para arrastar blocos (JavaScript puro) | a base da versão React |
| [Drag Handle React extension](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react) | Alça de arraste de bloco como componente React | reordenar bloco no editor; tem de ter alternativa por teclado ou menu (`frontend.md` §10.2) |
| [Drag Handle vue extension](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-vue) | Alça de arraste para Vue | fora da stack: Vue |
| [Dropcursor extension](https://tiptap.dev/docs/editor/extensions/functionality/dropcursor) | Indicador de onde o arrastado vai cair, no StarterKit | já vem no StarterKit |
| [Export](https://tiptap.dev/docs/editor/extensions/functionality/export) | **Pro/Cloud (pago, exige conta Tiptap)**: exportação (legado), aponta para Conversion | não usar; legado com fim anunciado para 2026 |
| [FileHandler extension](https://tiptap.dev/docs/editor/extensions/functionality/filehandler) | Trata arquivo solto ou colado no editor (`onDrop`, `onPaste`, tipos aceitos) | upload de imagem por arrastar e colar, enviando para o storage antes de inserir a URL |
| [Find and Replace extension](https://tiptap.dev/docs/editor/extensions/functionality/find-and-replace) | Localizar e substituir, sem UI (ver `guides/find-and-replace`) | texto longo |
| [Focus extension](https://tiptap.dev/docs/editor/extensions/functionality/focus) | Classe no nó que tem o foco | modo de foco em texto longo |
| [FontFamily extension](https://tiptap.dev/docs/editor/extensions/functionality/fontfamily) | Família de fonte (via TextStyle) | raro: a fonte é do tema |
| [FontSize extension](https://tiptap.dev/docs/editor/extensions/functionality/fontsize) | Tamanho de fonte (via TextStyle) | raro: tamanho vem do título, não de valor livre |
| [Gapcursor extension](https://tiptap.dev/docs/editor/extensions/functionality/gapcursor) | Cursor em lugar sem texto (antes de tabela, imagem), no StarterKit | já vem no StarterKit |
| [Import](https://tiptap.dev/docs/editor/extensions/functionality/import) | **Pro/Cloud (pago, exige conta Tiptap)**: importação (legado), aponta para Conversion | não usar; legado com fim anunciado para 2026 |
| [InvisibleCharacters extensions](https://tiptap.dev/docs/editor/extensions/functionality/invisiblecharacters) | Mostra espaço, quebra e fim de parágrafo | editor de revisão; raro |
| [Line Height extension](https://tiptap.dev/docs/editor/extensions/functionality/line-height) | Altura de linha (via TextStyle) | raro: vem do tema |
| [ListKit extension](https://tiptap.dev/docs/editor/extensions/functionality/list-kit) | Todas as extensões de lista num pacote só | quando o StarterKit não está em uso |
| [List Keymap extension](https://tiptap.dev/docs/editor/extensions/functionality/listkeymap) | Atalhos de teclado de lista (Backspace e Delete entre itens) | lista se comporta como em editor de texto comum |
| [Professional page-based layout](https://tiptap.dev/docs/editor/extensions/functionality/pages) | **Pro/Cloud (pago, exige conta Tiptap)**: layout paginado, ver área Pages | fora do uso da casa |
| [Paste Handler](https://tiptap.dev/docs/editor/extensions/functionality/paste-handler) | **Pro/Cloud (pago, exige conta Tiptap)**: tratamento de colagem (`@tiptap-pro/extension-paste-handler`) | `transformPastedHTML` da Extension API resolve o caso comum |
| [Selection extension](https://tiptap.dev/docs/editor/extensions/functionality/selection) | Mantém a seleção visível quando o editor perde o foco | barra que abre popover (link) sem perder a seleção |
| [Integrate Snapshots into your editor](https://tiptap.dev/docs/editor/extensions/functionality/snapshot) | **Pro/Cloud (pago, exige conta Tiptap)**: histórico de versões | só com decisão do projeto |
| [Snapshot Compare Extension](https://tiptap.dev/docs/editor/extensions/functionality/snapshot-compare) | **Pro/Cloud (pago, exige conta Tiptap)**: comparar versões do histórico | só com decisão do projeto |
| [TableKit extension](https://tiptap.dev/docs/editor/extensions/functionality/table-kit) | Tabela, linha, célula e cabeçalho num pacote | conteúdo com tabela; tabela no leitor precisa de rolagem horizontal própria |
| [Table of Contents extension](https://tiptap.dev/docs/editor/extensions/functionality/table-of-contents) | Sumário a partir dos títulos, com ids | artigo longo; no static renderer o id não é gerado (ver armadilha de `static-renderer`) |
| [TextStyleKit extension](https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit) | TextStyle, cor, fundo, fonte, tamanho e altura de linha num pacote | raro: estilo livre foge do tema |
| [TextAlign extension](https://tiptap.dev/docs/editor/extensions/functionality/textalign) | Alinhamento de texto em títulos e parágrafos | justificado só se o projeto pedir |
| [Tracked Changes extension](https://tiptap.dev/docs/editor/extensions/functionality/tracked-changes) | **Pro/Cloud (pago, exige conta Tiptap)**: modo sugestão, ver área Tracked Changes | só com decisão do projeto |
| [Trailing Node extension](https://tiptap.dev/docs/editor/extensions/functionality/trailing-node) | Garante um parágrafo vazio no fim do documento | sempre que o documento pode terminar em imagem ou tabela |
| [Typography extension](https://tiptap.dev/docs/editor/extensions/functionality/typography) | Troca tipográfica ao digitar (aspas curvas, reticências, travessão) | cuidado: gera travessão no texto do usuário; avaliar por projeto |
| [Undo/Redo extension](https://tiptap.dev/docs/editor/extensions/functionality/undo-redo) | Desfazer e refazer, no StarterKit | já vem no StarterKit; desligar com Collaboration (o Y.js tem o próprio) |
| [UniqueID extension](https://tiptap.dev/docs/editor/extensions/functionality/uniqueid) | Id único em cada nó (`@tiptap/extension-unique-id`) | âncora e comentário próprio; gerar o id antes de renderizar estático |
| [Mark views with JavaScript](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-views/javascript) | Mark view em JavaScript puro | fora da stack: na casa a variante é React (`mark-views/react`) |
| [Mark views with Vue](https://tiptap.dev/docs/editor/extensions/custom-extensions/mark-views/vue) | Mark view em Vue | fora da stack: Vue |
| [Node views with JavaScript](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/javascript) | Node view em JavaScript puro | fora da stack: na casa a variante é React (`node-views/react`) |
| [Node views with Vue](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue) | Node view em Vue | fora da stack: Vue |

## Catálogo: exemplos

Demonstrações com código aberto. Exemplo não é extensão suportada: copie a ideia, não o arquivo.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Examples](https://tiptap.dev/docs/examples) | Índice dos exemplos | consulta |
| [Tiptap Editor with customized extensions](https://tiptap.dev/docs/examples/advanced/clever-editor) | Editor com extensões bem customizadas | como referência ao montar o recurso equivalente |
| [Collaborative editing implementation](https://tiptap.dev/docs/examples/advanced/collaborative-editing) | Edição colaborativa com Y.js e cursores | junto da área Collaboration (Pro/Cloud) ou de servidor próprio |
| [Tiptap Editor with a canvas drawing node](https://tiptap.dev/docs/examples/advanced/drawing) | Nó de desenho em canvas | ver o aviso de `node-views/examples` sobre colaboração |
| [Enforcing a content structure](https://tiptap.dev/docs/examples/advanced/forced-content-structure) | Documento com estrutura forçada (título obrigatório no topo) | campo com formato fixo (título + corpo) |
| [Interactive React & Vue views](https://tiptap.dev/docs/examples/advanced/interactive-react-and-vue-views) | Node view interativo em React e Vue | só a metade React |
| [Mentions in Tiptap](https://tiptap.dev/docs/examples/advanced/mentions) | Menções com o Suggestion | menção de usuário |
| [Bubble & floating menu implementation](https://tiptap.dev/docs/examples/advanced/menus) | Bubble menu e floating menu | barra contextual |
| [React rendering performance](https://tiptap.dev/docs/examples/advanced/react-performance) | Renderização em React com desempenho | junto de `guides/performance` |
| [Using the CodeBlockLowlight extension in Tiptap](https://tiptap.dev/docs/examples/advanced/syntax-highlighting) | Realce de código com CodeBlockLowlight | artigo técnico |
| [Default text editor](https://tiptap.dev/docs/examples/basics/default-text-editor) | Editor padrão com StarterKit e barra | ponto de partida |
| [Formatting](https://tiptap.dev/docs/examples/basics/formatting) | Formatação de texto e alinhamento | como referência ao montar o recurso equivalente |
| [Images](https://tiptap.dev/docs/examples/basics/images) | Imagens no editor | como referência ao montar o recurso equivalente |
| [Long texts](https://tiptap.dev/docs/examples/basics/long-texts) | Texto longo e desempenho | como referência ao montar o recurso equivalente |
| [Markdown shortcuts in Tiptap](https://tiptap.dev/docs/examples/basics/markdown-shortcuts) | Atalhos Markdown ao digitar (input rules) | como referência ao montar o recurso equivalente |
| [Minimal setup for paragraphs & text only](https://tiptap.dev/docs/examples/basics/minimal-setup) | Só parágrafo e texto | campo de texto rico mínimo |
| [Adding table support to Tiptap](https://tiptap.dev/docs/examples/basics/tables) | Tabelas | como referência ao montar o recurso equivalente |
| [Task lists in Tiptap](https://tiptap.dev/docs/examples/basics/tasks) | Listas de tarefas | como referência ao montar o recurso equivalente |
| [Text direction & RTL support](https://tiptap.dev/docs/examples/basics/text-direction) | Direção de texto e RTL | como referência ao montar o recurso equivalente |
| [Multiple fields on collaborative document](https://tiptap.dev/docs/examples/experiments/collaborative-fields) | Vários campos num documento colaborativo | experimento |
| [Example code editor with Figures](https://tiptap.dev/docs/examples/experiments/figure) | Figura com legenda | experimento |
| [Image & Table figures via a generic figure](https://tiptap.dev/docs/examples/experiments/generic-figure) | Figura genérica para imagem e tabela | experimento |
| [Integrate an iFrame into your Editor](https://tiptap.dev/docs/examples/experiments/iframe) | Nó de iframe | experimento; CSP `frame-src` restrita |
| [Linting example in Tiptap](https://tiptap.dev/docs/examples/experiments/linting) | Linter de conteúdo com decorações | experimento; revisão de texto |
| [Code editor with Slash Commands](https://tiptap.dev/docs/examples/experiments/slash-commands) | Comandos de barra (`/`) com o Suggestion | experimento; base de menu de inserção |

## Fora da stack

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Alpine](https://tiptap.dev/docs/editor/getting-started/install/alpine) | Instalação com Alpine.js | fora da stack: o frontend da casa é React sobre TanStack Start |
| [Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs) | Instalação com Next.js (React com App Router e `'use client'`) | fora da stack: a casa usa TanStack Start, não Next.js; o que vale do React está em `install/react` (acima) |
| [Nuxt](https://tiptap.dev/docs/editor/getting-started/install/nuxt) | Instalação com Nuxt | fora da stack: Vue |
| [PHP](https://tiptap.dev/docs/editor/getting-started/install/php) | Instalação com PHP (Laravel Livewire) | fora da stack: PHP |
| [Svelte](https://tiptap.dev/docs/editor/getting-started/install/svelte) | Instalação com Svelte | fora da stack: Svelte |
| [Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript) | Instalação com JavaScript puro (`new Editor`) | fora da stack: na casa o editor nasce do `useEditor` do `@tiptap/react` |
| [Vue 2](https://tiptap.dev/docs/editor/getting-started/install/vue2) | Instalação com Vue 2 | fora da stack: Vue |
| [Vue 3](https://tiptap.dev/docs/editor/getting-started/install/vue3) | Instalação com Vue 3 | fora da stack: Vue |
| [Tiptap for PHP utility](https://tiptap.dev/docs/editor/api/utilities/tiptap-for-php) | Pacote PHP que converte JSON em HTML e sanitiza | fora da stack: o backend é Node; a casa renderiza com o static renderer |
| [Highlight Search Terms with Decorations in Vanilla JS](https://tiptap.dev/docs/guides/decorations-vanilla) | Destaque por decorações em JavaScript puro | fora da stack: a versão React é `guides/decorations-react` |
| [Highlight Search Terms with Decorations in Vue 3](https://tiptap.dev/docs/guides/decorations-vue) | Destaque por decorações em Vue 3 | fora da stack: Vue |

## Pro/Cloud (pago, exige conta Tiptap)

Tudo desta seção é **Pro/Cloud (pago, exige conta Tiptap)**: pacote `@tiptap-pro/*` do registro
privado (`guides/pro-extensions`), serviço na Tiptap Cloud ou programa piloto com contato comercial.
A página de visão geral de cada área foi aberta; as linhas seguem o índice oficial
(`https://tiptap.dev/docs/llms.txt`) e o menu lateral. Nada aqui entra sem decisão do projeto em
`docs/DECISIONS.md`, com custo, token no CI e o caminho de saída se o plano acabar.

### Licença

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Tiptap Pro license](https://tiptap.dev/pro-license) | Termos da licença Tiptap Pro (extensões, UI Components e templates pagos): uso perpétuo após pagamento, só por empresa, sem redistribuir como produto avulso, cópia da licença em toda distribuição | ler antes de adotar qualquer pacote pago; a licença viaja com o produto que o embute |

### UI Components

A visão geral (`ui-components/getting-started/overview`) diz que o componente segue a licença da
extensão em que se apoia: sobre extensão aberta (Bold, Heading, Image) é MIT; sobre recurso pago
(Comments, histórico, IA) exige assinatura Cloud. Não é pacote npm: o CLI (`npx @tiptap/cli`) copia
o código-fonte para o projeto, com `login` para os pagos; o estilo é SCSS e os primitivos são
próprios (o Menu é sobre Ariakit). A casa usa Tailwind v4 e primitivos do shadcn sobre Base UI
(`frontend.md` §6, §6.4): sirva-se do código como referência de comportamento; não instale o kit.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Integrate Tiptap UI Components](https://tiptap.dev/docs/ui-components/getting-started/overview) | Visão geral: licença por componente, instalação por CLI, componentes, nós e primitivos | ler antes de copiar qualquer peça |
| [Using the Tiptap CLI](https://tiptap.dev/docs/ui-components/getting-started/cli) | CLI que copia componentes e templates, com `login` para os pagos | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Style Tiptap UI Components](https://tiptap.dev/docs/ui-components/getting-started/style) | Estilo em SCSS com variáveis e animações | conflita com Tailwind v4 da casa |
| [changelog](https://tiptap.dev/docs/ui-components/getting-started/changelog) | Histórico de mudanças dos componentes | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Astro](https://tiptap.dev/docs/ui-components/install/astro) | Instalação em Astro | fora da stack |
| [Laravel](https://tiptap.dev/docs/ui-components/install/laravel) | Instalação em Laravel | fora da stack |
| [Manual Installation](https://tiptap.dev/docs/ui-components/install/manual) | Instalação manual, sem template | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Next.js](https://tiptap.dev/docs/ui-components/install/next) | Instalação em Next.js | fora da stack |
| [React Router](https://tiptap.dev/docs/ui-components/install/react-router) | Instalação em React Router | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Vite](https://tiptap.dev/docs/ui-components/install/vite) | Instalação em Vite | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Components overview](https://tiptap.dev/docs/ui-components/components/overview) | Lista de componentes e primitivos | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [AI Ask Button](https://tiptap.dev/docs/ui-components/components/ai-ask-button) | Botão de pedir à IA sobre a seleção (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [AI Menu](https://tiptap.dev/docs/ui-components/components/ai-menu) | Menu contextual de IA (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Blockquote Button](https://tiptap.dev/docs/ui-components/components/blockquote-button) | Botão de citação | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Code Block Button](https://tiptap.dev/docs/ui-components/components/code-block-button) | Botão de bloco de código | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Color Highlight Button](https://tiptap.dev/docs/ui-components/components/color-highlight-button) | Botão de marca-texto com cores predefinidas | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Color highlight popover](https://tiptap.dev/docs/ui-components/components/color-highlight-popover) | Popover de escolha de marca-texto | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Color Text Button](https://tiptap.dev/docs/ui-components/components/color-text-button) | Botão de cor do texto | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Color Text Popover](https://tiptap.dev/docs/ui-components/components/color-text-popover) | Popover de cor de texto e de destaque com cores recentes | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Copy Anchor Link Button](https://tiptap.dev/docs/ui-components/components/copy-anchor-link-button) | Copia link de âncora para um bloco | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Copy to Clipboard Button](https://tiptap.dev/docs/ui-components/components/copy-to-clipboard-button) | Copia seleção ou nó com formatação | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Delete Node Button](https://tiptap.dev/docs/ui-components/components/delete-node-button) | Apaga o bloco selecionado | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Drag Context Menu](https://tiptap.dev/docs/ui-components/components/drag-context-menu) | Alça de arraste com menu de ações do bloco | bom modelo de alternativa ao arraste (mover por menu) |
| [Duplicate Button](https://tiptap.dev/docs/ui-components/components/duplicate-button) | Duplica o bloco | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Emoji Dropdown Menu](https://tiptap.dev/docs/ui-components/components/emoji-dropdown-menu) | Seletor de emoji por `:` com busca | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Emoji Menu](https://tiptap.dev/docs/ui-components/components/emoji-menu) | Menu de emoji com busca | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Emoji Trigger Button](https://tiptap.dev/docs/ui-components/components/emoji-trigger-button) | Botão que insere o gatilho de emoji | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Font Family Combobox](https://tiptap.dev/docs/ui-components/components/font-family-combobox) | Combobox de família de fonte com prévia | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Heading Button](https://tiptap.dev/docs/ui-components/components/heading-button) | Botão que alterna níveis de título | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Heading Dropdown Menu](https://tiptap.dev/docs/ui-components/components/heading-dropdown-menu) | Menu de escolha de título | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Image Align Button](https://tiptap.dev/docs/ui-components/components/image-align-button) | Alinhamento de imagem | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Image Upload Button](https://tiptap.dev/docs/ui-components/components/image-upload-button) | Botão de upload e inserção de imagem | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Improve Dropdown](https://tiptap.dev/docs/ui-components/components/improve-dropdown) | Menu de melhorar texto com IA (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Link Popover](https://tiptap.dev/docs/ui-components/components/link-popover) | Popover de link | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [List Button](https://tiptap.dev/docs/ui-components/components/list-button) | Botão de lista (marcadores, numerada, tarefas) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [List Dropdown Menu](https://tiptap.dev/docs/ui-components/components/list-dropdown-menu) | Menu de tipo de lista | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Mark Button](https://tiptap.dev/docs/ui-components/components/mark-button) | Botão de marca (negrito, itálico, sublinhado) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Mention Dropdown Menu](https://tiptap.dev/docs/ui-components/components/mention-dropdown-menu) | Menu de menção de usuários | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Mention Trigger Button](https://tiptap.dev/docs/ui-components/components/mention-trigger-button) | Botão que insere o gatilho de menção | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Move Node Button](https://tiptap.dev/docs/ui-components/components/move-node-button) | Move bloco para cima ou para baixo | modelo da alternativa de um ponteiro ao arraste |
| [Numbering Format Dropdown Menu](https://tiptap.dev/docs/ui-components/components/numbering-format-dropdown-menu) | Formato de numeração de lista ordenada | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Reset All Formatting Button](https://tiptap.dev/docs/ui-components/components/reset-all-formatting-button) | Remove toda a formatação da seleção | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Search and Replace](https://tiptap.dev/docs/ui-components/components/search-and-replace) | Painel de localizar e substituir | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Slash Command Trigger Button](https://tiptap.dev/docs/ui-components/components/slash-command-trigger-button) | Botão que insere o gatilho de comando `/` | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Slash Dropdown Menu](https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu) | Paleta de comandos por `/` | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Text align button](https://tiptap.dev/docs/ui-components/components/text-align-button) | Botão de alinhamento | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Text Button](https://tiptap.dev/docs/ui-components/components/text-button) | Converte bloco em parágrafo | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Turn Into Dropdown](https://tiptap.dev/docs/ui-components/components/turn-into-dropdown) | Menu "transformar em" (título, lista, citação) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Undo Redo Button](https://tiptap.dev/docs/ui-components/components/undo-redo-button) | Botões de desfazer e refazer | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Zoom Dropdown Menu](https://tiptap.dev/docs/ui-components/components/zoom-dropdown-menu) | Controle de zoom (feito para Pages) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Blockquote Node](https://tiptap.dev/docs/ui-components/node-components/blockquote-node) | Visual do nó de citação | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Code Block Node](https://tiptap.dev/docs/ui-components/node-components/code-block-node) | Visual do bloco de código | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Heading Node](https://tiptap.dev/docs/ui-components/node-components/heading-node) | Visual dos títulos | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Horizontal Rule Node](https://tiptap.dev/docs/ui-components/node-components/horizontal-rule-node) | Visual da linha horizontal | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Image Node](https://tiptap.dev/docs/ui-components/node-components/image-node) | Visual da imagem | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Image Node Pro](https://tiptap.dev/docs/ui-components/node-components/image-node-pro) | Imagem redimensionável com legenda e alinhamento (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Image Upload Node](https://tiptap.dev/docs/ui-components/node-components/image-upload-node) | Nó de upload de imagem | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [List Node](https://tiptap.dev/docs/ui-components/node-components/list-node) | Visual das listas | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Paragraph Node](https://tiptap.dev/docs/ui-components/node-components/paragraph-node) | Visual do parágrafo | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Table Node](https://tiptap.dev/docs/ui-components/node-components/table-node) | Visual da tabela | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Table of Contents Node](https://tiptap.dev/docs/ui-components/node-components/table-of-contents-node) | Visual do sumário | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Integrate the Avatar UI component](https://tiptap.dev/docs/ui-components/primitives/avatar) | Primitivo Avatar | a casa usa o do kit |
| [Add a badge UI component to your Editor](https://tiptap.dev/docs/ui-components/primitives/badge) | Primitivo Badge | a casa usa o do kit |
| [Integrate a button in your Editor](https://tiptap.dev/docs/ui-components/primitives/button) | Primitivo Button | a casa usa o do kit |
| [Integrate the Card UI component](https://tiptap.dev/docs/ui-components/primitives/card) | Primitivo Card | a casa usa o do kit |
| [Integrate the Combobox UI component](https://tiptap.dev/docs/ui-components/primitives/combobox) | Primitivo Combobox | a casa usa o do kit |
| [Add a dropdown menu to Tiptap](https://tiptap.dev/docs/ui-components/primitives/dropdown-menu) | Primitivo DropdownMenu | a casa usa o Menu do Base UI |
| [Integrate the Input UI component](https://tiptap.dev/docs/ui-components/primitives/input) | Primitivo Input | a casa usa o do kit |
| [Integrate the Label UI component](https://tiptap.dev/docs/ui-components/primitives/label) | Primitivo Label | a casa usa o do kit |
| [Integrate the Menu UI component](https://tiptap.dev/docs/ui-components/primitives/menu) | Primitivo Menu sobre Ariakit, com busca | a casa usa o Menu do Base UI |
| [Integrate a popover UI component](https://tiptap.dev/docs/ui-components/primitives/popover) | Primitivo Popover | a casa usa o Popover do Base UI |
| [Add a separator into Tiptap](https://tiptap.dev/docs/ui-components/primitives/separator) | Primitivo Separator | a casa usa o do kit |
| [Add a spacer UI component into Tiptap](https://tiptap.dev/docs/ui-components/primitives/spacer) | Primitivo Spacer | utilitário de layout do Tailwind resolve |
| [Integrate the TextareaAutosize UI component](https://tiptap.dev/docs/ui-components/primitives/textarea-autosize) | Textarea que cresce com o conteúdo (react-textarea-autosize) | `field-sizing: content` do CSS resolve sem dependência |
| [Add a toolbar UI component into Tiptap](https://tiptap.dev/docs/ui-components/primitives/toolbar) | Primitivo Toolbar | a casa usa o Toolbar do Base UI |
| [Add a tooltip UI component to your Editor](https://tiptap.dev/docs/ui-components/primitives/tooltip) | Primitivo Tooltip | a casa usa o Tooltip do Base UI |
| [DOCX Editor](https://tiptap.dev/docs/ui-components/templates/docx-editor) | Template de editor estilo Word com Pages e colaboração (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Notion-like](https://tiptap.dev/docs/ui-components/templates/notion-like-editor) | Template estilo Notion com colaboração e IA (pago) | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Simple template](https://tiptap.dev/docs/ui-components/templates/simple-editor) | Template simples só com extensões abertas (MIT) | a melhor referência de barra para o `rich-editor` da casa |
| [Floating Element](https://tiptap.dev/docs/ui-components/utils-components/floating-element) | Elemento flutuante que acompanha a seleção | referência de comportamento; a peça da casa vem do kit sobre Base UI |
| [Suggestion Menu](https://tiptap.dev/docs/ui-components/utils-components/suggestion-menu) | Menu de sugestão genérico por caractere | referência de comportamento; a peça da casa vem do kit sobre Base UI |

### Collaboration

A visão geral tem entrada própria acima (`collaboration/getting-started/overview`). A extensão
`@tiptap/extension-collaboration` é aberta; o que esta área documenta é o servidor e o provider da
Tiptap Cloud (`TiptapCollabProvider`, `@tiptap-pro/provider`).

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Install Collaboration](https://tiptap.dev/docs/collaboration/getting-started/install) | Instalação da colaboração com a Tiptap Cloud | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Authenticate and authorize in Collaboration](https://tiptap.dev/docs/collaboration/getting-started/authenticate) | Autenticação e autorização por token com escopo de documento | token assinado no backend, nunca no frontend |
| [Awareness in Collaboration](https://tiptap.dev/docs/collaboration/core-concepts/awareness) | Presença: quem está no documento e onde está o cursor | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Webhooks in Collaboration](https://tiptap.dev/docs/collaboration/core-concepts/webhooks) | Webhooks do servidor de documentos | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Manage Documents with Tiptap](https://tiptap.dev/docs/collaboration/documents) | Gestão de documentos na Cloud | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Inject content REST API](https://tiptap.dev/docs/collaboration/documents/content-injection) | API REST para injetar conteúdo JSON num documento | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Document management API](https://tiptap.dev/docs/collaboration/documents/rest-api) | API REST de gestão de documentos | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Integrate snapshots](https://tiptap.dev/docs/collaboration/documents/snapshot) | Histórico de versões manual e automático | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Compare document versions](https://tiptap.dev/docs/collaboration/documents/snapshot-compare) | Comparar versões do histórico | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Runtime configuration](https://tiptap.dev/docs/collaboration/operations/configure) | Configuração do servidor em tempo de execução | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Server metrics and statistics](https://tiptap.dev/docs/collaboration/operations/metrics) | Métricas e estatísticas do servidor | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [State and change events](https://tiptap.dev/docs/collaboration/provider/events) | Eventos de estado e de mudança do provider | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Integrate the Collaboration provider](https://tiptap.dev/docs/collaboration/provider/integration) | Configuração do provider de sincronização | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Authentication with Collaboration](https://tiptap.dev/docs/guides/authentication) | Guia de tokens de colaboração gerados no servidor | token assinado no backend, segredo no ENV |
| [Collaboration API](https://tiptap.dev/docs/guides/collaboration-api) | API de colaboração | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Name and structure your Collaboration documents](https://tiptap.dev/docs/guides/naming-documents) | Nome e organização de documentos colaborativos (id único, fragmentos Y.js) | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |
| [Add offline support to your editor](https://tiptap.dev/docs/guides/offline-support) | Edição offline com sincronização ao voltar | só com decisão do projeto por colaboração em tempo real na Tiptap Cloud |

### Comments

A visão geral (`comments/getting-started/overview`): comentários inline, de documento e de barra
lateral, por extensão no editor, por API REST ou por webhook, em cima da Tiptap Cloud.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Integrate Comments into your app](https://tiptap.dev/docs/comments/getting-started/overview) | Visão geral dos comentários | só com decisão do projeto por comentários na Tiptap Cloud |
| [Install the Comments extension](https://tiptap.dev/docs/comments/getting-started/install) | Instalação da extensão de comentários | só com decisão do projeto por comentários na Tiptap Cloud |
| [Configure comments](https://tiptap.dev/docs/comments/core-concepts/configure) | Configuração do provider e das classes de thread | só com decisão do projeto por comentários na Tiptap Cloud |
| [Manage threads in your editor](https://tiptap.dev/docs/comments/core-concepts/manage-threads) | Gestão de threads e comentários por comandos | só com decisão do projeto por comentários na Tiptap Cloud |
| [Style comments in your editor](https://tiptap.dev/docs/comments/core-concepts/style-threads) | Estilo e visibilidade das threads por classes de decoração | só com decisão do projeto por comentários na Tiptap Cloud |
| [Thread authentication](https://tiptap.dev/docs/comments/core-concepts/thread-authentication) | Regras de dono: quem edita e apaga thread e comentário | autorização também no backend |
| [Add comments to code](https://tiptap.dev/docs/comments/integrate/code) | Comentário em código inline e em bloco | só com decisão do projeto por comentários na Tiptap Cloud |
| [Create comment threads via the REST API](https://tiptap.dev/docs/comments/integrate/create-thread-via-api) | Criar thread por API REST, fora do editor | só com decisão do projeto por comentários na Tiptap Cloud |
| [Comments editor commands](https://tiptap.dev/docs/comments/integrate/editor-commands) | Comandos de comentário no editor | só com decisão do projeto por comentários na Tiptap Cloud |
| [Comments REST API](https://tiptap.dev/docs/comments/integrate/rest-api) | API REST de comentários | só com decisão do projeto por comentários na Tiptap Cloud |
| [Comments webhook](https://tiptap.dev/docs/comments/integrate/webhook) | Webhook de thread e comentário | assinatura verificada no backend |

### Compare

A visão geral (`compare/getting-started/overview`): add-on comprado por contato comercial
(`@tiptap-pro/compare`), compara dois documentos ou duas versões e mostra a diferença no editor.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Compare documents with Tiptap](https://tiptap.dev/docs/compare/getting-started/overview) | Visão geral do Compare | só com decisão do projeto e add-on contratado |
| [Commands](https://tiptap.dev/docs/compare/api-reference/commands) | Comandos do Compare | só com decisão do projeto e add-on contratado |
| [Styling](https://tiptap.dev/docs/compare/api-reference/styling) | Estilo das diferenças | só com decisão do projeto e add-on contratado |
| [Types](https://tiptap.dev/docs/compare/api-reference/types) | Tipos TypeScript | só com decisão do projeto e add-on contratado |
| [Utilities](https://tiptap.dev/docs/compare/api-reference/utilities) | Funções utilitárias | só com decisão do projeto e add-on contratado |
| [Compare documents](https://tiptap.dev/docs/compare/guides/compare-documents) | Comparar dois documentos JSON | só com decisão do projeto e add-on contratado |
| [Compare versions](https://tiptap.dev/docs/compare/guides/compare-versions) | Comparar duas versões da colaboração | só com decisão do projeto e add-on contratado |
| [Compare documents on the server](https://tiptap.dev/docs/compare/guides/server-compare) | Comparar no servidor | só com decisão do projeto e add-on contratado |
| [Split view](https://tiptap.dev/docs/compare/guides/split-view) | Revisão em dois painéis, integrada ao Tracked Changes | só com decisão do projeto e add-on contratado |
| [Compare documents with Tracked Changes](https://tiptap.dev/docs/compare/guides/tracked-changes) | Mostrar a comparação como mudanças rastreadas | só com decisão do projeto e add-on contratado |

### Composable Docs

Duas áreas em programa piloto (contato comercial). `composable-docs` sozinho responde 404; as
visões gerais abertas são `content-protection/getting-started/overview` (o que cada usuário lê ou
edita, com política por seletor) e `slots/getting-started/overview` (modelo de documento com campos
validados).

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Content Protection](https://tiptap.dev/docs/composable-docs/content-protection/getting-started/overview) | Visão geral do Content Protection | só com decisão do projeto e acesso ao piloto |
| [Commands](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/commands) | Comandos de política | só com decisão do projeto e acesso ao piloto |
| [Extension](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/extension) | Opções, storage e eventos da extensão | só com decisão do projeto e acesso ao piloto |
| [Policy language](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/policy) | Linguagem de política: seletores, permissões, precedência | regra de acesso também no backend; o editor não é fronteira de segurança |
| [Redacted content](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/rendering) | Marcador de conteúdo oculto e seu comportamento ao copiar e exportar | só com decisão do projeto e acesso ao piloto |
| [Types](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/types) | Tipos | só com decisão do projeto e acesso ao piloto |
| [Utilities](https://tiptap.dev/docs/composable-docs/content-protection/api-reference/utilities) | Validar política, checar permissão, exportar conteúdo legível | só com decisão do projeto e acesso ao piloto |
| [Example policies](https://tiptap.dev/docs/composable-docs/content-protection/guides/example-policies) | Exemplos de política | só com decisão do projeto e acesso ao piloto |
| [Lock selected content](https://tiptap.dev/docs/composable-docs/content-protection/guides/lock-selected-content) | Travar conteúdo selecionado | só com decisão do projeto e acesso ao piloto |
| [Slots](https://tiptap.dev/docs/composable-docs/slots/getting-started/overview) | Visão geral de Slots | só com decisão do projeto e acesso ao piloto |
| [Commands](https://tiptap.dev/docs/composable-docs/slots/api-reference/commands) | Comandos de criar, preencher e navegar slots | só com decisão do projeto e acesso ao piloto |
| [Configuration](https://tiptap.dev/docs/composable-docs/slots/api-reference/concepts) | Configuração e regras de conteúdo do slot | só com decisão do projeto e acesso ao piloto |
| [Editor events](https://tiptap.dev/docs/composable-docs/slots/api-reference/events) | Eventos do editor | só com decisão do projeto e acesso ao piloto |
| [Extension](https://tiptap.dev/docs/composable-docs/slots/api-reference/extension) | Opções e storage da extensão | só com decisão do projeto e acesso ao piloto |
| [Rendering and NodeViews](https://tiptap.dev/docs/composable-docs/slots/api-reference/rendering) | Marcação e NodeViews do slot | só com decisão do projeto e acesso ao piloto |
| [Types](https://tiptap.dev/docs/composable-docs/slots/api-reference/types) | Tipos | só com decisão do projeto e acesso ao piloto |
| [Utilities](https://tiptap.dev/docs/composable-docs/slots/api-reference/utilities) | Leitores, assinaturas e políticas de preenchimento | só com decisão do projeto e acesso ao piloto |
| [Validation](https://tiptap.dev/docs/composable-docs/slots/api-reference/validation) | Validação embutida e própria | a validação que vale é a do VineJS no backend |
| [Table fields example](https://tiptap.dev/docs/composable-docs/slots/examples/table-fields) | Exemplo de campos em tabela | só com decisão do projeto e acesso ao piloto |
| [Add slots to the document](https://tiptap.dev/docs/composable-docs/slots/guides/add-slots) | Inserir, configurar, preencher e desfazer slots | só com decisão do projeto e acesso ao piloto |
| [Allow filling only](https://tiptap.dev/docs/composable-docs/slots/guides/fill-only) | Política "só preencher" | só com decisão do projeto e acesso ao piloto |
| [Validate Slot values](https://tiptap.dev/docs/composable-docs/slots/guides/validate-submission) | Validar valores dos slots | só com decisão do projeto e acesso ao piloto |

### Conversion

A visão geral (`conversion/getting-started/overview`): pipeline de conversão no serviço da Tiptap
entre arquivo (DOCX, ODT, PDF, EPUB, Markdown) e o JSON do Tiptap, por extensão no editor ou por API
REST; `ConvertKit` (`@tiptap-pro/extension-convert-kit`) é o kit de schema; os pacotes legados
`extension-import`/`extension-export` têm fim anunciado para 2026. Importação de Markdown na casa
não precisa disto: é `MarkdownManager.parse()`, aberto.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Document import and export](https://tiptap.dev/docs/conversion/getting-started/overview) | Visão geral do pipeline de conversão | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Install](https://tiptap.dev/docs/conversion/getting-started/install) | Credenciais e instalação | credencial no backend |
| [Live demo](https://tiptap.dev/docs/conversion/getting-started/demo) | Demonstração ao vivo | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Supported features](https://tiptap.dev/docs/conversion/getting-started/feature-support-matrix) | O que é suportado na importação, no editor e na exportação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Building custom extensions for conversion](https://tiptap.dev/docs/conversion/getting-started/guides/custom-extensions) | Extensão própria para conteúdo convertido | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Debugging & inspecting conversion output](https://tiptap.dev/docs/conversion/getting-started/guides/debugging) | Avisos e inspeção do JSON intermediário | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [End-to-end walkthrough: import, edit, export](https://tiptap.dev/docs/conversion/getting-started/guides/end-to-end-walkthrough) | Ida e volta completa de DOCX | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Styling converted content](https://tiptap.dev/docs/conversion/getting-started/guides/styling-converted-content) | Por que o documento importado muda de aparência | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [_regional-endpoints](https://tiptap.dev/docs/conversion/_shared/_regional-endpoints) | Fragmento compartilhado: endpoints regionais | região do serviço importa para LGPD |
| [Content reference](https://tiptap.dev/docs/conversion/content-types/overview) | Referência por elemento do documento | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Headers and footers](https://tiptap.dev/docs/conversion/content-types/page-layout/headers-footers) | Cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks](https://tiptap.dev/docs/conversion/content-types/page-layout/page-breaks) | Quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page structure](https://tiptap.dev/docs/conversion/content-types/page-layout/page-structure) | Seções, tamanho de página, margens e numeração | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Block elements](https://tiptap.dev/docs/conversion/content-types/structures-and-media/block-elements) | Citação, código, linha horizontal e quebra | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Comments](https://tiptap.dev/docs/conversion/content-types/structures-and-media/comments) | Comentários do DOCX como threads | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Footnotes and endnotes](https://tiptap.dev/docs/conversion/content-types/structures-and-media/footnotes-endnotes) | Notas de rodapé e de fim | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Hyperlinks and bookmarks](https://tiptap.dev/docs/conversion/content-types/structures-and-media/hyperlinks-bookmarks) | Links e marcadores internos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Images](https://tiptap.dev/docs/conversion/content-types/structures-and-media/images) | Imagens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Math and equations](https://tiptap.dev/docs/conversion/content-types/structures-and-media/math-equations) | Equações | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Tables](https://tiptap.dev/docs/conversion/content-types/structures-and-media/tables) | Tabelas, células mescladas, larguras | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Word styles](https://tiptap.dev/docs/conversion/content-types/structures-and-media/word-styles) | Estilos de parágrafo e de caractere do Word | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Bold, italic, underline, strikethrough](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/bold-italic-underline-strike) | Negrito, itálico, sublinhado e tachado | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Font family and size](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/font-family-size) | Família e tamanho de fonte | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Headings](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/headings) | Títulos de 1 a 9 | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Lists](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/lists) | Listas | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Paragraphs](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/paragraphs) | Parágrafos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Subscript and superscript](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/subscript-superscript) | Subscrito e sobrescrito | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Tabs](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/tabs) | Tabulação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Task lists](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/task-lists) | Listas de tarefas | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Text alignment](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/text-alignment) | Alinhamento | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Text color and highlight](https://tiptap.dev/docs/conversion/content-types/text-and-formatting/text-color-highlight) | Cor e destaque | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [_custom-node-conversion-guide](https://tiptap.dev/docs/conversion/export/_shared/_custom-node-conversion-guide) | Fragmento compartilhado: conversão de nó próprio na exportação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [_element-overrides-rest-api](https://tiptap.dev/docs/conversion/export/_shared/_element-overrides-rest-api) | Fragmento compartilhado: sobrescrita de elemento na API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [_export-styles-guide](https://tiptap.dev/docs/conversion/export/_shared/_export-styles-guide) | Fragmento compartilhado: estilos na exportação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom nodes to .doc](https://tiptap.dev/docs/conversion/export/doc/custom-nodes) | DOC: nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export DOC from your editor](https://tiptap.dev/docs/conversion/export/doc/editor-extension) | DOC: exportar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Extend your DOC export with Headers & Footers](https://tiptap.dev/docs/conversion/export/doc/headers-footers) | DOC: cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks in DOC export](https://tiptap.dev/docs/conversion/export/doc/page-breaks) | DOC: quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom page layouts in DOC](https://tiptap.dev/docs/conversion/export/doc/page-layout) | DOC: página e margens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export DOC via REST API](https://tiptap.dev/docs/conversion/export/doc/rest-api) | DOC: exportar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom styles to DOC](https://tiptap.dev/docs/conversion/export/doc/styles) | DOC: estilos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export editor CSS as DOCX styles](https://tiptap.dev/docs/conversion/export/docx/css-to-docx) | DOCX: CSS do editor vira estilo do Word | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom nodes to .docx](https://tiptap.dev/docs/conversion/export/docx/custom-nodes) | DOCX: nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom nodes with the JSON DSL](https://tiptap.dev/docs/conversion/export/docx/custom-nodes-dsl) | DOCX: DSL JSON para nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom-nodes DSL builder (TypeScript)](https://tiptap.dev/docs/conversion/export/docx/custom-nodes-dsl-builder) | DOCX: construtor tipado da DSL | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export .docx from your editor](https://tiptap.dev/docs/conversion/export/docx/editor-extension) | DOCX: exportar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Embed custom fonts in DOCX export](https://tiptap.dev/docs/conversion/export/docx/fonts) | DOCX: fontes embutidas | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Extend your DOCX export with Headers & Footers](https://tiptap.dev/docs/conversion/export/docx/headers-footers) | DOCX: cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Customize list numbering and bullets for DOCX export](https://tiptap.dev/docs/conversion/export/docx/ordered-list-numbering) | DOCX: numeração e marcadores de lista | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks in DOCX export](https://tiptap.dev/docs/conversion/export/docx/page-breaks) | DOCX: quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom page layouts in DOCX](https://tiptap.dev/docs/conversion/export/docx/page-layout) | DOCX: página e margens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export DOCX via REST API](https://tiptap.dev/docs/conversion/export/docx/rest-api) | DOCX: exportar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom styles to .docx](https://tiptap.dev/docs/conversion/export/docx/styles) | DOCX: estilos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export tracked changes to DOCX](https://tiptap.dev/docs/conversion/export/docx/tracked-changes) | DOCX: sugestões como revisões do Word | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom nodes to .epub](https://tiptap.dev/docs/conversion/export/epub/custom-nodes) | EPUB: nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export EPUB from your editor](https://tiptap.dev/docs/conversion/export/epub/editor-extension) | EPUB: exportar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Extend your EPUB export with Headers & Footers](https://tiptap.dev/docs/conversion/export/epub/headers-footers) | EPUB: cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks in EPUB export](https://tiptap.dev/docs/conversion/export/epub/page-breaks) | EPUB: quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom page layouts in EPUB](https://tiptap.dev/docs/conversion/export/epub/page-layout) | EPUB: página e margens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export EPUB via REST API](https://tiptap.dev/docs/conversion/export/epub/rest-api) | EPUB: exportar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom styles to EPUB](https://tiptap.dev/docs/conversion/export/epub/styles) | EPUB: estilos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export Markdown from your editor](https://tiptap.dev/docs/conversion/export/markdown/editor-extension) | Markdown: exportar pelo editor | na casa, `renderToMarkdown` do static renderer (aberto) resolve |
| [Export Markdown via REST API](https://tiptap.dev/docs/conversion/export/markdown/rest-api) | Markdown: exportar por API REST | na casa, `renderToMarkdown` do static renderer (aberto) resolve |
| [Export custom nodes to .odt](https://tiptap.dev/docs/conversion/export/odt/custom-nodes) | ODT: nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export ODT from your editor](https://tiptap.dev/docs/conversion/export/odt/editor-extension) | ODT: exportar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Extend your ODT export with Headers & Footers](https://tiptap.dev/docs/conversion/export/odt/headers-footers) | ODT: cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks in ODT export](https://tiptap.dev/docs/conversion/export/odt/page-breaks) | ODT: quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom page layouts in ODT](https://tiptap.dev/docs/conversion/export/odt/page-layout) | ODT: página e margens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export ODT via REST API](https://tiptap.dev/docs/conversion/export/odt/rest-api) | ODT: exportar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom styles to ODT](https://tiptap.dev/docs/conversion/export/odt/styles) | ODT: estilos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom nodes to .pdf](https://tiptap.dev/docs/conversion/export/pdf/custom-nodes) | PDF: nó próprio | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export PDF from your editor](https://tiptap.dev/docs/conversion/export/pdf/editor-extension) | PDF: exportar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Extend your PDF export with Headers & Footers](https://tiptap.dev/docs/conversion/export/pdf/headers-footers) | PDF: cabeçalho e rodapé | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Page breaks in PDF export](https://tiptap.dev/docs/conversion/export/pdf/page-breaks) | PDF: quebra de página | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Custom page layouts in PDF](https://tiptap.dev/docs/conversion/export/pdf/page-layout) | PDF: página e margens | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export PDF via REST API](https://tiptap.dev/docs/conversion/export/pdf/rest-api) | PDF: exportar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Export custom styles to PDF](https://tiptap.dev/docs/conversion/export/pdf/styles) | PDF: estilos | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [ConvertKit: DOCX-aware editor extensions](https://tiptap.dev/docs/conversion/import/docx/convertkit) | ConvertKit: extensões com schema próprio para DOCX | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Inject DOCX default styles as CSS](https://tiptap.dev/docs/conversion/import/docx/css-injection) | Estilos padrão do DOCX injetados como CSS | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import custom marks with .docx](https://tiptap.dev/docs/conversion/import/docx/custom-mark-mapping) | DOCX: marca própria na importação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import custom nodes from .docx](https://tiptap.dev/docs/conversion/import/docx/custom-node-mapping) | DOCX: nó próprio na importação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import .docx in your editor](https://tiptap.dev/docs/conversion/import/docx/editor-extension) | DOCX: importar pelo editor | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Preserve images during conversion](https://tiptap.dev/docs/conversion/import/docx/image-handling) | DOCX: imagens enviadas para o seu upload | upload para o storage da casa, nunca base64 no JSON |
| [Page breaks in DOCX import](https://tiptap.dev/docs/conversion/import/docx/page-breaks) | DOCX: quebra de página na importação | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import DOCX via REST API](https://tiptap.dev/docs/conversion/import/docx/rest-api) | DOCX: importar por API REST | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import tracked changes from DOCX](https://tiptap.dev/docs/conversion/import/docx/tracked-changes) | DOCX: revisões do Word como sugestões | só com decisão do projeto por conversão de documentos na Tiptap Cloud |
| [Import Markdown via REST API](https://tiptap.dev/docs/conversion/import/markdown/rest-api) | Markdown: importar por API REST | na casa, `MarkdownManager.parse()` (aberto) resolve sem serviço |
| [Legacy DOCX Import & Export](https://tiptap.dev/docs/conversion/legacy/overview) | Importação e exportação legadas | não usar; fim anunciado para 2026 |
| [Migrating from the legacy import/export extensions](https://tiptap.dev/docs/conversion/legacy/migration-guide) | Migração das extensões legadas para as novas | só para quem já usa o legado |
| [Convert Markdown with Tiptap (Legacy)](https://tiptap.dev/docs/conversion/legacy/markdown/editor-extensions) | Markdown pelo editor (legado) | não usar |
| [Convert Markdown via REST API (Legacy)](https://tiptap.dev/docs/conversion/legacy/markdown/rest-api) | Markdown por API REST (legado) | não usar |
| [Convert ODT with Tiptap (Legacy)](https://tiptap.dev/docs/conversion/legacy/odt/editor-extensions) | ODT pelo editor (legado) | não usar |
| [Convert ODT files via REST API (Legacy)](https://tiptap.dev/docs/conversion/legacy/odt/rest-api) | ODT por API REST (legado) | não usar |

### Pages

A visão geral (`pages/getting-started/overview`): layout paginado (A4, Letter, formatos próprios),
cabeçalho, rodapé e zoom, sem schema próprio (precisa de `ConvertKit` e `PagesTableKit`); a página
declara superfície *beta* e manda fixar versão exata.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Pages](https://tiptap.dev/docs/pages/getting-started/overview) | Visão geral do Pages | só com decisão do projeto por editor de documento paginado |
| [Install the Pages extension](https://tiptap.dev/docs/pages/getting-started/install) | Instalação | só com decisão do projeto por editor de documento paginado |
| [Pages Live Demo](https://tiptap.dev/docs/pages/getting-started/live-demo) | Demonstração ao vivo | só com decisão do projeto por editor de documento paginado |
| [Endnotes](https://tiptap.dev/docs/pages/core-concepts/endnotes) | Notas de fim | só com decisão do projeto por editor de documento paginado |
| [Footnotes](https://tiptap.dev/docs/pages/core-concepts/footnotes) | Notas de rodapé por página | só com decisão do projeto por editor de documento paginado |
| [Layout participants](https://tiptap.dev/docs/pages/core-concepts/layout-participants) | NodeView próprio participando do cálculo de página | só com decisão do projeto por editor de documento paginado |
| [Limitations](https://tiptap.dev/docs/pages/core-concepts/limitations) | Limitações conhecidas e contornos | só com decisão do projeto por editor de documento paginado |
| [Pages extension API reference](https://tiptap.dev/docs/pages/core-concepts/options) | Referência de opções, comandos e storage | só com decisão do projeto por editor de documento paginado |
| [PageBreak node](https://tiptap.dev/docs/pages/core-concepts/page-break-node) | Nó de quebra de página | só com decisão do projeto por editor de documento paginado |
| [Page format](https://tiptap.dev/docs/pages/core-concepts/page-format) | Formato de página | só com decisão do projeto por editor de documento paginado |
| [Page gap & background](https://tiptap.dev/docs/pages/core-concepts/page-gap) | Espaço e fundo entre páginas | só com decisão do projeto por editor de documento paginado |
| [Page header and footer](https://tiptap.dev/docs/pages/core-concepts/page-header-footer) | Cabeçalho e rodapé, inclusive primeira página diferente | só com decisão do projeto por editor de documento paginado |
| [Zoom](https://tiptap.dev/docs/pages/core-concepts/zoom) | Zoom | só com decisão do projeto por editor de documento paginado |
| [Adding collaboration to Pages](https://tiptap.dev/docs/pages/guides/collaboration-with-pages) | Colaboração com Pages | só com decisão do projeto por editor de documento paginado |
| [PageKit](https://tiptap.dev/docs/pages/guides/pagekit-usage) | PageKit: Pages e tabela num pacote | só com decisão do projeto por editor de documento paginado |
| [PagesTableKit: tables for the Pages extension](https://tiptap.dev/docs/pages/guides/pages-tablekit) | PagesTableKit: tabelas para Pages | só com decisão do projeto por editor de documento paginado |
| [Rows that span a page break](https://tiptap.dev/docs/pages/guides/row-fragmentation) | Linha de tabela que atravessa a quebra de página | só com decisão do projeto por editor de documento paginado |
| [Using the TableKit extension with Pages](https://tiptap.dev/docs/pages/guides/table-with-pages) | TableKit junto com Pages | só com decisão do projeto por editor de documento paginado |
| [From zero to print-ready: Pages & DOCX export](https://tiptap.dev/docs/pages/guides/zero-to-print-ready) | Do zero ao documento pronto para impressão e DOCX | só com decisão do projeto por editor de documento paginado |
| [cmToPixels utility](https://tiptap.dev/docs/pages/utilities/cm-to-pixels) | `cmToPixels` | só com decisão do projeto por editor de documento paginado |
| [inchToPixels utility](https://tiptap.dev/docs/pages/utilities/inch-to-pixels) | `inchToPixels` | só com decisão do projeto por editor de documento paginado |
| [Page formats constants](https://tiptap.dev/docs/pages/utilities/page-formats) | Constantes de formato de página | só com decisão do projeto por editor de documento paginado |

### Tracked Changes

A visão geral (`tracked-changes/getting-started/overview`): modo sugestão com oito tipos de
mudança rastreada, aceitar e rejeitar por usuário. A lista "Fora de escopo" no fim deste arquivo já
citava esta página; a linha abaixo a cataloga.

| Página | O que faz | Quando usar na casa |
|---|---|---|
| [Track changes in your editor](https://tiptap.dev/docs/tracked-changes/getting-started/overview) | Visão geral do Tracked Changes | só com decisão do projeto por revisão com sugestões |
| [Install the Tracked Changes extension](https://tiptap.dev/docs/tracked-changes/getting-started/install) | Instalação | só com decisão do projeto por revisão com sugestões |
| [Basic usage](https://tiptap.dev/docs/tracked-changes/usage/basic-usage) | Ligar o rastreio, usuários, aceitar e rejeitar | só com decisão do projeto por revisão com sugestões |
| [Advanced usage](https://tiptap.dev/docs/tracked-changes/usage/advanced-usage) | Agrupamento, junção de exclusões, colaboração | só com decisão do projeto por revisão com sugestões |
| [Commands](https://tiptap.dev/docs/tracked-changes/api-reference/commands) | Comandos | só com decisão do projeto por revisão com sugestões |
| [Events](https://tiptap.dev/docs/tracked-changes/api-reference/events) | Eventos | só com decisão do projeto por revisão com sugestões |
| [Styling](https://tiptap.dev/docs/tracked-changes/api-reference/styling) | Estilo por atributos `data-*` | só com decisão do projeto por revisão com sugestões |
| [Types](https://tiptap.dev/docs/tracked-changes/api-reference/types) | Tipos | só com decisão do projeto por revisão com sugestões |
| [Utilities](https://tiptap.dev/docs/tracked-changes/api-reference/utilities) | Utilitários de consulta de sugestões | só com decisão do projeto por revisão com sugestões |
| [Tracked Changes with Collaboration](https://tiptap.dev/docs/tracked-changes/examples/collaboration) | Exemplo com colaboração Y.js | só com decisão do projeto por revisão com sugestões |
| [Tracked Changes with Comments](https://tiptap.dev/docs/tracked-changes/examples/comments) | Exemplo com comentários | só com decisão do projeto por revisão com sugestões |
| [Simple Tracked Changes](https://tiptap.dev/docs/tracked-changes/examples/simple) | Exemplo simples com barra de sugestões | só com decisão do projeto por revisão com sugestões |
| [Tracked Changes with Comments](https://tiptap.dev/docs/tracked-changes/guides/comments-integration) | Revisão completa com comentários | só com decisão do projeto por revisão com sugestões |
| [Creating an editor with Tracked Changes](https://tiptap.dev/docs/tracked-changes/guides/editor-setup) | Editor com Tracked Changes em React | só com decisão do projeto por revisão com sugestões |
| [Using NodeViews with Tracked Changes](https://tiptap.dev/docs/tracked-changes/guides/nodeview-support) | NodeViews com rastreio | só com decisão do projeto por revisão com sugestões |
| [Build a suggestion list](https://tiptap.dev/docs/tracked-changes/guides/suggestion-list) | Barra lateral de sugestões | só com decisão do projeto por revisão com sugestões |

## Fora de escopo

- docs (página inicial/índice, sem conteúdo próprio)
- docs/llms.txt (o próprio índice para agentes, não uma página de uso)
- resources/changelog
- resources/contributing
- tracked-changes/getting-started/overview (recurso Tiptap Pro pago; não instalado em nenhum dos
  dois projetos)
