# Vite

Servidor de desenvolvimento e ferramenta de build que roda por baixo de todo o frontend.

**O que é:** duas ferramentas no mesmo pacote. Em desenvolvimento, um servidor que entrega os
módulos como ESM nativo para o navegador, sem empacotar nada, o que faz o `pnpm dev` subir em
milissegundos independente do tamanho do projeto. Em produção, um build empacotado e otimizado — a
partir do **Vite 8** com o **Rolldown**, bundler escrito em Rust que substituiu o Rollup. O ponto de
encontro das duas metades é o `vite.config.ts` e sua lista de plugins.

**Para que serve:** num app React moderno, o Vite é onde meia dúzia de ferramentas se encaixam. Um
`vite.config.ts` típico carrega, em ordem, os devtools do TanStack, o compilador de mensagens do
i18n, o Nitro (que produz o servidor de produção), o Tailwind 4, o TanStack Start, o plugin do React
e o Babel do React Compiler. Nenhuma dessas ferramentas fala com a outra diretamente: todas falam
com o Vite. É também quem decide o que vira variável de ambiente no navegador (`VITE_`), o que vira
URL de asset e o que sai do bundle.

**Como usar:** em projeto criado pelo TanStack Start ninguém instala Vite à mão — ele já vem como
dependência — e o que se escreve é a configuração:

