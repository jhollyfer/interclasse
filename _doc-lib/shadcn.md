# shadcn/ui

> Conferido contra `shadcn@4.21.4` (última publicada no npm). A CLI é usada uma vez por `add`; sem
> rodar código, não há como confirmar se os arquivos já gravados em `components/ui/` divergem da
> geração atual (ver `docs/cli` → `diff`).

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

**Links:** 107.

**Skills:** `shadcn`, `maiyu-frontend`, `compound-pattern`, `react-composition-patterns`, `dialog-pattern`, `sheet-pattern`, `accessibility`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

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

```bash
# básico: exatamente como a doc oficial mostra
npx shadcn@latest init
```

```jsonc
// caso real da stack: tsconfig.json ANTES do init: sem isto, a CLI grava arquivos que não compilam
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
// e o alias equivalente no vite.config.ts, senão quebra só no build
```

```bash
# armadilha: rodar o init sem o alias já configurado
# ERRADO: CLI aceita, mas os imports "@/components/ui/button" gerados
# não resolvem — erro só aparece no primeiro build/typecheck
npx shadcn@latest init

# CERTO: alias em tsconfig.json e vite.config.ts primeiro (ver bloco acima),
# só então o init — a doc de installation lista isso como pré-requisito
```

#### docs/installation/tanstack
[doc](https://ui.shadcn.com/docs/installation/tanstack) | [markdown](https://ui.shadcn.com/docs/installation/tanstack.md)
**O que é:** o guia de instalação específico para TanStack Start — por `shadcn/create` (preset
visual), pela CLI (`npx create-tsrouter-app@latest` + init) ou num projeto Start já existente.
**Para que serve:** não adivinhar aliases e config de Vite/Tailwind que o Start já define diferente
de um Vite genérico.
**Quando usar:** ao criar um projeto novo com TanStack Start, ou ao rodar `init` num que já existe.

```bash
pnpm dlx shadcn@latest init   # num projeto TanStack Start existente, detecta o framework
```

#### docs/components
[doc](https://ui.shadcn.com/docs/components) | [markdown](https://ui.shadcn.com/docs/components.md)
**O que é:** o índice de todos os componentes disponíveis.
**Para que serve:** descobrir o que existe antes de construir do zero.
**Quando usar:** **antes de escrever qualquer componente novo**. A chance de já existir é alta.

```bash
# básico: listar e adicionar pela CLI, como a doc oficial mostra
npx shadcn@latest add button
```

```bash
# caso real da stack: o catálogo pelo terminal, sem abrir o navegador
pnpm dlx shadcn@latest add

# e o que JÁ está no projeto (evita reescrever o que já foi instalado):
ls src/components/ui
```

```bash
# armadilha: criar um componente "do zero" em components/ui sem checar o índice
# ERRADO: escrever um Combobox próprio porque "não lembrava" se existia
# CERTO: checar docs/components (ou `ls src/components/ui`) antes — o índice
# lista o que já existe e economiza reinventar variantes e acessibilidade
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

#### docs/tailwind-v4
[doc](https://ui.shadcn.com/docs/tailwind-v4) | [markdown](https://ui.shadcn.com/docs/tailwind-v4.md)
**O que é:** o resumo do que mudou quando o shadcn passou a gerar para Tailwind v4 + React 19: sem
`forwardRef`, `data-slot` em toda primitiva, cores em OKLCH, estilo padrão novo passa a ser
`new-york`, e o `toast` antigo (pacote `sonner`) fica deprecado em favor do `Toast` do Base UI.
**Para que serve:** saber se um trecho de código ou issue que você encontrou é da geração v3/React
18 ou da atual, antes de copiar.
**Quando usar:** ao debugar um componente colado de um exemplo antigo que usa `forwardRef` ou cor em
HSL direto — **são os dois sinais de que o snippet é da geração anterior**, não um bug seu.

```tsx
// sinal de geração antiga (v3/React 18) — não é erro, é snippet desatualizado
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(...)

// geração atual: sem forwardRef, com data-slot
function Button({ className, ...props }: ButtonProps) {
  return <button data-slot="button" className={cn(buttonVariants(), className)} {...props} />
}
```

#### docs/react-19
[doc](https://ui.shadcn.com/docs/react-19) | [markdown](https://ui.shadcn.com/docs/react-19.md)
**O que é:** o aviso de peer dependency do `npm` quando um pacote ainda não lista React 19 — e a
flag que resolve.
**Para que serve:** não travar instalação por falso positivo de incompatibilidade.
**Quando usar:** **quando `npm install` falhar com `ERESOLVE`** depois de adicionar uma lib de UI.
`pnpm` (o gerenciador usado aqui) já resolve isso sozinho na maioria dos casos; a flag é para quem
usa `npm`.

```bash
# básico: exatamente a flag que a doc oficial recomenda
npm install --legacy-peer-deps
```

```bash
# caso real da stack: só necessário em npm; pnpm normalmente não precisa disto
npm install pacote-x --legacy-peer-deps
```

```bash
# armadilha: usar --force em vez de --legacy-peer-deps
# ERRADO: --force ignora TODO conflito de peer dep, não só o falso positivo do React 19
npm install pacote-x --force

# CERTO: --legacy-peer-deps volta ao comportamento do npm 6, que só avisa
# e não bloqueia — é o que a doc react-19 pede, nada mais amplo que isso
npm install pacote-x --legacy-peer-deps
```

#### docs/theming
[doc](https://ui.shadcn.com/docs/theming) | [markdown](https://ui.shadcn.com/docs/theming.md)
**O que é:** o sistema de tema por variáveis CSS, com os tokens semânticos (`background`,
`foreground`, `primary`, `muted`, `destructive`) e os modos claro e escuro.
**Para que serve:** trocar a identidade visual inteira mexendo em variáveis, não em componentes.
**Quando usar:** **leia antes de estilizar qualquer coisa**. Usar `bg-blue-500` em vez de
`bg-primary` é o que garante que o modo escuro vai quebrar.

```css
/* básico: os tokens em @theme, exatamente como a doc oficial declara */
@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-primary: oklch(0.205 0 0);
}
```

```tsx
// caso real da stack: Tailwind v4 lê o token direto, sem prefixo "bg-primary-500"
<Button className="bg-primary text-primary-foreground">Salvar</Button>
```

```tsx
// armadilha
// ERRADO: cor fixa. No modo escuro vira texto branco sobre fundo quase branco.
// <div className="bg-white text-slate-900">

// CERTO: par semântico. Os dois tokens trocam juntos quando o tema muda.
<div className="bg-background text-foreground">
  <span className="text-muted-foreground">rótulo</span>
</div>
```

#### docs/typeset
[doc](https://ui.shadcn.com/docs/typeset) | [markdown](https://ui.shadcn.com/docs/typeset.md)
**O que é:** um arquivo `typeset.css` próprio (gerado no builder em `/typeset`) que estiliza tudo
dentro de um contêiner `.typeset` — título, parágrafo, lista, tabela, código — a partir de três
variáveis (`--typeset-size`, `--typeset-leading`, `--typeset-flow`). Substitui o `prose` do
`@tailwindcss/typography` (que esta doc antes mostrava); a antiga página `components/base/typography`
(classes manuais como `scroll-m-20 text-4xl`) **redireciona para aqui** — não existe mais como
página própria.
**Para que serve:** texto consistente — markdown renderizado, post de blog, chat — sem decidir
tamanho e espaçamento elemento por elemento.
**Quando usar:** ao renderizar conteúdo longo vindo de markdown/CMS. Para um `<h1>`/`<p>` isolado
escrito à mão no JSX, classes utilitárias pontuais ainda bastam — **não precisa instalar nada só
para isso**.

```css
/* typeset.css importado depois do Tailwind */
@import "tailwindcss";
@import "./typeset.css";
```

```tsx
// ativa o sistema (.typeset) + o preset gerado no builder (.typeset-docs)
<article className="typeset typeset-docs">
  <YourMarkdownRenderer>{content}</YourMarkdownRenderer>
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
# básico: link do kit oficial, como a doc lista
# https://www.figma.com/community/file/1203061493325953101
```

```text
# caso real da stack: a conferência que evita retrabalho: o kit cobre a versão que está no repositório?
# componente do kit que não existe no seu components/ui vira tela impossível de entregar.
```

```text
# armadilha
# ERRADO: aceitar o mockup do Figma como fonte de verdade de prop/variante
# CERTO: Figma é só referência visual — a doc oficial do componente (e o
# código em components/ui) é quem decide variant/size/API real
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
# básico: a página do changelog só existe no site — nada para rodar aqui,
# a leitura em si é o passo básico antes de qualquer diff/reinstalação
```

```bash
# caso real da stack: o par: ler o changelog e só então conferir o que mudou no seu arquivo
pnpm dlx shadcn@latest diff button
```

```bash
# armadilha
# ERRADO: reinstalar por cima (`add button --overwrite`) sem olhar o changelog
npx shadcn@latest add button --overwrite

# CERTO: diff primeiro, decide linha a linha o que reaplicar — componente
# editado à mão não se atualiza sozinho, overwrite perde a edição
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
// básico: o script inline que a doc oficial injeta antes do hidrate, para
// ler localStorage no cliente sem esperar o React montar
<script>
  {`document.documentElement.classList.toggle('dark', localStorage.theme === 'dark')`}
</script>
```

```tsx
// caso real da stack: o flash acontece porque o servidor não sabe o tema do
// usuário. A saída é ler a preferência no SERVIDOR (cookie) e já mandar a
// classe no HTML.
export const Route = createRootRoute({
  loader: () => ({ tema: getCookie('tema') ?? 'light' }),
  component: () => <html className={Route.useLoaderData().tema} />,
})
```

```tsx
// armadilha
// ERRADO: ler o tema só no cliente (useEffect) e trocar a classe depois do mount
// — é exatamente o flash que a página existe para evitar

// CERTO: tema decidido no loader do servidor, antes do primeiro HTML sair
export const Route = createRootRoute({ loader: () => ({ tema: getCookie('tema') ?? 'light' }) })
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
// básico: exatamente o padrão da doc oficial — FormField ligando o campo
// controlado ao Form.Control/Message do shadcn
<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

```tsx
// caso real da stack
import { vineResolver } from '@hookform/resolvers/vine'
import { useForm } from 'react-hook-form'
import type { Infer } from '@vinejs/vine/types'
// O `vine` vem daqui já configurado, nunca de '@vinejs/vine' direto.
import { vine } from '@/lib/validator'

const validator = vine.create({ document: vine.string().fixedLength(14) })

// o tipo do formulário SAI do validator: um campo só existe se estiver validado
const form = useForm<Infer<typeof validator>>({ resolver: vineResolver(validator) })
```

```tsx
// armadilha
// ERRADO: schema local redeclarado no componente, duplicando a regra do backend
// const schema = z.object({ document: z.string().length(14) })

// CERTO: validator único em lib/validator.ts, par do _shared.validator.ts do
// backend — mudou a regra lá, muda aqui sem reescrever o form
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
// básico: exatamente como a doc oficial inicializa o form
import { useForm } from 'formisch/react'

const form = useForm({ schema: FormSchema })
```

```tsx
// caso real da stack: o custo escondido: Formisch pressupõe Valibot, e o
// schema vira uma terceira declaração ao lado dos dois validators que já existem
import * as v from 'valibot'

const FormSchema = v.object({ title: v.pipe(v.string(), v.minLength(5)) })
```

```tsx
// armadilha
// ERRADO: adotar Formisch num projeto que já valida com VineJS
// — duas libs de schema (Valibot + VineJS) no mesmo bundle do cliente

// CERTO: react-hook-form + vineResolver, a integração já padronizada aqui
// (ver docs/forms/react-hook-form) — Formisch só em projeto novo sem VineJS
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
// básico: o namespace de primitivas, como a doc oficial mostra
import { Questionnaire } from '@shadcn/react/questionnaire'

<Questionnaire.Root>
  <Questionnaire.Item name="objetivo" />
</Questionnaire.Root>
```

```tsx
// caso real da stack
import { Questionnaire } from '@shadcn/react/questionnaire'

// o mapeamento que confunde: Root é um <form>, cada Item é um <fieldset> e
// o Title é a <legend> dele. A semântica já vem certa.
<Questionnaire.Root>
  <Questionnaire.Item name="objetivo">
    <Questionnaire.Title>Qual o objetivo?</Questionnaire.Title>
  </Questionnaire.Item>
</Questionnaire.Root>
```

```tsx
// armadilha
// ERRADO: procurar prop em QuestionnaireItem (nome achatado) quando a API
// usada é a de namespace — a página do componente estilizado não documenta
// o que o namespace aceita

// CERTO: para prop de baixo nível, a referência é esta página (primitiva),
// não a do componente estilizado
<Questionnaire.Item name="objetivo" />
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

#### docs/directory
[doc](https://ui.shadcn.com/docs/directory) | [markdown](https://ui.shadcn.com/docs/directory.md)
**O que é:** o índice de registries de terceiros já embutidos na CLI (sem precisar configurar
`registries` no `components.json`).
**Para que serve:** descobrir catálogos de componentes prontos antes de escrever um customizado.
**Quando usar:** só avalie código de terceiro **revisando antes de instalar** — registry comunitário
não passa por nenhuma curadoria do shadcn. Nos dois projetos daqui o campo `registries` do
`components.json` está vazio; isto ainda não está em uso.

```bash
# básico: exatamente como a doc oficial lista um registry embutido
npx shadcn add @acme/button
```

```bash
# caso real da stack
npx shadcn add @nome-do-registry/componente
```

```bash
# armadilha
# ERRADO: instalar sem ler o código que a CLI vai copiar para components/ui
npx shadcn add @registry-comunitario/data-table

# CERTO: revisar o arquivo-fonte do registry antes — não existe curadoria
# oficial, e o campo `registries` do components.json aqui está vazio
npx shadcn view @registry-comunitario/data-table
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
// básico: a URL de endpoint que a doc oficial monta
const url = 'https://ui.shadcn.com/r/styles/new-york/button.json'
```

```tsx
// caso real da stack: e o item precisa estar acessível sem login para o v0 conseguir ler
<a href={`https://v0.dev/chat/api/open?url=${url}`} target="_blank" rel="noreferrer">
  Abrir no v0
</a>
```

```tsx
// armadilha
// ERRADO: apontar para um registry com cssVars/envVars ou autenticado por header
// — a página avisa que esses casos não funcionam no botão "Abrir no v0"

// CERTO: só item de registry público, sem variável de ambiente nem token
// que não seja query string — senão o v0 não consegue buscar o JSON
const url = 'https://ui.shadcn.com/r/styles/new-york/button.json'
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
// básico: o shape mínimo que a doc oficial mostra
{
  "name": "hello-world",
  "type": "registry:component",
  "files": [{ "path": "hello-world.tsx", "type": "registry:component" }]
}
```

```jsonc
// caso real da stack
{
  "name": "tabela-padrao",
  "type": "registry:component",
  "dependencies": ["@tanstack/react-table"], // pacotes npm
  // outros itens do catálogo: sem declarar, o componente instala quebrado
  "registryDependencies": ["table", "button", "dropdown-menu"],
  "files": [{ "path": "components/tabela-padrao.tsx", "type": "registry:component" }]
}
```

```jsonc
// armadilha
// ERRADO: importar Button/DropdownMenu no arquivo e não listar em registryDependencies
// — a CLI copia só o que está declarado; o import sobra sem o arquivo-fonte

// CERTO: todo componente de components/ui usado no arquivo entra em registryDependencies
{ "registryDependencies": ["table", "button", "dropdown-menu"] }
```

## Componentes: formulário e entrada

#### input
[doc](https://ui.shadcn.com/docs/components/base/input) | [markdown](https://ui.shadcn.com/docs/components/base/input.md)
**O que é:** o campo de texto de linha única, estilizado e com estados de foco, erro e desabilitado.
**Para que serve:** entrada de texto comum.
**Quando usar:** o campo mais usado de qualquer formulário. Combine com `field` para rótulo e erro.

```tsx
// básico: exatamente como a doc oficial mostra
import { Input } from '@/components/ui/input'

<Input type="email" placeholder="Email" />
```

```tsx
// caso real da stack
import { Input } from '@/components/ui/input'

// type correto muda o teclado no celular e a validação nativa de graça
<Input type="email" placeholder="user@dominio.com" autoComplete="email" />
```

```tsx
// armadilha
// ERRADO: Input controlado só por useState, em formulário com react-hook-form
// const [value, setValue] = useState('')
// <Input value={value} onChange={(e) => setValue(e.target.value)} />

// CERTO: spread do field do RHF — é quem já dá value/onChange/onBlur/ref
<FormControl><Input {...field} type="email" /></FormControl>
```

#### textarea
[doc](https://ui.shadcn.com/docs/components/base/textarea) | [markdown](https://ui.shadcn.com/docs/components/base/textarea.md)
**O que é:** o campo de texto de várias linhas.
**Para que serve:** descrições, observações e comentários.
**Quando usar:** quando o texto pode passar de uma linha. A altura automática não vem de fábrica, é
ajuste seu.

```tsx
// básico: exatamente como a doc oficial mostra
import { Textarea } from '@/components/ui/textarea'

<Textarea placeholder="Type your message here." />
```

```tsx
// caso real da stack
import { Textarea } from '@/components/ui/textarea'

// a altura NÃO cresce sozinha: `rows` define o tamanho inicial, e crescimento
// automático é código seu
<Textarea rows={4} placeholder="Observações" />
```

```tsx
// armadilha
// ERRADO: contar caractere com useState espelhando o valor do campo
// const [len, setLen] = useState(0)

// CERTO: ler o valor direto do form (react-hook-form já guarda o estado)
const descricao = form.watch('descricao')
<Textarea {...field} />
<span>{descricao.length}/500</span>
```

#### input-group
[doc](https://ui.shadcn.com/docs/components/base/input-group) | [markdown](https://ui.shadcn.com/docs/components/base/input-group.md)
**O que é:** agrupamento de campo com elementos adjacentes, como prefixo, sufixo, ícone ou botão.
**Para que serve:** o campo de busca com ícone dentro, ou o campo de valor com "R$" na frente.
**Quando usar:** sempre que algo precisar ficar visualmente colado ao campo. Melhor que posicionar
ícone com CSS absoluto por cima.

```tsx
// básico: exatamente como a doc oficial mostra
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group'

<InputGroup>
  <InputGroupInput placeholder="Search..." />
  <InputGroupAddon>@</InputGroupAddon>
</InputGroup>
```

```tsx
// caso real da stack
import { MagnifyingGlass } from '@phosphor-icons/react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

// ícone posicionado com `absolute` por cima do input rouba o clique e some no
// modo RTL. Aqui ele faz parte do layout.
<InputGroup>
  <InputGroupAddon><MagnifyingGlass /></InputGroupAddon>
  <InputGroupInput placeholder="Buscar post" />
</InputGroup>
```

```tsx
// armadilha
// ERRADO: <div className="relative"><Search className="absolute left-2" /><Input className="pl-8" /></div>
// — quebra no RTL (ver docs/rtl) e o padding mágico desalinha no primeiro ajuste de ícone

// CERTO: InputGroupAddon já resolve posição e RTL
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
// básico: exatamente como a doc oficial mostra
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
  </InputOTPGroup>
</InputOTP>
```

```tsx
// caso real da stack
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

// colar o código inteiro distribui entre os quadrados, e Backspace volta para o
// anterior: é essa parte que dá trabalho na mão
<InputOTP maxLength={6} onComplete={verificar}>
  <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
</InputOTP>
```

```tsx
// armadilha
// ERRADO: seis <Input maxLength={1}> controlando foco manualmente
// — reimplementa colagem, backspace e navegação que o InputOTP já resolve

// CERTO: um único InputOTP com onComplete, sem gerência de foco na mão
<InputOTP maxLength={6} onComplete={verificar}>
  <InputOTPGroup><InputOTPSlot index={0} /></InputOTPGroup>
</InputOTP>
```

#### native-select
[doc](https://ui.shadcn.com/docs/components/base/native-select) | [markdown](https://ui.shadcn.com/docs/components/base/native-select.md)
**O que é:** o `<select>` nativo do navegador, apenas estilizado.
**Para que serve:** seleção simples com o comportamento nativo, especialmente bom no celular.
**Quando usar:** **prefira este ao `select` customizado quando não precisar de busca ou conteúdo
rico**. É mais leve, mais acessível de graça e melhor em telas pequenas.

```tsx
// básico: exatamente como a doc oficial mostra
import { NativeSelect } from '@/components/ui/native-select'

<NativeSelect>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
</NativeSelect>
```

```tsx
// caso real da stack
import { NativeSelect } from '@/components/ui/native-select'

// no celular abre o seletor do sistema, que é melhor que qualquer lista
// customizada, e a acessibilidade vem pronta
<NativeSelect>
  <option value="ATIVO">Ativo</option>
  <option value="INATIVO">Inativo</option>
</NativeSelect>
```

```tsx
// armadilha
// ERRADO: usar Select customizado para um filtro de 3 opções sem busca
// nem conteúdo rico — peso de JS maior que o nativo, sem ganho nenhum

// CERTO: NativeSelect — mais leve, melhor no celular, acessibilidade de graça
<NativeSelect><option value="ATIVO">Ativo</option></NativeSelect>
```

#### select
[doc](https://ui.shadcn.com/docs/components/base/select) | [markdown](https://ui.shadcn.com/docs/components/base/select.md)
**O que é:** o seletor customizado, com grupos, rótulos, separadores e conteúdo livre nas opções.
**Para que serve:** seleção que precisa de mais que texto puro nas opções.
**Quando usar:** quando o nativo não bastar. Se a lista for longa, o caso é `combobox`, que tem
busca.

```tsx
// básico: exatamente como a doc oficial mostra
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select>
  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Theme" /></SelectTrigger>
  <SelectContent><SelectItem value="light">Light</SelectItem></SelectContent>
</Select>
```

```tsx
// caso real da stack
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// justifica-se quando a opção tem MAIS que texto: ícone, badge, descrição
<Select onValueChange={setStatus}>
  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
  <SelectContent><SelectItem value="ATIVO">Ativo</SelectItem></SelectContent>
</Select>
```

```tsx
// armadilha
// ERRADO: Select para uma lista de 50 cidades, sem busca
// — usuário rola a lista inteira procurando, experiência despenca

// CERTO: acima de ~20 opções o caso é combobox, que tem busca embutida
<Combobox options={cidades} />
```

#### combobox
[doc](https://ui.shadcn.com/docs/components/base/combobox) | [markdown](https://ui.shadcn.com/docs/components/base/combobox.md)
**O que é:** a combinação de campo de busca com lista de opções filtráveis.
**Para que serve:** escolher em listas longas, como país, cidade ou post.
**Quando usar:** **acima de umas vinte opções**. Sem busca, o usuário rola procurando, e a
experiência despenca.

```tsx
// básico: exatamente a receita da doc oficial (popover + command)
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

<Popover>
  <PopoverTrigger>Select framework...</PopoverTrigger>
  <PopoverContent>
    <Command><CommandInput /><CommandList><CommandItem>Next.js</CommandItem></CommandList></Command>
  </PopoverContent>
</Popover>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: usar combobox para uma lista de 4 status fixos
// — overhead de Command/Popover sem necessidade nenhuma de busca

// CERTO: abaixo de ~20 opções sem conteúdo rico, select (ou native-select) basta
<Select><SelectTrigger /><SelectContent /></Select>
```

#### checkbox
[doc](https://ui.shadcn.com/docs/components/base/checkbox) | [markdown](https://ui.shadcn.com/docs/components/base/checkbox.md)
**O que é:** a caixa de seleção, com suporte ao estado indeterminado.
**Para que serve:** opções independentes e seleção de linhas em tabela.
**Quando usar:** quando o usuário pode marcar zero, uma ou várias. O estado indeterminado serve para
o "selecionar todos" parcial.

```tsx
// básico: exatamente como a doc oficial mostra
import { Checkbox } from '@/components/ui/checkbox'

<Checkbox id="terms" />
```

```tsx
// caso real da stack
import { Checkbox } from '@/components/ui/checkbox'

// 'indeterminate' é um TERCEIRO estado, não um booleano: é o traço do
// "selecionar todos" quando só parte das linhas está marcada
<Checkbox checked={todas ? true : algumas ? 'indeterminate' : false} onCheckedChange={alternar} />
```

```tsx
// armadilha
// ERRADO: checked={todas && algumas} tentando simular o terceiro estado com booleano
// — nunca mostra o traço, só marcado ou vazio

// CERTO: passar a string literal 'indeterminate', o terceiro valor que o
// componente aceita de fato
<Checkbox checked={algumas ? 'indeterminate' : todas} />
```

#### radio-group
[doc](https://ui.shadcn.com/docs/components/base/radio-group) | [markdown](https://ui.shadcn.com/docs/components/base/radio-group.md)
**O que é:** grupo de opções mutuamente exclusivas.
**Para que serve:** escolher exatamente uma entre poucas opções, todas visíveis.
**Quando usar:** com até cinco opções. Acima disso, `select` ocupa menos espaço.

```tsx
// básico: exatamente como a doc oficial mostra
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

<RadioGroup defaultValue="comfortable">
  <RadioGroupItem value="default" id="r1" />
  <RadioGroupItem value="comfortable" id="r2" />
</RadioGroup>
```

```tsx
// caso real da stack
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// todas as opções visíveis ao mesmo tempo: é a vantagem sobre o select, e o
// motivo de não passar de cinco
<RadioGroup defaultValue="ATIVO">
  <RadioGroupItem value="ATIVO" id="ativo" />
  <RadioGroupItem value="INATIVO" id="inativo" />
</RadioGroup>
```

```tsx
// armadilha
// ERRADO: RadioGroup com oito opções visíveis de uma vez
// — ocupa espaço vertical desproporcional ao valor da escolha

// CERTO: acima de cinco opções, select ocupa menos espaço
<Select><SelectTrigger /><SelectContent /></Select>
```

#### switch
[doc](https://ui.shadcn.com/docs/components/base/switch) | [markdown](https://ui.shadcn.com/docs/components/base/switch.md)
**O que é:** o interruptor de ligar e desligar.
**Para que serve:** preferências que valem imediatamente ao clicar.
**Quando usar:** **quando o efeito é instantâneo**. Se a mudança só vale depois de clicar em
"Salvar", o certo é `checkbox`, e trocar isso confunde o usuário.

```tsx
// básico: exatamente como a doc oficial mostra
import { Switch } from '@/components/ui/switch'

<Switch id="airplane-mode" />
```

```tsx
// caso real da stack
import { Switch } from '@/components/ui/switch'

// vale AGORA: a chamada sai no próprio onCheckedChange, sem botão de salvar
<Switch checked={ativo} onCheckedChange={(v) => alternarStatus.mutate(v)} />
```

```tsx
// armadilha
// ERRADO: Switch dentro de um <form> com botão "Salvar" separado
// — usuário muda o switch e espera efeito imediato, mas nada aconteceu ainda

// CERTO: se depende de "Salvar", o componente certo é checkbox, não switch
<Checkbox checked={ativo} onCheckedChange={setAtivo} />
```

#### slider
[doc](https://ui.shadcn.com/docs/components/base/slider) | [markdown](https://ui.shadcn.com/docs/components/base/slider.md)
**O que é:** o controle deslizante, com suporte a faixa de dois valores.
**Para que serve:** escolher um número dentro de um intervalo, ou uma faixa de preço.
**Quando usar:** quando o valor aproximado basta. Se o usuário precisa do número exato, um campo
numérico é melhor.

```tsx
// básico: exatamente como a doc oficial mostra
import { Slider } from '@/components/ui/slider'

<Slider defaultValue={[50]} max={100} step={1} />
```

```tsx
// caso real da stack
import { Slider } from '@/components/ui/slider'

// dois valores no array = faixa. Digitar "R$ 1.237,00" aqui é impossível, e é
// por isso que valor exato pede campo numérico.
<Slider value={faixa} onValueChange={setFaixa} min={0} max={5000} step={50} />
```

```tsx
// armadilha
// ERRADO: Slider para um valor que precisa ser exato (ex.: idade digitada)
// — usuário não consegue "acertar" 37 arrastando, só aproximar

// CERTO: valor exato é campo numérico; slider é só para faixa aproximada
<Input type="number" {...field} />
```

#### label
[doc](https://ui.shadcn.com/docs/components/base/label) | [markdown](https://ui.shadcn.com/docs/components/base/label.md)
**O que é:** o rótulo associado a um campo, com o vínculo de acessibilidade correto.
**Para que serve:** clicar no rótulo focar o campo, e o leitor de tela anunciar o campo certo.
**Quando usar:** em todo campo. Sem rótulo associado, o formulário é inacessível.

```tsx
// básico: exatamente como a doc oficial mostra
import { Label } from '@/components/ui/label'

<Label htmlFor="email">Your email address</Label>
```

```tsx
// caso real da stack
import { Label } from '@/components/ui/label'

// htmlFor precisa bater com o id: é esse par que faz o clique focar o campo e
// o leitor de tela anunciar o nome certo
<Label htmlFor="document">documento</Label>
<Input id="document" />
```

```tsx
// armadilha
// ERRADO: <span className="text-sm font-medium">documento</span> no lugar do Label
// — parece igual visualmente, mas não associa ao campo nem é clicável

// CERTO: Label com htmlFor batendo o id — clique foca, leitor de tela anuncia
<Label htmlFor="document">documento</Label>
```

#### field
[doc](https://ui.shadcn.com/docs/components/base/field) | [markdown](https://ui.shadcn.com/docs/components/base/field.md)
**O que é:** o invólucro que junta rótulo, campo, texto de ajuda e mensagem de erro.
**Para que serve:** a estrutura completa de um campo, com os vínculos de acessibilidade prontos.
**Quando usar:** **é a peça central dos formulários**. Use junto com a integração de formulário, e
você não escreve nem um `aria-` na mão.

```tsx
// básico: exatamente como a doc oficial mostra
import { Field, FieldLabel } from '@/components/ui/field'

<Field>
  <FieldLabel htmlFor="username">Username</FieldLabel>
  <Input id="username" />
</Field>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <p className="text-sm text-red-500">{erros.document?.message}</p> sem aria-describedby
// — leitor de tela não anuncia o erro ao focar o campo

// CERTO: FieldError já liga aria-describedby/aria-invalid ao campo do Field
<FieldError>{erros.document?.message}</FieldError>
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
// básico: exatamente como a doc oficial mostra
import { Questionnaire, QuestionnaireItem } from '@/components/ui/questionnaire'

<Questionnaire>
  <QuestionnaireItem name="objetivo" />
</Questionnaire>
```

```tsx
// caso real da stack
import { Questionnaire, QuestionnaireItem, QuestionnaireNext } from '@/components/ui/questionnaire'

// o componente estilizado usa nomes achatados; a primitiva de
// @shadcn/react usa namespace. A referência de props está na primitiva.
<Questionnaire items={perguntas} onSubmit={enviar}>
  <QuestionnaireItem name="objetivo" />
  <QuestionnaireNext />
</Questionnaire>
```

```tsx
// armadilha
// ERRADO: montar um formulário comum (todos os campos visíveis) com Questionnaire
// — esconder campo que não precisava esconder é custo, não recurso

// CERTO: perguntas sequenciais e dependentes usam Questionnaire; formulário
// normal continua field + react-hook-form, tudo visível de uma vez
<Field><FieldLabel>documento</FieldLabel><Input /></Field>
```

#### calendar
[doc](https://ui.shadcn.com/docs/components/base/calendar) | [markdown](https://ui.shadcn.com/docs/components/base/calendar.md)
**O que é:** o calendário, com seleção de dia único, de vários dias e de intervalo.
**Para que serve:** a grade de datas em si.
**Quando usar:** embutido na página. Para um campo de formulário, use `date-picker`, que já combina
calendário com `popover`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Calendar } from '@/components/ui/calendar'

<Calendar mode="single" selected={date} onSelect={setDate} />
```

```tsx
// caso real da stack
import { Calendar } from '@/components/ui/calendar'
import { ptBR } from 'date-fns/locale'

// sem `locale`, os dias da semana e os meses saem em inglês
<Calendar mode="range" selected={periodo} onSelect={setPeriodo} locale={ptBR} />
```

```tsx
// armadilha
// ERRADO: Calendar direto na tela como campo de formulário, sem popover
// — ocupa espaço permanente e não se comporta como um Field normal

// CERTO: dentro de formulário, use date-picker (calendário + popover prontos)
<DatePicker value={data} onChange={setData} />
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
// básico: exatamente como a doc oficial mostra
import { Button } from '@/components/ui/button'

<Button variant="outline">Button</Button>
```

```tsx
// caso real da stack
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// asChild: o estilo vai para o <a> do Link. Sem ele, sairia um <a> dentro de
// <button>, que é HTML inválido e quebra o clique do meio e o "abrir em nova aba"
<Button asChild variant="outline">
  <Link to="/users/$id" params={{ id }}>Ver user</Link>
</Button>
```

```tsx
// armadilha
// ERRADO: <Button onClick={() => navigate({ to: '/users/$id' })}>Ver user</Button>
// — perde clique do meio, "abrir em nova aba" e o prefetch do Link

// CERTO: asChild manda o estilo para o próprio <a>, sem aninhar elementos
<Button asChild><Link to="/users/$id" params={{ id }}>Ver user</Link></Button>
```

#### button-group
[doc](https://ui.shadcn.com/docs/components/base/button-group) | [markdown](https://ui.shadcn.com/docs/components/base/button-group.md)
**O que é:** botões agrupados visualmente, com as bordas unidas.
**Para que serve:** ações relacionadas lado a lado, ou um botão com menu suspenso anexado.
**Quando usar:** em barras de ação. Se as opções são mutuamente exclusivas, o certo é `toggle-group`.

```tsx
// básico: exatamente como a doc oficial mostra
import { ButtonGroup } from '@/components/ui/button-group'

<ButtonGroup>
  <Button variant="outline">Button</Button>
  <Button variant="outline">Button</Button>
</ButtonGroup>
```

```tsx
// caso real da stack
import { ButtonGroup } from '@/components/ui/button-group'

// AÇÕES, não estados: cada botão faz algo. Se fosse escolher entre modos de
// visualização, seria toggle-group.
<ButtonGroup>
  <Button variant="outline">Salvar</Button>
  <Button variant="outline">Salvar e novo</Button>
</ButtonGroup>
```

```tsx
// armadilha
// ERRADO: ButtonGroup para alternar entre "Lista" e "Grade" (estado, não ação)
// — os dois ficam clicáveis ao mesmo tempo, sem indicar qual está ativo

// CERTO: estado mutuamente exclusivo é toggle-group, que marca o selecionado
<ToggleGroup type="single"><ToggleGroupItem value="lista" /></ToggleGroup>
```

#### toggle
[doc](https://ui.shadcn.com/docs/components/base/toggle) | [markdown](https://ui.shadcn.com/docs/components/base/toggle.md)
**O que é:** um botão de dois estados, pressionado ou não.
**Para que serve:** ações do tipo negrito e itálico numa barra de formatação.
**Quando usar:** em barra de ferramentas. Para uma preferência, `switch` comunica melhor.

```tsx
// básico: exatamente como a doc oficial mostra
import { Bold } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'

<Toggle aria-label="Toggle bold"><Bold /></Toggle>
```

```tsx
// caso real da stack
import { TextB } from '@phosphor-icons/react'
import { Toggle } from '@/components/ui/toggle'

// `pressed` vira aria-pressed: o leitor de tela anuncia o estado
<Toggle pressed={negrito} onPressedChange={setNegrito} aria-label="Negrito">
  <TextB />
</Toggle>
```

```tsx
// armadilha
// ERRADO: <Toggle aria-pressed={negrito}>...</Toggle> escrevendo aria-pressed à mão
// — o componente já deriva isso de `pressed`; o atributo manual pode divergir

// CERTO: só passar `pressed`, o aria- sai sincronizado sozinho
<Toggle pressed={negrito} onPressedChange={setNegrito} aria-label="Negrito" />
```

#### toggle-group
[doc](https://ui.shadcn.com/docs/components/base/toggle-group) | [markdown](https://ui.shadcn.com/docs/components/base/toggle-group.md)
**O que é:** um conjunto de toggles, com seleção única ou múltipla.
**Para que serve:** alternar entre modos de visualização, como lista e grade.
**Quando usar:** quando as opções são poucas e cabem lado a lado.

```tsx
// básico: exatamente como a doc oficial mostra
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

<ToggleGroup type="single">
  <ToggleGroupItem value="a">A</ToggleGroupItem>
</ToggleGroup>
```

```tsx
// caso real da stack
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// type="single" garante exclusividade; "multiple" permite combinar
<ToggleGroup type="single" value={modo} onValueChange={setModo}>
  <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
  <ToggleGroupItem value="grade">Grade</ToggleGroupItem>
</ToggleGroup>
```

```tsx
// armadilha
// ERRADO: type="multiple" para "lista vs grade", que são mutuamente exclusivos
// — permite os dois marcados ao mesmo tempo, estado que não existe na tela

// CERTO: type="single" garante exclusividade de verdade
<ToggleGroup type="single" value={modo} onValueChange={setModo} />
```

#### dropdown-menu
[doc](https://ui.shadcn.com/docs/components/base/dropdown-menu) | [markdown](https://ui.shadcn.com/docs/components/base/dropdown-menu.md)
**O que é:** o menu suspenso, com submenus, itens de seleção, itens de rádio, separadores e atalhos.
**Para que serve:** o menu de três pontinhos com as ações de uma linha ou de um card.
**Quando usar:** para ações secundárias. Manter só a ação principal visível e o resto no menu deixa a
interface bem mais limpa.

```tsx
// básico: exatamente como a doc oficial mostra
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent><DropdownMenuItem>Profile</DropdownMenuItem></DropdownMenuContent>
</DropdownMenu>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <DropdownMenuItem className="text-red-500">Remover</DropdownMenuItem>
// — cor fixa fora do token semântico, não muda junto com o tema

// CERTO: variant="destructive" já usa o token semântico certo
<DropdownMenuItem variant="destructive">Remover</DropdownMenuItem>
```

#### context-menu
[doc](https://ui.shadcn.com/docs/components/base/context-menu) | [markdown](https://ui.shadcn.com/docs/components/base/context-menu.md)
**O que é:** o menu do clique direito.
**Para que serve:** atalhos avançados sem ocupar espaço na tela.
**Quando usar:** como **complemento**, nunca como único caminho para uma ação. No celular ele não
existe.

```tsx
// básico: exatamente como a doc oficial mostra
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'

<ContextMenu>
  <ContextMenuTrigger>Right click here</ContextMenuTrigger>
  <ContextMenuContent><ContextMenuItem>Profile</ContextMenuItem></ContextMenuContent>
</ContextMenu>
```

```tsx
// caso real da stack
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'

// no toque não há clique direito: TODA ação daqui precisa existir também no
// menu de três pontinhos, senão é inacessível no celular
<ContextMenu>
  <ContextMenuTrigger>{linha}</ContextMenuTrigger>
  <ContextMenuContent><ContextMenuItem>Duplicar</ContextMenuItem></ContextMenuContent>
</ContextMenu>
```

```tsx
// armadilha
// ERRADO: ação "Duplicar" que só existe no context-menu
// — no celular, sem clique direito, a ação simplesmente não existe

// CERTO: a mesma ação também fica no dropdown-menu de três pontinhos da linha
<DropdownMenu><DropdownMenuContent><DropdownMenuItem>Duplicar</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
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
// básico: exatamente como a doc oficial mostra
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu'

<NavigationMenu>
  <NavigationMenuList><NavigationMenuItem>Item</NavigationMenuItem></NavigationMenuList>
</NavigationMenu>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: NavigationMenu como navegação principal de um painel administrativo
// — pensado para painéis largos promocionais, não para hierarquia de páginas

// CERTO: painel autenticado usa sidebar, que comunica hierarquia melhor
<SidebarProvider><Sidebar /></SidebarProvider>
```

#### sidebar
[doc](https://ui.shadcn.com/docs/components/base/sidebar) | [markdown](https://ui.shadcn.com/docs/components/base/sidebar.md)
**O que é:** a barra lateral completa: recolhível, responsiva, com grupos, submenus, rodapé e
persistência do estado.
**Para que serve:** a navegação principal de um painel administrativo.
**Quando usar:** **em qualquer painel**. É um dos componentes mais completos do catálogo, e refazer
isso na mão custa dias.

```tsx
// básico: exatamente como a doc oficial mostra
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar'

<SidebarProvider>
  <Sidebar><SidebarContent /></Sidebar>
</SidebarProvider>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: montar sidebar recolhível na mão com useState + CSS de largura
// — reimplementa dias de trabalho que o componente já resolve (persistência, SSR, atalho)

// CERTO: SidebarProvider já guarda o estado recolhido em cookie
<SidebarProvider><Sidebar collapsible="icon" /></SidebarProvider>
```

#### breadcrumb
[doc](https://ui.shadcn.com/docs/components/base/breadcrumb) | [markdown](https://ui.shadcn.com/docs/components/base/breadcrumb.md)
**O que é:** a trilha de navegação hierárquica, com colapso quando há níveis demais.
**Para que serve:** mostrar onde o usuário está e permitir subir níveis.
**Quando usar:** em hierarquias de três ou mais níveis. Em navegação rasa, é ruído.

```tsx
// básico: exatamente como a doc oficial mostra
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'

<Breadcrumb>
  <BreadcrumbList><BreadcrumbItem><BreadcrumbPage>Home</BreadcrumbPage></BreadcrumbItem></BreadcrumbList>
</Breadcrumb>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <BreadcrumbLink>Acme</BreadcrumbLink> para a página atual
// — vira um link que recarrega a própria página e não marca aria-current

// CERTO: a última miga é BreadcrumbPage, nunca BreadcrumbLink
<BreadcrumbItem><BreadcrumbPage>Acme</BreadcrumbPage></BreadcrumbItem>
```

#### pagination
[doc](https://ui.shadcn.com/docs/components/base/pagination) | [markdown](https://ui.shadcn.com/docs/components/base/pagination.md)
**O que é:** os controles de paginação, com anterior, próximo e números de página.
**Para que serve:** navegar entre páginas de uma listagem.
**Quando usar:** com listagens paginadas. Ligue os links ao estado da URL para o botão voltar
funcionar.

```tsx
// básico: exatamente como a doc oficial mostra
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'

<Pagination>
  <PaginationContent><PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem></PaginationContent>
</Pagination>
```

```tsx
// caso real da stack
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'

// link de verdade, com a página na URL: botão voltar funciona e o link é
// compartilhável. Com onClick e useState, nada disso acontece.
<PaginationItem>
  <PaginationLink asChild>
    <Link to="/posts/" search={{ page: 2 }}>2</Link>
  </PaginationLink>
</PaginationItem>
```

```tsx
// armadilha
// ERRADO: <PaginationLink onClick={() => setPage(2)}>2</PaginationLink>, página em useState
// — botão voltar do navegador não volta de página, e o link não é compartilhável

// CERTO: asChild + Link, página real na URL via search param
<PaginationLink asChild><Link to="/posts/" search={{ page: 2 }}>2</Link></PaginationLink>
```

#### tabs
[doc](https://ui.shadcn.com/docs/components/base/tabs) | [markdown](https://ui.shadcn.com/docs/components/base/tabs.md)
**O que é:** abas com navegação por teclado e painéis associados.
**Para que serve:** dividir conteúdo relacionado sem trocar de página.
**Quando usar:** quando o conteúdo é de fato paralelo. **Guarde a aba ativa na URL**, senão recarregar
a página joga o usuário de volta na primeira aba.

```tsx
// básico: exatamente como a doc oficial mostra
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="account">
  <TabsList><TabsTrigger value="account">Account</TabsTrigger></TabsList>
  <TabsContent value="account">Account content</TabsContent>
</Tabs>
```

```tsx
// caso real da stack
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// a aba ativa vem do search param: F5 e link compartilhado preservam a aba
const { aba } = Route.useSearch()
<Tabs value={aba} onValueChange={(v) => navigate({ search: { aba: v } })}>
  <TabsList><TabsTrigger value="dados">Dados</TabsTrigger></TabsList>
  <TabsContent value="dados">{conteudo}</TabsContent>
</Tabs>
```

```tsx
// armadilha
// ERRADO: const [aba, setAba] = useState('dados'), sem ligar na URL
// — F5 na aba "histórico" volta para "dados", e o link copiado também

// CERTO: aba ativa é search param da rota, não useState local
<Tabs value={aba} onValueChange={(v) => navigate({ search: { aba: v } })} />
```

## Componentes: sobreposição

#### dialog
[doc](https://ui.shadcn.com/docs/components/base/dialog) | [markdown](https://ui.shadcn.com/docs/components/base/dialog.md)
**O que é:** o modal, com foco preso dentro dele, fechamento por Esc e sobreposição escurecida.
**Para que serve:** formulário ou conteúdo que exige atenção sem sair da página.
**Quando usar:** para interações curtas. Formulário longo em modal é desconfortável, prefira página.

```tsx
// básico: exatamente como a doc oficial mostra
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent><DialogTitle>Edit profile</DialogTitle></DialogContent>
</Dialog>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <DialogContent><p>texto</p></DialogContent> sem DialogTitle
// — leitor de tela anuncia "diálogo" sem nome, falha de acessibilidade real

// CERTO: DialogTitle sempre presente, mesmo que visualmente oculto (sr-only)
<DialogContent><DialogTitle className="sr-only">Nova categoria</DialogTitle></DialogContent>
```

#### alert-dialog
[doc](https://ui.shadcn.com/docs/components/base/alert-dialog) | [markdown](https://ui.shadcn.com/docs/components/base/alert-dialog.md)
**O que é:** o modal de confirmação, que **não fecha ao clicar fora** e exige uma escolha explícita.
**Para que serve:** confirmar ação destrutiva.
**Quando usar:** **em toda remoção**. A diferença para o `dialog` é justamente não permitir descartar
por acidente, e usar o componente errado aqui é um risco real.

```tsx
// básico: exatamente como a doc oficial mostra
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTitle } from '@/components/ui/alert-dialog'

<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction>Continue</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: usar Dialog comum para confirmar remoção
// — clique fora do modal "cancela" silenciosamente, e o usuário nunca sabe
// se a remoção aconteceu ou não

// CERTO: toda remoção usa alert-dialog, que exige escolha explícita
<AlertDialog><AlertDialogContent><AlertDialogAction onClick={() => remover.mutate(id)} /></AlertDialogContent></AlertDialog>
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
// básico: exatamente como a doc oficial mostra
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent><SheetTitle>Edit profile</SheetTitle></SheetContent>
</Sheet>
```

```tsx
// caso real da stack
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

// a lista continua visível atrás: é a diferença prática para o dialog, que
// escurece e tira o contexto
<Sheet>
  <SheetTrigger asChild><Button variant="outline">Filtros</Button></SheetTrigger>
  <SheetContent side="right"><SheetTitle>Filtros</SheetTitle>{campos}</SheetContent>
</Sheet>
```

```tsx
// armadilha
// ERRADO: Sheet para confirmar remoção de um item
// — some sem exigir escolha explícita; clique fora fecha "sem querer"

// CERTO: remoção/ação destrutiva é alert-dialog, que não fecha ao clicar fora
<AlertDialog><AlertDialogContent /></AlertDialog>
```

#### popover
[doc](https://ui.shadcn.com/docs/components/base/popover) | [markdown](https://ui.shadcn.com/docs/components/base/popover.md)
**O que é:** um balão flutuante com conteúdo interativo, posicionado em relação a um gatilho.
**Para que serve:** conteúdo rico que aparece ao clicar, como um seletor de cor ou um mini
formulário.
**Quando usar:** quando o conteúdo é **interativo**. Se for só um texto explicativo, use `tooltip`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Place content for the popover here.</PopoverContent>
</Popover>
```

```tsx
// caso real da stack
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// abre por CLIQUE e o conteúdo é focável: tooltip não serve para nada que o
// usuário precise clicar ou digitar
<Popover>
  <PopoverTrigger asChild><Button variant="ghost">Período</Button></PopoverTrigger>
  <PopoverContent><Calendar mode="range" /></PopoverContent>
</Popover>
```

```tsx
// armadilha
// ERRADO: Tooltip com um formulário dentro (conteúdo interativo)
// — tooltip some ao tirar o mouse, antes do clique chegar ao campo

// CERTO: qualquer conteúdo que precise de clique ou digitação é popover
<Popover><PopoverTrigger /><PopoverContent><Input /></PopoverContent></Popover>
```

#### hover-card
[doc](https://ui.shadcn.com/docs/components/base/hover-card) | [markdown](https://ui.shadcn.com/docs/components/base/hover-card.md)
**O que é:** um cartão que aparece ao passar o mouse, com conteúdo mais rico que um tooltip.
**Para que serve:** prévia de perfil ou de link, sem clique.
**Quando usar:** só como enfeite informativo. **Não coloque nada essencial ali**, porque no toque não
existe passar o mouse.

```tsx
// básico: exatamente como a doc oficial mostra
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

<HoverCard>
  <HoverCardTrigger>Hover</HoverCardTrigger>
  <HoverCardContent>The React Framework – created and maintained by @vercel.</HoverCardContent>
</HoverCard>
```

```tsx
// caso real da stack
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

// no celular este conteúdo NUNCA aparece: só prévia, nunca informação ou ação
// que o usuário precise
<HoverCard>
  <HoverCardTrigger>{user.name}</HoverCardTrigger>
  <HoverCardContent>{user.document}</HoverCardContent>
</HoverCard>
```

```tsx
// armadilha
// ERRADO: colocar o único botão "Remover user" dentro do HoverCardContent
// — no toque não existe passar o mouse, a ação fica inacessível no celular

// CERTO: hover-card só para prévia; ação essencial mora fora dele
<HoverCard><HoverCardContent>{user.document}</HoverCardContent></HoverCard>
```

#### tooltip
[doc](https://ui.shadcn.com/docs/components/base/tooltip) | [markdown](https://ui.shadcn.com/docs/components/base/tooltip.md)
**O que é:** a dica de texto curta que aparece ao passar o mouse ou focar.
**Para que serve:** explicar um ícone sem rótulo.
**Quando usar:** em botão só de ícone, sempre. Vale lembrar que tooltip não substitui rótulo
acessível, o `aria-label` continua necessário.

```tsx
// básico: exatamente como a doc oficial mostra
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger>Hover</TooltipTrigger>
  <TooltipContent>Add to library</TooltipContent>
</Tooltip>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <Button size="icon"><Trash /></Button> sem aria-label, só com tooltip
// — tooltip é visual; leitor de tela não anuncia nada no botão

// CERTO: aria-label sempre, tooltip é reforço visual, não substituto
<Button size="icon" aria-label="Remover"><Trash /></Button>
```

#### command
[doc](https://ui.shadcn.com/docs/components/base/command) | [markdown](https://ui.shadcn.com/docs/components/base/command.md)
**O que é:** a paleta de comandos com busca, no estilo Cmd+K, com grupos e atalhos.
**Para que serve:** navegação e ações rápidas por teclado.
**Quando usar:** em aplicações densas, para usuários frequentes. É também a base do `combobox`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

<Command>
  <CommandInput placeholder="Type a command..." />
  <CommandList><CommandItem>Calendar</CommandItem></CommandList>
</Command>
```

```tsx
// caso real da stack
import { CommandDialog, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

// o atalho é código seu: o componente não registra listener de teclado
useEffect(() => {
  const h = (e: KeyboardEvent) => e.key === 'k' && e.metaKey && setAberto(true)
  document.addEventListener('keydown', h)
  return () => document.removeEventListener('keydown', h)
}, [])
```

```tsx
// armadilha
// ERRADO: esperar que CommandDialog abra sozinho com Cmd+K
// — o componente só desenha a paleta; o listener de teclado é código seu

// CERTO: registrar o listener e controlar `open` manualmente (ver efeito acima)
<CommandDialog open={aberto} onOpenChange={setAberto} />
```

## Componentes: exibição de dados

#### table
[doc](https://ui.shadcn.com/docs/components/base/table) | [markdown](https://ui.shadcn.com/docs/components/base/table.md)
**O que é:** os componentes de tabela estilizados: cabeçalho, corpo, linha, célula, legenda.
**Para que serve:** a marcação semântica de tabela, com aparência consistente.
**Quando usar:** para tabelas simples, sem ordenação nem filtro. Com essas features, veja
`data-table`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

<Table>
  <TableHeader><TableRow><TableHead>Invoice</TableHead></TableRow></TableHeader>
  <TableBody><TableRow><TableCell>INV001</TableCell></TableRow></TableBody>
</Table>
```

```tsx
// caso real da stack
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// só marcação e estilo: ordenar, filtrar e paginar é com o TanStack Table
<Table>
  <TableHeader><TableRow><TableHead>User</TableHead></TableRow></TableHeader>
  <TableBody>{linhas.map((l) => <TableRow key={l.id}><TableCell>{l.name}</TableCell></TableRow>)}</TableBody>
</Table>
```

```tsx
// armadilha
// ERRADO: implementar ordenação clicando no TableHead com useState manual
// — reimplementa o que o TanStack Table já resolve, e diverge do resto do app

// CERTO: tabela com ordenação/filtro é o padrão data-table, não Table puro
<Table>{/* motor: useReactTable — ver entrada data-table */}</Table>
```

#### data-table
[doc](https://ui.shadcn.com/docs/components/base/data-table) | [markdown](https://ui.shadcn.com/docs/components/base/data-table.md)
**O que é:** a receita de tabela completa, combinando os componentes de tabela com o TanStack Table:
ordenação, filtro, paginação, seleção e visibilidade de colunas.
**Para que serve:** a listagem de verdade de um painel administrativo.
**Quando usar:** **em toda listagem com filtro ou ordenação**. É um guia para copiar e adaptar, não
um componente instalável, e por isso vale ler com atenção antes de sair colando.

```tsx
// básico: exatamente a receita da doc oficial
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
```

```tsx
// caso real da stack
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

// `shadcn add data-table` NÃO existe: é código para copiar e adaptar.
// O motor é o TanStack Table; os componentes de <Table> só desenham.
const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

// com paginação no SERVIDOR, use manualPagination e mande a página pela URL,
// senão a tabela pagina só o que já está em memória
```

```tsx
// armadilha
// ERRADO: usar getPaginationRowModel() com dado já paginado pelo servidor
// — a tabela repagina em memória o que já chegou paginado, só mostra uma parte

// CERTO: manualPagination:true + pageCount vindo da API, página na URL
const table = useReactTable({ data, columns, manualPagination: true, pageCount })
```

#### chart
[doc](https://ui.shadcn.com/docs/components/base/chart) | [markdown](https://ui.shadcn.com/docs/components/base/chart.md)
**O que é:** os componentes de gráfico sobre Recharts, com tema, tooltip e legenda integrados ao
sistema de cores.
**Para que serve:** gráficos que combinam com o resto da interface e respeitam o modo escuro.
**Quando usar:** em dashboards. Usar Recharts direto funciona, mas aí a cor do gráfico não segue o
tema.

```tsx
// básico: exatamente como a doc oficial mostra
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'

const chartConfig = { desktop: { label: 'Desktop', color: 'var(--chart-1)' } }
<ChartContainer config={chartConfig}><BarChart data={chartData} /></ChartContainer>
```

```tsx
// caso real da stack
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'

// as cores saem do config, que aponta para variáveis CSS: o gráfico troca
// junto com o tema, sem hex escrito no componente
const config = { total: { label: 'Total', color: 'var(--chart-1)' } }
<ChartContainer config={config}><BarChart data={dados}><ChartTooltip /></BarChart></ChartContainer>
```

```tsx
// armadilha
// ERRADO: <Bar fill="#2563eb" /> com hex fixo direto no Recharts
// — não muda no modo escuro, porque não é token do tema

// CERTO: cor vem do config, que referencia a variável CSS do tema
<Bar dataKey="total" fill="var(--color-total)" />
```

#### badge
[doc](https://ui.shadcn.com/docs/components/base/badge) | [markdown](https://ui.shadcn.com/docs/components/base/badge.md)
**O que é:** o rótulo pequeno, com variantes de cor.
**Para que serve:** status, categoria e contagem.
**Quando usar:** em tabelas e cards, para status. Mapeie o valor do status para a variante num lugar
só, em vez de repetir o `if` em cada tela.

```tsx
// básico: exatamente como a doc oficial mostra
import { Badge } from '@/components/ui/badge'

<Badge variant="secondary">Badge</Badge>
```

```tsx
// caso real da stack
import { Badge } from '@/components/ui/badge'

// um lookup, não um if espalhado por tela: status novo se resolve num lugar só
const VARIANTE = { ATIVO: 'default', INATIVO: 'secondary', REMOVIDO: 'destructive' } as const

<Badge variant={VARIANTE[user.status]}>{user.status}</Badge>
```

```tsx
// armadilha
// ERRADO: if (status === 'ATIVO') variant = 'default'; else if (...) ...
// repetido em cada tela que mostra o status

// CERTO: lookup object único, importado onde precisar (regra 6 de typescript.md)
<Badge variant={VARIANTE[user.status]}>{user.status}</Badge>
```

#### avatar
[doc](https://ui.shadcn.com/docs/components/base/avatar) | [markdown](https://ui.shadcn.com/docs/components/base/avatar.md)
**O que é:** a imagem de perfil circular, com fallback de iniciais quando a imagem falha.
**Para que serve:** representar usuário ou user.
**Quando usar:** em cabeçalho, listagem e comentários. O fallback evita o ícone de imagem quebrada.

```tsx
// básico: exatamente como a doc oficial mostra
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

```tsx
// caso real da stack
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// o fallback cobre os dois casos: sem avatar e com URL quebrada
<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
</Avatar>
```

```tsx
// armadilha
// ERRADO: <img src={user.avatarUrl ?? '/placeholder.png'} /> só
// — se a URL existir mas a imagem falhar (404), fica o ícone de imagem quebrada

// CERTO: AvatarFallback cobre os dois casos (sem URL e URL que falha)
<Avatar><AvatarImage src={user.avatarUrl} /><AvatarFallback>CN</AvatarFallback></Avatar>
```

#### card
[doc](https://ui.shadcn.com/docs/components/base/card) | [markdown](https://ui.shadcn.com/docs/components/base/card.md)
**O que é:** o contêiner com cabeçalho, título, descrição, conteúdo e rodapé.
**Para que serve:** agrupar informação relacionada num bloco visual.
**Quando usar:** em toda parte. Cuidado com card dentro de card dentro de card, que polui mais do
que organiza.

```tsx
// básico: exatamente como a doc oficial mostra
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader><CardTitle>Card Title</CardTitle></CardHeader>
  <CardContent>Card Content</CardContent>
</Card>
```

```tsx
// caso real da stack
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// card dentro de card multiplica bordas e sombras: use separator ou espaçamento
// para dividir seções INTERNAS
<Card>
  <CardHeader><CardTitle>Acme</CardTitle><CardDescription>12.345.678/0001-99</CardDescription></CardHeader>
  <CardContent>{detalhes}</CardContent>
</Card>
```

```tsx
// armadilha
// ERRADO: <Card><CardContent><Card>{secaoInterna}</Card></CardContent></Card>
// — borda e sombra se multiplicam, visual fica poluído

// CERTO: dividir seção interna com Separator ou só espaçamento, sem novo Card
<Card><CardContent><Separator className="my-4" />{secaoInterna}</CardContent></Card>
```

#### item
[doc](https://ui.shadcn.com/docs/components/base/item) | [markdown](https://ui.shadcn.com/docs/components/base/item.md)
**O que é:** o item de lista estruturado, com área de mídia, conteúdo e ações.
**Para que serve:** listas com ícone à esquerda, texto no meio e ação à direita.
**Quando usar:** em listas de configurações e de resultados. Evita remontar esse layout de flexbox
toda vez.

```tsx
// básico: exatamente como a doc oficial mostra
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'

<Item>
  <ItemContent><ItemTitle>Basic Item</ItemTitle></ItemContent>
</Item>
```

```tsx
// caso real da stack
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item'

// o layout ícone / texto / ação já vem resolvido, inclusive o truncamento do
// texto longo no meio
<Item>
  <ItemMedia><Buildings /></ItemMedia>
  <ItemContent><ItemTitle>Acme</ItemTitle></ItemContent>
  <ItemActions><Button size="sm">Ver</Button></ItemActions>
</Item>
```

```tsx
// armadilha
// ERRADO: <div className="flex items-center gap-2">{icone}{texto}{acao}</div>
// remontado em cada lista — trunca texto longo diferente em cada tela

// CERTO: Item já resolve o layout e o truncamento de forma consistente
<Item><ItemMedia /><ItemContent /><ItemActions /></Item>
```

#### empty
[doc](https://ui.shadcn.com/docs/components/base/empty) | [markdown](https://ui.shadcn.com/docs/components/base/empty.md)
**O que é:** o estado vazio, com ícone, título, descrição e ação.
**Para que serve:** transformar "nenhum resultado" em algo útil, com um caminho de saída.
**Quando usar:** **em toda listagem**. Estado vazio é a parte mais esquecida de uma tela e a que mais
frustra quem chega primeiro no sistema.

```tsx
// básico: exatamente como a doc oficial mostra
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'

<Empty>
  <EmptyTitle>No Projects Yet</EmptyTitle>
  <EmptyDescription>You haven&apos;t created any projects yet.</EmptyDescription>
</Empty>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: mesmo texto "Nenhum post ainda" tanto sem dado quanto com filtro sem
// resultado — convida a "criar" quando o problema real é o filtro aplicado

// CERTO: texto depende da causa (lista vazia vs. filtro sem resultado)
<Empty><EmptyTitle>{filtroAtivo ? 'Nada encontrado' : 'Nenhum post ainda'}</EmptyTitle></Empty>
```

#### skeleton
[doc](https://ui.shadcn.com/docs/components/base/skeleton) | [markdown](https://ui.shadcn.com/docs/components/base/skeleton.md)
**O que é:** o bloco cinza que representa o conteúdo enquanto carrega.
**Para que serve:** carregamento que preserva o layout, evitando o pulo quando o conteúdo chega.
**Quando usar:** para carregamento inicial. Desenhe o esqueleto parecido com o conteúdo real, senão
o pulo continua.

```tsx
// básico: exatamente como a doc oficial mostra
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-4 w-[250px]" />
```

```tsx
// caso real da stack
import { Skeleton } from '@/components/ui/skeleton'

// as MEDIDAS precisam bater com o conteúdo real: esqueleto de 3 linhas para um
// card de 8 pula do mesmo jeito, e aí ele não serviu para nada
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
</div>
```

```tsx
// armadilha
// ERRADO: um só <Skeleton className="h-4" /> genérico para um card com avatar + 3 linhas
// — layout pula do mesmo jeito quando o conteúdo real chega

// CERTO: um skeleton por bloco real, nas mesmas medidas do conteúdo final
<div className="flex gap-2"><Skeleton className="size-10 rounded-full" /><Skeleton className="h-4 w-40" /></div>
```

#### spinner
[doc](https://ui.shadcn.com/docs/components/base/spinner) | [markdown](https://ui.shadcn.com/docs/components/base/spinner.md)
**O que é:** o indicador circular de carregamento.
**Para que serve:** sinalizar processamento em espaços pequenos, como dentro de um botão.
**Quando usar:** em botão durante o envio. Para carregar uma tela inteira, `skeleton` é melhor.

```tsx
// básico: exatamente como a doc oficial mostra
import { Spinner } from '@/components/ui/spinner'

<Spinner />
```

```tsx
// caso real da stack
import { Spinner } from '@/components/ui/spinner'

// desabilitar junto evita o envio duplo por clique impaciente
<Button disabled={mutation.isPending}>
  {mutation.isPending && <Spinner className="mr-2" />}
  Salvar
</Button>
```

```tsx
// armadilha
// ERRADO: <Spinner /> cobrindo a tela inteira para um carregamento previsível
// — pula o layout todo quando o conteúdo chega, sem reservar espaço

// CERTO: tela inteira usa skeleton, do tamanho do conteúdo final; spinner é
// só para espaço pequeno (botão, ícone)
<Skeleton className="h-screen w-full" />
```

#### progress
[doc](https://ui.shadcn.com/docs/components/base/progress) | [markdown](https://ui.shadcn.com/docs/components/base/progress.md)
**O que é:** a barra de progresso, determinada ou indeterminada.
**Para que serve:** mostrar avanço mensurável.
**Quando usar:** em upload e processamento com percentual conhecido. Sem percentual, `spinner`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Progress } from '@/components/ui/progress'

<Progress value={33} />
```

```tsx
// caso real da stack
import { Progress } from '@/components/ui/progress'

// barra sem percentual real (fake progress) mente para o usuário: sem número
// confiável, spinner é mais honesto
<Progress value={(enviados / total) * 100} />
```

```tsx
// armadilha
// ERRADO: <Progress value={progressoFalso} /> animado sozinho sem relação com
// upload real — mente sobre o quanto falta

// CERTO: sem percentual confiável, use spinner — é mais honesto que fingir
<Spinner />
```

#### separator
[doc](https://ui.shadcn.com/docs/components/base/separator) | [markdown](https://ui.shadcn.com/docs/components/base/separator.md)
**O que é:** a linha divisória, horizontal ou vertical, com semântica correta.
**Para que serve:** separar seções visualmente.
**Quando usar:** entre grupos de conteúdo. Marque como decorativo quando for só visual, para o leitor
de tela não anunciar.

```tsx
// básico: exatamente como a doc oficial mostra
import { Separator } from '@/components/ui/separator'

<Separator />
```

```tsx
// caso real da stack
import { Separator } from '@/components/ui/separator'

// decorative: some da árvore de acessibilidade. Sem isso, o leitor de tela
// anuncia cada linha como um marco de seção.
<Separator decorative orientation="vertical" className="h-6" />
```

```tsx
// armadilha
// ERRADO: <Separator /> sem `decorative` dentro de uma lista puramente visual
// — leitor de tela anuncia cada linha como marco de seção, virando ruído

// CERTO: decorative quando a linha é só visual, sem significado estrutural
<Separator decorative />
```

#### aspect-ratio
[doc](https://ui.shadcn.com/docs/components/base/aspect-ratio) | [markdown](https://ui.shadcn.com/docs/components/base/aspect-ratio.md)
**O que é:** o contêiner que mantém uma proporção fixa.
**Para que serve:** imagens e vídeos que não deformam o layout ao carregar.
**Quando usar:** em galerias e capas. Evita o pulo de layout quando a imagem chega.

```tsx
// básico: exatamente como a doc oficial mostra
import { AspectRatio } from '@/components/ui/aspect-ratio'

<AspectRatio ratio={16 / 9}><img src="..." alt="..." /></AspectRatio>
```

```tsx
// caso real da stack
import { AspectRatio } from '@/components/ui/aspect-ratio'

// o espaço é reservado ANTES da imagem carregar: sem isso a grade inteira
// pula quando as fotos chegam
<AspectRatio ratio={4 / 3}>
  <img src={post.imagemUrl} alt={post.name} className="h-full w-full object-cover" />
</AspectRatio>
```

```tsx
// armadilha
// ERRADO: <img src={post.imagemUrl} className="w-full" /> sem contêiner de proporção
// — grade inteira pula de altura enquanto cada foto carrega

// CERTO: AspectRatio reserva o espaço antes da imagem chegar
<AspectRatio ratio={4 / 3}><img src={post.imagemUrl} className="object-cover" /></AspectRatio>
```

#### scroll-area
[doc](https://ui.shadcn.com/docs/components/base/scroll-area) | [markdown](https://ui.shadcn.com/docs/components/base/scroll-area.md)
**O que é:** a área rolável com barra de rolagem customizada e consistente entre navegadores.
**Para que serve:** rolagem interna sem a barra nativa feia do Windows.
**Quando usar:** em listas dentro de painéis e modais. Confira o comportamento no celular antes de
adotar em tudo.

```tsx
// básico: exatamente como a doc oficial mostra
import { ScrollArea } from '@/components/ui/scroll-area'

<ScrollArea className="h-72 w-48 rounded-md border">{itens}</ScrollArea>
```

```tsx
// caso real da stack
import { ScrollArea } from '@/components/ui/scroll-area'

// exige ALTURA definida: sem h- ou max-h, não há o que rolar e o componente
// não faz nada
<ScrollArea className="h-72">{itens}</ScrollArea>
```

```tsx
// armadilha
// ERRADO: <ScrollArea>{itens}</ScrollArea> sem h-/max-h nenhum
// — sem altura definida não há overflow, o componente não rola nada

// CERTO: sempre com altura fixa ou max-h explícita na classe
<ScrollArea className="h-72">{itens}</ScrollArea>
```

#### collapsible
[doc](https://ui.shadcn.com/docs/components/base/collapsible) | [markdown](https://ui.shadcn.com/docs/components/base/collapsible.md)
**O que é:** uma seção que abre e fecha, sem a coordenação de grupo do accordion.
**Para que serve:** esconder detalhes opcionais.
**Quando usar:** para um bloco isolado. Com vários itens coordenados, use `accordion`.

```tsx
// básico: exatamente como a doc oficial mostra
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

<Collapsible>
  <CollapsibleTrigger>Can I use this in my project?</CollapsibleTrigger>
  <CollapsibleContent>Yes. Free to use for personal and commercial projects.</CollapsibleContent>
</Collapsible>
```

```tsx
// caso real da stack
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// um bloco só, sem coordenação com vizinhos: "filtros avançados" é o caso
// clássico
<Collapsible>
  <CollapsibleTrigger>Filtros avançados</CollapsibleTrigger>
  <CollapsibleContent>{campos}</CollapsibleContent>
</Collapsible>
```

```tsx
// armadilha
// ERRADO: três Collapsible soltos onde só um deveria ficar aberto por vez
// — cada um abre/fecha sozinho, sem coordenação nenhuma entre os três

// CERTO: vários itens coordenados (só um aberto por vez) é accordion
<Accordion type="single"><AccordionItem value="a" /></Accordion>
```

#### accordion
[doc](https://ui.shadcn.com/docs/components/base/accordion) | [markdown](https://ui.shadcn.com/docs/components/base/accordion.md)
**O que é:** vários painéis retráteis coordenados, com modo de um aberto por vez ou vários.
**Para que serve:** perguntas frequentes e formulários longos em seções.
**Quando usar:** com conteúdo em seções mutuamente exclusivas. Não esconda campo obrigatório dentro
de accordion fechado.

```tsx
// básico: exatamente como a doc oficial mostra
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
  </AccordionItem>
</Accordion>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: <AccordionContent>{campoObrigatorioCep}</AccordionContent> fechado por padrão
// — usuário envia, VineJS rejeita, e o campo inválido fica escondido na seção fechada

// CERTO: campo obrigatório fica fora do accordion, ou a seção abre por padrão
<Accordion type="single" defaultValue="entrega"><AccordionItem value="entrega" /></Accordion>
```

#### carousel
[doc](https://ui.shadcn.com/docs/components/base/carousel) | [markdown](https://ui.shadcn.com/docs/components/base/carousel.md)
**O que é:** o carrossel sobre Embla, com gesto de arrastar e navegação por teclado.
**Para que serve:** galeria de imagens e destaques.
**Quando usar:** em galeria de post. Para conteúdo importante, carrossel esconde informação, e
grade costuma servir melhor.

```tsx
// básico: exatamente como a doc oficial mostra
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'

<Carousel>
  <CarouselContent><CarouselItem>1</CarouselItem></CarouselContent>
</Carousel>
```

```tsx
// caso real da stack
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

// só o primeiro slide é visto pela maioria: nada essencial a partir do segundo
<Carousel>
  <CarouselContent>{fotos.map((f) => <CarouselItem key={f.id}><img src={f.url} alt="" /></CarouselItem>)}</CarouselContent>
  <CarouselPrevious /><CarouselNext />
</Carousel>
```

```tsx
// armadilha
// ERRADO: colocar o preço ou a única CTA de compra só no terceiro slide
// — a maioria do tráfego nunca arrasta até lá, informação essencial se perde

// CERTO: conteúdo essencial fora do carrossel; carrossel é só para destaque
<Carousel><CarouselContent><CarouselItem>{fotoDestaque}</CarouselItem></CarouselContent></Carousel>
```

#### resizable
[doc](https://ui.shadcn.com/docs/components/base/resizable) | [markdown](https://ui.shadcn.com/docs/components/base/resizable.md)
**O que é:** painéis com divisórias arrastáveis, horizontais e verticais.
**Para que serve:** layouts em que o usuário ajusta a proporção, como lista e prévia.
**Quando usar:** em ferramentas do tipo editor ou cliente de e-mail. Salve as proporções, senão o
usuário reajusta toda vez.

```tsx
// básico: exatamente como a doc oficial mostra
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel>One</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel>Two</ResizablePanel>
</ResizablePanelGroup>
```

```tsx
// caso real da stack
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

// autoSaveId persiste as proporções: sem ele, o usuário reajusta a cada visita
<ResizablePanelGroup direction="horizontal" autoSaveId="painel-posts">
  <ResizablePanel defaultSize={30}>{lista}</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>{previa}</ResizablePanel>
</ResizablePanelGroup>
```

```tsx
// armadilha
// ERRADO: ResizablePanelGroup sem autoSaveId em painel usado todo dia
// — usuário reajusta a proporção a cada visita, sempre do zero

// CERTO: autoSaveId persiste a proporção entre sessões
<ResizablePanelGroup direction="horizontal" autoSaveId="painel-posts" />
```

#### toast
[doc](https://ui.shadcn.com/docs/components/base/toast) | [markdown](https://ui.shadcn.com/docs/components/base/toast.md)
**O que é:** a notificação temporária de canto, com título, descrição e ação. **Duas gerações
coexistem**: a doc oficial atual mostra o wrapper `base-*` em cima do `Toast` do Base UI
(`toast.add()`, de `@/components/ui/toast`) e deprecia o componente antigo que usava o pacote
`sonner` direto. Nos dois projetos daqui, porém, **é o `sonner` que está de fato em uso** — `ui/toast.tsx`
(o wrapper novo) existe no repo mas não tem nenhum import, e `ui/sonner.tsx` é o `<Toaster />`
realmente montado no root.
**Para que serve:** confirmar que a ação deu certo sem interromper o fluxo.
**Quando usar:** depois de salvar, remover ou copiar. **Não use para erro que exige leitura atenta**,
porque ele some sozinho — nesse caso é `alert` fixo na tela. **Para código novo aqui, siga o padrão
`sonner` que já está montado** (`toast.success`/`toast.error`); `toast.add()` do wrapper `base-*` é
código morto nos dois repos até migrar.

```tsx
// básico: o <Toaster /> do sonner já está montado uma vez no root da rota —
// em componentes de tela só se importa o disparador
import { toast } from 'sonner'

toast.success('Endereço copiado.')
```

```tsx
// caso comum: ação com id fixo (evita duplicar toast em clique repetido) e
// callback de desfazer
function removerItem(itemId: string): void {
  toast.success('Item removido', {
    id: `remover-${itemId}`,
    action: { label: 'Desfazer', onClick: () => restaurarItem(itemId) },
  })
}
```

```tsx
// pitfall: toast.add({ type, ... }) é da OUTRA geração (wrapper base-* não
// usado aqui) e não existe no sonner — nestes dois repos isso é runtime error
// ERRADO:
// toast.add({ type: 'success', description: 'Usuário aprovado' })

// CORRETO (sonner, o que está montado):
toast.success('Usuário aprovado')

// erro "esqueça e siga" ainda pode ser toast; erro que precisa de leitura e
// ação do usuário é Alert, não Toast — ele some sozinho em poucos segundos
toast.error('Falha ao salvar', { id: 'storage-create-error' })
```

#### alert
[doc](https://ui.shadcn.com/docs/components/base/alert) | [markdown](https://ui.shadcn.com/docs/components/base/alert.md)
**O que é:** o aviso fixo dentro do conteúdo, com variantes de destaque.
**Para que serve:** informação persistente e contextual, como um erro de formulário ou um aviso de
conta pendente.
**Quando usar:** quando a mensagem precisa **ficar** na tela. É o complemento do toast, não o
concorrente.

```tsx
// básico: exatamente como a doc oficial mostra
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

<Alert>
  <AlertTitle>Success! Your changes have been saved</AlertTitle>
  <AlertDescription>This is an alert with icon, title and description.</AlertDescription>
</Alert>
```

```tsx
// caso real da stack
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

```tsx
// armadilha
// ERRADO: toast.error('Cadastro em análise') para um estado que persiste
// — some em poucos segundos, e o usuário nem leu a mensagem inteira

// CERTO: estado que precisa ficar visível é Alert fixo, não Toast
<Alert variant="destructive"><AlertTitle>Cadastro em análise</AlertTitle></Alert>
```

#### kbd
[doc](https://ui.shadcn.com/docs/components/base/kbd) | [markdown](https://ui.shadcn.com/docs/components/base/kbd.md)
**O que é:** a representação visual de uma tecla ou combinação.
**Para que serve:** documentar atalhos dentro da interface.
**Quando usar:** em menus e na paleta de comandos, ao lado da ação correspondente.

```tsx
// básico: exatamente como a doc oficial mostra
import { Kbd } from '@/components/ui/kbd'

<Kbd>Ctrl + K</Kbd>
```

```tsx
// caso real da stack
import { Kbd } from '@/components/ui/kbd'

// o símbolo muda por sistema: ⌘ no macOS, Ctrl no resto. Fixar um confunde
// metade dos usuários.
<Kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</Kbd>
<Kbd>K</Kbd>
```

```tsx
// armadilha
// ERRADO: <Kbd>Ctrl</Kbd><Kbd>K</Kbd> fixo em todo navegador, inclusive macOS
// — metade dos usuários lê um atalho que não existe no próprio teclado

// CERTO: símbolo condicional ao sistema operacional
<Kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</Kbd>
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

#### docs/rtl/start
[doc](https://ui.shadcn.com/docs/rtl/start) | [markdown](https://ui.shadcn.com/docs/rtl/start.md)
**O que é:** o guia de RTL específico para TanStack Start — onde montar o `DirectionProvider` e o
`dir` do `<html>` na rota raiz.
**Para que serve:** não esquecer a metade do RTL que o `DirectionProvider` **não** cobre (o `dir` do
HTML em si).
**Quando usar:** só se o projeto precisar suportar um idioma RTL — hoje `rtl: false` no
`components.json` dos dois projetos, não está em uso.

```tsx
// __root.tsx: o dir do <html> é seu, o provider só cobre o comportamento
<html dir="rtl">
  <DirectionProvider dir="rtl">{children}</DirectionProvider>
</html>
```

## Componentes: conversa

#### bubble
[doc](https://ui.shadcn.com/docs/components/base/bubble) | [markdown](https://ui.shadcn.com/docs/components/base/bubble.md)
**O que é:** o balão de mensagem, com variantes de remetente.
**Para que serve:** a bolha de fala numa conversa.
**Quando usar:** em interface de chat.

```tsx
// básico: exatamente como a doc oficial mostra
import { Bubble } from '@/components/ui/bubble'

<Bubble variant="sent">Hello!</Bubble>
```

```tsx
// caso real da stack
import { Bubble } from '@/components/ui/bubble'

// a variante decide alinhamento e cor: quem enviou fica de um lado, quem
// recebeu do outro, sem CSS condicional espalhado
<Bubble variant={mensagem.deMim ? 'sent' : 'received'}>{mensagem.texto}</Bubble>
```

```tsx
// armadilha
// ERRADO: className={mensagem.deMim ? 'ml-auto bg-primary' : 'bg-muted'} na mão
// — reimplementa o que a variante já resolve, e diverge do resto do chat

// CERTO: variant decide alinhamento e cor, sem classe condicional espalhada
<Bubble variant={mensagem.deMim ? 'sent' : 'received'} />
```

#### message
[doc](https://ui.shadcn.com/docs/components/base/message) | [markdown](https://ui.shadcn.com/docs/components/base/message.md)
**O que é:** a mensagem completa, com autor, conteúdo, horário e ações.
**Para que serve:** o item de uma lista de conversa.
**Quando usar:** em chat e em assistente de IA.

```tsx
// básico: exatamente como a doc oficial mostra
import { Message, MessageContent } from '@/components/ui/message'

<Message>
  <MessageContent>Hello!</MessageContent>
</Message>
```

```tsx
// caso real da stack
import { Message, MessageContent, MessageHeader } from '@/components/ui/message'

// o Bubble é só o balão; Message é a linha inteira, com autor, horário e ações
<Message>
  <MessageHeader>{m.autor}</MessageHeader>
  <MessageContent>{m.texto}</MessageContent>
</Message>
```

```tsx
// armadilha
// ERRADO: usar só Bubble numa lista de chat com vários autores
// — falta autor, horário e ações; some a informação de quem disse o quê

// CERTO: Message é a linha inteira (autor + conteúdo + ações); Bubble é só o balão
<Message><MessageHeader>{m.autor}</MessageHeader><MessageContent>{m.texto}</MessageContent></Message>
```

#### message-scroller
[doc](https://ui.shadcn.com/docs/components/base/message-scroller) | [markdown](https://ui.shadcn.com/docs/components/base/message-scroller.md)
**O que é:** o contêiner rolável de mensagens, que fixa no fim mas respeita a rolagem manual do
usuário.
**Para que serve:** o comportamento de rolagem que todo chat precisa e quase ninguém acerta de
primeira.
**Quando usar:** em qualquer lista de mensagens, especialmente com streaming.

```tsx
// básico: exatamente como a doc oficial mostra
import { MessageScroller } from '@/components/ui/message-scroller'

<MessageScroller>{mensagens}</MessageScroller>
```

```tsx
// caso real da stack
import { MessageScroller } from '@/components/ui/message-scroller'

// com streaming a lista cresce a cada token: sem este componente, ou a tela
// não acompanha, ou ela arranca o usuário do trecho que ele estava lendo
<MessageScroller>{mensagens.map((m) => <Message key={m.id} {...m} />)}</MessageScroller>
```

```tsx
// armadilha
// ERRADO: <div ref={scrollRef} className="overflow-y-auto">{mensagens}</div>
// com scrollIntoView manual a cada mensagem nova — arranca o usuário do
// trecho que ele estava lendo quando ele rolou para cima

// CERTO: MessageScroller já respeita a rolagem manual do usuário
<MessageScroller>{mensagens}</MessageScroller>
```

#### attachment
[doc](https://ui.shadcn.com/docs/components/base/attachment) | [markdown](https://ui.shadcn.com/docs/components/base/attachment.md)
**O que é:** a exibição de arquivo anexado, com ícone por tipo, nome, tamanho e remoção.
**Para que serve:** listar anexos antes ou depois do envio.
**Quando usar:** em formulário com upload e em conversa com arquivos.

```tsx
// básico: exatamente como a doc oficial mostra
import { Attachment } from '@/components/ui/attachment'

<Attachment name="file.pdf" size={1024} />
```

```tsx
// caso real da stack
import { Attachment } from '@/components/ui/attachment'

// mostrar nome e TAMANHO antes do envio evita o upload que morre no limite do
// servidor depois de dois minutos
<Attachment name={arquivo.name} size={arquivo.size} onRemove={() => remover(arquivo)} />
```

```tsx
// armadilha
// ERRADO: deixar o usuário anexar um arquivo de 80MB sem mostrar o tamanho antes
// — upload morre no limite do servidor só depois de dois minutos de espera

// CERTO: Attachment mostra nome e tamanho antes do envio, falha fica visível já
<Attachment name={arquivo.name} size={arquivo.size} />
```

## Fora de escopo

- installation/next, installation/remix, installation/astro, installation/laravel,
  installation/gatsby, installation/react-router, installation/tanstack-router (framework não usado
  aqui; TanStack Start tem guia próprio em `installation/tanstack`)
- installation/vite (Vite puro sem TanStack Start — redundante com o guia do Start)
- installation/manual
- dark-mode (índice), dark-mode/next, dark-mode/astro, dark-mode/remix (frameworks não usados; já
  cobertos `dark-mode/tanstack-start` e `dark-mode/vite`)
- rtl (índice), rtl/next, rtl/vite (já cobertos `direction` e `rtl/start`, específico de Start)
- forms (índice), forms/next (já cobertos os três guias de lib de formulário em `forms/*`)
- v0 (integração com o builder visual v0 da Vercel)
- docs/mcp (servidor MCP de propósito geral; `docs/registry/mcp` já cobre o uso real: registries)
- docs/registry/faq
- schema/registry.json, schema/registry-item.json (referência JSON pura, não página de uso)
