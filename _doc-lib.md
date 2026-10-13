# Índice de documentação

Referência anotada de 1321 páginas de documentação, distribuídas em 24 bibliotecas. As regras da
casa — o que fazer com elas — ficam em [`_padroes/`](_padroes/), e vencem o código existente.

O Fastify é a única biblioteca com **dois** arquivos, e o motivo é que são duas perguntas: como o
framework funciona, e que plugin resolve um problema. A segunda tem 298 respostas, e afogaria a
primeira num arquivo só. O `fastify-decorators` não é um terceiro: é biblioteca à parte, de outro
autor, e tem o próprio arquivo pela regra geral.

**As páginas de biblioteca são genéricas, e isso é regra, não acaso:** valem para qualquer projeto
React × Node com essa stack, não citam nome de repositório, e os exemplos usam entidades neutras
(`User`, `Team`, `Post`) em vez do domínio de quem escreveu. Caminho de arquivo aparece como
convenção sugerida, nunca como fato — quem copiar este pacote para outro projeto ajusta os caminhos
e o resto continua valendo. A opinião forte que os arquivos carregam ("não use X nesta stack") se
apoia na **stack**, não em decisão de repositório: mesma stack, mesma conclusão.

O gerador de contrato da API, que antes morava aqui como exceção, é padrão da casa e está em
[`_padroes/openapi.md`](_padroes/openapi.md).

Cada biblioteca tem um arquivo próprio em `_doc-lib/`. Dentro dele, o cabeçalho responde **o que é**,
**para que serve**, **como usar** e **quando adotar** a biblioteca, e cada link responde três coisas:

- **O que é** a página.
- **Para que serve** o que ela ensina.
- **Quando usar**, ou seja, o gatilho concreto que faz valer a pena abrir.

O objetivo é escolher o link certo sem visitar os outros 1317.

---

## Backend

| Biblioteca             | Arquivo                                                            | O que resolve                                                                     | Links |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | :---: |
| **AdonisJS**           | [`_doc-lib/adonisjs.md`](_doc-lib/adonisjs.md)                     | Framework Node.js completo: rotas, controllers, auth, filas, testes, CLI          |   91  |
| **Fastify**            | [`_doc-lib/fastify.md`](_doc-lib/fastify.md)                       | Servidor HTTP montado por plugin: ciclo de vida, schema, serialização             |   42  |
| **Fastify (plugins)**  | [`_doc-lib/fastify-plugins.md`](_doc-lib/fastify-plugins.md)       | O ecossistema: 60 plugins oficiais anotados e 237 da comunidade em tabela         |  298  |
| **fastify-decorators** | [`_doc-lib/fastify-decorators.md`](_doc-lib/fastify-decorators.md) | Controller, rota e injeção por decorator sobre o Fastify; bootstrap por diretório |   20  |
| **Lucid ORM**          | [`_doc-lib/lucid.md`](_doc-lib/lucid.md)                           | ORM do AdonisJS: models, migrations, query builder, relacionamentos               |   35  |
| **VineJS**             | [`_doc-lib/vinejs.md`](_doc-lib/vinejs.md)                         | Validação de payload com tipo inferido do schema. Também usado no frontend        |   26  |
| **FlyDrive**           | [`_doc-lib/flydrive.md`](_doc-lib/flydrive.md)                     | Arquivos com uma API só sobre disco local, S3, R2 e GCS                           |   13  |
| **MongoDB (driver)**   | [`_doc-lib/mongodb.md`](_doc-lib/mongodb.md)                       | O driver oficial sem ODM: CRUD, agregação, índices, transações, tipagem           |   48  |
| **BullMQ**             | [`_doc-lib/bullmq.md`](_doc-lib/bullmq.md)                         | Fila de trabalho em Redis: retry, agendamento, flows, encerramento limpo          |   45  |
| **Socket.IO**          | [`_doc-lib/socket-io.md`](_doc-lib/socket-io.md)                   | Tempo real com fallback: namespaces, rooms, auth no handshake, escala             |   44  |
| **isolated-vm**        | [`_doc-lib/isolated-vm.md`](_doc-lib/isolated-vm.md)               | Isolate V8 separado para rodar código não confiável — o que `node:vm` não faz     |   35  |