```ts
// vite.config.ts — a ordem dos plugins é o contrato do arquivo
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Vite 8 lê os `paths` do tsconfig sem plugin externo: `@/*` funciona.
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})
```

```bash
pnpm dev      # vite dev --host --port 3000
pnpm build    # vite build → .output/ (Nitro), não dist/
pnpm preview  # vite preview, serve o build para conferir antes do deploy
```

**Quando adotar a biblioteca:** num projeto com TanStack Start a pergunta não se coloca — o Vite sai
junto, como dependência. A dúvida real é **onde termina o Start e onde começa o Vite**: são camadas,
não alternativas — nenhuma linha da tabela de "onde um dado mora" é do Vite, e é proposital. SSR,
server function, rota de API e deploy são do **Start** (veja
[`tanstack-start.md`](tanstack-start.md)); resolução de módulo, transformação de arquivo, variável
de ambiente, asset e plugin são do **Vite**; e o formato do servidor de produção é do **Nitro**
(veja [`nitro.md`](nitro.md)). Configurar SSR na mão pela doc do Vite, com o Start no projeto, é
reescrever o que ele já faz — e é o erro que a seção "Integração" abaixo existe para evitar.

**Links:** 25. Um terço deles é para quem escreve plugin ou framework, e não para quem escreve tela.
Estão marcados como tal.

---

## Fundamentos

#### índice
[doc](https://vite.dev/guide/)

**O que é:** a porta de entrada do guia: o que o Vite faz, requisitos de Node, `pnpm create vite`,
os templates oficiais e a estrutura mínima de um projeto.
**Para que serve:** ter o mapa antes de cair numa página específica, e conferir a versão de Node que
a versão instalada exige.
**Quando usar:** na primeira semana, e quando um erro de instalação parecer ambiental. Quem parte do
TanStack Start não cria o projeto por aqui, mas a lista de requisitos vale para os dois caminhos.

```bash
# O caminho de quem começa pelo TanStack Start (o scaffold já traz o Vite):
npx @tanstack/cli@latest create

# O caminho de quem começa pelo Vite puro:
pnpm create vite

# O que interessa desta página: as versões que o Vite 8 exige.
node --version   # >= 20.19 ou >= 22.12
pnpm vite --version
```

#### philosophy
[doc](https://vite.dev/guide/philosophy)

**O que é:** os princípios de projeto declarados do Vite: ser opinativo no que é comum, extensível
no resto, priorizar a experiência de desenvolvimento e manter uma API estável para quem constrói
framework em cima.
**Para que serve:** entender por que certas coisas **não** são configuráveis, e por que o time do
Vite empurra soluções para plugins em vez de para o núcleo.
**Quando usar:** quando bater a vontade de abrir uma issue pedindo uma opção nova, ou quando for
preciso decidir se um comportamento estranho é bug ou escolha. É leitura de contexto, não de
tarefa — leia uma vez e siga.

```ts
// A filosofia aparece na prática: o núcleo não sabe o que é Tailwind, React
// ou i18n. Tudo isso é plugin, e é por isso que o array abaixo existe.
export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})
```

#### why
[doc](https://vite.dev/guide/why)

**O que é:** a justificativa técnica do Vite: por que o bundle em desenvolvimento ficou lento, como
o ESM nativo no navegador resolve isso, e por que ainda existe um bundler para produção.
**Para que serve:** entender a assimetria que causa a maior parte da confusão — **dev e build são
dois caminhos de código diferentes** —, e por isso um bug pode existir só em um dos dois.
**Quando usar:** **na primeira vez que algo funcionar em `pnpm dev` e quebrar em `pnpm build`**.
Esta página explica por que isso é possível, e é o que impede de perder uma tarde procurando o bug
no lugar errado.

```bash
# O sintoma clássico: passa aqui...
pnpm dev

# ...e quebra aqui, porque o caminho é outro.
pnpm build && pnpm preview
```

#### features
[doc](https://vite.dev/guide/features)

**O que é:** o catálogo do que o Vite faz sem configuração nenhuma: TypeScript, JSX, CSS Modules,
PostCSS, JSON, WebAssembly, Web Workers, `import.meta.glob`, e os sufixos de importação `?raw`,
`?url`, `?inline`.
**Para que serve:** descobrir que o recurso que você ia instalar já vem embutido. É a página com a
maior taxa de "não precisava de plugin".
**Quando usar:** **antes de adicionar qualquer dependência de build**. E especificamente quando
precisar importar muitos arquivos de uma pasta: `import.meta.glob` resolve com uma linha o que
normalmente vira um `index.ts` escrito à mão que alguém sempre esquece de atualizar.

```ts
// Importa todos os arquivos de uma pasta sem manter um index.ts à mão.
// `eager: true` importa de fato; sem ele, o valor é uma função que carrega sob demanda.
const modules = import.meta.glob('./locales/*.json', { eager: true })

// Os sufixos: o mesmo arquivo, três resultados diferentes.
import conteudo from './termos.md?raw' // string com o conteúdo
import urlDoIcone from './logo.svg?url' // caminho final, com hash
import estiloInline from './print.css?inline' // CSS como string, sem injetar na página
```

#### cli
[doc](https://vite.dev/guide/cli)

**O que é:** a referência dos três comandos — `vite` (ou `vite dev`), `vite build` e `vite preview` —
com todas as flags: `--host`, `--port`, `--force`, `--mode`, `--outDir`, `--debug`.
**Para que serve:** saber o que cada script do `package.json` realmente faz, e ter as flags de
emergência à mão.
**Quando usar:** ao mexer nos scripts, e **quando o dev server começar a servir código velho** — a
flag para isso é `--force`, que descarta o cache de pré-bundling. Repare também que **`vite preview`
não é um servidor de produção**: ele serve o build só para conferência local. Num app com SSR quem
roda em produção é o servidor gerado pelo Nitro (`node .output/server/index.mjs`).

```bash
# O que costuma estar no package.json:
vite dev --host --port 3000   # --host expõe na rede local, útil para testar no celular
vite build
vite preview

# As duas flags de emergência:
pnpm dev --force              # limpa node_modules/.vite e re-otimiza as dependências
pnpm build --mode staging     # troca qual .env é carregado (veja env-and-mode)
```

## Configuração

#### config
[doc](https://vite.dev/config/)

**O que é:** a referência completa do `vite.config.ts`: `plugins`, `resolve`, `server`, `build`,
`css`, `optimizeDeps`, `define`, `envPrefix`, `base`, e a forma de função
(`defineConfig(({ command, mode }) => ...)`) para configuração condicional.
**Para que serve:** achar a opção certa antes de contornar o problema com um plugin ou com um script
de shell.
**Quando usar:** sempre que o `vite.config.ts` precisar mudar. Duas opções que quase todo projeto
acaba usando vivem aqui: **`resolve.tsconfigPaths`**, que é nativo no Vite 8 e substitui o antigo
`vite-tsconfig-paths` — é o que faz `@/components/...` resolver —, e a forma de função, para quando
um plugin só deve rodar em `serve` e não em `build`.

```ts
import { defineConfig } from 'vite'

// A forma de função dá acesso a `command` ('serve' | 'build') e `mode`.
export default defineConfig(({ command }) => ({
  // Nativo no Vite 8: lê `paths` do tsconfig.json. Sem isto, `@/*` não resolve.
  resolve: { tsconfigPaths: true },

  plugins: [
    tailwindcss(),
    // Devtools só fazem sentido no dev server; em build são peso morto.
    ...(command === 'serve' ? [devtools()] : []),
  ],
}))
```

#### env-and-mode
[doc](https://vite.dev/guide/env-and-mode)

**O que é:** como o Vite carrega os arquivos `.env`, o que o prefixo `VITE_` significa, as variáveis
embutidas em `import.meta.env` (`MODE`, `DEV`, `PROD`, `SSR`, `BASE_URL`), e a ordem de precedência
entre `.env`, `.env.local` e `.env.[mode]`.
**Para que serve:** decidir o que o navegador pode ver. É a fronteira entre configuração pública e
segredo.
**Quando usar:** **antes de criar qualquer variável de ambiente nova, sem exceção.** A regra é
curta e a consequência de errar é grave: **só o que começa com `VITE_` chega ao cliente, e o que
chega ao cliente é público** — vai no bundle, em texto, para quem abrir o DevTools. Chave de API,
segredo de assinatura e string de conexão nunca levam esse prefixo.

Um módulo de env declarado (padrão do `@t3-oss/env-core`) transforma essa convenção em código, com
`server` e `client` separados pelo `clientPrefix`. Vale o aviso: esse pacote exige schema
**síncrono**, então nem toda biblioteca de validação serve.

```ts
// src/env.ts — a separação vira declaração, e não convenção oral.
export const env = createEnv({
  server: { SERVER_URL: z.string().url().optional() }, // nunca vai para o bundle
  clientPrefix: 'VITE_',
  client: { VITE_APP_TITLE: z.string().min(1).optional() }, // público, e é intencional
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
```

```bash
# .env.local NÃO é versionado (fica no .gitignore) — é o lugar do que é seu.
VITE_APP_TITLE="Meu App (local)"   # público: aparece no bundle
DATABASE_PASSWORD=...              # sem VITE_: some do cliente, e é isso que se quer
```

#### using-plugins
[doc](https://vite.dev/guide/using-plugins)

**O que é:** como adicionar plugins, o que `enforce: 'pre' | 'post'` faz, como `apply: 'build' |
'serve'` limita quando um plugin roda, e — o mais importante — **como a ordem do array é resolvida**.
**Para que serve:** entender por que mudar de posição um item do array pode quebrar o build inteiro.
**Quando usar:** **antes de encostar no array `plugins` do `vite.config.ts`.** A ordem ali não é
estética: o Paraglide precisa gerar `src/paraglide` antes que alguém importe de lá; o
`tanstackStart()` gera a árvore de rotas que o `viteReact()` depois transforma; o Babel do React
Compiler vem por último porque opera sobre o JSX já processado. Plugin novo entra com a pergunta "o
que ele precisa que já exista?", não no fim por comodidade.

```ts
// Uma ordem real de app TanStack Start, com o motivo de cada posição:
plugins: [
  devtools(),         // intercepta cedo, antes de qualquer transformação
  paraglideVitePlugin({ project: './project.inlang', outdir: './src/paraglide' }),
  nitro({ preset: 'node-server' }), // opções diretas: é a forma que o tipo declara
  tailwindcss(),
  tanstackStart({ router: { routeToken: 'layout' } }),
  viteReact(),        // depois do Start: transforma o JSX das rotas geradas
  babel({ presets: [reactCompilerPreset()] }), // por último, sobre o JSX já processado
]
```

#### dep-pre-bundling
[doc](https://vite.dev/guide/dep-pre-bundling)

**O que é:** a etapa em que o Vite converte dependências do `node_modules` para ESM e junta cada
pacote num arquivo só, guardando o resultado em `node_modules/.vite`. Explica `optimizeDeps.include`,
`optimizeDeps.exclude` e quando o cache é invalidado.
**Para que serve:** entender por que a primeira execução do `pnpm dev` demora mais que as
seguintes, e por que às vezes o servidor serve uma versão antiga de um pacote.
**Quando usar:** **quando o dev server insistir em código velho depois de instalar, atualizar ou
`pnpm link` de um pacote.** O sintoma é o mesmo do cache do navegador e a causa não é essa. A
resposta é `--force`; a resposta permanente, para um pacote que muda em disco, é `optimizeDeps.exclude`.

```bash
# Sintoma: instalou o pacote, o import continua "não existe" ou vem antigo.
rm -rf node_modules/.vite && pnpm dev
# ou, mais curto:
pnpm dev --force
```

```ts
// Permanente: um pacote local que muda em disco não deve ser pré-empacotado,
// senão o cache congela a versão da primeira execução.
export default defineConfig({
  optimizeDeps: { exclude: ['@acme/pacote-local'] },
})
```

## Assets, build e deploy

#### assets
[doc](https://vite.dev/guide/assets)

**O que é:** como o Vite trata arquivos que não são código: importar uma imagem devolve a URL final,
arquivos pequenos viram data URL, a pasta `public/` é copiada sem processamento, e
`new URL('./x.png', import.meta.url)` resolve caminho dinâmico.
**Para que serve:** escolher entre importar o asset e deixá-lo em `public/`. A diferença é
concreta: o importado ganha hash no nome e cache eterno; o de `public/` mantém o nome e pode ser
referenciado por caminho fixo.
**Quando usar:** ao acrescentar imagem, fonte ou ícone. A regra prática:
`public/` guarda o que precisa de nome estável — `favicon.ico`, `robots.txt`,
`manifest.json` e os `logo*.png` que o manifest referencia por caminho. Todo o resto se importa,
para ganhar hash e não precisar de invalidação de cache no deploy.

```tsx
// Importado: vira /assets/ilustracao-a1b2c3d4.png, com hash. Cache eterno.
import ilustracao from '@/assets/ilustracao.png'

export function Vazio() {
  return <img src={ilustracao} alt="" />
}

// De public/: o caminho é literal e o nome não muda. É o que o manifest.json
// referencia, e é por isso que os logos moram lá.
;<link rel="icon" href="/favicon.ico" />
```

#### build
[doc](https://vite.dev/guide/build)

**O que é:** as opções de produção: `build.target`, `sourcemap`, `outDir`, `assetsInlineLimit`,
`chunkSizeWarningLimit`, divisão de chunks, e o modo biblioteca.
**Para que serve:** ajustar o que sai do `pnpm build` — tamanho dos pedaços, presença de sourcemap,
navegadores alvo.
**Quando usar:** ao investigar bundle grande ou aviso de chunk no CI. Antes disso, uma correção de
expectativa que economiza busca: **aqui o build não produz `dist/`**. O `nitro()` assume a saída e
gera `.output/`, com o servidor em `.output/server/index.mjs` — que é exatamente o que o
`Dockerfile-production` copia e executa. Documentação que fala em `dist/` está descrevendo um
projeto Vite puro, não este.

```bash
pnpm build
ls .output/server/index.mjs   # o artefato real; `dist/` não existe aqui
```

```ts
// Sourcemap em produção é uma decisão, não um padrão: ajuda a ler stack trace
// real, e ao mesmo tempo publica a estrutura do código-fonte.
export default defineConfig({
  build: { sourcemap: true },
})
```

#### static-deploy
[doc](https://vite.dev/guide/static-deploy)

**O que é:** as receitas de publicação de um build estático — GitHub Pages, Netlify, Vercel,
Cloudflare Pages — mais a configuração de `base` para quando o site não fica na raiz do domínio.
**Para que serve:** publicar uma SPA que é só arquivo servido por CDN.
**Quando usar:** **nunca, se o app faz SSR.** Aí o build não é estático: o Nitro produz um servidor
Node que serve as rotas do TanStack Start, e o deploy é esse servidor (em container ou não). Vale
conhecer para reconhecer o descompasso — quando um tutorial mandar subir a pasta `dist/` num bucket,
é o cenário de SPA pura que ele assume.

```dockerfile
# Dockerfile de produção — o deploy real: servidor, não bucket.
COPY .output/ ./.output/
CMD ["node", ".output/server/index.mjs"]
```

#### performance
[doc](https://vite.dev/guide/performance)

**O que é:** o guia de diagnóstico de lentidão: como medir com `--debug`, o `server.warmup` para
pré-aquecer arquivos muito importados, o custo dos barrel files, e o efeito de plugins mal
comportados.
**Para que serve:** atacar a causa certa quando o dev server ou o build ficam lentos, em vez de
chutar configuração.
**Quando usar:** quando `pnpm dev` demorar a responder na primeira navegação, ou quando o build
crescer sem explicação. Note o alerta sobre **barrel files** — um `index.ts` que re-exporta uma
pasta inteira faz o Vite carregar tudo para servir um componente só. Importar por caminho direto
(`@/components/ui/button`) evita isso, e é a convenção que o shadcn/ui já assume.

```ts
// Pré-aquece o que quase toda navegação precisa: o Vite transforma esses
// arquivos antes do primeiro pedido, em vez de na hora.
export default defineConfig({
  server: {
    warmup: { clientFiles: ['./src/routes/**/*.tsx', './src/components/ui/*.tsx'] },
  },
})
```

## Integração, migração e problemas

#### ssr
[doc](https://vite.dev/guide/ssr)

**O que é:** a API de baixo nível de renderização no servidor: `ssrLoadModule`, o `middlewareMode`,
a separação entre `entry-client` e `entry-server`, e as externalizações de SSR.
**Para que serve:** construir um framework com SSR sobre o Vite.
**Quando usar:** **para ler, não para aplicar.** Num app Start quem faz SSR é o próprio Start, e é
ele quem consome esta API — veja [`tanstack-start.md`](tanstack-start.md) para o que se escreve de
fato. Montar `entry-server.tsx` à mão nesse cenário é ter dois SSRs competindo. Vale abrir
quando um erro de servidor citar `ssrLoadModule` ou externalização e for preciso entender de onde
aquilo veio.

```ts
// O que esta página ensina a fazer à mão...
const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')

// ...e o que o repositório escreve, com o Start cuidando do resto.
import { createServerFn } from '@tanstack/react-start'
const listar = createServerFn({ method: 'GET' }).handler(async () => { /* ... */ })
```

#### backend-integration
[doc](https://vite.dev/guide/backend-integration)

**O que é:** como usar o Vite como pipeline de assets de um backend que renderiza HTML — Rails,
Laravel, Django —, via `build.manifest` e o `manifest.json` que mapeia entrada para arquivo final.
**Para que serve:** deixar o backend montar as tags `<script>` e `<link>` a partir do manifest.
**Quando usar:** não se aplica quando o backend serve **API JSON** em vez de HTML com assets (veja
[`adonisjs.md`](adonisjs.md)), que é o arranjo de frontend e backend em dois deploys separados
conversando por HTTP. A página fica no índice para fechar a lista e para descartar rápido a ideia
quando ela aparecer numa discussão.

```ts
// O modo que esta página descreve — e que um frontend separado não usa.
export default defineConfig({
  build: { manifest: true, rollupOptions: { input: '/src/main.tsx' } },
})
```

#### migration
[doc](https://vite.dev/guide/migration)

**O que é:** o guia de atualização entre versões maiores, com as mudanças de comportamento, as
opções removidas e o passo a passo de cada salto.
**Para que serve:** subir de versão sem descobrir as quebras uma a uma, em produção.
**Quando usar:** ao atualizar o Vite, e — mais frequente — **ao copiar solução da internet que não
funciona**. No **Vite 8, que usa Rolldown no lugar do Rollup**, resposta de StackOverflow que manda
mexer em `rollupOptions` de um jeito muito específico, ou instalar plugin de Rollup, pode estar
descrevendo um mundo que não existe mais. Confirme a versão antes de aplicar.

```bash
# Antes de aplicar qualquer receita achada na internet:
pnpm vite --version   # 8.x — Rolldown, não Rollup
```

#### troubleshooting
[doc](https://vite.dev/guide/troubleshooting)

**O que é:** o catálogo dos erros mais comuns com a causa de cada um: `Failed to resolve import`,
CORS no dev server, limite de watchers do sistema de arquivos, `Outdated Optimize Dep`, problemas de
symlink e de monorepo.
**Para que serve:** identificar uma mensagem de erro sem investigar do zero.
**Quando usar:** **como primeira parada em qualquer erro do Vite**, antes de pesquisar a mensagem
solta. Boa parte do que parece bug de código é uma dessas entradas — em especial `Outdated Optimize
Dep`, que é cache de pré-bundling e não código quebrado (veja `dep-pre-bundling`), e o limite de
watchers no Linux, que aparece como "too many open files" sem falar em watcher nenhum.

```bash
# Linux, projeto grande: o watcher estoura o limite e o erro não diz isso.
cat /proc/sys/fs/inotify/max_user_watches
sudo sysctl fs.inotify.max_user_watches=524288
```

## APIs de extensão

#### api-plugin
[doc](https://vite.dev/guide/api-plugin)

**O que é:** o contrato para escrever um plugin: os hooks universais (`resolveId`, `load`,
`transform`), os hooks específicos do Vite (`config`, `configResolved`, `configureServer`,
`transformIndexHtml`, `handleHotUpdate`), e a ordenação com `enforce` e `apply`.
**Para que serve:** interceptar o pipeline de módulos — gerar arquivo virtual, transformar um tipo
de arquivo, injetar algo no HTML.
**Quando usar:** raramente, e sempre depois de procurar plugin pronto. Existe um caso legítimo aqui:
um plugin curto e local, escrito no próprio `vite.config.ts`, para gerar um módulo virtual a partir
de dados do próprio projeto — evita um script de `prebuild` e um arquivo gerado versionado. Lendo esta
página, comece pelos três hooks universais: eles são 90% do que qualquer plugin usa.

```ts
// Plugin local: expõe a versão do build como módulo importável, sem arquivo em disco.
function versaoDoBuild(versao: string): Plugin {
  const id = 'virtual:versao'
  return {
    name: 'versao-do-build',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load: (resolved) =>
      resolved === '\0' + id ? `export const versao = ${JSON.stringify(versao)}` : null,
  }
}
```

#### api-hmr
[doc](https://vite.dev/guide/api-hmr)

**O que é:** a API `import.meta.hot`: `accept`, `dispose`, `invalidate`, `prune`, `data`, e os
eventos customizados entre servidor e cliente.
**Para que serve:** controlar o que acontece quando um módulo é substituído a quente, preservando
ou descartando estado.
**Quando usar:** quase nunca em código de tela — `@vitejs/plugin-react` já cuida do HMR dos
componentes. A exceção é **estado que vive fora do React e não deveria ser recriado a cada
salvamento**: uma instância de `Store` do TanStack (veja [`tanstack-store.md`](tanstack-store.md))
ou um cliente criado no topo do módulo. Se salvar o arquivo zera algo que não deveria zerar, é esta
página.

```ts
import { Store } from '@tanstack/store'

