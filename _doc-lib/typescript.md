# TypeScript

> Conferido em 2026-10-14 contra as 75 páginas da lista (Handbook, Reference, Modules, Declaration
> Files, Project Configuration, a referência do `tsconfig`, Playground, Download e o post do 7.0),
> abertas como HTML e extraídas em texto (o site não publica `.md` nem `llms.txt`: 404), e contra o
> pacote publicado `typescript@6.0.3` (`npm pack` + `lib/typescript.d.ts`, `lib/lib.es5.d.ts` e a
> lista de depreciação em `lib/_tsc.js`).
>
> **A casa fica no TypeScript 6.x e não adota o 7** (`tooling.md` §0, `DECISIONS.md` #121). Em
> 2026-10-14 o `npm view typescript dist-tags` responde `latest: 7.0.2`, `rc: 7.0.1-rc`,
> `next: 7.1.0-dev.*`; a última 6.x é `6.0.3`. Portanto `pnpm add -D typescript` **sem faixa**
> instala o 7: sempre `typescript@~6`. O 7.0 não tem API programática (volta "nova e diferente" no
> 7.1), e ferramenta que importa `typescript` (typescript-eslint, plugin de editor) depende da API
> do 6. A entrada `typescript/announcing-typescript-7-0` registra o que muda, como referência para a
> migração futura, não como instrução.
>
> A referência do `tsconfig` está parcialmente defasada em relação ao 6.0: mostra `strict`,
> `types: []` e `noUncheckedSideEffectImports` com o default novo, mas ainda descreve `baseUrl`,
> `moduleResolution: node10`, `target: ES5` e `outFile` sem marcar a depreciação. A depreciação vem
> do compilador publicado (`checkDeprecations("6.0", "7.0", ...)` em `_tsc.js`: `baseUrl`,
> `outFile`, `target: ES5`, `module`/`moduleResolution` antigos, `esModuleInterop`,
> `allowSyntheticDefaultImports` e `alwaysStrict` em `false`) e da lista do post do 7.0.

Superset tipado do JavaScript: um verificador estático que roda antes do código e some no build.
Todo projeto da casa (backend AdonisJS ou Fastify, frontend TanStack Start, `shared/`) é TypeScript
de ponta a ponta.

**O que é:** a linguagem (tipos anotados, inferidos e derivados de outros tipos) e o compilador
`tsc`, configurado por `tsconfig.json`. Os tipos são apagados na emissão
(`docs/handbook/typescript-from-scratch`, "Erased Types"): nada do que está em `type`, `: T` ou
`satisfies` existe em runtime.

**Para que serve:** pegar no editor e no CI o defeito que o JavaScript só mostra em produção:
propriedade inexistente, `undefined` esquecido, `case` que falta numa união, import que não resolve,
contrato de função quebrado. Na casa, é o que sustenta "o tipo nasce na fonte" (`typescript.md` §1)
e a resposta da API tipada pelo schema (`typescript.md` §2).

**Como usar:**

```bash
pnpm add -D typescript@~6
```

```jsonc
// tsconfig.json: o piso da casa (tooling.md §3) por cima do preset do framework
{
  "extends": "nitro/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"]
  }
}
```

```ts
type UploadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'failed'; readonly code: string }

const LABEL = { idle: 'Aguardando', failed: 'Falhou' } satisfies Record<UploadState['kind'], string>

function label(state: UploadState): string {
  switch (state.kind) {
    case 'idle': return LABEL.idle
    case 'failed': return state.code
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}
```

**Quando adotar a biblioteca:** sempre; não é opcional na casa. O que se decide por projeto é só o
preset (`@adonisjs/tsconfig`, `nitro/tsconfig`, nenhum no Fastify) e o perfil de módulo
(`tooling.md` §3). A versão não se decide: última 6.x.

**O que muda a experiência:**

1. **`typescript@latest` já é o 7.** Instalar sem faixa, seguir o `pnpm update --latest` ou aceitar
   o PR de major do Dependabot troca o compilador por um sem API e quebra o typescript-eslint. A
   faixa `~6` e o `ignore` de major no Dependabot (`tooling.md` §0) são o que segura.
2. **No 6.0 o default de `types` virou `[]`** (`tsconfig#types`): `process`, `describe`, `expect`
   somem até o pacote ser listado. Erro de "Cannot find name 'process'" depois do upgrade é isso, não
   falta de `@types/node`.
3. **`noUncheckedIndexedAccess` só toca índice não declarado**: index signature (`Record<string, V>`,
   `{ [k: string]: V }`) e array. `Record<'a' | 'b', V>` tem chaves declaradas e continua `V`.
4. **`verbatimModuleSyntax`**: o que você escreve é o que sai. Import sem `type` fica no JS, import
   com `type` some; `import { type X } from 'x'` vira `import {} from 'x'` e mantém o efeito
   colateral do módulo.
5. **O Handbook não fala de `satisfies`**: o operador só aparece na página de JSDoc (`@satisfies`).
   A regra "`satisfies` em vez de `as`" da casa se apoia nas release notes do 4.9, fora desta lista.

**Links:** 75

**Skills:** `code-pattern` (estilo: sem `any`, sem `as`, sem `!`, `type`, `Merge`), `maiyu-standards`
(acha a seção de `typescript.md`/`tooling.md`), `maiyu-backend` e `maiyu-frontend` (o tipo na
camada), `migrate-to-shoehorn` (só `fromPartial` em teste, `typescript.md` §1). Dispare junto com a
leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Get Started

#### docs/handbook/typescript-from-scratch
[doc](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
**O que é:** introdução para quem não conhece JavaScript: TypeScript como verificador estático,
superset tipado, comportamento de runtime igual ao do JS e tipos apagados na emissão.
**Para que serve:** fixar que tipo não existe em runtime; por isso dado de fora precisa de
validator e não de anotação (`typescript.md` §2).
**Quando usar:** onboarding de quem chega sem JS; argumento contra "o tipo garante" quando o dado
vem da rede.

#### docs/handbook/typescript-in-5-minutes
[doc](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
**O que é:** tour para quem já programa em JS: inferência, definição de tipo, união, genérico e
tipagem estrutural.
**Para que serve:** o mínimo para ler código da casa. A página define tipos com `interface`; a casa
escreve `type` (`backend.md` §2, item 5).
**Quando usar:** primeira leitura de quem vem do JavaScript.

#### docs/handbook/typescript-in-5-minutes-oop
[doc](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html)
**O que é:** TypeScript para quem vem de Java/C#: função livre, classe estática dispensável, tipos
como conjuntos, tipagem estrutural e ausência de reflexão de tipo.
**Para que serve:** explicar por que `instanceof` de interface não existe e por que dois tipos com o
mesmo formato são intercambiáveis.
**Quando usar:** dev de C#/Java estranhando DI por `abstract class` (`solid.md`) ou id que aceita
qualquer string (ver "ID com marca", `typescript.md` §11).

#### docs/handbook/typescript-in-5-minutes-func
[doc](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html)
**O que é:** TypeScript para quem vem de Haskell/ML: união discriminada, tipos unitários,
`readonly` e `const`, inferência contextual, ausência de higher-kinded types.
**Para que serve:** ponte para união discriminada e `readonly`, que a casa usa por padrão
(`typescript.md` §3 e §7).
**Quando usar:** quem pensa em tipos algébricos e quer o equivalente.

#### docs/handbook/typescript-tooling-in-5-minutes
[doc](https://www.typescriptlang.org/docs/handbook/typescript-tooling-in-5-minutes.html)
**O que é:** primeiro arquivo `.ts` compilado com `tsc`, anotações, interfaces e classes, rodando
no navegador.
**Para que serve:** ver o ciclo `tsc` → `.js` à mão. Instala globalmente com `npm install -g`; a
casa instala por projeto com faixa `~6`.
**Quando usar:** só como demonstração; não é o fluxo dos projetos (Vite, tsup e o build do Adonis
emitem; `tsc --noEmit` só checa).

## Handbook

#### docs/handbook/intro
[doc](https://www.typescriptlang.org/docs/handbook/intro.html)
**O que é:** apresentação do Handbook: estrutura, o que ele não cobre (não é especificação, não
ensina JS do zero).
**Para que serve:** saber que o Handbook é guia; a fonte exata de flag é `tsconfig` e de API é o
`.d.ts` instalado.
**Quando usar:** antes de citar o Handbook como contrato de detalhe que ele não promete.

#### docs/handbook/2/basic-types
[doc](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
**O que é:** "The Basics": checagem estática, falha que não é exceção, `tsc`, emitir com erro,
tipos explícitos, apagamento, downleveling e as flags `noImplicitAny`/`strictNullChecks`.
**Para que serve:** de onde vem "emitir mesmo com erro" (`noEmitOnError`) e por que `strict` é o
piso.
**Quando usar:** explicar por que o CI roda `tsc --noEmit` e não confia só no build do bundler, que
não checa tipo.

#### docs/handbook/2/everyday-types
[doc](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
**O que é:** primitivos, arrays, `any`, anotação, função, objeto, união, alias, interface, a seção
"Differences Between Type Aliases and Interfaces", asserção de tipo, literais, `null`/`undefined`,
`!` pós-fixo e enum.
**Para que serve:** base de três regras da casa. A página diz que entre `type` e `interface` "you
can choose based on personal preference" (a casa escolhe `type`); que asserção (`as`) "won't
affect the runtime" e não checa nada (a casa proíbe `as`, `typescript.md` §1); que `!` "doesn't
change the runtime behavior" (a casa proíbe, `backend.md` §2 item 4).
**Quando usar:** sustentar `type`/sem `as`/sem `!` em revisão. Atenção: a heurística da página é a
oposta ("use interface until you need to use features from type") e ela registra que `interface`
com `extends` "can often be more performant" que interseção; a escolha da casa é permitida, não
recomendada pela doc.

#### docs/handbook/2/narrowing
[doc](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
**O que é:** como o compilador estreita um tipo pelo fluxo: `typeof`, truthiness, igualdade, `in`,
`instanceof`, atribuição, análise de fluxo, predicado (`x is T`), função de asserção, união
discriminada, `never` e checagem exaustiva.
**Para que serve:** é o mecanismo que substitui `as` e `!`. A casa restringe onde ele roda:
`typeof`/`instanceof`/`in` só na fronteira (validator, `http.ts`, leitor de ENV, parser), e dentro
do domínio só o `switch` sobre o discriminante (`typescript.md` §2.1 e §3).
**Quando usar:** todo `switch` de união com `default` em `never`; todo guard no topo da função em
vez de `!`.

```ts
default: {
  const unreachable: never = state
  return unreachable
}
```

#### docs/handbook/2/functions
[doc](https://www.typescriptlang.org/docs/handbook/2/functions.html)
**O que é:** tipo de função, assinatura de chamada e de construção, genérico (inferência,
restrição, "Guidelines for Writing Good Generic Functions"), parâmetro opcional, overload, `this`,
`void`, `object`, `unknown`, `never`, `Function`, rest e destructuring.
**Para que serve:** base de "tipo `Function` → assinatura explícita" (`typescript.md` §11) e de
`unknown` em vez de `any`.
**Quando usar:** escrever genérico (regra da página: o parâmetro de tipo aparece pelo menos duas
vezes, senão não é genérico) ou decidir entre overload e união.

#### docs/handbook/2/objects
[doc](https://www.typescriptlang.org/docs/handbook/2/objects.html)
**O que é:** modificadores de propriedade (`?`, `readonly`), index signature, checagem de
propriedade excedente, extensão, interseção, "Interface Extension vs. Intersection", tipo de objeto
genérico, `ReadonlyArray`, tupla.
**Para que serve:** a seção de interseção mostra o defeito que o `Merge` da casa evita: chave
repetida com tipos diferentes vira `never` em `A & B`, sem erro (`typescript.md` §8).
**Quando usar:** decidir entre `&` e `Merge`; tipar lista imutável (`ReadonlyArray<T>`, §7).

#### docs/handbook/2/types-from-types
[doc](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
**O que é:** índice do capítulo "Creating Types from Types": genérico, `keyof`, `typeof`, acesso
indexado, condicional, mapeado e template literal.
**Para que serve:** mapa para derivar tipo de outro em vez de redigitar o formato.
**Quando usar:** antes de escrever à mão um tipo que já existe noutro lugar (zero duplicidade).

#### docs/handbook/2/generics
[doc](https://www.typescriptlang.org/docs/handbook/2/generics.html)
**O que é:** variável de tipo, tipo genérico, classe genérica, restrição (`extends`), parâmetro de
tipo na restrição, default e anotação de variância.
**Para que serve:** o genérico do driver no lugar do cast (`db.collection<Row>()`,
`typescript.md` §1) e o `Either<L, R>` da casa.
**Quando usar:** repositório, `Either`, helper de teste; sem genérico que não se repete na
assinatura.

#### docs/handbook/2/keyof-types
[doc](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
**O que é:** o operador `keyof`, que produz a união das chaves de um tipo.
**Para que serve:** metade da trinca do enum da casa: `(typeof X)[keyof typeof X]`
(`typescript.md` §4).
**Quando usar:** derivar a união de chaves de um objeto `as const`.

#### docs/handbook/2/typeof-types
[doc](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
**O que é:** o `typeof` em posição de tipo (pega o tipo de um valor) e a limitação: só sobre
identificador ou propriedade, não sobre chamada.
**Para que serve:** tipo derivado do valor: `typeof POST_STATUS`, `Infer<typeof Validator>`. Não é
o `typeof` de runtime que `typescript.md` §2.1 restringe.
**Quando usar:** sempre que o valor é a fonte e o tipo segue (validator, constante, enum).

```ts
export const POST_STATUS = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' } as const
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS]
```

#### docs/handbook/2/indexed-access-types
[doc](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
**O que é:** `T['campo']`, `T[number]` e acesso por união de chaves para ler o tipo de uma
propriedade.
**Para que serve:** `UploadState['kind']` como chave de `satisfies Record` (`typescript.md` §3) e o
item de um array `as const`.
**Quando usar:** quando o tipo de um campo já existe no tipo maior.

#### docs/handbook/2/conditional-types
[doc](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
**O que é:** `A extends B ? X : Y` em tipo, restrição, `infer` e distribuição sobre união.
**Para que serve:** utilitário de tipo pontual. A casa limita a profundidade: tipo condicional que
precisa de comentário para ler vira tipos nomeados (`typescript.md` §8). O "sem ternário" da casa é
de valor, não se aplica a tipo condicional.
**Quando usar:** raramente fora de `shared/` (o `Merge` e o que o framework exige).

#### docs/handbook/2/mapped-types
[doc](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
**O que é:** `{ [K in keyof T]: ... }`, modificadores `readonly`/`?` com `+`/`-` e remapeamento de
chave com `as`.
**Para que serve:** como `Partial`, `Readonly` e o `Merge` são construídos. O `as` do remapeamento
é sintaxe de tipo, não asserção.
**Quando usar:** escrever utilitário em `shared/` que os nativos não cobrem.

#### docs/handbook/2/template-literal-types
[doc](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
**O que é:** tipo literal de string por template (`` `${A}_${B}` ``), inferência com template e
`Uppercase`/`Lowercase`/`Capitalize`/`Uncapitalize`.
**Para que serve:** chave composta sem lista à mão (`typescript.md` §11). No 7.0 a inferência passa
a respeitar ponto de código Unicode (ver entrada do 7.0).
**Quando usar:** chave de rótulo por idioma, nome de evento, chave de cache.

```ts
type Locale = 'pt' | 'en'
type TitleKey = `${Locale}_title`
const LABEL = { pt_title: 'Título', en_title: 'Title' } satisfies Record<TitleKey, string>
```

#### docs/handbook/2/classes
[doc](https://www.typescriptlang.org/docs/handbook/2/classes.html)
**O que é:** campo, `strictPropertyInitialization`, `readonly`, construtor, método, acessor,
`implements`, `extends`, `override`, ordem de inicialização, visibilidade, membro estático, bloco
`static`, classe genérica, parameter properties e classe abstrata.
**Para que serve:** forma das classes da casa: use-case, service, repositório e contrato por
`abstract class` (`solid.md`), injeção por construtor com parameter property
(`constructor(private readonly x: X) {}`) e `override` exigido por `noImplicitOverride`.
**Quando usar:** escrever implementação de contrato (`extends` de `abstract class`, com `override`).

#### docs/handbook/2/modules
[doc](https://www.typescriptlang.org/docs/handbook/2/modules.html)
**O que é:** o que é módulo em JS, sintaxe ESM, `import type`, sintaxe CommonJS, interop, opções de
resolução e de saída, namespaces.
**Para que serve:** `import type` e `import { type X }`, que `verbatimModuleSyntax` torna
obrigatórios para o que é só tipo (`typescript.md` §9).
**Quando usar:** dúvida de sintaxe de import/export; o detalhe de configuração está em
`docs/handbook/modules/*`.

## Reference

#### docs/handbook/utility-types
[doc](https://www.typescriptlang.org/docs/handbook/utility-types.html)
**O que é:** os utilitários globais: `Awaited`, `Partial`, `Required`, `Readonly`, `Record`, `Pick`,
`Omit`, `Exclude`, `Extract`, `NonNullable`, `Parameters`, `ConstructorParameters`, `ReturnType`,
`InstanceType`, `NoInfer`, `ThisParameterType`, `OmitThisParameter`, `ThisType` e os de string.
**Para que serve:** "os nativos primeiro" (`typescript.md` §8). `NoInfer<T>` (conferido em
`lib.es5.d.ts` do 6.0.3) é o substituto de genérico inferido pelo argumento errado (§11).
**Quando usar:** antes de escrever utilitário próprio; `Merge` só quando nenhum nativo resolve.

```ts
function createState<T>(initial: T, fallback: NoInfer<T>): T {
  return initial ?? fallback
}
```

#### docs/handbook/decorators
[doc](https://www.typescriptlang.org/docs/handbook/decorators.html)
**O que é:** decorators **experimentais** (stage 2, `experimentalDecorators`), fábrica, composição,
ordem de avaliação, decorator de classe/método/acessor/propriedade/parâmetro e metadados com
`emitDecoratorMetadata` + `reflect-metadata`. A própria página avisa que o stage 3 existe desde o 5.0.
**Para que serve:** é o modelo que o perfil Fastify usa (`fastify-decorators`, DI por tipo do
parâmetro do construtor via `design:paramtypes`); o AdonisJS também usa decorator (`@inject`).
**Quando usar:** só no perfil que exige `experimentalDecorators` (`tooling.md` §3); decorator
próprio fora do framework não entra.

#### docs/handbook/declaration-merging
[doc](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
**O que é:** fusão de interfaces, de namespaces, namespace com classe/função/enum, fusões
proibidas, augmentation de módulo (`declare module`) e global (`declare global`).
**Para que serve:** é a base da única exceção a "sempre `type`": `declare module` exige
`interface` para estender o tipo de outro pacote (`backend.md` §2 item 5), por exemplo
`ctx.actor`, eventos tipados, `Register` do TanStack Router.
**Quando usar:** tipar extensão de framework; `type` não se funde e daria "Duplicate identifier".

```ts
declare module '@adonisjs/core/http' {
  interface HttpContext {
    actor: Actor
  }
}
```

#### docs/handbook/enums
[doc](https://www.typescriptlang.org/docs/handbook/enums.html)
**O que é:** enum numérico, de string, heterogêneo, membros calculados, enum em runtime e em
compilação, mapeamento reverso, `const enum` e suas armadilhas, enum ambiente e a seção "Objects vs
Enums".
**Para que serve:** a seção final ("you may not need an enum when an object with as const could
suffice") é a base do enum da casa como objeto `as const` (`typescript.md` §4).
**Quando usar:** argumento em revisão quando aparecer `enum`; a forma da casa é a trinca
`POST_STATUS`/`PostStatus`/`POST_STATUSES`.

#### docs/handbook/iterators-and-generators
[doc](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)
**O que é:** iterável, `for..of` vs `for..in` e geração de código por alvo (a parte de ES5 não vale
mais: `target: ES5` foi depreciado no 6.0).
**Para que serve:** `for..of` sobre valores; `for..in` itera chaves e pega herdadas.
**Quando usar:** iterar cursor do driver, stream ou gerador; nunca `for..in` em array.

#### docs/handbook/jsx
[doc](https://www.typescriptlang.org/docs/handbook/jsx.html)
**O que é:** arquivo `.tsx`, por que em `.tsx` a asserção só pode ser `as`, checagem de elemento
intrínseco e por valor, componente função e classe, atributo, `children`, tipo de resultado,
integração com React e o `jsx` do `tsconfig`.
**Para que serve:** o frontend usa `"jsx": "react-jsx"` (`tooling.md` §3); o tipo do componente
vem de `@types/react`.
**Quando usar:** erro de tipo em JSX (atributo, `children`) ou ao configurar `jsx` num pacote novo.

#### docs/handbook/mixins
[doc](https://www.typescriptlang.org/docs/handbook/mixins.html)
**O que é:** composição de classe por função que recebe uma classe e devolve outra, com restrição e
limitações (decorator e estático).
**Para que serve:** é o mecanismo do `compose()` de mixin do AdonisJS (`withAuthFinder` no model `User`).
**Quando usar:** ler o tipo de um model com mixin; a casa não escreve mixin próprio, compõe por
injeção (`solid.md`).

#### docs/handbook/namespaces
[doc](https://www.typescriptlang.org/docs/handbook/namespaces.html)
**O que é:** `namespace` do TypeScript: organização interna, divisão em arquivos, alias e namespace
ambiente.
**Para que serve:** ler declaração antiga de biblioteca. Namespace com código é recusado por
`erasableSyntaxOnly` e o 7.0 proíbe `module` como palavra de namespace.
**Quando usar:** não usar em código da casa; módulo ES é a unidade.

#### docs/handbook/namespaces-and-modules
[doc](https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html)
**O que é:** quando usar módulo e quando namespace, armadilhas (`/// <reference>` a módulo,
namespace redundante dentro de módulo) e trade-offs.
**Para que serve:** a página recomenda módulo para código novo.
**Quando usar:** argumento em revisão contra `namespace` em arquivo que já é módulo.

#### docs/handbook/symbols
[doc](https://www.typescriptlang.org/docs/handbook/symbols.html)
**O que é:** `symbol`, `unique symbol` e os símbolos bem conhecidos (`Symbol.iterator`,
`Symbol.asyncIterator`, `Symbol.hasInstance` e outros).
**Para que serve:** tipar iterável próprio e chave única; `Symbol.dispose` (do `using`) segue o
mesmo modelo.
**Quando usar:** raro; recurso descartável ou iterável customizado.

#### docs/handbook/triple-slash-directives
[doc](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
**O que é:** `/// <reference path|types|lib|no-default-lib />`, `amd-module`, `amd-dependency` e
`preserve="true"`.
**Para que serve:** o `/// <reference types="vite/client" />` que alguns templates geram;
`no-default-lib` deixa de ser respeitado no 7.0 sob `skipDefaultLibCheck`.
**Quando usar:** quase nunca; o tipo de ambiente entra por `types` no `tsconfig` (`tooling.md` §3).

#### docs/handbook/type-compatibility
[doc](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
**O que é:** tipagem estrutural, nota sobre soundness, comparação de funções, bivariância de
parâmetro, classes (membro `private` muda a compatibilidade), genéricos e a tabela de
atribuibilidade de `any`/`unknown`/`object`/`void`/`undefined`/`null`/`never`.
**Para que serve:** entender por que `UserId` e `PostId` como `string` simples se trocam sem erro,
e por que a casa usa marca (`typescript.md` §11).
**Quando usar:** erro de atribuição inesperado; desenhar id com marca.

#### docs/handbook/type-inference
[doc](https://www.typescriptlang.org/docs/handbook/type-inference.html)
**O que é:** inferência pelo melhor tipo comum e tipagem contextual.
**Para que serve:** saber quando não anotar (inferência basta) e quando anotar o retorno (função
exportada, contrato).
**Quando usar:** array de tipos mistos inferido errado; callback sem anotação.

#### docs/handbook/variable-declarations
[doc](https://www.typescriptlang.org/docs/handbook/variable-declarations.html)
**O que é:** `var`/`let`/`const`, escopo, destructuring, spread e `using`/`await using` com
`Symbol.dispose`/`Symbol.asyncDispose`.
**Para que serve:** `using` substitui `try/finally` manual para fechar recurso (`typescript.md` §11).
**Quando usar:** conexão, transação, arquivo temporário ou lock que precisa fechar no fim do bloco.

```ts
await using tmp = await TempDir.create()
```

#### cheatsheets
[doc](https://www.typescriptlang.org/cheatsheets/)
**O que é:** folhas de referência para baixar (PDF/PNG): análise de fluxo, interfaces, tipos e
classes.
**Para que serve:** consulta rápida de sintaxe.
**Quando usar:** onboarding; a folha de "Control Flow Analysis" resume o narrowing.

## Modules Reference

#### docs/handbook/modules/introduction
[doc](https://www.typescriptlang.org/docs/handbook/modules/introduction.html)
**O que é:** índice da documentação de módulos: teoria, guias, referência e apêndices.
**Para que serve:** porta de entrada para qualquer decisão de `module`/`moduleResolution`.
**Quando usar:** antes de mexer em resolução de módulo de um pacote.

#### docs/handbook/modules/theory
[doc](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
**O que é:** quem é o "host" (Node, bundler, navegador), formato de saída, detecção de formato,
interop ESM/CJS, especificador não é reescrito, resolução definida pelo host e papel do `.d.ts`.
**Para que serve:** o princípio "o TypeScript imita a resolução do host": o `tsconfig` descreve o
runtime, não o escolhe.
**Quando usar:** entender por que backend Adonis é `NodeNext` e frontend é `bundler`
(`tooling.md` §3).

#### docs/handbook/modules/guides/choosing-compiler-options
[doc](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
**O que é:** receitas por cenário: app com bundler (`module: esnext`, `moduleResolution: bundler`,
`noEmit`, `verbatimModuleSyntax`), saída rodando no Node (`module: nodenext`), ts-node, tsx,
navegador sem bundler e biblioteca (`module: node18`, `strict`, `declaration`).
**Para que serve:** sustenta os perfis de `tooling.md` §3. Para biblioteca, a página explica que
`bundler` é "infeccioso" e que código que passa em `nodenext` quase sempre funciona no bundler,
que é o argumento do `shared/` em `NodeNext`.
**Quando usar:** criar ou revisar o `tsconfig` de um perfil; um `tsconfig` representa um ambiente
só (servidor, DOM, teste separados).

```jsonc
// perfil frontend (bundler), só as opções de módulo
{ "compilerOptions": { "module": "esnext", "moduleResolution": "bundler", "noEmit": true, "verbatimModuleSyntax": true } }
```

#### docs/handbook/modules/reference
[doc](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
**O que é:** referência de sintaxe (import/export de declaração TS, `import type`, `import()` de
tipo, `export =`), módulo ambiente e cada valor de `module` (`node16`..`nodenext`, `preserve`,
`es20xx`/`esnext`, `commonjs`, `system`, `amd`, `umd`) e de `moduleResolution`, com opções
implícitas.
**Para que serve:** saber o que cada valor implica (ex.: `nodenext` implica `esModuleInterop` e
`target: esnext`). `system`, `amd`, `umd` e `none` foram depreciados no 6.0 e são erro no 7.0.
**Quando usar:** erro de resolução ou de interop que a receita do guia não explica.

#### docs/handbook/modules/appendices/esm-cjs-interop
[doc](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html)
**O que é:** `allowSyntheticDefaultImports` e `esModuleInterop`, interop no Node, o problema do
"double default", export nomeado não confiável, `require` de ESM antes do Node 22 e as conclusões.
**Para que serve:** explicar import default de pacote CommonJS que vem `undefined` ou como objeto
`{ default }`. No 6.0 `esModuleInterop: false` é depreciado.
**Quando usar:** biblioteca CJS antiga no backend (driver, SDK) com import default estranho.

## Tutorials

#### docs/handbook/dom-manipulation
[doc](https://www.typescriptlang.org/docs/handbook/dom-manipulation.html)
**O que é:** tipos do DOM: `HTMLElement`, `Document.getElementById`, `createElement`,
`appendChild`, `children` vs `childNodes`, `querySelector` genérico.
**Para que serve:** saber que `getElementById` devolve `HTMLElement | null` e que
`querySelector('input')` já tipa `HTMLInputElement` pelo seletor de tag, sem `as`.
**Quando usar:** raro no React; ref, portal ou integração com lib que pede elemento.

#### docs/handbook/migrating-from-javascript
[doc](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)
**O que é:** migração de projeto JS: diretórios, `tsconfig`, integração com build, renomear para
`.ts`, tratar erros, declaração de módulo e endurecer flags aos poucos (`noImplicitAny`,
`strictNullChecks`, `noImplicitThis`).
**Para que serve:** roteiro de quem herda projeto em JS. A casa não aceita o estado intermediário
com `any`: o piso de `tooling.md` §3 vale desde o primeiro commit em TS.
**Quando usar:** absorver projeto ou script JS legado.

#### docs/handbook/babel-with-typescript
[doc](https://www.typescriptlang.org/docs/handbook/babel-with-typescript.html)
**O que é:** quando usar Babel (ou outro transpilador) para emitir e `tsc` só para checar tipos e
gerar `.d.ts`, com `isolatedModules`.
**Para que serve:** é o mesmo arranjo da casa com outras ferramentas: Vite/esbuild e tsup emitem
sem checar, e `tsc --noEmit` checa no CI. Sem o passo do `tsc`, erro de tipo chega a produção.
**Quando usar:** justificar o `typecheck` separado no `pnpm check` (`tooling.md` §7).

| Página | O que é | Na casa |
|---|---|---|
| [asp-net-core](https://www.typescriptlang.org/docs/handbook/asp-net-core.html) | TypeScript num projeto ASP.NET Core com Gulp | fora da stack: backend é AdonisJS ou Fastify, não .NET |
| [gulp](https://www.typescriptlang.org/docs/handbook/gulp.html) | build com Gulp, Browserify, Watchify, Terser e Babel | fora da stack: o build é Vite (frontend), tsup ou o do Adonis |
| [react-&-webpack](https://www.typescriptlang.org/docs/handbook/react-&-webpack.html) | a página só redireciona para `webpack.js.org/guides/typescript/` | fora da stack: o frontend é TanStack Start sobre Vite, sem webpack |

## Declaration Files

#### docs/handbook/declaration-files/introduction
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
**O que é:** índice da seção de arquivos de declaração (`.d.ts`): referência, estruturas de
biblioteca, do's and don'ts, deep dive, publicação e consumo.
**Para que serve:** ponto de partida quando um pacote não tem tipo ou tem tipo errado.
**Quando usar:** antes de escrever `.d.ts` ou `declare module` para pacote sem tipo.

#### docs/handbook/declaration-files/by-example
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html)
**O que é:** como declarar objeto com propriedades, função sobrecarregada, tipo reutilizável
(interface e alias), organização de tipos, classe, variável e função globais.
**Para que serve:** modelo para tipar um pacote JS pequeno sem `@types`.
**Quando usar:** pacote sem tipo usado por um adapter de `services/` (o tipo não sai do adapter).

#### docs/handbook/declaration-files/library-structures
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html)
**O que é:** identificar se a biblioteca é modular, global ou UMD, como consumir dependências de
cada tipo e o efeito do ES6 em assinaturas de chamada de módulo.
**Para que serve:** escolher o template certo antes de escrever a declaração.
**Quando usar:** ao tipar biblioteca de terceiro sem tipo.

| Template | O que é | Na casa |
|---|---|---|
| [module-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html) | declaração de módulo comum: export default, padrões CommonJS, tipos no módulo, layout e teste dos tipos | o template a usar para pacote sem tipo no backend ou frontend |
| [module-plugin-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-plugin-d-ts.html) | módulo que estende outro módulo (plugin) | augmentation de pacote; na casa vira `declare module` com `interface` |
| [module-class-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-class-d-ts.html) | módulo cujo export é uma classe | pacote CJS que exporta classe (`export =`) |
| [module-function-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-function-d-ts.html) | módulo cujo export é uma função | pacote CJS que exporta função |
| [global-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-d-ts.html) | biblioteca global (script que cria variável global) | raro; script de terceiro no `<head>` |
| [global-modifying-module-d-ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html) | módulo que altera o escopo global ao ser importado | raro; polyfill. A casa não estende protótipo nativo |

#### docs/handbook/declaration-files/do-s-and-don-ts
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
**O que é:** regras para declarações: nunca `Number`/`String`/`Boolean`/`Object`, genérico que usa o
parâmetro, `any` só em migração ("Don't use any ... you can use unknown"), retorno `void` em
callback, parâmetro opcional em callback, ordem de overloads, opcional e união em vez de overload.
**Para que serve:** é a página oficial que sustenta "sem `any`, use `unknown`" (`backend.md` §2
item 2).
**Quando usar:** revisar `.d.ts` e assinatura pública de `shared/`; argumento contra `any`.

#### docs/handbook/declaration-files/deep-dive
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html)
**O que é:** teoria das declarações: tipo, valor e namespace como espaços separados, combinações
embutidas e de usuário, adição por interface ou namespace.
**Para que serve:** entender por que a trinca do enum (`POST_STATUS` valor e `PostStatus` tipo)
convive e por que `interface` se funde e `type` não.
**Quando usar:** declaração que precisa ser ao mesmo tempo valor e tipo.

#### docs/handbook/declaration-files/publishing
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
**O que é:** incluir declarações no pacote npm (`types`), dependências, sinais de alerta,
`typesVersions` e publicação no DefinitelyTyped.
**Para que serve:** o `shared/` é consumido por dois lados; se um dia for publicado, a página
define o `package.json`.
**Quando usar:** só se um pacote da casa for publicado; hoje o `shared/` é consumido do repositório.

#### docs/handbook/declaration-files/consumption
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html)
**O que é:** baixar `@types/*`, consumir e procurar declarações.
**Para que serve:** pacote sem tipo próprio: `pnpm add -D @types/<pkg>`. Com `types: []` (default do
6.0), `@types` de ambiente (como `node`) só entra se listado em `types`; import de módulo continua
tipado.
**Quando usar:** ao adicionar dependência JS sem tipo embutido.

#### docs/handbook/declaration-files/dts-from-js
[doc](https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html)
**O que é:** gerar `.d.ts` a partir de JavaScript com JSDoc (`allowJs`, `declaration`,
`emitDeclarationOnly`).
**Para que serve:** pouco: a casa escreve TypeScript. Vale para script `.mjs` do repositório de
régua.
**Quando usar:** raro; script JS que precisa expor tipo.

## JavaScript

#### docs/handbook/intro-to-js-ts
[doc](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html)
**O que é:** checagem de JavaScript pelo TypeScript: dica de tipo por JSDoc e `// @ts-check`.
**Para que serve:** checar script `.mjs` sem convertê-lo (ex.: `scripts/` da régua).
**Quando usar:** script em JS que vale a pena checar; código de app é `.ts`.

#### docs/handbook/type-checking-javascript-files
[doc](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)
**O que é:** como o TypeScript infere tipos em `.js`: propriedade por atribuição, função
construtora como classe, CommonJS, objeto literal aberto, inicializador `null` como `any`,
parâmetro opcional por default.
**Para que serve:** saber o quão frouxa é a checagem de JS. O 7.0 muda várias dessas regras (ver
entrada do 7.0, "JavaScript Differences").
**Quando usar:** só ao checar arquivo `.js`/`.mjs`.

#### docs/handbook/jsdoc-supported-types
[doc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
**O que é:** tags JSDoc que o TypeScript entende: `@type`, cast, `@import`, `@param`/`@returns`,
`@typedef`, `@template`, `@satisfies`, modificadores, `@deprecated`, `@see`, `@link`, `@enum` e o
que não é suportado.
**Para que serve:** `@deprecated` e `@see` também valem em `.ts` (o editor risca o uso). É a única
página da lista que descreve `satisfies` ("declare that a value implements a type but does not
affect the type of the value").
**Quando usar:** marcar API depreciada em `shared/`; tipar script JS.

## Project Configuration

#### docs/handbook/tsconfig-json
[doc](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
**O que é:** o que é `tsconfig.json` (e `jsconfig.json`), exemplos, bases da comunidade
(`@tsconfig/*` via `extends`) e o schema.
**Para que serve:** o mecanismo de `extends` que a casa usa com preset do framework
(`@adonisjs/tsconfig`, `nitro/tsconfig`) e o piso por cima (`tooling.md` §3).
**Quando usar:** criar o `tsconfig` de um app ou de `shared/`.

#### docs/handbook/compiler-options
[doc](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
**O que é:** uso da CLI `tsc`: comandos, opções de build (`--build`), de watch e a tabela de todas as
flags.
**Para que serve:** o comando do `typecheck`: `tsc --noEmit` (ou `-p` por `tsconfig`).
**Quando usar:** montar script de `package.json`; a semântica de cada flag fica na entrada `tsconfig`.

#### docs/handbook/project-references
[doc](https://www.typescriptlang.org/docs/handbook/project-references.html)
**O que é:** dividir o programa em projetos com `references`, `composite`, `declarationMap`,
`tsc -b` e as ressalvas.
**Para que serve:** monorepo com vários `tsconfig`. A casa não tem workspace na raiz e cada app
checa o seu; `shared/` entra por caminho, não por referência.
**Quando usar:** só se um projeto adotar `tsc -b` entre pacotes, decisão registrada.

#### docs/handbook/integrating-with-build-tools
[doc](https://www.typescriptlang.org/docs/handbook/integrating-with-build-tools.html)
**O que é:** receitas para Babel, Browserify, Grunt, Gulp, Jspm, MSBuild, NuGet, Rollup, Svelte e
webpack.
**Para que serve:** nenhuma receita é da stack (Vite, tsup e o build do Adonis não aparecem); a
página só reforça o padrão "o bundler emite, o `tsc` checa".
**Quando usar:** raramente; a integração da casa está em `_doc-lib/vitejs.md` e no preset do
framework.

#### docs/handbook/configuring-watch
[doc](https://www.typescriptlang.org/docs/handbook/configuring-watch.html)
**O que é:** estratégia de observação de arquivo e diretório do `--watch` (`watchOptions`,
`TSC_WATCHFILE`, `TSC_WATCHDIRECTORY`).
**Para que serve:** ajustar `tsc --watch` em contêiner ou volume montado. O 7.0 reescreve o watch
sobre o watcher do Parcel; a página descreve o do 6.
**Quando usar:** `tsc --watch` que não percebe mudança em Docker; o dev server do framework
normalmente dispensa.

#### docs/handbook/nightly-builds
[doc](https://www.typescriptlang.org/docs/handbook/nightly-builds.html)
**O que é:** instalar o build noturno (`typescript@next`) e apontar o editor para ele
(`typescript.tsdk`).
**Para que serve:** testar correção antes do release. Hoje `next` é `7.1.0-dev`, fora da política da
casa.
**Quando usar:** não em projeto da casa; só em pasta descartável para reproduzir bug do compilador.

#### tsconfig
[doc](https://www.typescriptlang.org/tsconfig/)
**O que é:** referência de toda opção do `tsconfig`, por grupo (Type Checking, Modules, Emit,
JavaScript Support, Interop Constraints, Language and Environment, Projects, Completeness, Watch),
com default, valores permitidos e versão de introdução.
**Para que serve:** é a página que confere o piso de `tooling.md` §3. Cada flag do piso, com o que
a página diz:

| Flag | O que a página diz | Default (página) |
|---|---|---|
| `strict` | liga a família estrita (`strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `strictBuiltinIteratorReturn`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`); versão nova pode acrescentar checagem | `true` |
| `noUnusedLocals` | erro em variável local não lida | desligado |
| `noUnusedParameters` | erro em parâmetro não lido; nome com `_` é isento | desligado |
| `noFallthroughCasesInSwitch` | `case` não vazio precisa de `break`, `return` ou `throw` | desligado |
| `noImplicitReturns` | todo caminho da função retorna valor | desligado |
| `noImplicitOverride` | membro que sobrescreve o da classe base exige `override` | desligado |
| `noUncheckedIndexedAccess` | acrescenta `undefined` a "any un-declared field": acesso por index signature (e por índice de array) | desligado |
| `noUncheckedSideEffectImports` | erro quando `import 'x'` não resolve; asset (CSS) precisa de `declare module '*.css' {}` | `true` |
| `verbatimModuleSyntax` | import sem `type` fica, com `type` some; ESM não é reescrito para `require` | desligado |
| `skipLibCheck` | não checa `.d.ts`; ganha tempo, perde precisão entre declarações duplicadas | desligado (marcada "Recommended") |
| `types` | lista os `@types` globais incluídos; não afeta import de módulo | `[]` desde o 6.0 |

Também conferidas: `erasableSyntaxOnly` (recusa `enum`, namespace com código, parameter property,
`import =`/`export =` e asserção `<T>`), `experimentalDecorators`/`emitDecoratorMetadata`
(decorators experimentais e metadados para `reflect-metadata`), `paths` (não muda o import emitido;
só informa o TS de um mapeamento que outra ferramenta faz), `esModuleInterop` (default `true` em
`node16`/`nodenext`/`preserve`).
**Quando usar:** antes de acrescentar, tirar ou justificar qualquer flag; a régua cita esta entrada.

| Página | O que é | Na casa |
|---|---|---|
| [compiler-options-in-msbuild](https://www.typescriptlang.org/docs/handbook/compiler-options-in-msbuild.html) | flags do TypeScript como propriedades de MSBuild (`.csproj`) | fora da stack: não há MSBuild nem Visual Studio no build |

## Tools e release

#### play
[doc](https://www.typescriptlang.org/play/)
**O que é:** o Playground: editor online com escolha de versão, flags do `tsconfig`, saída JS,
`.d.ts` e exemplos.
**Para que serve:** reproduzir um erro de tipo isolado e compartilhar por link em issue ou revisão.
**Quando usar:** dúvida de comportamento do compilador; fixe a versão 6.x no seletor para refletir a
casa.

#### download
[doc](https://www.typescriptlang.org/download/)
**O que é:** como instalar: npm por projeto (com lockfile) ou global, NuGet e extensão do Visual
Studio. A página já diz que o global instala o 7.0.
**Para que serve:** reforça a instalação por projeto. Na casa: `pnpm add -D typescript@~6`, nunca
global.
**Quando usar:** setup de projeto novo.

#### typescript/announcing-typescript-7-0
[doc](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
**O que é:** anúncio do TypeScript 7.0, o compilador portado para Go: 8x a 12x mais rápido em build
completo, menos memória, novo servidor de linguagem (LSP), `--checkers`, `--builders`,
`--singleThreaded` e `--watch` reescrito. **A casa não migrou** (`tooling.md` §0,
`DECISIONS.md` #121).
**Para que serve:** inventário do que a migração futura terá de tratar:
- **sem API programática no 7.0** (volta, diferente, no 7.1); typescript-eslint e plugins de editor
  ficam no 6. O post sugere o pacote `@typescript/typescript6` por alias; a casa não usa alias.
- adota os defaults do 6.0 e transforma em erro tudo que o 6.0 depreciou: `target: es5`,
  `downlevelIteration`, `moduleResolution: node/node10/classic`, `module: amd/umd/systemjs/none`,
  `baseUrl`, `esModuleInterop`/`allowSyntheticDefaultImports` em `false`, `alwaysStrict: false`,
  `module` como palavra de namespace, `asserts` em import (vira `with`);
- `stableTypeOrdering` sempre ligado; `rootDir` passa a `./` e `types` a `[]`;
- template literal type passa a dividir por ponto de código Unicode, não por unidade UTF-16;
- checagem de JavaScript por JSDoc fica mais próxima da de `.ts` (sem `@enum`, sem `@class`, sem
  sintaxe Closure).
**Quando usar:** quando a migração for reavaliada: o post diz que código que compila limpo no 6.0
com `stableTypeOrdering` ligado e sem `ignoreDeprecations` compila igual no 7.0. Até lá, o piso da
casa já evita todas as flags removidas.
