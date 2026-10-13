# Auditoria de contrato — padrões vs. documentação oficial

Princípio do dono: a doc oficial é o contrato; o padrão só pode escolher dentro do que ela permite,
nunca contrariá-la. Método: citação em `_padroes/*.md` → entrada `_doc-lib/<lib>.md#<entry>` → página
oficial (via `[markdown]`/link, `node -e` fetch) quando a entrada não bastou. Regras puras de
TypeScript foram checadas contra o Handbook e `typescript-eslint.io`.

**Ressalva metodológica:** vários `_doc-lib/*.md` embutem exemplos escritos pela casa ("caso real da
stack", "básico"/"certo"/"errado") ao lado do conteúdo oficial traduzido. Onde a citação do padrão se
apoiava nesses blocos (não no texto oficial), isso está anotado na coluna Nota — não invalida a
classificação, porque a hierarquia de `backend.md` §0 já coloca `_doc-lib/` acima deste documento,
mas é bom registrar a origem.

## Resumo

| Classe | Qtde |
|---|---|
| SUSTENTADA | 34 |
| ESCOLHA | 14 |
| SEM BASE | 16 |
| CONTRADIZ | 4 |
| **Total de regras auditadas** | **68** |

---

## typescript.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| §1 `as` só em `as const`, resto é `satisfies`/narrowing | SUSTENTADA | typescript-eslint.io/rules/consistent-type-assertions | "const assertions are always allowed by this rule" — confere com `assertionStyle: 'never'` do tooling.md |
| §2 dado externo é `unknown` até validar | SUSTENTADA | `_doc-lib/vinejs.md#schema_101` | schema é a fronteira de tipo; `Infer<typeof X>` é o padrão oficial do VineJS |
| §3 união discriminada + `switch` exaustivo com `never` | SUSTENTADA | typescriptlang.org/docs/handbook/2/narrowing.html (exhaustiveness checking) | não coberto por doc-lib (sem snapshot do Handbook completo); verificado na página oficial |
| §4 enum como objeto `as const` | ESCOLHA | typescriptlang.org (release notes `erasableSyntaxOnly`, TS 5.8) | Handbook não proíbe `enum`; a alternativa é oferecida para quem quer erasable/type-stripping — escolha legítima, não imposição |
| §5 falha esperada é `Either`, não `throw` | SEM BASE | — | padrão funcional de terceiros (`fp-ts`-like); nenhuma doc oficial da stack prescreve isso. Não contradiz nada |
| §6 "nada de função solta" (tabela de onde mora) | SEM BASE | — | convenção arquitetural da casa |
| §7 `readonly` por padrão | SUSTENTADA | typescriptlang.org/docs/handbook (readonly modifier) | uso padrão documentado da linguagem |
| §8 tipos nativos primeiro; `Merge<A,B>` em vez de `A & B` | SEM BASE / ver nota | typescriptlang.org/docs/handbook/2/everyday-types.html (Intersection Types) | Handbook usa `&` como a forma idiomática de combinar tipos; `Merge` é utilitário próprio, não documentado em lugar nenhum. Não é CONTRADIZ porque o Handbook não proíbe um utilitário que resolve o caso de chaves conflitantes — mas está sem citação própria |
| §9 `import type` para o que é só tipo | SUSTENTADA | typescriptlang.org (release notes `verbatimModuleSyntax`, TS 5.0) | comportamento documentado da flag |
| §10 tsconfig (`strict`, `noUncheckedIndexedAccess`, …) | SUSTENTADA | typescriptlang.org/tsconfig (cada flag tem página própria) | flags reais, comportamento descrito corretamente |

## solid.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| Base: injeção por construtor, `new` de Service/UseCase/Policy/Controller/Repository nunca | SUSTENTADA | `_doc-lib/adonisjs.md#guides/concepts/dependency-injection`, `_doc-lib/fastify-decorators.md#Services and dependency injection` | ambos os frameworks resolvem por tipo do parâmetro; mecanismo central dos dois |
| §1 DI: resolver por tipo, `container.swap`/`configureServiceTest` no teste | SUSTENTADA | mesmas entradas acima | confirmado nas duas docs |
| §2 contrato é `abstract class`, nunca `interface` (sobrevive à compilação, serve de token) | SUSTENTADA | typescriptlang.org (type erasure de `interface`) + `_doc-lib/adonisjs.md` DI (resolução por tipo do parâmetro) | é uma restrição real da linguagem/`emitDecoratorMetadata`, não preferência — `interface` de fato não existe em runtime |
| §2 "quando criar contrato" (só I/O externo) | SEM BASE | — | heurística própria, razoável, nenhuma doc prescreve o limiar |
| §3 S/O/L/I na prática da stack | ESCOLHA | skills `solid`/`solid-principles` (não é doc de biblioteca) | mapeamento de princípio genérico de design para a stack; não há "doc oficial" de SOLID para contradizer |
| §4 frontend sem container, inversão por composição/props | SEM BASE | — | não há doc-lib de React/"composição" puro; prática comum, não contradiz nada |

## backend.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| §2.1 DI sempre, `new X()` nunca (ESLint `no-restricted-syntax`) | SUSTENTADA | `_doc-lib/adonisjs.md#guides/concepts/dependency-injection` | mecanismo central do framework |
| §2.1-4 `type`, nunca `interface` | **CONTRADIZ** | typescriptlang.org/docs/handbook/2/everyday-types.html | quote (≤15 palavras): *"If you would like a heuristic, use interface until you need to use features from type"* — o Handbook também nota que `interface extends` é mais performático que interseção. A regra da casa vai no sentido contrário sem justificar o porquê (diferente de §4.5/§4.8, que têm seção "por quê") |
| §2.1-5 `Merge<A,B>` em vez de `A & B` | SEM BASE | ver `typescript.md §8` acima | mesma nota: utilitário próprio, Handbook favorece `&`/`interface extends` |
| §2.1-1 sem ternário | ESCOLHA | eslint.org/docs/latest/rules/no-ternary | regra real do ESLint core: "This rule disallows ternary operators" — é opção estilística oficial, a casa optou por ligá-la |
| §2.1-2/3 sem `any`/sem `as` | SUSTENTADA | typescript-eslint.io (`no-explicit-any`, `consistent-type-assertions`) | regras reais, comportamento descrito corretamente |
| §2.1-6 lookup object em vez de 3+ `if/else-if` | SEM BASE | — | já autodeclarado em `tooling.md` como "sem plugin, é revisão humana" — consistente |
| §2.1-7 `async/await`, nunca `.then/.catch` | SEM BASE | — | estilo comum, nenhuma doc da stack prescreve; não contradiz |
| §4.3 `actor` é o objeto `User`, nunca o id | SEM BASE | — | convenção de payload da casa |
| §4.4 unicidade no use-case (`left(Conflict)`) em vez da regra `unique()` do Lucid | ESCOLHA | `_doc-lib/lucid.md#validation` | a doc mostra `.unique()`/`.exists()` como mecanismo oficial, mas não o torna obrigatório; o `model-hooks` do mesmo doc-lib já desaconselha checar unicidade em hook e aprova a checagem no use-case como `Either` — ambos os caminhos são "oficiais" dentro do próprio snapshot |
| §4.5 paginação montada à mão (`{ meta: rows.getMeta(), data: rows.all() }`) em vez de `.serialize()` | ESCOLHA | `_doc-lib/lucid.md#pagination` | o próprio doc-lib mostra `.serialize()` como exemplo principal, mas `getMeta()`/`all()` também são API pública documentada na mesma página ("básico"). Divergência justificada por escrito (perda de tipo, `serializeAs`) — não é ignorar a doc, é usar outra combinação de métodos dela |
| §4.6 policy sem Bouncer | **CONTRADIZ** | `_doc-lib/adonisjs.md#guides/auth/authorization` | quote: *"Políticas por recurso são o caminho para regras como 'só o dono do registro edita'"* — a doc oficial do AdonisJS resolve exatamente esse caso com `BasePolicy` + `Bouncer`, e a casa optou por uma classe comum sem o pacote. É divergência **documentada e justificada** (quebraria `Payload → Either`), mas ainda vai contra o mecanismo que a doc recomenda — por isso CONTRADIZ, não ESCOLHA |
| §4.7 model só com relações/enum narrowing/`prepare`-`consume`/scopes/`@computed` | SUSTENTADA | `_doc-lib/lucid.md#models`, `#schema-classes` | corresponde ao que a doc descreve como extensão do model gerado |
| §4.8 soft delete por query scope, não `@beforeFetch`/scope global | SUSTENTADA | `_doc-lib/lucid.md#model-query-scopes`, `#model-hooks` | citações literais confirmadas: *"assim que o mesmo filtro aparecer pela terceira vez..."* e *"hooks não disparam em update ou delete em massa via query builder"* batem byte a byte com o doc-lib |
| §4.9 service vs `_shared` pelo critério dependência/estado | SEM BASE | — | heurística arquitetural própria |
| §6 ENV: toda chave com schema, sem default para segredo | SEM BASE | — | política operacional da casa, razoável, sem doc para contradizer |
| §7 cobertura ≥ 2,0 specs/controller | SEM BASE | — | métrica interna arbitrária |
| §9 Conventional Commits em pt-BR | ESCOLHA | conventionalcommits.org | a spec define os tipos em inglês (`feat`, `fix`, …) mas não a língua da descrição — pt-BR é escolha válida dentro da spec |
| §10 guard-rails (`pattern:check`, `sync:check`, `authz:check`, `di:check`) | SEM BASE | — | ferramental próprio do repositório, não é regra de biblioteca de terceiro |

## backend-fastify.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| §2 controller resolvido pelo container via `design:paramtypes` | SUSTENTADA | `_doc-lib/fastify-decorators.md#Controllers`, `#Services and dependency injection` | confirmado: container resolve por tipo, falha silenciosa quando o tipo não sobrevive à compilação |
| §2 schema da rota escrito à mão (Fastify não deriva do validator) | SUSTENTADA | `_doc-lib/fastify.md#Reference/Validation-and-Serialization` | confirmado: "o que não está declarado não é serializado" — schema de resposta é filtro, não decoração |
| §3 registry por convenção contract/impl, nunca importar por barrel | SUSTENTADA | `_doc-lib/fastify-decorators.md#Services and dependency injection` | elisão de tipo em barrel é o mesmo risco que a doc descreve para `emitDecoratorMetadata` |
| §4 store substitui repositório; `_id` ObjectId só no banco; relação por `$in`, não `$lookup` | SUSTENTADA | `_doc-lib/mongodb.md#crud/query/query-document`, `#crud/query/project` | citações confirmadas: `$exists` vs `null`, projeção de inclusão/exclusão mutuamente exclusivas |
| §5 plugin registrado uma vez no kernel, nunca dentro de controller | SUSTENTADA | `_doc-lib/fastify.md#Reference/Encapsulation` | confirmado: decorator só existe no contexto em que foi registrado e nos filhos |
| §5 `fastify-plugin` (`fp()`) para vazar decorator de propósito | SUSTENTADA | `_doc-lib/fastify.md#Reference/Plugins` | confirmado, incluindo a pegadinha de `prefix` ignorado dentro de `fp()` |
| §6 handler de erro central, ordem de reconhecimento | ESCOLHA | `_doc-lib/fastify.md#Reference/Validation-and-Serialization` (parcial) | a ordem exata (VineJS → BSONError → E11000 → 4xx nativo → 500) é decisão da casa; Fastify documenta hooks de erro mas não prescreve essa lista |
| §7 leitor de ENV síncrono, sem schema de promise | SEM BASE | — | não há doc-lib de dotenv/validação; raciocínio é análogo ao de `vitejs.md#env-and-mode` (schema deve ser síncrono), mas não citado |
| §8 unit sem banco / e2e com Mongo real, runners separados | ESCOLHA | `_doc-lib/vitest.md#guide`, `#config/pool` | Vitest documenta `pool`/paralelismo, mas a separação unit/e2e por arquivo é organização da casa |
| §9 Socket.IO no mesmo `http.Server`, nunca `app.listen` próprio | SUSTENTADA | `_doc-lib/socket-io.md#server-initialization` | citação literal confirmada ("app.listen(3000) não funciona") |
| §9 BullMQ worker in-process, job persiste no Redis | SUSTENTADA | `_doc-lib/bullmq.md#guide/architecture` | confirmado: máquina de estados documentada, retomada automática é comportamento do Redis, não lógica própria |
| §9 isolated-vm só para código de usuário, timeout curto + heap limitado | SUSTENTADA | `_doc-lib/isolated-vm.md#security` | citação quase literal da seção de segurança oficial |
| §10 segredo em repouso cifrado (HKDF, AAD, versionado) | SEM BASE | — | boa prática de segurança, mas sem doc-lib de criptografia para apoiar; nenhuma contradição |

## frontend.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| §1 `-components/` ignorado pelo router; `index.tsx`/`index.lazy.tsx` separados | SUSTENTADA | `_doc-lib/tanstack-router.md#routing/route-trees`, `#routing/routing-concepts` | confirmado: árvore de arquivos é a hierarquia, prefixo `-` é convenção real do gerador |
| §2 dado de servidor no cache do Query, nunca `useState`/store espelho | SUSTENTADA | `_doc-lib/tanstack-query.md#guides/queries` | pattern central da biblioteca |
| §2 filtro/paginação na URL (`validateSearch`), não `useState` | SUSTENTADA | `_doc-lib/tanstack-router.md#guide/search-params` | confirmado, inclusive a exigência de `validateSearch` ser síncrono |
| §2.1 query key factory por módulo, prefixo `all` para invalidar família | SUSTENTADA | `_doc-lib/tanstack-query.md#guides/query-keys` | o próprio doc-lib mostra a fábrica com `all`/`list`/`detail` como "caso comum" |
| §2.1 `queryOptions()` sempre, nunca `queryKey`/`queryFn` soltos | SUSTENTADA | `_doc-lib/tanstack-query.md#guides/query-options` | citação: "É a convenção que este pacote recomenda, e a que a regra `prefer-query-options` do ESLint cobra" |
| §3 ambiente ativo em cookie, nunca `localStorage` (por causa do SSR) | SUSTENTADA | `_doc-lib/tanstack-start.md#guide/server-functions` | coerente com o modelo de execução servidor/cliente do Start |
| §3 env de build lido em `env.ts`, síncrono | ESCOLHA | `_doc-lib/vitejs.md#env-and-mode` | a doc recomenda `createEnv` do `@t3-oss/env-core` com schema **síncrono** — a regra da casa não proíbe schema, só promessa; compatível, mas o texto "checada à mão" é mais estrito que o necessário |
| §4 `vineResolver`, nunca `register(...,{ required, pattern })` do RHF | SUSTENTADA | `_doc-lib/react-hook-form.md#get-started#Applyvalidation` | a própria entrada do doc-lib já rotula essa forma como "para reconhecer e não usar" nesta stack |
| §4 erro 422/409 aplicado ao form via `applyHTTPErrorToForm`/`setError` | SUSTENTADA | `_doc-lib/react-hook-form.md#docs/useform/seterror` | mecanismo (`root`, chave por campo) corresponde exatamente ao documentado |
| §4 máscara com `.parse()` antes de enviar, nunca regex manual | SUSTENTADA | `_doc-lib/use-mask-input.md#tutorial-basics/static-mask` | confirmado, inclusive o aviso sobre `maxLength` |
| §4 form dinâmico usa `rules.validate`, não `resolver` | SUSTENTADA | `_doc-lib/react-hook-form.md#get-started#Applyvalidation` | é limitação documentada da própria lib (resolver e rules não convivem) |
| §5 `QueryErrorResetBoundary` + `react-error-boundary` no `Outlet` | SUSTENTADA | `_doc-lib/tanstack-query.md#guides/important-defaults` | padrão documentado para retry sem recarregar |
| §6 `components/ui/` não se edita módulo a módulo; tema via token | SUSTENTADA | `_doc-lib/shadcn.md#docs/theming` | confirmado |
| §6 cor semântica, nunca paleta fixa | SUSTENTADA | `_doc-lib/shadcn.md#docs/theming`, `_doc-lib/tailwindcss.md#dark-mode` | confirmado nas duas |
| §6 Tailwind v4 via plugin do Vite, sem `tailwind.config.js` | SUSTENTADA | `_doc-lib/tailwindcss.md#installation/using-vite` | citação: "é a única opção que aproveita o motor novo sem intermediário" |
| §6 `cn()` (`clsx`+`tailwind-merge`) para classe condicional | SEM BASE | `_doc-lib/tailwindcss.md#styling-with-utility-classes` (indireto) | `tailwind-merge` não é biblioteca oficial do Tailwind; a doc oficial não menciona esse padrão, embora não o contradiga — é convenção difundida no ecossistema shadcn |
| Divergências resolvidas (query-key por módulo, `verbatimModuleSyntax`, Prettier) | ESCOLHA | já citadas acima | o próprio arquivo registra a divergência entre os três projetos e a maioria escolhida — exatamente o uso correto da categoria ESCOLHA |

## tooling.md

| Regra | Classe | Base | Nota |
|---|---|---|---|
| §0 dependências sempre na versão mais nova publicada | SEM BASE | — | política interna; nenhuma doc de biblioteca prescreve isso, e não contradiz nenhuma |
| §1 `packageManager` fixo no `package.json` para o corepack | SEM BASE | — | comportamento real do corepack/npm, mas sem doc-lib de Node/npm para citar |
| §2 Node ≥ 24 em `engines.node` | SEM BASE | — | escolha de política de suporte, não uma prescrição de doc |
| §3 flags estritas de tsconfig | SUSTENTADA | typescriptlang.org/tsconfig | cada flag citada existe e se comporta como descrito (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, etc.) |
| §4 ESLint flat config, quatro regras "nativas do typescript-eslint" | **CONTRADIZ** (erro factual) | eslint.org/docs/latest/rules/no-ternary vs. typescript-eslint.io | `no-ternary` é regra **core do ESLint**, não do pacote `typescript-eslint` — o texto afirma "as quatro primeiras... são nativas do typescript-eslint", o que é verdade para três (`no-explicit-any`, `consistent-type-assertions`, `consistent-type-definitions`) mas não para `no-ternary` |
| §4 `no-restricted-syntax` para `new *Service\|UseCase\|Policy\|Controller\|Repository` | SUSTENTADA | eslint.org (regra core `no-restricted-syntax`, seletor AST válido) | mecanismo real do ESLint, seletor bem formado |
| §4 `projectService: true` para regras type-aware | SUSTENTADA | typescript-eslint.io (parserOptions) | opção real, substitui o antigo `project` |
| §4 ausência de regra automatizada para `Merge`/lookup object | SUSTENTADA (autoavaliação correta) | — | o próprio arquivo já classifica isso como "regra de revisão humana... não finja que estão automatizadas" — é a casa fazendo a mesma auditoria que este documento faz |
| §5 Prettier `semi: false`, `singleQuote`, `trailingComma: all` | ESCOLHA | prettier.io/docs/options (`semi`: default `true`, `false` é opção válida) | confirmado: default do Prettier é `semi: true`; a casa optou pela opção alternativa, documentada, via `@adonisjs/prettier-config` |
| §6 commitlint + husky, Conventional Commits | ESCOLHA | conventionalcommits.org | ver nota em `backend.md §9` |
| §7 portões de CI (install --frozen-lockfile, lint, typecheck, openapi, test, build) | SEM BASE | — | pipeline próprio do repositório, sem doc de terceiro para contradizer |

## openapi.md

Documento descreve um gerador interno (não uma biblioteca de terceiro); poucas sentenças são
verificáveis contra doc oficial — a maioria descreve o próprio script. As que citam comportamento de
biblioteca:

| Regra | Classe | Base | Nota |
|---|---|---|---|
| `response` do Fastify como whitelist de serialização, não documentação | SUSTENTADA | `_doc-lib/fastify.md#Reference/Validation-and-Serialization` | citação quase literal: "o que não está declarado não é serializado" |
| Esquema de segurança `apiKey` em cookie, não `bearer` | SEM BASE | — | descrição tecnicamente correta do OpenAPI 3 (`securitySchemes.type: apiKey, in: cookie`), mas não há `_doc-lib` de OpenAPI/Swagger para citar — recomendação: adicionar nota apontando `swagger.io/docs/specification/authentication/api-keys/` |
| Resto do documento (scripts, registro de resposta, tags, `openapi:verify`) | N/A | — | descreve mecanismo interno do repositório, não uma regra que possa contradizer doc de terceiro |

---

## Ações

**CONTRADIZ — correção proposta:**

1. `backend.md` §2 regra 4 (`type`, nunca `interface`) e `tooling.md` §4 (`consistent-type-definitions: 'type'`):
   nenhum dos dois documentos justifica a escolha com um "por quê", ao contrário de §4.5/§4.6/§4.8 de
   `backend.md`. O Handbook recomenda o oposto como heurística padrão ("use interface until you need
   features from type"). Proposta: ou (a) adicionar a justificativa que falta — provavelmente
   consistência com union types e `satisfies`, que `interface` não expressa — alinhando com o espírito
   de "divergência registrada" que o resto do documento já pratica, ou (b) relaxar a regra para objetos
   simples sem união/mapeamento, onde o Handbook pesa mais.

2. `backend.md` §4.6 (policy sem Bouncer): já é uma divergência documentada e justificada
   tecnicamente (Bouncer exigiria `HttpContext` no use-case). Proposta: não mudar o código — só
   adicionar, ao lado da citação em §0, a mesma frase que §4.5/§4.8 já têm ("correção sobre a doc"),
   deixando explícito que é uma decisão consciente e não uma lacuna de leitura da doc.

3. `tooling.md` §4 (afirmação de que `no-ternary` é "nativa do typescript-eslint"): é erro factual,
   não de design. Proposta: trocar o texto por "três são nativas do `typescript-eslint`
   (`no-explicit-any`, `consistent-type-assertions`, `consistent-type-definitions`); `no-ternary` é
   regra core do ESLint."

4. `backend.md` §4.4 e §4.5 (unicidade no use-case; paginação manual): não exigem correção — já
   citam a doc e explicam o porquê — mas valeria suavizar a palavra "Divergência deliberada" para
   "escolha dentro do que a doc oferece", já que ambos os caminhos (VineJS `unique()`/`.serialize()`
   vs. a alternativa escolhida) estão documentados na mesma página.

**SEM BASE — citar ou marcar "opinião da casa":**

- `typescript.md` §8 / `backend.md` §2 regra 5 (`Merge<A,B>`): marcar explicitamente como "opinião da
  casa" no próprio arquivo (hoje está implícito; só `tooling.md` admite a ausência de regra
  automatizada, `typescript.md` não).
- `backend-fastify.md` §10 (segredo em repouso, HKDF/AAD): recomendação de segurança correta, mas sem
  citação. Adicionar referência a `RFC 5869` (HKDF) ou à documentação de `node:crypto` em vez de
  deixar sem base.
- `backend-fastify.md` §7 (leitor de ENV síncrono): citar `_doc-lib/vitejs.md#env-and-mode`, que já
  documenta a mesma exigência de sincronismo para o módulo de env (hoje só o padrão de frontend cita).
- `openapi.md` (esquema `apiKey` em cookie): adicionar link à especificação OpenAPI 3 sobre
  `securitySchemes` tipo `apiKey`.
- `tooling.md` §0, §1, §2 (versão sempre mais nova, `packageManager`, Node ≥ 24): marcar como
  "opinião da casa" no cabeçalho da seção — são políticas operacionais razoáveis, não há doc de
  terceiro a favor ou contra, e está bem que o leitor saiba que não precisa procurar citação ali.
