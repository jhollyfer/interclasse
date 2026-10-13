# Tiptap

> Conferido contra `@tiptap/core@3.31.4` (última publicada no npm).

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

**Links:** 45.

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

## Fora de escopo

- docs (página inicial/índice, sem conteúdo próprio)
- docs/llms.txt (o próprio índice para agentes, não uma página de uso)
- resources/changelog
- resources/contributing
- tracked-changes/getting-started/overview (recurso Tiptap Pro pago; não instalado em nenhum dos
  dois projetos)