// `import.meta.hot.data` sobrevive à troca do módulo; o estado do wizard não
// volta à estaca zero a cada Ctrl+S.
export const wizardStore =
  import.meta.hot?.data.wizardStore ?? new Store({ etapa: 1 })

if (import.meta.hot) {
  import.meta.hot.data.wizardStore = wizardStore
  import.meta.hot.accept()
}
```

#### api-javascript
[doc](https://vite.dev/guide/api-javascript)

**O que é:** o Vite usado como biblioteca em vez de CLI: `createServer`, `build`, `preview`,
`resolveConfig`, `mergeConfig`, e o objeto `ViteDevServer`.
**Para que serve:** subir ou construir programaticamente, de dentro de outro processo Node.
**Quando usar:** para ler quando um erro vier de dentro de uma dessas chamadas, não para escrever.
Quem chama essa API num app Start é o próprio Start, e o Nitro. Um segundo caso, mais provável, é
configuração de teste: o `vitest` resolve o `vite.config.ts` por este caminho, e é por isso que uma
opção de build errada consegue quebrar `pnpm test`.

```ts
// Onde isto aparece de verdade: dentro de uma ferramenta, não numa tela.
import { createServer } from 'vite'

const server = await createServer({ configFile: './vite.config.ts' })
await server.listen()
```

## Environment API

Cinco páginas sobre a API que permite ao Vite tratar cliente, servidor SSR e outros runtimes como
ambientes separados, cada um com módulos e transformações próprios. **É API para quem constrói
framework.** Num app Start com Nitro, são eles que a consomem; nada disso se escreve em código de
aplicação. Estão listadas para completar a documentação e para dar contexto quando um
erro de build citar "environment".

#### api-environment
[doc](https://vite.dev/guide/api-environment)

**O que é:** a introdução ao conceito: por que um único grafo de módulos não dava conta de cliente e
servidor ao mesmo tempo, e o que muda com ambientes nomeados (`client`, `ssr` e customizados).
**Para que serve:** entender o vocabulário — "environment", "module graph", "runner" — que aparece
em mensagens de erro e em changelog do Vite.
**Quando usar:** quando um erro de build ou de SSR mencionar `environment` e a palavra não fizer
sentido. É a página que traduz o termo; as outras quatro só interessam a quem implementa.

```ts
// O vocabulário, em uma linha: dois ambientes, dois grafos de módulos.
export default defineConfig({
  environments: {
    client: {},
    ssr: {},
  },
})
```

#### api-environment-instances
[doc](https://vite.dev/guide/api-environment-instances)

**O que é:** como acessar e usar as instâncias de ambiente em tempo de execução —
`server.environments.client`, `.ssr`, o `transformRequest` de cada uma e os respectivos grafos.
**Para que serve:** operar sobre um ambiente específico dentro de código de ferramenta.
**Quando usar:** só ao escrever um framework ou uma integração de baixo nível. Pule.

```ts
// Código de ferramenta, não de aplicação.
const ambiente = server.environments.ssr
await ambiente.transformRequest('/src/entry-server.tsx')
```

#### api-environment-plugins
[doc](https://vite.dev/guide/api-environment-plugins)

**O que é:** como um plugin passa a ter comportamento por ambiente, com a opção `applyToEnvironment`
e os hooks que recebem o ambiente atual.
**Para que serve:** escrever um plugin que faz uma coisa no cliente e outra no SSR — ou que
simplesmente não roda em um dos dois.
**Quando usar:** ao escrever plugin que precisa dessa distinção. Para código de aplicação, pule.

```ts
// Um plugin que só deve agir no bundle do cliente.
const plugin: Plugin = {
  name: 'so-no-cliente',
  applyToEnvironment: (env) => env.name === 'client',
  transform(codigo) { /* ... */ },
}
```

#### api-environment-frameworks
[doc](https://vite.dev/guide/api-environment-frameworks)

**O que é:** o guia para autores de framework: como montar SSR sobre ambientes, coordenar cliente e
servidor, e migrar de uma configuração de SSR antiga.
**Para que serve:** construir algo como o TanStack Start.
**Quando usar:** nunca em código de aplicação. Está aqui porque é literalmente a página que descreve
o que o TanStack Start faz por baixo — útil se algum dia for preciso depurar a integração entre o
Start e o Vite.

```ts
// O que o `tanstackStart()` do vite.config.ts implementa por baixo.
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
```

#### api-environment-runtimes
[doc](https://vite.dev/guide/api-environment-runtimes)

**O que é:** como executar módulos em runtimes que não são o Node — Workers, Deno, edge — usando
`ModuleRunner` e transportes customizados.
**Para que serve:** rodar o mesmo código em ambientes de execução diferentes.
**Quando usar:** praticamente nunca em código de aplicação. Com o `nitro()` fixado num preset como
`node-server`, é o Nitro — não o Vite — que abstrai destino de deploy. Se a discussão for mover o
frontend para edge, a decisão acontece na configuração do Nitro, e esta página explica o que existe
por baixo dela.

```ts
// A escolha de runtime, aqui, é uma linha do Nitro — não desta API.
nitro({ preset: 'node-server' })
```