AdonisJS e Fastify ocupam a **mesma camada** e não se somam: um projeto tem um ou o outro. Lucid,
VineJS e FlyDrive não dependem dessa escolha, e o frontend inteiro menos ainda. O que muda é de
onde vem o resto — no Adonis, do próprio framework; no Fastify, do ecossistema, e é isso que o
segundo arquivo cataloga. O `fastify-decorators` só existe do lado Fastify: é o que devolve a ele
o container e a convenção de controller que o Adonis traz de fábrica.

## Frontend

| Biblioteca          | Arquivo                                                      | O que resolve                                                                                    | Links |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | :---: |
| **shadcn/ui**       | [`_doc-lib/shadcn.md`](_doc-lib/shadcn.md)                   | Componentes copiados para o repositório, sobre Tailwind e primitivas headless                    |  107  |
| **Base UI**         | [`_doc-lib/base-ui.md`](_doc-lib/base-ui.md)                 | A primitiva headless por baixo do shadcn: comportamento, teclado, acessibilidade, posicionamento |  53   |
| **React Hook Form** | [`_doc-lib/react-hook-form.md`](_doc-lib/react-hook-form.md) | Formulário sem re-render a cada tecla: campo, validação por resolver, erro do servidor           |  48   |
| **use-mask-input**  | [`_doc-lib/use-mask-input.md`](_doc-lib/use-mask-input.md)   | Máscara de digitação no campo, sobre o motor Inputmask                                           |  11   |
| **TanStack Query**  | [`_doc-lib/tanstack-query.md`](_doc-lib/tanstack-query.md)   | Estado de servidor: cache, revalidação, mutações, invalidação                                    |  57   |
| **TanStack Router** | [`_doc-lib/tanstack-router.md`](_doc-lib/tanstack-router.md) | Roteamento com tipagem de ponta a ponta, incluindo search params                                 |  61   |
| **TanStack Start**  | [`_doc-lib/tanstack-start.md`](_doc-lib/tanstack-start.md)   | Camada full-stack sobre o Router: SSR, server functions, deploy                                  |  45   |
| **TanStack Table**  | [`_doc-lib/tanstack-table.md`](_doc-lib/tanstack-table.md)   | Motor de tabela headless (v9): features opt-in, ordenação, filtro, paginação, seleção            |  46   |
| **TanStack Store**  | [`_doc-lib/tanstack-store.md`](_doc-lib/tanstack-store.md)   | Estado de cliente que não é do servidor nem cabe na URL                                          |   4   |
| **Tailwind CSS**    | [`_doc-lib/tailwindcss.md`](_doc-lib/tailwindcss.md)         | Utilitário sobre CSS, v4 configurada em CSS: tema por token, variantes, modo escuro              |  42   |
| **Tiptap**          | [`_doc-lib/tiptap.md`](_doc-lib/tiptap.md)                   | Editor de texto rico headless sobre ProseMirror: schema, extensão própria, round-trip de HTML    |  45   |

## Build e ferramentas

| Biblioteca | Arquivo                                    | O que resolve                                                        | Links |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------- | :---: |
| **Vite**   | [`_doc-lib/vitejs.md`](_doc-lib/vitejs.md) | Dev server, build, plugins, variável de ambiente, HMR                |  25   |
| **Nitro**  | [`_doc-lib/nitro.md`](_doc-lib/nitro.md)   | Servidor de produção do build: preset, runtime, storage, cache, task |  30   |
| **Vitest** | [`_doc-lib/vitest.md`](_doc-lib/vitest.md) | Suite de teste sobre o Vite: mock, cobertura, isolamento, projetos   |  50   |

---

## Como as peças se dividem

Boa parte da confusão em projetos com essa stack vem de colocar uma responsabilidade na camada
errada. A divisão que as próprias bibliotecas assumem:

**No frontend, onde um dado mora**

| O dado                                                 | Onde ele fica           | Biblioteca      |
| ------------------------------------------------------ | ----------------------- | --------------- |
| Vem de uma API                                         | Cache de queries        | TanStack Query  |
| Precisa ser compartilhável por link e sobreviver ao F5 | Search params da URL    | TanStack Router |
| Está sendo digitado num formulário                     | Instância do formulário | React Hook Form |
| É de um componente só                                  | `useState`              | React           |
| É global, do cliente, e não cabe na URL                | Store                   | TanStack Store  |

A linha do formulário costuma ser a esquecida: rascunho de campo não é estado de componente nem de
store. Espelhar cada tecla num `useState` ou num store devolve o re-render que o React Hook Form
existe para evitar.

Nenhuma linha da tabela é do Vite, e é proposital: ele não guarda dado, fica uma camada abaixo de
todas elas. A pergunta que só ele responde é outra — "por que isso não apareceu no bundle", "por que
essa variável de ambiente não existe em produção", "por que funciona no `pnpm dev` e quebra no
`pnpm build`".

Abaixo do Vite ainda tem uma terceira camada, e ignorá-la é o que transforma "o build passou" em "o
deploy quebrou". A fronteira completa, de cima para baixo:

| A pergunta                                                                   | De quem é      |
| ---------------------------------------------------------------------------- | -------------- |
| SSR, server function, rota de API, o que renderiza onde                      | TanStack Start |
| Módulo, plugin, transformação de arquivo, asset, `VITE_`                     | Vite           |
| Formato da saída, preset, runtime de destino, storage, cache, task, `NITRO_` | Nitro          |

É do Nitro o `.output/` que o `pnpm build` produz — a resposta para "por que não é `dist/`" — e é
dele a decisão de como esse diretório vira um servidor em Node, em container ou na borda.

**shadcn e Base UI, quem responde o quê**

Um arquivo em `components/ui/` é seu, mas o comportamento dele não é: o shadcn escreve uma casca de
estilo em volta de uma primitiva do Base UI. São duas docs, e a pergunta decide qual abrir.

| A pergunta                                                                                  | De quem é                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Qual componente usar, como instalar, como estilizar, qual token de tema                     | shadcn                                             |
| Que props a peça aceita, como ela reage ao teclado, por que o popup abre para o lado errado | Base UI                                            |
| Como trocar o elemento renderizado — a prop `render`, que substituiu o `asChild`            | Base UI (`handbook/composition`)                   |
| O que significam as classes `data-open:` e `data-ending-style:` do arquivo gerado           | Base UI (`handbook/styling`, `handbook/animation`) |

Prop ausente na doc do shadcn não quer dizer que não existe: o wrapper repassa `...props` para a
primitiva, então tudo que o Base UI aceita chega lá. O caminho inverso não vale — token de tema e
variante são invenção do shadcn, e não existem no Base UI.

**No backend, quem faz o quê**

| A tarefa                                           | Onde ela fica                  |
| -------------------------------------------------- | ------------------------------ |
| Rota, middleware, resposta                         | AdonisJS ou Fastify            |
| Injeção de dependência, convenção de controller    | AdonisJS ou fastify-decorators |
| Formato e regra do payload que entra               | VineJS                         |
| Schema, consulta, relacionamento, transação        | Lucid                          |
| Gravar e ler arquivo, em qualquer destino          | FlyDrive                       |
| Publicar o contrato da API para quem consome       | OpenAPI (do repositório)       |

A última linha não acrescenta trabalho às outras: o gerador lê o que AdonisJS e VineJS já declararam.
Rota nova em feature existente não exige documentação nenhuma.

As duas primeiras linhas têm duas respostas porque a escolha do framework é do projeto, e a
diferença é concreta: no AdonisJS a injeção vem do container e a estrutura vem da convenção; no
Fastify as duas vêm do `fastify-decorators`, que as monta por cima de plugin comum — e por isso o
que decide o que enxerga o quê continua sendo o encapsulamento: todo `register` cria um contexto
filho, e o que o filho decora não sobe. Um guard registrado no lugar errado da árvore não roda, e
não avisa. O `fastify-decorators` acrescenta uma segunda forma de silêncio, que é sua: a injeção
por constructor só existe se o tipo do parâmetro sobreviver à compilação, e o serviço que chega
`undefined` não avisa no boot.

