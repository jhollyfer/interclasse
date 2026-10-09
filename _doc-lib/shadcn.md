# shadcn/ui

Componentes React que você **copia para o seu projeto**, em vez de instalar como dependência.

**O que é:** um catálogo de componentes acessíveis, construídos sobre primitivas headless (Radix ou
Base UI) e estilizados com Tailwind. A diferença central: `shadcn add button` **grava o arquivo do
componente dentro do seu repositório**. Não existe pacote `shadcn/ui` no `package.json` com os
componentes, existe código seu que você pode editar à vontade.

**Qual primitiva:** decide o `"style"` do `components.json`. Nos estilos novos (`base-*`) é o Base UI,
e é dele o comportamento inteiro do componente — foco, teclado, ARIA, posicionamento. Prop que não
aparece nesta doc quase sempre existe lá, porque o arquivo gerado repassa `...props` para a
primitiva. A referência está em [`base-ui.md`](base-ui.md).

**Para que serve:** ter a base de uma biblioteca de componentes sem herdar as limitações de uma.
Precisa mudar o comportamento de um `Select`? Abre o arquivo e muda. Sem sobrescrever CSS de
terceiro, sem esperar release, sem `!important`.

**Como usar:**

```bash
pnpm dlx shadcn@latest init      # cria components.json, tokens de tema e o utilitário cn()
pnpm dlx shadcn@latest add button dialog form
```

```tsx
import { Button } from '@/components/ui/button'

<Button variant="destructive" size="sm">Remover</Button>
```

**Quando usar a biblioteca:** em qualquer projeto React com Tailwind que precise de mais que um punhado de
botões. O custo é ter os arquivos no repositório (que é justamente o benefício); a alternativa
(MUI, Chakra) troca isso por menos código seu e menos controle.

**O que muda a experiência:** as **variantes** (via `class-variance-authority`) e o utilitário `cn`
são a espinha do sistema. Antes de criar um componente novo, veja se não é uma variante de um que já
existe. E leia `theming` cedo: cor escrita direto no componente em vez de token de tema é o que
quebra o modo escuro depois.

**Sobre os links de componente:** cada página traz instalação, exemplos, anatomia e a referência de
props. O campo "Quando usar" abaixo foca em **qual componente escolher**, que é a dúvida real, já que
vários resolvem problemas parecidos.

**Links:** 103.

---

## Começando

#### docs
[doc](https://ui.shadcn.com/docs) | [markdown](https://ui.shadcn.com/docs.md)
**O que é:** a página inicial da documentação, com a filosofia do projeto e o mapa das seções.
**Para que serve:** entender o modelo de "copiar e colar como dependência" antes de adotar.
**Quando usar:** primeira leitura. É curta e evita a expectativa errada de biblioteca instalável.

```bash
pnpm dlx shadcn@latest add button

# o resultado não é uma linha no package.json, é um ARQUIVO seu:
# src/components/ui/button.tsx  <- versionado, editável, sem release para esperar
```

#### docs/installation
[doc](https://ui.shadcn.com/docs/installation) | [markdown](https://ui.shadcn.com/docs/installation.md)
**O que é:** o `init`, os pré-requisitos (Tailwind, aliases de path) e os guias por framework.
**Para que serve:** deixar o projeto pronto para receber componentes.
**Quando usar:** uma vez por projeto. Os **aliases de import** precisam existir antes, e é o
tropeço mais comum do `init`.

```jsonc
// tsconfig.json ANTES do init: sem isto, a CLI grava arquivos que não compilam
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
// e o alias equivalente no vite.config.ts, senão quebra só no build
```

#### docs/components
[doc](https://ui.shadcn.com/docs/components) | [markdown](https://ui.shadcn.com/docs/components.md)
**O que é:** o índice de todos os componentes disponíveis.
**Para que serve:** descobrir o que existe antes de construir do zero.
**Quando usar:** **antes de escrever qualquer componente novo**. A chance de já existir é alta.

```bash
# o catálogo pelo terminal, sem abrir o navegador
pnpm dlx shadcn@latest add

# e o que JÁ está no projeto (evita reescrever o que já foi instalado):
ls src/components/ui
```

#### docs/cli
[doc](https://ui.shadcn.com/docs/cli) | [markdown](https://ui.shadcn.com/docs/cli.md)
**O que é:** a referência da CLI: `init`, `add`, `diff`, `build`, e as flags de sobrescrita.
**Para que serve:** adicionar componentes e comparar sua versão local com a upstream.
**Quando usar:** o tempo todo para `add`. O `diff` é útil para saber o que mudou upstream depois que
você já editou o arquivo local.

```bash
pnpm dlx shadcn@latest add dialog sheet

# -o SOBRESCREVE o arquivo local: se você editou o componente, sua edição some.
# Confira o que mudou antes de aceitar:
pnpm dlx shadcn@latest diff button
```

#### docs/components-json
[doc](https://ui.shadcn.com/docs/components-json) | [markdown](https://ui.shadcn.com/docs/components-json.md)
**O que é:** a referência do `components.json`: estilo, biblioteca de ícones, aliases, caminho do CSS
e a flag de RSC.
**Para que serve:** o arquivo que diz à CLI onde escrever e o que gerar.
**Quando usar:** ao mudar a estrutura de pastas do projeto, ou quando a CLI gravar arquivo no lugar
errado.

```jsonc
{
  "style": "base-mira",
  "rsc": false,
  // iconLibrary decide o import dos ícones dentro do componente GERADO.
  // Trocar depois não reescreve o que já está no disco.
  "iconLibrary": "phosphor",
  "aliases": { "ui": "@/components/ui", "utils": "@/lib/utils" }
}
```

#### docs/theming
[doc](https://ui.shadcn.com/docs/theming) | [markdown](https://ui.shadcn.com/docs/theming.md)
**O que é:** o sistema de tema por variáveis CSS, com os tokens semânticos (`background`,
`foreground`, `primary`, `muted`, `destructive`) e os modos claro e escuro.
**Para que serve:** trocar a identidade visual inteira mexendo em variáveis, não em componentes.
**Quando usar:** **leia antes de estilizar qualquer coisa**. Usar `bg-blue-500` em vez de
`bg-primary` é o que garante que o modo escuro vai quebrar.

```tsx
// ERRADO: cor fixa. No modo escuro vira texto branco sobre fundo quase branco.
// <div className="bg-white text-slate-900">

// CERTO: par semântico. Os dois tokens trocam juntos quando o tema muda.
<div className="bg-background text-foreground">
  <span className="text-muted-foreground">rótulo</span>
</div>
```

#### docs/typeset
[doc](https://ui.shadcn.com/docs/typeset) | [markdown](https://ui.shadcn.com/docs/typeset.md)
**O que é:** o sistema de tipografia: escala, pesos, espaçamento e os estilos para conteúdo longo.
**Para que serve:** texto consistente sem decidir tamanho e peso caso a caso.
**Quando usar:** ao montar páginas com bastante texto, e ao definir os padrões visuais do projeto.

```tsx
// conteúdo longo (markdown, descrição de post) num contêiner só, em vez de
// classe de tipografia repetida em cada parágrafo
<article className="prose dark:prose-invert max-w-none">
  <h2>Título</h2>
  <p>Parágrafo com escala e espaçamento já definidos.</p>
</article>
```

#### docs/skills
[doc](https://ui.shadcn.com/docs/skills) | [markdown](https://ui.shadcn.com/docs/skills.md)
**O que é:** as skills que ensinam agentes de IA a usar o shadcn corretamente no seu projeto.
**Para que serve:** o agente escolher o componente certo e seguir as convenções, em vez de inventar
markup.
**Quando usar:** se você programa com assistente de IA. Instalar a skill melhora bastante o
resultado.

```bash
# o ganho concreto: o agente passa a ler o components.json do projeto (style,
# ícones, aliases) em vez de gerar markup de um shadcn genérico
pnpm dlx shadcn@latest add skill
```

#### llms.txt
[doc](https://ui.shadcn.com/llms.txt) | (já é `.txt`)
**O que é:** o índice de toda a documentação em texto puro, no padrão `llms.txt`.
**Para que serve:** dar a doc inteira, e atualizada, para um assistente de IA.
**Quando usar:** quando o agente inventar prop que não existe. É também a lista canônica para
conferir se uma página foi renomeada.

```bash
# a página que você procura ainda existe? o nome mudou?
curl -s https://ui.shadcn.com/llms.txt | grep -i questionnaire
```

#### docs/figma
[doc](https://ui.shadcn.com/docs/figma) | [markdown](https://ui.shadcn.com/docs/figma.md)
**O que é:** a lista de kits do Figma que reproduzem os componentes, gratuitos e pagos.
**Para que serve:** desenhar tela usando os mesmos componentes que o código já tem.
**Quando usar:** ao entrar designer no time. **Os arquivos são da comunidade, não oficiais** — a
própria página avisa, e isso significa que podem estar atrás da versão que você usa.

```text
# a conferência que evita retrabalho: o kit cobre a versão que está no repositório?
# componente do kit que não existe no seu components/ui vira tela impossível de entregar.
```

#### docs/package-imports
[doc](https://ui.shadcn.com/docs/package-imports) | [markdown](https://ui.shadcn.com/docs/package-imports.md)
**O que é:** como importar componentes a partir de pacotes, para quem distribui componentes.
**Para que serve:** publicar componentes para outros projetos consumirem.
**Quando usar:** ao montar uma biblioteca interna compartilhada.

```ts
// consumir por pacote inverte o trato: volta a ser dependência versionada, e
// editar o componente deixa de ser opção
import { Button } from '@user/ui/button'

// use quando a padronização entre times vale mais que a liberdade de editar
```

#### docs/monorepo
[doc](https://ui.shadcn.com/docs/monorepo) | [markdown](https://ui.shadcn.com/docs/monorepo.md)
**O que é:** a configuração em monorepo, com pacote de UI compartilhado entre vários apps.
**Para que serve:** um só conjunto de componentes servindo mais de uma aplicação.
**Quando usar:** em monorepo com dois ou mais apps que compartilham interface.

```jsonc
// apps/web/components.json: os componentes moram no pacote, o app só aponta
{
  "aliases": {
    "ui": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils"
  }
}
```

#### docs/javascript
[doc](https://ui.shadcn.com/docs/javascript) | [markdown](https://ui.shadcn.com/docs/javascript.md)
**O que é:** como usar sem TypeScript.
**Para que serve:** projetos em JavaScript puro.
**Quando usar:** só nesse caso. Com TypeScript, pule.

```jsonc
// components.json: "tsx": false faz a CLI gravar .jsx e usar jsconfig.json
{ "tsx": false, "aliases": { "ui": "@/components/ui" } }
```

#### docs/changelog
[doc](https://ui.shadcn.com/docs/changelog) | [markdown](https://ui.shadcn.com/docs/changelog.md)
**O que é:** as novidades e os avisos de mudança do projeto.
**Para que serve:** descobrir componente novo e mudança que quebra o que já está no disco.
**Quando usar:** **antes de rodar `diff` ou reinstalar um componente**. Componente já editado por você
não se atualiza sozinho, então saber o que mudou é o que decide se vale reaplicar. A versão `.md`
crua sai praticamente vazia; esta é uma das poucas páginas que só valem no site.

```bash
# o par: ler o changelog e só então conferir o que mudou no seu arquivo
pnpm dlx shadcn@latest diff button
```

#### docs/legacy
[doc](https://ui.shadcn.com/docs/legacy) | [markdown](https://ui.shadcn.com/docs/legacy.md)
**O que é:** o ponteiro para a documentação antiga, de shadcn sobre **Tailwind v3**.
**Para que serve:** ler a doc que corresponde a um projeto que ainda não migrou.
**Quando usar:** só em projeto preso no Tailwind v3. Num projeto v4, seguir exemplo de lá é a receita
para tema quebrado — a v3 configura cor em `tailwind.config.js`, a v4 em variável CSS.

```text
Tailwind v4 (esta doc)  ->  ui.shadcn.com
Tailwind v3 (legada)    ->  v3.shadcn.com
```

## Modo escuro

#### docs/dark-mode/tanstack-start
[doc](https://ui.shadcn.com/docs/dark-mode/tanstack-start) | [markdown](https://ui.shadcn.com/docs/dark-mode/tanstack-start.md)
**O que é:** o guia de modo escuro em TanStack Start, com a persistência da preferência e o
tratamento de SSR.
**Para que serve:** alternar tema sem piscar branco no primeiro carregamento.
**Quando usar:** ao implementar o alternador de tema em Start. **O flash de tema errado é problema de
SSR**, e a solução está aqui, não no CSS.

```tsx
// o flash acontece porque o servidor não sabe o tema do usuário. A saída é ler
// a preferência no SERVIDOR (cookie) e já mandar a classe no HTML.
export const Route = createRootRoute({
  loader: () => ({ tema: getCookie('tema') ?? 'light' }),
  component: () => <html className={Route.useLoaderData().tema} />,
})
```

#### docs/dark-mode/vite
[doc](https://ui.shadcn.com/docs/dark-mode/vite) | [markdown](https://ui.shadcn.com/docs/dark-mode/vite.md)
**O que é:** o mesmo guia para SPA em Vite, sem SSR.
**Para que serve:** modo escuro com preferência salva no navegador.
**Quando usar:** em SPA. Mais simples que a versão com SSR, porque não há HTML do servidor para
divergir.

```tsx
import { ThemeProvider } from 'next-themes'

// sem SSR não há HTML de servidor para divergir: um provider resolve
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <App />
</ThemeProvider>
```

## Formulários

#### docs/forms/react-hook-form
[doc](https://ui.shadcn.com/docs/forms/react-hook-form) | [markdown](https://ui.shadcn.com/docs/forms/react-hook-form.md)
**O que é:** a integração com react-hook-form e resolvers de schema, com os componentes de campo,
rótulo, descrição e mensagem de erro.
**Para que serve:** formulários acessíveis, validados e com erro exibido no lugar certo, sem
repetição.
**Quando usar:** **em todo formulário do projeto**. Junto com um validator VineJS, dá validação e
tipo do formulário de uma vez. Aqui são os componentes de campo; a biblioteca de formulário em si
está em [`react-hook-form.md`](react-hook-form.md), e o schema em [`vinejs.md`](vinejs.md).

```tsx
import { vineResolver } from '@hookform/resolvers/vine'
import { useForm } from 'react-hook-form'
import type { Infer } from '@vinejs/vine/types'
// O `vine` vem daqui já configurado, nunca de '@vinejs/vine' direto.
import { vine } from '@/lib/validator'

const validator = vine.create({ document: vine.string().fixedLength(14) })

// o tipo do formulário SAI do validator: um campo só existe se estiver validado
const form = useForm<Infer<typeof validator>>({ resolver: vineResolver(validator) })
```

#### docs/forms/tanstack-form
[doc](https://ui.shadcn.com/docs/forms/tanstack-form) | [markdown](https://ui.shadcn.com/docs/forms/tanstack-form.md)
**O que é:** a mesma integração, com TanStack Form.
**Para que serve:** a alternativa, com API baseada em campos tipados.
**Quando usar:** se o projeto já é todo TanStack e você prefere consistência de ecossistema. Escolha
**uma** biblioteca de formulário e mantenha, misturar as duas é a pior opção.

```tsx
import { useForm } from '@tanstack/react-form'

const form = useForm({
  defaultValues: { document: '' },
  onSubmit: ({ value }) => criarUser(value),
})
// Num projeto que já usa react-hook-form + VineJS, trazer esta é ter duas
// convenções de formulário no mesmo repositório, o pior dos dois mundos.
```

#### docs/forms/formisch
[doc](https://ui.shadcn.com/docs/forms/formisch) | [markdown](https://ui.shadcn.com/docs/forms/formisch.md)
**O que é:** a terceira integração de formulário, com Formisch e schemas Valibot.
**Para que serve:** a alternativa mais leve, com schema obrigatório e tipo inferido dele.
**Quando usar:** **em projeto novo, ou em nenhum**. Ela vem casada com Valibot, então adotá-la num
projeto que valida com VineJS significa duas bibliotecas de schema no bundle do cliente — que é
exatamente o que a escolha de VineJS nos dois lados existe para evitar.

```tsx
// o custo escondido: Formisch pressupõe Valibot, e o schema vira uma
// terceira declaração ao lado dos dois validators que já existem
import * as v from 'valibot'

const FormSchema = v.object({ title: v.pipe(v.string(), v.minLength(5)) })
```

## Utilitários e helpers

#### docs/react/message-scroller
[doc](https://ui.shadcn.com/docs/react/message-scroller) | [markdown](https://ui.shadcn.com/docs/react/message-scroller.md)
**O que é:** o hook por trás do componente de rolagem de mensagens, com o comportamento de fixar no
fim da lista.
**Para que serve:** listas que rolam sozinhas ao chegar item novo, mas param se o usuário rolou para
cima.
**Quando usar:** em chat e em log ao vivo. Esse comportamento é chato de acertar na mão.

```tsx
// a regra que o hook implementa e que quase ninguém acerta de primeira:
// item novo -> rola para o fim, MAS só se o usuário já estava no fim.
// Rolou para cima para ler algo? Não arrasta a leitura dele.
const { ref, estaNoFim, irParaOFim } = useMessageScroller()
```

#### docs/react/questionnaire
[doc](https://ui.shadcn.com/docs/react/questionnaire) | [markdown](https://ui.shadcn.com/docs/react/questionnaire.md)
**O que é:** a primitiva sem estilo por trás do componente de questionário, no pacote
`@shadcn/react`. Ela gerencia respostas, progresso, validação e navegação entre perguntas.
**Para que serve:** montar o fluxo de uma pergunta por vez sem escrever a máquina de estados.
**Quando usar:** ao precisar de markup diferente do componente estilizado. **É aqui que está a
referência de props**, porque a página do componente mostra a versão de nomes achatados
(`QuestionnaireItem`) e esta mostra o namespace (`Questionnaire.Item`).

```tsx
import { Questionnaire } from '@shadcn/react/questionnaire'

// o mapeamento que confunde: Root é um <form>, cada Item é um <fieldset> e
// o Title é a <legend> dele. A semântica já vem certa.
<Questionnaire.Root>
  <Questionnaire.Item name="objetivo">
    <Questionnaire.Title>Qual o objetivo?</Questionnaire.Title>
  </Questionnaire.Item>
</Questionnaire.Root>
```

#### docs/helpers/ai-sdk
[doc](https://ui.shadcn.com/docs/helpers/ai-sdk) | [markdown](https://ui.shadcn.com/docs/helpers/ai-sdk.md)
**O que é:** helpers para conectar os componentes de conversa ao AI SDK da Vercel.
**Para que serve:** montar interface de chat com streaming sem escrever a cola.
**Quando usar:** só em app com funcionalidade de IA conversacional.

```tsx
import { useChat } from 'ai/react'

// a cola pronta: streaming, estado de envio e a lista de mensagens no formato
// que os componentes de conversa esperam
const { messages, input, handleSubmit } = useChat({ api: '/api/chat' })
```

#### docs/helpers/tanstack-ai
[doc](https://ui.shadcn.com/docs/helpers/tanstack-ai) | [markdown](https://ui.shadcn.com/docs/helpers/tanstack-ai.md)
**O que é:** os mesmos helpers, para o TanStack AI.
**Para que serve:** a alternativa dentro do ecossistema TanStack.
**Quando usar:** mesma condição, escolhendo essa biblioteca.

```ts
// mesma função, outro ecossistema: os componentes de conversa são os mesmos, e
// só a origem das mensagens muda
import { useChat } from '@tanstack/react-ai'
```

#### docs/utils/scroll-fade
[doc](https://ui.shadcn.com/docs/utils/scroll-fade) | [markdown](https://ui.shadcn.com/docs/utils/scroll-fade.md)
**O que é:** o utilitário que aplica um esmaecimento nas bordas de uma área rolável.
**Para que serve:** sinalizar visualmente que há mais conteúdo além da borda.
**Quando usar:** em listas e abas com rolagem horizontal, onde não fica óbvio que dá para rolar.

```tsx
// sem a pista visual, em telas sem barra de rolagem visível (macOS, celular) o
// usuário simplesmente não descobre que existe mais conteúdo à direita
<ScrollFade orientation="horizontal">
  <div className="flex gap-2 overflow-x-auto">{abas}</div>
</ScrollFade>
```

#### docs/utils/shimmer
[doc](https://ui.shadcn.com/docs/utils/shimmer) | [markdown](https://ui.shadcn.com/docs/utils/shimmer.md)
**O que é:** o efeito de brilho animado usado em estados de carregamento.
**Para que serve:** esqueleto de carregamento que parece vivo em vez de bloco cinza parado.
**Quando usar:** junto com `skeleton`, para telas com carregamento perceptível.

```tsx
// bloco parado passa impressão de tela travada; o brilho comunica "está vindo"
<div className="animate-pulse rounded-md bg-muted h-4 w-40" />
```

## Registry

#### docs/registry
[doc](https://ui.shadcn.com/docs/registry) | [markdown](https://ui.shadcn.com/docs/registry.md)
**O que é:** a introdução ao sistema de registries, ou seja, distribuir seus próprios componentes
pela mesma CLI.
**Para que serve:** um catálogo interno do time, instalável com `shadcn add`.
**Quando usar:** quando mais de um projeto precisar dos mesmos componentes customizados.

```bash
# o mesmo comando, apontando para o catálogo do time
pnpm dlx shadcn@latest add https://ui.acme.com/r/tabela-padrao.json
```

#### docs/registry/getting-started
[doc](https://ui.shadcn.com/docs/registry/getting-started) | [markdown](https://ui.shadcn.com/docs/registry/getting-started.md)
**O que é:** o passo a passo para criar um registry próprio.
**Para que serve:** sair do zero até um componente interno instalável.
**Quando usar:** ao montar o registry do time.

```bash
# registry.json descreve os itens; o build gera um .json por componente em
# public/r/, que é o que a CLI consome
pnpm dlx shadcn@latest build
```

#### docs/registry/github
[doc](https://ui.shadcn.com/docs/registry/github) | [markdown](https://ui.shadcn.com/docs/registry/github.md)
**O que é:** hospedar o registry num repositório GitHub, incluindo repositórios privados.
**Para que serve:** distribuir sem servidor próprio.
**Quando usar:** a opção mais simples para registry interno.

```bash
# repositório público: a URL crua já serve de registry, sem infraestrutura
pnpm dlx shadcn@latest add https://raw.githubusercontent.com/org/ui/main/r/tabela.json

# privado: exige token, ver a página de authentication
```

#### docs/registry/registry-index
[doc](https://ui.shadcn.com/docs/registry/registry-index) | [markdown](https://ui.shadcn.com/docs/registry/registry-index.md)
**O que é:** o arquivo de índice que lista os itens do registry.
**Para que serve:** a CLI descobrir o que está disponível.
**Quando usar:** ao adicionar item novo ao registry.

```jsonc
// registry.json: item que não está no índice é invisível para a CLI, mesmo
// com o arquivo publicado
{
  "name": "ui-interno",
  "items": [{ "name": "tabela-padrao", "type": "registry:component" }]
}
```

#### docs/registry/dynamic-search
[doc](https://ui.shadcn.com/docs/registry/dynamic-search) | [markdown](https://ui.shadcn.com/docs/registry/dynamic-search.md)
**O que é:** a busca no servidor: a CLI repassa `q`, `type`, `limit` e `offset` para o seu registry,
em vez de baixar o índice inteiro e filtrar no cliente.
**Para que serve:** catálogo grande continuar rápido de pesquisar.
**Quando usar:** só quando o índice ficar grande a ponto de incomodar. É retrocompatível: registry
que ignora os parâmetros continua funcionando com o filtro do lado do cliente.

```bash
# o contrato: a CLI monta a query, o seu servidor responde paginado
GET /r/search?q=tabela&type=registry:component&limit=20&offset=0
```

#### docs/registry/examples
[doc](https://ui.shadcn.com/docs/registry/examples) | [markdown](https://ui.shadcn.com/docs/registry/examples.md)
**O que é:** exemplos de registries reais, com estruturas diferentes.
**Para que serve:** copiar uma estrutura que funciona em vez de inventar.
**Quando usar:** ao montar o seu, como referência.

```bash
# ler um registry pronto é mais rápido que a referência: a resposta de "como
# declaram dependência entre itens?" está no JSON real. O caminho do item
# inclui o estilo, e é por isso que /r/button.json sozinho dá 404.
curl -s https://ui.shadcn.com/r/styles/new-york/button.json | head -30
```

#### docs/registry/namespace
[doc](https://ui.shadcn.com/docs/registry/namespace) | [markdown](https://ui.shadcn.com/docs/registry/namespace.md)
**O que é:** namespaces para evitar colisão de nome entre registries.
**Para que serve:** conviver com o registry oficial e o interno sem conflito.
**Quando usar:** ao usar mais de um registry no mesmo projeto.

```jsonc
// components.json
{ "registries": { "@interno": "https://ui.acme.com/r/{name}.json" } }
// e então: pnpm dlx shadcn@latest add @interno/tabela-padrao
// sem namespace, o `button` do time briga com o `button` oficial
```

#### docs/registry/authentication
[doc](https://ui.shadcn.com/docs/registry/authentication) | [markdown](https://ui.shadcn.com/docs/registry/authentication.md)
**O que é:** proteger um registry com autenticação por token.
**Para que serve:** componentes internos que não devem ser públicos.
**Quando usar:** em registry privado da organização.

```jsonc
// o token vem do AMBIENTE, nunca escrito no components.json (que é versionado)
{
  "registries": {
    "@interno": {
      "url": "https://ui.acme.com/r/{name}.json",
      "headers": { "Authorization": "Bearer ${REGISTRY_TOKEN}" }
    }
  }
}
```

#### docs/registry/mcp
[doc](https://ui.shadcn.com/docs/registry/mcp) | [markdown](https://ui.shadcn.com/docs/registry/mcp.md)
**O que é:** o servidor MCP do registry, que permite a agentes de IA consultar e instalar
componentes.
**Para que serve:** o assistente instalar o componente certo sozinho, a partir do catálogo real.
**Quando usar:** se você programa com assistente de IA e mantém um registry.

```bash
# com MCP o agente consulta o catálogo REAL antes de gerar markup, em vez de
# inventar props a partir do que ele lembra da doc
pnpm dlx shadcn@latest mcp init
```

#### docs/registry/open-in-v0
[doc](https://ui.shadcn.com/docs/registry/open-in-v0) | [markdown](https://ui.shadcn.com/docs/registry/open-in-v0.md)
**O que é:** o botão que abre um item do registry direto no v0, por uma URL de endpoint.
**Para que serve:** iterar visualmente num componente do catálogo sem clonar nada.
**Quando usar:** só em registry **público**. A página lista o que fica de fora, e a lista é grande:
`cssVars`, `css`, `envVars`, registries com namespace e autenticação por header. Sobra só token em
query string, que é o método mais fraco dos que existem.

```tsx
// e o item precisa estar acessível sem login para o v0 conseguir ler
<a href={`https://v0.dev/chat/api/open?url=${url}`} target="_blank" rel="noreferrer">
  Abrir no v0
</a>
```

#### docs/registry/api-reference
[doc](https://ui.shadcn.com/docs/registry/api-reference) | [markdown](https://ui.shadcn.com/docs/registry/api-reference.md)
**O que é:** a referência da API do registry.
**Para que serve:** integrar ferramentas próprias ao registry.
**Quando usar:** ao automatizar publicação de componentes.

```bash
# o contrato é HTTP + JSON: qualquer ferramenta que sirva esses arquivos vira
# um registry válido
curl -s https://ui.shadcn.com/r/index.json | jq '.[0]'
```

#### docs/registry/registry-json
[doc](https://ui.shadcn.com/docs/registry/registry-json) | [markdown](https://ui.shadcn.com/docs/registry/registry-json.md)
**O que é:** o esquema do arquivo `registry.json`.
**Para que serve:** declarar o registry corretamente.
**Quando usar:** como referência ao criar o arquivo.

```jsonc
{
  // o $schema é o que dá autocomplete e validação no editor: vale a linha
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "ui-interno",
  "homepage": "https://ui.acme.com",
  "items": []
}
```

#### docs/registry/registry-item-json
[doc](https://ui.shadcn.com/docs/registry/registry-item-json) | [markdown](https://ui.shadcn.com/docs/registry/registry-item-json.md)
**O que é:** o esquema de cada item: arquivos, dependências, dependências de registry e alvos.
**Para que serve:** declarar um componente com tudo que ele precisa para funcionar no destino.
**Quando usar:** ao adicionar item. As **dependências de registry** garantem que instalar um
componente traga junto os que ele usa.

```jsonc
{
  "name": "tabela-padrao",
  "type": "registry:component",
  "dependencies": ["@tanstack/react-table"], // pacotes npm
  // outros itens do catálogo: sem declarar, o componente instala quebrado
  "registryDependencies": ["table", "button", "dropdown-menu"],
  "files": [{ "path": "components/tabela-padrao.tsx", "type": "registry:component" }]
}
```

## Componentes: formulário e entrada

#### input
[doc](https://ui.shadcn.com/docs/components/base/input) | [markdown](https://ui.shadcn.com/docs/components/base/input.md)
**O que é:** o campo de texto de linha única, estilizado e com estados de foco, erro e desabilitado.
**Para que serve:** entrada de texto comum.
**Quando usar:** o campo mais usado de qualquer formulário. Combine com `field` para rótulo e erro.

```tsx
import { Input } from '@/components/ui/input'

// type correto muda o teclado no celular e a validação nativa de graça
<Input type="email" placeholder="user@dominio.com" autoComplete="email" />
```

#### textarea
[doc](https://ui.shadcn.com/docs/components/base/textarea) | [markdown](https://ui.shadcn.com/docs/components/base/textarea.md)
**O que é:** o campo de texto de várias linhas.
**Para que serve:** descrições, observações e comentários.
**Quando usar:** quando o texto pode passar de uma linha. A altura automática não vem de fábrica, é
ajuste seu.

```tsx
import { Textarea } from '@/components/ui/textarea'

// a altura NÃO cresce sozinha: `rows` define o tamanho inicial, e crescimento
// automático é código seu
<Textarea rows={4} placeholder="Observações" />
```

#### input-group
[doc](https://ui.shadcn.com/docs/components/base/input-group) | [markdown](https://ui.shadcn.com/docs/components/base/input-group.md)
**O que é:** agrupamento de campo com elementos adjacentes, como prefixo, sufixo, ícone ou botão.
**Para que serve:** o campo de busca com ícone dentro, ou o campo de valor com "R$" na frente.
**Quando usar:** sempre que algo precisar ficar visualmente colado ao campo. Melhor que posicionar
ícone com CSS absoluto por cima.

```tsx
import { MagnifyingGlass } from '@phosphor-icons/react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

// ícone posicionado com `absolute` por cima do input rouba o clique e some no
// modo RTL. Aqui ele faz parte do layout.
<InputGroup>
  <InputGroupAddon><MagnifyingGlass /></InputGroupAddon>
  <InputGroupInput placeholder="Buscar post" />
</InputGroup>
```

#### input-otp
[doc](https://ui.shadcn.com/docs/components/base/input-otp) | [markdown](https://ui.shadcn.com/docs/components/base/input-otp.md)
**O que é:** o campo de código de verificação, com um quadrado por dígito, colagem e navegação entre
eles.
**Para que serve:** confirmação em duas etapas e código enviado por e-mail ou SMS.
**Quando usar:** nesses fluxos. Fazer isso na mão dá muito mais trabalho do que parece.

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

// colar o código inteiro distribui entre os quadrados, e Backspace volta para o
// anterior: é essa parte que dá trabalho na mão
<InputOTP maxLength={6} onComplete={verificar}>
  <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
</InputOTP>
```

#### native-select
[doc](https://ui.shadcn.com/docs/components/base/native-select) | [markdown](https://ui.shadcn.com/docs/components/base/native-select.md)
**O que é:** o `<select>` nativo do navegador, apenas estilizado.
**Para que serve:** seleção simples com o comportamento nativo, especialmente bom no celular.
**Quando usar:** **prefira este ao `select` customizado quando não precisar de busca ou conteúdo
rico**. É mais leve, mais acessível de graça e melhor em telas pequenas.

```tsx
import { NativeSelect } from '@/components/ui/native-select'

// no celular abre o seletor do sistema, que é melhor que qualquer lista
// customizada, e a acessibilidade vem pronta
<NativeSelect>
  <option value="ATIVO">Ativo</option>
  <option value="INATIVO">Inativo</option>
</NativeSelect>
```

#### select
[doc](https://ui.shadcn.com/docs/components/base/select) | [markdown](https://ui.shadcn.com/docs/components/base/select.md)
**O que é:** o seletor customizado, com grupos, rótulos, separadores e conteúdo livre nas opções.
**Para que serve:** seleção que precisa de mais que texto puro nas opções.
**Quando usar:** quando o nativo não bastar. Se a lista for longa, o caso é `combobox`, que tem
busca.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// justifica-se quando a opção tem MAIS que texto: ícone, badge, descrição
<Select onValueChange={setStatus}>
  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
  <SelectContent><SelectItem value="ATIVO">Ativo</SelectItem></SelectContent>
</Select>
```

#### combobox
[doc](https://ui.shadcn.com/docs/components/base/combobox) | [markdown](https://ui.shadcn.com/docs/components/base/combobox.md)
**O que é:** a combinação de campo de busca com lista de opções filtráveis.
**Para que serve:** escolher em listas longas, como país, cidade ou post.
**Quando usar:** **acima de umas vinte opções**. Sem busca, o usuário rola procurando, e a
experiência despenca.

```tsx
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// não é um componente instalável: é a receita popover + command
<Popover>
  <PopoverTrigger>{selecionada?.name ?? 'Categoria'}</PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Buscar categoria" />
      <CommandList>{categorias.map((c) => <CommandItem key={c.id}>{c.name}</CommandItem>)}</CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

#### checkbox
[doc](https://ui.shadcn.com/docs/components/base/checkbox) | [markdown](https://ui.shadcn.com/docs/components/base/checkbox.md)
**O que é:** a caixa de seleção, com suporte ao estado indeterminado.
**Para que serve:** opções independentes e seleção de linhas em tabela.
**Quando usar:** quando o usuário pode marcar zero, uma ou várias. O estado indeterminado serve para
o "selecionar todos" parcial.

```tsx
import { Checkbox } from '@/components/ui/checkbox'

// 'indeterminate' é um TERCEIRO estado, não um booleano: é o traço do
// "selecionar todos" quando só parte das linhas está marcada
<Checkbox checked={todas ? true : algumas ? 'indeterminate' : false} onCheckedChange={alternar} />
```

#### radio-group
[doc](https://ui.shadcn.com/docs/components/base/radio-group) | [markdown](https://ui.shadcn.com/docs/components/base/radio-group.md)
**O que é:** grupo de opções mutuamente exclusivas.
**Para que serve:** escolher exatamente uma entre poucas opções, todas visíveis.
**Quando usar:** com até cinco opções. Acima disso, `select` ocupa menos espaço.

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// todas as opções visíveis ao mesmo tempo: é a vantagem sobre o select, e o
// motivo de não passar de cinco
<RadioGroup defaultValue="ATIVO">
  <RadioGroupItem value="ATIVO" id="ativo" />
  <RadioGroupItem value="INATIVO" id="inativo" />
</RadioGroup>
```

#### switch
[doc](https://ui.shadcn.com/docs/components/base/switch) | [markdown](https://ui.shadcn.com/docs/components/base/switch.md)
**O que é:** o interruptor de ligar e desligar.
**Para que serve:** preferências que valem imediatamente ao clicar.
**Quando usar:** **quando o efeito é instantâneo**. Se a mudança só vale depois de clicar em
"Salvar", o certo é `checkbox`, e trocar isso confunde o usuário.

```tsx
import { Switch } from '@/components/ui/switch'

// vale AGORA: a chamada sai no próprio onCheckedChange, sem botão de salvar
<Switch checked={ativo} onCheckedChange={(v) => alternarStatus.mutate(v)} />
```

#### slider
[doc](https://ui.shadcn.com/docs/components/base/slider) | [markdown](https://ui.shadcn.com/docs/components/base/slider.md)
**O que é:** o controle deslizante, com suporte a faixa de dois valores.
**Para que serve:** escolher um número dentro de um intervalo, ou uma faixa de preço.
**Quando usar:** quando o valor aproximado basta. Se o usuário precisa do número exato, um campo
numérico é melhor.

```tsx
import { Slider } from '@/components/ui/slider'

// dois valores no array = faixa. Digitar "R$ 1.237,00" aqui é impossível, e é
// por isso que valor exato pede campo numérico.
<Slider value={faixa} onValueChange={setFaixa} min={0} max={5000} step={50} />
```

#### label
[doc](https://ui.shadcn.com/docs/components/base/label) | [markdown](https://ui.shadcn.com/docs/components/base/label.md)
**O que é:** o rótulo associado a um campo, com o vínculo de acessibilidade correto.
**Para que serve:** clicar no rótulo focar o campo, e o leitor de tela anunciar o campo certo.
**Quando usar:** em todo campo. Sem rótulo associado, o formulário é inacessível.

```tsx
import { Label } from '@/components/ui/label'

// htmlFor precisa bater com o id: é esse par que faz o clique focar o campo e
// o leitor de tela anunciar o nome certo
<Label htmlFor="document">documento</Label>
<Input id="document" />
```

#### field
[doc](https://ui.shadcn.com/docs/components/base/field) | [markdown](https://ui.shadcn.com/docs/components/base/field.md)
**O que é:** o invólucro que junta rótulo, campo, texto de ajuda e mensagem de erro.
**Para que serve:** a estrutura completa de um campo, com os vínculos de acessibilidade prontos.
**Quando usar:** **é a peça central dos formulários**. Use junto com a integração de formulário, e
você não escreve nem um `aria-` na mão.

```tsx
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'

// os aria-describedby e aria-invalid saem prontos: erro e ajuda ficam
// anunciados pelo leitor de tela sem nenhum atributo escrito à mão
<Field>
  <FieldLabel>documento</FieldLabel>
  <Input />
  <FieldDescription>Somente números</FieldDescription>
  <FieldError>{erros.document?.message}</FieldError>
</Field>
```

#### questionnaire
[doc](https://ui.shadcn.com/docs/components/base/questionnaire) | [markdown](https://ui.shadcn.com/docs/components/base/questionnaire.md)
**O que é:** o questionário de várias etapas, uma pergunta por tela, com escolha única, múltipla,
resposta livre, pular e barra de progresso.
**Para que serve:** onboarding, pesquisa e triagem, sem montar a navegação entre passos na mão.
**Quando usar:** quando as perguntas são **sequenciais e dependentes**. Formulário comum, com tudo
visível de uma vez, continua sendo `field` mais `react-hook-form` — este aqui esconde os campos, e
esconder campo é custo, não recurso.

```tsx
import { Questionnaire, QuestionnaireItem, QuestionnaireNext } from '@/components/ui/questionnaire'

// o componente estilizado usa nomes achatados; a primitiva de
// @shadcn/react usa namespace. A referência de props está na primitiva.
<Questionnaire items={perguntas} onSubmit={enviar}>
  <QuestionnaireItem name="objetivo" />
  <QuestionnaireNext />
</Questionnaire>
```

#### calendar
[doc](https://ui.shadcn.com/docs/components/base/calendar) | [markdown](https://ui.shadcn.com/docs/components/base/calendar.md)
**O que é:** o calendário, com seleção de dia único, de vários dias e de intervalo.
**Para que serve:** a grade de datas em si.
**Quando usar:** embutido na página. Para um campo de formulário, use `date-picker`, que já combina
calendário com `popover`.

```tsx
import { Calendar } from '@/components/ui/calendar'
import { ptBR } from 'date-fns/locale'

// sem `locale`, os dias da semana e os meses saem em inglês
<Calendar mode="range" selected={periodo} onSelect={setPeriodo} locale={ptBR} />
```

#### date-picker
[doc](https://ui.shadcn.com/docs/components/base/date-picker) | [markdown](https://ui.shadcn.com/docs/components/base/date-picker.md)
**O que é:** o campo de data, que abre o calendário num popover.
**Para que serve:** entrada de data em formulário.
**Quando usar:** em todo campo de data. Cuidado com fuso horário na conversão: é a fonte de bug mais
comum com datas.

```tsx
// o Date do calendário é MEIA-NOITE LOCAL. `toISOString()` converte para UTC e,
// no fuso do Brasil, joga a data para o dia anterior.
import { format } from 'date-fns'

const paraApi = format(data, 'yyyy-MM-dd') // certo: sem passar por UTC
// const errado = data.toISOString().split('T')[0] // 2026-07-31 vira 2026-07-30
```

## Componentes: ação e navegação

#### button
[doc](https://ui.shadcn.com/docs/components/base/button) | [markdown](https://ui.shadcn.com/docs/components/base/button.md)
**O que é:** o botão, com variantes (`default`, `secondary`, `destructive`, `outline`, `ghost`,
`link`) e tamanhos, mais o `asChild` para virar outro elemento.
**Para que serve:** toda ação clicável.
**Quando usar:** o componente mais usado do catálogo. **`asChild` é o truque importante**: permite
que um `<Link>` do roteador tenha a aparência de botão sem aninhar `<a>` dentro de `<button>`.

```tsx
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// asChild: o estilo vai para o <a> do Link. Sem ele, sairia um <a> dentro de
// <button>, que é HTML inválido e quebra o clique do meio e o "abrir em nova aba"
<Button asChild variant="outline">
  <Link to="/users/$id" params={{ id }}>Ver user</Link>
</Button>
```

#### button-group
[doc](https://ui.shadcn.com/docs/components/base/button-group) | [markdown](https://ui.shadcn.com/docs/components/base/button-group.md)
**O que é:** botões agrupados visualmente, com as bordas unidas.
**Para que serve:** ações relacionadas lado a lado, ou um botão com menu suspenso anexado.
**Quando usar:** em barras de ação. Se as opções são mutuamente exclusivas, o certo é `toggle-group`.

```tsx
import { ButtonGroup } from '@/components/ui/button-group'

// AÇÕES, não estados: cada botão faz algo. Se fosse escolher entre modos de
// visualização, seria toggle-group.
<ButtonGroup>
  <Button variant="outline">Salvar</Button>
  <Button variant="outline">Salvar e novo</Button>
</ButtonGroup>
```

#### toggle
[doc](https://ui.shadcn.com/docs/components/base/toggle) | [markdown](https://ui.shadcn.com/docs/components/base/toggle.md)
**O que é:** um botão de dois estados, pressionado ou não.
**Para que serve:** ações do tipo negrito e itálico numa barra de formatação.
**Quando usar:** em barra de ferramentas. Para uma preferência, `switch` comunica melhor.

```tsx
import { TextB } from '@phosphor-icons/react'
import { Toggle } from '@/components/ui/toggle'

// `pressed` vira aria-pressed: o leitor de tela anuncia o estado
<Toggle pressed={negrito} onPressedChange={setNegrito} aria-label="Negrito">
  <TextB />
</Toggle>
```

#### toggle-group
[doc](https://ui.shadcn.com/docs/components/base/toggle-group) | [markdown](https://ui.shadcn.com/docs/components/base/toggle-group.md)
**O que é:** um conjunto de toggles, com seleção única ou múltipla.
**Para que serve:** alternar entre modos de visualização, como lista e grade.
**Quando usar:** quando as opções são poucas e cabem lado a lado.

```tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// type="single" garante exclusividade; "multiple" permite combinar
<ToggleGroup type="single" value={modo} onValueChange={setModo}>
  <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
  <ToggleGroupItem value="grade">Grade</ToggleGroupItem>
</ToggleGroup>
```

#### dropdown-menu
[doc](https://ui.shadcn.com/docs/components/base/dropdown-menu) | [markdown](https://ui.shadcn.com/docs/components/base/dropdown-menu.md)
**O que é:** o menu suspenso, com submenus, itens de seleção, itens de rádio, separadores e atalhos.
**Para que serve:** o menu de três pontinhos com as ações de uma linha ou de um card.
**Quando usar:** para ações secundárias. Manter só a ação principal visível e o resto no menu deixa a
interface bem mais limpa.

```tsx
import { DotsThree } from '@phosphor-icons/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger aria-label="Ações"><DotsThree /></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Editar</DropdownMenuItem>
    {/* a variante destrutiva pinta o item de vermelho e separa visualmente */}
    <DropdownMenuItem variant="destructive">Remover</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### context-menu
[doc](https://ui.shadcn.com/docs/components/base/context-menu) | [markdown](https://ui.shadcn.com/docs/components/base/context-menu.md)
**O que é:** o menu do clique direito.
**Para que serve:** atalhos avançados sem ocupar espaço na tela.
**Quando usar:** como **complemento**, nunca como único caminho para uma ação. No celular ele não
existe.

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'

// no toque não há clique direito: TODA ação daqui precisa existir também no
// menu de três pontinhos, senão é inacessível no celular
<ContextMenu>
  <ContextMenuTrigger>{linha}</ContextMenuTrigger>
  <ContextMenuContent><ContextMenuItem>Duplicar</ContextMenuItem></ContextMenuContent>
</ContextMenu>
```

#### menubar
[doc](https://ui.shadcn.com/docs/components/base/menubar) | [markdown](https://ui.shadcn.com/docs/components/base/menubar.md)
**O que é:** a barra de menus horizontal, no estilo de aplicativo de desktop (Arquivo, Editar, Ver).
**Para que serve:** aplicações densas, com muitos comandos.
**Quando usar:** raro na web. Só em ferramentas do tipo editor.

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'

// só se justifica com dezenas de comandos. Num painel comum, sidebar mais
// dropdown cobre tudo com menos peso.
<Menubar>
  <MenubarMenu>
    <MenubarTrigger>Arquivo</MenubarTrigger>
    <MenubarContent><MenubarItem>Exportar</MenubarItem></MenubarContent>
  </MenubarMenu>
</Menubar>
```

#### navigation-menu
[doc](https://ui.shadcn.com/docs/components/base/navigation-menu) | [markdown](https://ui.shadcn.com/docs/components/base/navigation-menu.md)
**O que é:** o menu de navegação principal, com painéis suspensos.
**Para que serve:** o cabeçalho de site com submenus grandes.
**Quando usar:** em site institucional e de marketing. Para painel administrativo, `sidebar` é a
escolha usual.

```tsx
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

// pensado para navegação PÚBLICA, com painéis largos e conteúdo promocional.
// Num painel autenticado, a sidebar comunica hierarquia bem melhor.
<NavigationMenu>
  <NavigationMenuItem>
    <NavigationMenuTrigger>Posts</NavigationMenuTrigger>
    <NavigationMenuContent>{destaques}</NavigationMenuContent>
  </NavigationMenuItem>
</NavigationMenu>
```

#### sidebar
[doc](https://ui.shadcn.com/docs/components/base/sidebar) | [markdown](https://ui.shadcn.com/docs/components/base/sidebar.md)
**O que é:** a barra lateral completa: recolhível, responsiva, com grupos, submenus, rodapé e
persistência do estado.
**Para que serve:** a navegação principal de um painel administrativo.
**Quando usar:** **em qualquer painel**. É um dos componentes mais completos do catálogo, e refazer
isso na mão custa dias.

```tsx
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar'

// o provider guarda o estado recolhido em cookie: sobrevive ao F5 e ao SSR
<SidebarProvider>
  <Sidebar collapsible="icon">
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuButton asChild><Link to="/users/">Users</Link></SidebarMenuButton>
      </SidebarMenu>
    </SidebarContent>
  </Sidebar>
</SidebarProvider>
```

#### breadcrumb
[doc](https://ui.shadcn.com/docs/components/base/breadcrumb) | [markdown](https://ui.shadcn.com/docs/components/base/breadcrumb.md)
**O que é:** a trilha de navegação hierárquica, com colapso quando há níveis demais.
**Para que serve:** mostrar onde o usuário está e permitir subir níveis.
**Quando usar:** em hierarquias de três ou mais níveis. Em navegação rasa, é ruído.

```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'

// a página ATUAL não é link: BreadcrumbPage marca aria-current e evita o link
// que não leva a lugar nenhum
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink asChild><Link to="/users/">Users</Link></BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbItem><BreadcrumbPage>Acme</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

#### pagination
[doc](https://ui.shadcn.com/docs/components/base/pagination) | [markdown](https://ui.shadcn.com/docs/components/base/pagination.md)
**O que é:** os controles de paginação, com anterior, próximo e números de página.
**Para que serve:** navegar entre páginas de uma listagem.
**Quando usar:** com listagens paginadas. Ligue os links ao estado da URL para o botão voltar
funcionar.

```tsx
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'

// link de verdade, com a página na URL: botão voltar funciona e o link é
// compartilhável. Com onClick e useState, nada disso acontece.
<PaginationItem>
  <PaginationLink asChild>
    <Link to="/posts/" search={{ page: 2 }}>2</Link>
  </PaginationLink>
</PaginationItem>
```

#### tabs
[doc](https://ui.shadcn.com/docs/components/base/tabs) | [markdown](https://ui.shadcn.com/docs/components/base/tabs.md)
**O que é:** abas com navegação por teclado e painéis associados.
**Para que serve:** dividir conteúdo relacionado sem trocar de página.
**Quando usar:** quando o conteúdo é de fato paralelo. **Guarde a aba ativa na URL**, senão recarregar
a página joga o usuário de volta na primeira aba.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// a aba ativa vem do search param: F5 e link compartilhado preservam a aba
const { aba } = Route.useSearch()
<Tabs value={aba} onValueChange={(v) => navigate({ search: { aba: v } })}>
  <TabsList><TabsTrigger value="dados">Dados</TabsTrigger></TabsList>
  <TabsContent value="dados">{conteudo}</TabsContent>
</Tabs>
```

## Componentes: sobreposição

#### dialog
[doc](https://ui.shadcn.com/docs/components/base/dialog) | [markdown](https://ui.shadcn.com/docs/components/base/dialog.md)
**O que é:** o modal, com foco preso dentro dele, fechamento por Esc e sobreposição escurecida.
**Para que serve:** formulário ou conteúdo que exige atenção sem sair da página.
**Quando usar:** para interações curtas. Formulário longo em modal é desconfortável, prefira página.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// DialogTitle é obrigatório para acessibilidade: sem ele, o leitor de tela
// anuncia um diálogo sem nome
<Dialog>
  <DialogTrigger asChild><Button>Nova categoria</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
    {formulario}
  </DialogContent>
</Dialog>
```

#### alert-dialog
[doc](https://ui.shadcn.com/docs/components/base/alert-dialog) | [markdown](https://ui.shadcn.com/docs/components/base/alert-dialog.md)
**O que é:** o modal de confirmação, que **não fecha ao clicar fora** e exige uma escolha explícita.
**Para que serve:** confirmar ação destrutiva.
**Quando usar:** **em toda remoção**. A diferença para o `dialog` é justamente não permitir descartar
por acidente, e usar o componente errado aqui é um risco real.

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTitle } from '@/components/ui/alert-dialog'

// clicar fora NÃO fecha: a escolha precisa ser explícita. Com Dialog comum, um
// clique fora "cancela" e o usuário nunca sabe se removeu ou não.
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>Remover o team Acme?</AlertDialogTitle>
    <AlertDialogCancel>Cancelar</AlertDialogCancel>
    <AlertDialogAction onClick={() => remover.mutate(id)}>Remover</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

#### drawer
[doc](https://ui.shadcn.com/docs/components/base/drawer) | [markdown](https://ui.shadcn.com/docs/components/base/drawer.md)
**O que é:** o painel que sobe a partir da borda inferior, com gesto de arrastar.
**Para que serve:** o equivalente do modal no celular, com ergonomia de toque.
**Quando usar:** em telas pequenas. O padrão comum é `dialog` no desktop e `drawer` no celular.

```tsx
import { useMediaQuery } from '@/hooks/use-media-query'

// o padrão responsivo: mesmo conteúdo, contêiner diferente por tamanho de tela
const desktop = useMediaQuery('(min-width: 768px)')
const Container = desktop ? Dialog : Drawer
return <Container>{conteudo}</Container>
```

#### sheet
[doc](https://ui.shadcn.com/docs/components/base/sheet) | [markdown](https://ui.shadcn.com/docs/components/base/sheet.md)
**O que é:** o painel lateral deslizante, ancorável nos quatro lados.
**Para que serve:** filtros, detalhes e formulários auxiliares sem perder o contexto da tela atual.
**Quando usar:** quando o usuário precisa ver a lista atrás enquanto edita algo. Muito usado para
painel de filtros.

```tsx
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

// a lista continua visível atrás: é a diferença prática para o dialog, que
// escurece e tira o contexto
<Sheet>
  <SheetTrigger asChild><Button variant="outline">Filtros</Button></SheetTrigger>
  <SheetContent side="right"><SheetTitle>Filtros</SheetTitle>{campos}</SheetContent>
</Sheet>
```

#### popover
[doc](https://ui.shadcn.com/docs/components/base/popover) | [markdown](https://ui.shadcn.com/docs/components/base/popover.md)
**O que é:** um balão flutuante com conteúdo interativo, posicionado em relação a um gatilho.
**Para que serve:** conteúdo rico que aparece ao clicar, como um seletor de cor ou um mini
formulário.
**Quando usar:** quando o conteúdo é **interativo**. Se for só um texto explicativo, use `tooltip`.

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// abre por CLIQUE e o conteúdo é focável: tooltip não serve para nada que o
// usuário precise clicar ou digitar
<Popover>
  <PopoverTrigger asChild><Button variant="ghost">Período</Button></PopoverTrigger>
  <PopoverContent><Calendar mode="range" /></PopoverContent>
</Popover>
```

#### hover-card
[doc](https://ui.shadcn.com/docs/components/base/hover-card) | [markdown](https://ui.shadcn.com/docs/components/base/hover-card.md)
**O que é:** um cartão que aparece ao passar o mouse, com conteúdo mais rico que um tooltip.
**Para que serve:** prévia de perfil ou de link, sem clique.
**Quando usar:** só como enfeite informativo. **Não coloque nada essencial ali**, porque no toque não
existe passar o mouse.

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

// no celular este conteúdo NUNCA aparece: só prévia, nunca informação ou ação
// que o usuário precise
<HoverCard>
  <HoverCardTrigger>{user.name}</HoverCardTrigger>
  <HoverCardContent>{user.document}</HoverCardContent>
</HoverCard>
```

#### tooltip
[doc](https://ui.shadcn.com/docs/components/base/tooltip) | [markdown](https://ui.shadcn.com/docs/components/base/tooltip.md)
**O que é:** a dica de texto curta que aparece ao passar o mouse ou focar.
**Para que serve:** explicar um ícone sem rótulo.
**Quando usar:** em botão só de ícone, sempre. Vale lembrar que tooltip não substitui rótulo
acessível, o `aria-label` continua necessário.

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// o aria-label continua obrigatório: o tooltip é visual, e o leitor de tela
// anuncia o aria-label
<Tooltip>
  <TooltipTrigger asChild>
    <Button size="icon" aria-label="Remover"><Trash /></Button>
  </TooltipTrigger>
  <TooltipContent>Remover</TooltipContent>
</Tooltip>
```

#### command
[doc](https://ui.shadcn.com/docs/components/base/command) | [markdown](https://ui.shadcn.com/docs/components/base/command.md)
**O que é:** a paleta de comandos com busca, no estilo Cmd+K, com grupos e atalhos.
**Para que serve:** navegação e ações rápidas por teclado.
**Quando usar:** em aplicações densas, para usuários frequentes. É também a base do `combobox`.

```tsx
import { CommandDialog, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

// o atalho é código seu: o componente não registra listener de teclado
useEffect(() => {
  const h = (e: KeyboardEvent) => e.key === 'k' && e.metaKey && setAberto(true)
  document.addEventListener('keydown', h)
  return () => document.removeEventListener('keydown', h)
}, [])
```

## Componentes: exibição de dados

#### table
[doc](https://ui.shadcn.com/docs/components/base/table) | [markdown](https://ui.shadcn.com/docs/components/base/table.md)
**O que é:** os componentes de tabela estilizados: cabeçalho, corpo, linha, célula, legenda.
**Para que serve:** a marcação semântica de tabela, com aparência consistente.
**Quando usar:** para tabelas simples, sem ordenação nem filtro. Com essas features, veja
`data-table`.

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// só marcação e estilo: ordenar, filtrar e paginar é com o TanStack Table
<Table>
  <TableHeader><TableRow><TableHead>User</TableHead></TableRow></TableHeader>
  <TableBody>{linhas.map((l) => <TableRow key={l.id}><TableCell>{l.name}</TableCell></TableRow>)}</TableBody>
</Table>
```

#### data-table
[doc](https://ui.shadcn.com/docs/components/base/data-table) | [markdown](https://ui.shadcn.com/docs/components/base/data-table.md)
**O que é:** a receita de tabela completa, combinando os componentes de tabela com o TanStack Table:
ordenação, filtro, paginação, seleção e visibilidade de colunas.
**Para que serve:** a listagem de verdade de um painel administrativo.
**Quando usar:** **em toda listagem com filtro ou ordenação**. É um guia para copiar e adaptar, não
um componente instalável, e por isso vale ler com atenção antes de sair colando.

```tsx
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

// `shadcn add data-table` NÃO existe: é código para copiar e adaptar.
// O motor é o TanStack Table; os componentes de <Table> só desenham.
const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

// com paginação no SERVIDOR, use manualPagination e mande a página pela URL,
// senão a tabela pagina só o que já está em memória
```

#### chart
[doc](https://ui.shadcn.com/docs/components/base/chart) | [markdown](https://ui.shadcn.com/docs/components/base/chart.md)
**O que é:** os componentes de gráfico sobre Recharts, com tema, tooltip e legenda integrados ao
sistema de cores.
**Para que serve:** gráficos que combinam com o resto da interface e respeitam o modo escuro.
**Quando usar:** em dashboards. Usar Recharts direto funciona, mas aí a cor do gráfico não segue o
tema.

```tsx
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'

// as cores saem do config, que aponta para variáveis CSS: o gráfico troca
// junto com o tema, sem hex escrito no componente
const config = { total: { label: 'Total', color: 'var(--chart-1)' } }
<ChartContainer config={config}><BarChart data={dados}><ChartTooltip /></BarChart></ChartContainer>
```

#### badge
[doc](https://ui.shadcn.com/docs/components/base/badge) | [markdown](https://ui.shadcn.com/docs/components/base/badge.md)
**O que é:** o rótulo pequeno, com variantes de cor.
**Para que serve:** status, categoria e contagem.
**Quando usar:** em tabelas e cards, para status. Mapeie o valor do status para a variante num lugar
só, em vez de repetir o `if` em cada tela.

```tsx
import { Badge } from '@/components/ui/badge'

// um lookup, não um if espalhado por tela: status novo se resolve num lugar só
const VARIANTE = { ATIVO: 'default', INATIVO: 'secondary', REMOVIDO: 'destructive' } as const

<Badge variant={VARIANTE[user.status]}>{user.status}</Badge>
```

#### avatar
[doc](https://ui.shadcn.com/docs/components/base/avatar) | [markdown](https://ui.shadcn.com/docs/components/base/avatar.md)
**O que é:** a imagem de perfil circular, com fallback de iniciais quando a imagem falha.
**Para que serve:** representar usuário ou user.
**Quando usar:** em cabeçalho, listagem e comentários. O fallback evita o ícone de imagem quebrada.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// o fallback cobre os dois casos: sem avatar e com URL quebrada
<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
</Avatar>
```

#### card
[doc](https://ui.shadcn.com/docs/components/base/card) | [markdown](https://ui.shadcn.com/docs/components/base/card.md)
**O que é:** o contêiner com cabeçalho, título, descrição, conteúdo e rodapé.
**Para que serve:** agrupar informação relacionada num bloco visual.
**Quando usar:** em toda parte. Cuidado com card dentro de card dentro de card, que polui mais do
que organiza.

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// card dentro de card multiplica bordas e sombras: use separator ou espaçamento
// para dividir seções INTERNAS
<Card>
  <CardHeader><CardTitle>Acme</CardTitle><CardDescription>12.345.678/0001-99</CardDescription></CardHeader>
  <CardContent>{detalhes}</CardContent>
</Card>
```

#### typography
[doc](https://ui.shadcn.com/docs/components/base/typography) | [markdown](https://ui.shadcn.com/docs/components/base/typography.md)
**O que é:** o conjunto de classes para título, parágrafo, citação, lista, tabela e código.
**Para que serve:** texto com hierarquia consistente sem decidir tamanho caso a caso.
**Quando usar:** **não é componente instalável**, é uma página de receitas para copiar — `shadcn add
typography` não existe. Serve para texto que você escreve no JSX; para conteúdo longo vindo de
markdown, o contêiner de `typeset` resolve com uma classe só.

```tsx
// as classes vão no elemento, uma por vez. Repetir isto em 40 parágrafos é o
// sinal de que o caso era o contêiner de tipografia, não este.
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Título</h1>
<p className="leading-7 [&:not(:first-child)]:mt-6">Parágrafo.</p>
```

#### item
[doc](https://ui.shadcn.com/docs/components/base/item) | [markdown](https://ui.shadcn.com/docs/components/base/item.md)
**O que é:** o item de lista estruturado, com área de mídia, conteúdo e ações.
**Para que serve:** listas com ícone à esquerda, texto no meio e ação à direita.
**Quando usar:** em listas de configurações e de resultados. Evita remontar esse layout de flexbox
toda vez.

```tsx
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item'

// o layout ícone / texto / ação já vem resolvido, inclusive o truncamento do
// texto longo no meio
<Item>
  <ItemMedia><Buildings /></ItemMedia>
  <ItemContent><ItemTitle>Acme</ItemTitle></ItemContent>
  <ItemActions><Button size="sm">Ver</Button></ItemActions>
</Item>
```

#### empty
[doc](https://ui.shadcn.com/docs/components/base/empty) | [markdown](https://ui.shadcn.com/docs/components/base/empty.md)
**O que é:** o estado vazio, com ícone, título, descrição e ação.
**Para que serve:** transformar "nenhum resultado" em algo útil, com um caminho de saída.
**Quando usar:** **em toda listagem**. Estado vazio é a parte mais esquecida de uma tela e a que mais
frustra quem chega primeiro no sistema.

```tsx
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'

// os dois casos pedem textos DIFERENTES: "ainda não há nada" convida a criar,
// "o filtro não achou nada" convida a limpar o filtro
{dados.length === 0 && (
  <Empty>
    <EmptyTitle>Nenhum post ainda</EmptyTitle>
    <EmptyDescription>Cadastre o primeiro para ele aparecer aqui.</EmptyDescription>
    <Button>Novo post</Button>
  </Empty>
)}
```

#### skeleton
[doc](https://ui.shadcn.com/docs/components/base/skeleton) | [markdown](https://ui.shadcn.com/docs/components/base/skeleton.md)
**O que é:** o bloco cinza que representa o conteúdo enquanto carrega.
**Para que serve:** carregamento que preserva o layout, evitando o pulo quando o conteúdo chega.
**Quando usar:** para carregamento inicial. Desenhe o esqueleto parecido com o conteúdo real, senão
o pulo continua.

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// as MEDIDAS precisam bater com o conteúdo real: esqueleto de 3 linhas para um
// card de 8 pula do mesmo jeito, e aí ele não serviu para nada
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
</div>
```

#### spinner
[doc](https://ui.shadcn.com/docs/components/base/spinner) | [markdown](https://ui.shadcn.com/docs/components/base/spinner.md)
**O que é:** o indicador circular de carregamento.
**Para que serve:** sinalizar processamento em espaços pequenos, como dentro de um botão.
**Quando usar:** em botão durante o envio. Para carregar uma tela inteira, `skeleton` é melhor.

```tsx
import { Spinner } from '@/components/ui/spinner'

// desabilitar junto evita o envio duplo por clique impaciente
<Button disabled={mutation.isPending}>
  {mutation.isPending && <Spinner className="mr-2" />}
  Salvar
</Button>
```

#### progress
[doc](https://ui.shadcn.com/docs/components/base/progress) | [markdown](https://ui.shadcn.com/docs/components/base/progress.md)
**O que é:** a barra de progresso, determinada ou indeterminada.
**Para que serve:** mostrar avanço mensurável.
**Quando usar:** em upload e processamento com percentual conhecido. Sem percentual, `spinner`.

```tsx
import { Progress } from '@/components/ui/progress'

// barra sem percentual real (fake progress) mente para o usuário: sem número
// confiável, spinner é mais honesto
<Progress value={(enviados / total) * 100} />
```

#### separator
[doc](https://ui.shadcn.com/docs/components/base/separator) | [markdown](https://ui.shadcn.com/docs/components/base/separator.md)
**O que é:** a linha divisória, horizontal ou vertical, com semântica correta.
**Para que serve:** separar seções visualmente.
**Quando usar:** entre grupos de conteúdo. Marque como decorativo quando for só visual, para o leitor
de tela não anunciar.

```tsx
import { Separator } from '@/components/ui/separator'

// decorative: some da árvore de acessibilidade. Sem isso, o leitor de tela
// anuncia cada linha como um marco de seção.
<Separator decorative orientation="vertical" className="h-6" />
```

#### aspect-ratio
[doc](https://ui.shadcn.com/docs/components/base/aspect-ratio) | [markdown](https://ui.shadcn.com/docs/components/base/aspect-ratio.md)
**O que é:** o contêiner que mantém uma proporção fixa.
**Para que serve:** imagens e vídeos que não deformam o layout ao carregar.
**Quando usar:** em galerias e capas. Evita o pulo de layout quando a imagem chega.

```tsx
import { AspectRatio } from '@/components/ui/aspect-ratio'

// o espaço é reservado ANTES da imagem carregar: sem isso a grade inteira
// pula quando as fotos chegam
<AspectRatio ratio={4 / 3}>
  <img src={post.imagemUrl} alt={post.name} className="h-full w-full object-cover" />
</AspectRatio>
```

#### scroll-area
[doc](https://ui.shadcn.com/docs/components/base/scroll-area) | [markdown](https://ui.shadcn.com/docs/components/base/scroll-area.md)
**O que é:** a área rolável com barra de rolagem customizada e consistente entre navegadores.
**Para que serve:** rolagem interna sem a barra nativa feia do Windows.
**Quando usar:** em listas dentro de painéis e modais. Confira o comportamento no celular antes de
adotar em tudo.

```tsx
import { ScrollArea } from '@/components/ui/scroll-area'

// exige ALTURA definida: sem h- ou max-h, não há o que rolar e o componente
// não faz nada
<ScrollArea className="h-72">{itens}</ScrollArea>
```

#### collapsible
[doc](https://ui.shadcn.com/docs/components/base/collapsible) | [markdown](https://ui.shadcn.com/docs/components/base/collapsible.md)
**O que é:** uma seção que abre e fecha, sem a coordenação de grupo do accordion.
**Para que serve:** esconder detalhes opcionais.
**Quando usar:** para um bloco isolado. Com vários itens coordenados, use `accordion`.

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// um bloco só, sem coordenação com vizinhos: "filtros avançados" é o caso
// clássico
<Collapsible>
  <CollapsibleTrigger>Filtros avançados</CollapsibleTrigger>
  <CollapsibleContent>{campos}</CollapsibleContent>
</Collapsible>
```

#### accordion
[doc](https://ui.shadcn.com/docs/components/base/accordion) | [markdown](https://ui.shadcn.com/docs/components/base/accordion.md)
**O que é:** vários painéis retráteis coordenados, com modo de um aberto por vez ou vários.
**Para que serve:** perguntas frequentes e formulários longos em seções.
**Quando usar:** com conteúdo em seções mutuamente exclusivas. Não esconda campo obrigatório dentro
de accordion fechado.

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// campo obrigatório escondido aqui gera o pior erro de formulário: o usuário
// envia, falha, e não enxerga onde está o campo inválido
<Accordion type="single" collapsible>
  <AccordionItem value="entrega">
    <AccordionTrigger>Entrega</AccordionTrigger>
    <AccordionContent>{camposOpcionais}</AccordionContent>
  </AccordionItem>
</Accordion>
```

#### carousel
[doc](https://ui.shadcn.com/docs/components/base/carousel) | [markdown](https://ui.shadcn.com/docs/components/base/carousel.md)
**O que é:** o carrossel sobre Embla, com gesto de arrastar e navegação por teclado.
**Para que serve:** galeria de imagens e destaques.
**Quando usar:** em galeria de post. Para conteúdo importante, carrossel esconde informação, e
grade costuma servir melhor.

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

// só o primeiro slide é visto pela maioria: nada essencial a partir do segundo
<Carousel>
  <CarouselContent>{fotos.map((f) => <CarouselItem key={f.id}><img src={f.url} alt="" /></CarouselItem>)}</CarouselContent>
  <CarouselPrevious /><CarouselNext />
</Carousel>
```

#### resizable
[doc](https://ui.shadcn.com/docs/components/base/resizable) | [markdown](https://ui.shadcn.com/docs/components/base/resizable.md)
**O que é:** painéis com divisórias arrastáveis, horizontais e verticais.
**Para que serve:** layouts em que o usuário ajusta a proporção, como lista e prévia.
**Quando usar:** em ferramentas do tipo editor ou cliente de e-mail. Salve as proporções, senão o
usuário reajusta toda vez.

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

// autoSaveId persiste as proporções: sem ele, o usuário reajusta a cada visita
<ResizablePanelGroup direction="horizontal" autoSaveId="painel-posts">
  <ResizablePanel defaultSize={30}>{lista}</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>{previa}</ResizablePanel>
</ResizablePanelGroup>
```

#### toast
[doc](https://ui.shadcn.com/docs/components/base/toast) | [markdown](https://ui.shadcn.com/docs/components/base/toast.md)
**O que é:** a notificação temporária de canto, com título, descrição e ação.
**Para que serve:** confirmar que a ação deu certo sem interromper o fluxo.
**Quando usar:** depois de salvar, remover ou copiar. **Não use para erro que exige leitura atenta**,
porque ele some sozinho.

```tsx
import { toast } from 'sonner'

toast.success('User aprovada')

// erro que o usuário PRECISA ler e agir some em 4 segundos: esse caso é alert
// fixo na tela, não toast
toast.error('Falha ao salvar', { action: { label: 'Tentar de novo', onClick: salvar } })
```

#### alert
[doc](https://ui.shadcn.com/docs/components/base/alert) | [markdown](https://ui.shadcn.com/docs/components/base/alert.md)
**O que é:** o aviso fixo dentro do conteúdo, com variantes de destaque.
**Para que serve:** informação persistente e contextual, como um erro de formulário ou um aviso de
conta pendente.
**Quando usar:** quando a mensagem precisa **ficar** na tela. É o complemento do toast, não o
concorrente.

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// fica na tela enquanto a condição existir: é o certo para estado, e não para
// confirmação de ação
{user.status === 'INATIVO' && (
  <Alert variant="destructive">
    <AlertTitle>Cadastro em análise</AlertTitle>
    <AlertDescription>Sua user ainda não foi aprovada.</AlertDescription>
  </Alert>
)}
```

#### kbd
[doc](https://ui.shadcn.com/docs/components/base/kbd) | [markdown](https://ui.shadcn.com/docs/components/base/kbd.md)
**O que é:** a representação visual de uma tecla ou combinação.
**Para que serve:** documentar atalhos dentro da interface.
**Quando usar:** em menus e na paleta de comandos, ao lado da ação correspondente.

```tsx
import { Kbd } from '@/components/ui/kbd'

// o símbolo muda por sistema: ⌘ no macOS, Ctrl no resto. Fixar um confunde
// metade dos usuários.
<Kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</Kbd>
<Kbd>K</Kbd>
```

#### marker
[doc](https://ui.shadcn.com/docs/components/base/marker) | [markdown](https://ui.shadcn.com/docs/components/base/marker.md)
**O que é:** um marcador visual para destacar ou anotar um trecho da interface.
**Para que serve:** chamar atenção para um ponto específico.
**Quando usar:** em tour guiado e destaque de novidade.

```tsx
import { Marker } from '@/components/ui/marker'

// destaque de novidade precisa de VALIDADE: guarde que o usuário já viu, senão
// vira poluição permanente
{!viuNovidade && <Marker>Novo</Marker>}
```

#### direction
[doc](https://ui.shadcn.com/docs/components/base/direction) | [markdown](https://ui.shadcn.com/docs/components/base/direction.md)
**O que é:** o provedor de direção do texto, para idiomas da direita para a esquerda.
**Para que serve:** os componentes se adaptarem a árabe e hebraico.
**Quando usar:** só em app com idioma RTL.

```tsx
import { DirectionProvider } from '@/components/ui/direction'

// posicionamento de menu, popover e sheet inverte junto. Sem o provider, o
// menu abre para o lado errado no RTL.
<DirectionProvider dir="rtl">{app}</DirectionProvider>
```

## Componentes: conversa

#### bubble
[doc](https://ui.shadcn.com/docs/components/base/bubble) | [markdown](https://ui.shadcn.com/docs/components/base/bubble.md)
**O que é:** o balão de mensagem, com variantes de remetente.
**Para que serve:** a bolha de fala numa conversa.
**Quando usar:** em interface de chat.

```tsx
import { Bubble } from '@/components/ui/bubble'

// a variante decide alinhamento e cor: quem enviou fica de um lado, quem
// recebeu do outro, sem CSS condicional espalhado
<Bubble variant={mensagem.deMim ? 'sent' : 'received'}>{mensagem.texto}</Bubble>
```

#### message
[doc](https://ui.shadcn.com/docs/components/base/message) | [markdown](https://ui.shadcn.com/docs/components/base/message.md)
**O que é:** a mensagem completa, com autor, conteúdo, horário e ações.
**Para que serve:** o item de uma lista de conversa.
**Quando usar:** em chat e em assistente de IA.

```tsx
import { Message, MessageContent, MessageHeader } from '@/components/ui/message'

// o Bubble é só o balão; Message é a linha inteira, com autor, horário e ações
<Message>
  <MessageHeader>{m.autor}</MessageHeader>
  <MessageContent>{m.texto}</MessageContent>
</Message>
```

#### message-scroller
[doc](https://ui.shadcn.com/docs/components/base/message-scroller) | [markdown](https://ui.shadcn.com/docs/components/base/message-scroller.md)
**O que é:** o contêiner rolável de mensagens, que fixa no fim mas respeita a rolagem manual do
usuário.
**Para que serve:** o comportamento de rolagem que todo chat precisa e quase ninguém acerta de
primeira.
**Quando usar:** em qualquer lista de mensagens, especialmente com streaming.

```tsx
import { MessageScroller } from '@/components/ui/message-scroller'

// com streaming a lista cresce a cada token: sem este componente, ou a tela
// não acompanha, ou ela arranca o usuário do trecho que ele estava lendo
<MessageScroller>{mensagens.map((m) => <Message key={m.id} {...m} />)}</MessageScroller>
```

#### attachment
[doc](https://ui.shadcn.com/docs/components/base/attachment) | [markdown](https://ui.shadcn.com/docs/components/base/attachment.md)
**O que é:** a exibição de arquivo anexado, com ícone por tipo, nome, tamanho e remoção.
**Para que serve:** listar anexos antes ou depois do envio.
**Quando usar:** em formulário com upload e em conversa com arquivos.

```tsx
import { Attachment } from '@/components/ui/attachment'

// mostrar nome e TAMANHO antes do envio evita o upload que morre no limite do
// servidor depois de dois minutos
<Attachment name={arquivo.name} size={arquivo.size} onRemove={() => remover(arquivo)} />
```