**VineJS nos dois lados**

Um módulo de validator de cada lado — no servidor e no cliente —, os dois em VineJS. **Sem uma
segunda biblioteca de schema no frontend.** Onde cada módulo mora é convenção do projeto; o que não
é convenção é existirem os dois, e serem um só arquivo por lado. Daqui em diante este texto os chama
de `validator.ts` do servidor e `validator.ts` do cliente.

O schema não atravessa a fronteira, e continua sendo duas declarações: o backend não publica os seus
validators como pacote. O ganho de usar a mesma biblioteca dos dois lados é que as duas declarações
passam a ser **a mesma expressão**, e não uma tradução. Uma regra `document()` do frontend é a
`document()` do backend copiada linha a linha.

Com dialetos diferentes a tradução envelhece sem avisar, e o sintoma é sempre o mesmo: o cliente
recusa por meses um valor que o servidor já aceita, com um comentário explicando uma espera que já
terminou.

Regra nova entra nos dois arquivos, ou entra só no servidor. Validação de cliente é conveniência para
quem digita; a do servidor é a que segura o dado, porque quem chama a API direto passa longe do
frontend.

Dois lugares onde o VineJS **não** serve, e onde a saída é função à mão em vez de uma segunda
biblioteca: um módulo de env com `@t3-oss/env-core` e o `validateSearch` do TanStack Router. Os dois
exigem schema **síncrono**, e o `validate` do VineJS devolve promessa.

Duas configurações fazem o cliente se comportar como o servidor, e as duas moram no topo do
validator do cliente:

| Configuração                            | Por quê                                                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vine.convertEmptyStringsToNull = true` | Espelha o `config/bodyparser.ts` do AdonisJS. O default do VineJS fora do AdonisJS é `false`, e sem isto o `''` de um `<input>` passa no cliente e é recusado pela API. |
| `vine.messagesProvider`                 | O VineJS não aceita mensagem inline por campo. As mensagens traduzidas ficam num módulo à parte, com chave `campo.regra`.                                               |

O provider existe **nos dois lados**, pelo mesmo motivo dos validators: um módulo de mensagens no
servidor, outro no cliente. Sem o do servidor a resposta 422 sai bilíngue — envelope traduzido,
`errors` no default em inglês do VineJS.

As duas valem sobre um **singleton**, então o `validator.ts` reexporta o `vine` já configurado.
Importar `@vinejs/vine` direto num componente compila o schema com a flag errada e mensagem em
inglês, dependendo da ordem em que os módulos carregam.

**Onde a máscara mora**

Máscara é camada de **input**, e só. Ela não valida, não guarda estado e não aparece na tabela de
"onde um dado mora" — o campo mascarado continua sendo um campo do React Hook Form, com a diferença
de que o que entra no estado é a string formatada.

É aí que ela toca o VineJS, e é a única decisão que o assunto exige: **quem tira a máscara antes da
regra**. Duas respostas, e escolher uma por campo:

| Onde                                     | O que acontece                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `.parse()` do validator, nos dois lados  | O schema recebe `123.456.789-09` e normaliza antes das regras. O campo **sem** máscara continua válido, e quem chama a API direto também.      |
| `autoUnmask: true` nas opções da máscara | O elemento passa a devolver o valor cru. Em troca, ele também espera receber o valor **cru** de volta — `defaultValues` formatado não reexibe. |

A primeira é a desta stack, e o motivo não é gosto: a regra de normalização **já precisa existir no
servidor**, onde não há máscara nenhuma. Reaproveitá-la no cliente é uma linha na expressão que já
seria copiada de qualquer jeito, enquanto o `autoUnmask` cria um segundo caminho, que só o navegador
percorre. Um campo mascarado sem regra correspondente no `.parse()` do servidor é sempre um bug — o
formato passou a ser garantido por quem não segura o dado.

## Ordem de leitura sugerida

Para quem está começando na stack e não quer ler 1321 páginas:

**Backend**: `adonisjs` (folder-structure, http-context, routing, dependency-injection),
`vinejs` (schema_101, html_forms_and_surprises, types/object) e `lucid` (models, migrations,
table-builder, model-query-builder, relationships). Antes de abrir a primeira pull request que
mexa em rota, leia `_padroes/openapi.md` (fluxo-de-trabalho, rota-nova) — são dois minutos e evitam um
`--check` vermelho no CI.

**Backend em Fastify**, no lugar do primeiro parágrafo e não além dele: `fastify`
(Guides/Getting-Started, Reference/Plugins, Reference/Encapsulation, Reference/Lifecycle,
Guides/Testing). `Encapsulation` **antes da primeira pull request que crie um plugin** — é a
página que evita o guard que existe, passa no code review e não roda; e `Lifecycle` antes do
primeiro hook, que é o que evita procurar `request.body` numa fase em que ele ainda não existe.
Só depois de `Encapsulation`, `fastify-decorators` (README, Bootstrapping, Services and dependency
injection) — nessa ordem porque tudo que o pacote registra é plugin, e a página do Fastify é a que
explica onde o que ele registra fica visível. Depois, `fastify-plugins` não se lê: consulta-se,
quando aparecer o problema.

**Frontend**: `tanstack-query` (important-defaults, queries, query-keys, caching),
`tanstack-router` (routing-concepts, search-params, data-loading, integrations/query) e
`shadcn` (installation, theming, forms/react-hook-form, components) e `base-ui`
(handbook/composition, handbook/styling) — são as duas páginas que explicam a prop `render` e os
`data-*` de estado, e as duas aparecem em todo arquivo de `components/ui`. Antes do primeiro formulário,
`vinejs` (schema_101, html_forms_and_surprises, custom_error_messages) e `react-hook-form`
(docs/useform, docs/usecontroller/controller, docs/useform/seterror) — são as páginas que evitam
validar duas vezes em lugares diferentes e reescrever o `Controller` errado em cinco campos. E antes
do primeiro campo de documento, CEP ou telefone, `use-mask-input` (api-reference,
tutorial-basics/alias-mask, shadcn) — três páginas curtas que evitam escrever à mão um alias que já
existe e, principalmente, dizem qual valor sobra no estado do formulário depois da máscara.

**Build**: `vitejs` (env-and-mode, using-plugins, cli). São três páginas curtas, e valem o primeiro
dia: `env-and-mode` é a regra do prefixo `VITE_`, que separa configuração pública de segredo
vazado; `using-plugins` explica por que a ordem do array no `vite.config.ts` não é estética; e `cli`
diz o que `--force` resolve, que é a metade dos "não sei por que parou de funcionar". Some `nitro`
(docs/configuration, deploy) antes do primeiro deploy: `configuration` é a regra do prefixo
`NITRO_`, que é a irmã de servidor da regra do `VITE_`, e `deploy` explica por que o build do CI sai
diferente do build da sua máquina.

Dentro de cada arquivo, o campo "Quando usar" marca em **negrito** as páginas que evitam os erros
mais caros daquela biblioteca. Vale procurá-las por lá.

## Manutenção

Cada arquivo declara quantos links tem, e a soma bate com o total deste índice. Ao acrescentar um
link, atualize a contagem no arquivo da biblioteca e na tabela acima.

Nos arquivos de biblioteca, todos os links apontam para documentação oficial. Os do TanStack apontam
para os arquivos `.md` crus no GitHub, que é a forma mais estável de consumir essas docs e a que
funciona melhor em leitura automatizada. O Nitro publica o cru no próprio site, trocando
`nitro.build/x` por `nitro.build/raw/x.md`, e `nitro.md` aponta para os dois.

O Fastify publica o cru como o Nitro, acrescentando `.md` à URL da página, e mantém a lista
canônica em [`fastify.dev/llms.txt`](https://fastify.dev/llms.txt). Ela tem uma armadilha: lista
`docs/latest` **e** `docs/v3.29.x`, e só a primeira metade vale para conferir link.

`fastify-plugins.md` envelhece por outra regra, e é o único arquivo do pacote em que **link vivo
não prova nada**: os destinos são README no `HEAD` de repositório de terceiro, então o conteúdo
muda sem a URL quebrar, e o que morre primeiro é o pacote, não o link. A conferência ali é a data
do último commit, não o status HTTP. É também por isso que os 237 da comunidade estão em tabela de
uma linha, enquanto os 60 oficiais têm os três campos — a divergência está declarada no cabeçalho
do arquivo.

`fastify-decorators.md` envelhece em dois ritmos, e o arquivo separa os dois por seção. Os links
de `blob/v3.16.1` apontam para uma **tag**, que não muda nunca: link vivo ali prova o conteúdo, e
o cru está em `raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/<página>.md`. Os
de `tree/v4` apontam para uma **branch**, e envelhecem pela regra de `fastify-plugins.md` — o
conteúdo muda sem a URL quebrar, e a conferência é o último commit. Quando a v4 sair de `next`, a
seção inteira muda de natureza: os links viram a referência, e os da 3.16.1 viram história.

O Base UI publica o cru do mesmo jeito que o Nitro, acrescentando `.md` à URL, e mantém em
[`base-ui.com/llms.txt`](https://base-ui.com/llms.txt) a lista canônica de páginas — é por ela que se
confere link novo ou renomeado. O shadcn tem o equivalente em
[`ui.shadcn.com/llms.txt`](https://ui.shadcn.com/llms.txt).

O `use-mask-input` também publica a lista canônica, em
[`llms.txt`](https://use-mask-input.eduardoborges.dev/llms.txt), e ainda a doc inteira concatenada em
[`llms-full.txt`](https://use-mask-input.eduardoborges.dev/llms-full.txt) — os dois ficam de fora da
contagem de links, como os do Base UI e do shadcn, porque são ferramenta de conferência e não página
que se manda alguém abrir. Não há `.md` por página, então os links de `use-mask-input.md` apontam
para o site.

React Hook Form e Vite não publicam `.md` cru, então apontam para o site. E em `react-hook-form.md` a
maior parte dos links são **âncoras** dentro de três páginas longas (`get-started`, `ts` e
`advanced-usage`): link que não leva a lugar nenhum ali costuma ser âncora renomeada, com a página
inteira de pé. Confira o `#Id` na página-mãe antes de sair procurando substituto.

A auditoria de link é `node scripts/doc-lib/audit.mjs` (status, redirect, hash do conteúdo,
último push de repositório, páginas oficiais sem entrada). O resultado vai para
`_doc-lib/_audit/RELATORIO.md`, e a rodada seguinte compara com `links.json` para mostrar só o
que mudou. Rode antes de mexer em qualquer arquivo daqui.

**Quando a biblioteca lançar versão nova**, o link continuar respondendo 200 não quer dizer nada: o
que envelhece de verdade são os trechos de código anotados aqui. A conferência que pega isso é
comparar o identificador com o **código-fonte**, não só com a doc — a doc oficial atrasa. Foi assim
que se descobriu que o `inputValidator` do TanStack Start virou `validator` de novo: a página do
guia já mostrava a forma nova, mas quem só lesse o changelog anterior teria mantido a antiga.

O `use-mask-input` é o caso extremo dessa regra, e por isso `use-mask-input.md` abre com um aviso: a
3.13.0 instalada diverge do site em três pontos, e nenhum deles quebra link nenhum. Uma parte disso é
estrutural — quem implementa a máscara é o **Inputmask**, embutido no bundle, então versão nova da
biblioteca pode não mexer numa linha da API e ainda assim mudar comportamento de campo. A referência
de opção de máscara é [do motor](https://robinherbots.github.io/Inputmask/), não dela.
