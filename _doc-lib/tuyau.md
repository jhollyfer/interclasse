# Tuyau

> Conferido em 2026-10-14 contra o README do repositório (lido cru em
> `raw.githubusercontent.com`; a página HTML do GitHub respondeu 403 no proxy) e contra a página
> `guides/frontend/api-client` da doc do AdonisJS (versão `.md`), e contra o tipo publicado de
> `@tuyau/core@1.2.2` e `@tuyau/openapi@1.0.2` (`npm pack` + `.d.ts`, sem rodar código). No npm na
> mesma data: `@tuyau/react-query@1.0.0`, `@tuyau/superjson@1.1.0`.
>
> **Avisos de versão:**
> - O Tuyau 1.x não tem mais o comando `node ace tuyau:generate` nem a sintaxe `tuyau.x.$get()`:
>   o `commands.json` do pacote está vazio, o registro é gerado pelo hook `generateRegistry()` do
>   assembler e a chamada é `client.api.<rota>.<ação>({ body, params, query })`. O exemplo de
>   `_doc-lib/adonisjs.md#guides/frontend/api-client` usa a API antiga.
> - A página do Adonis cita `@tuyau/tanstack-query`, que não existe no npm (404). O README cita
>   `@tuyau/react-query`, que existe (1.0.0).
> - `@tuyau/core` 1.x exige Node >= 24, Adonis 7 (`@adonisjs/core` ^7) e assembler ^8 como peer.

Cliente HTTP tipado de ponta a ponta para APIs AdonisJS: o backend gera um registro das rotas
nomeadas com os tipos de request (tirados do validator VineJS) e de response (tirados do retorno do
controller), e o frontend chama a rota pelo nome, com autocompletar e erro de compilação quando a
rota muda.

**O que é:** `@tuyau/core` reúne as duas pontas. No backend, `generateRegistry()` de
`@tuyau/core/hooks`, no `hooks.init` do `adonisrc.ts`, gera `.adonisjs/client/registry`. No
frontend, `createTuyau({ baseUrl, registry })` de `@tuyau/core/client` devolve o cliente, feito
sobre o Ky (aceita `timeout`, `retry`, `hooks` e todo option do Ky). Tipos auxiliares em
`@tuyau/core/types`: `Route.Request/Response/Error/Params/Body/Query<'nome.da.rota'>` e `Path.*`
por método e padrão de URL.

**Para que serve:** eliminar a URL escrita à mão e o tipo de request redigitado no frontend:
renomear rota, mudar parâmetro ou campo do validator vira erro de `tsc` no frontend, não 404 ou
422 em produção.

**Como usar:**

```bash
pnpm --dir backend add @tuyau/core
```

```ts
// backend/adonisrc.ts
import { indexEntities } from '@adonisjs/core'
import { defineConfig } from '@adonisjs/core/app'
import { generateRegistry } from '@tuyau/core/hooks'

export default defineConfig({
  hooks: {
    init: [indexEntities({ transformers: { enabled: true } }), generateRegistry({ routes: { only: ['api.'] } })],
  },
})
```

```ts
// frontend: o transporte do http.ts, nunca chamado direto pela rota ou pelo componente
import { createTuyau } from '@tuyau/core/client'
import { registry } from '@<projeto>/backend/registry'
import { env } from '#/env'

export const tuyau = createTuyau({
  baseUrl: env.VITE_API_URL,
  registry,
  headers: { Accept: 'application/json' },
  credentials: 'include',
})

const [data, error] = await tuyau.api.administrator.teams.store({ body: { name: 'Time A' } }).safe()
```

**Quando adotar a biblioteca:** decisão do projeto, registrada em `docs/DECISIONS.md`, porque o
Tuyau **não substitui** o contrato de `shared/` (`architecture.md` §10) e **conflita** com três
pontos da régua (lista no fim deste cabeçalho). O encaixe que respeita a régua: o Tuyau entra como
transporte dentro de `integrations/tanstack-query/http.ts` (URL por nome de rota, `params`/`query`/
`body` tipados, CSRF), e o `http.ts` continua convertendo o corpo `unknown` pelo schema `…Response`
de `@<projeto>/shared` antes de devolver. Sem essa camada, o tipo da resposta é só de compilação.

**O que muda a experiência:**

1. **O tipo do request vem de `request.validateUsing()` no controller.** Sem essa chamada, o corpo
   tipa como `any` no frontend. Na casa o controller já valida com o validator de `shared/`, então
   o tipo bate com o do formulário.
2. **O tipo da resposta vem do retorno do controller**, não de um schema. Model do Lucid devolvido
   direto tipa como `ModelObject` vazio; a doc manda passar por Transformer. Na casa o presenter
   devolve objeto simples tipado pelo `…Response` de `shared/`, o que resolve o mesmo problema.
3. **`.safe()` em vez de `try/catch`**: devolve `[data, error]` com `error.kind` (`'http' |
   'network'`), `error.isStatus(404)` que estreita `error.response` para o payload daquele status,
   e `isValidationError()` para o 422 (`{ errors: SimpleError[] }` do VineJS). O caminho com
   `try/catch` da doc usa `e as Route.Error<...>`, que é `as` proibido.
4. **Data vira `string` no tipo**, como de fato chega pelo JSON. `@tuyau/superjson` preserva `Date`
   e `DateTime` com receita nos dois lados; a casa trafega data como `string` ISO no schema de resposta
   (`architecture.md` §10) e não precisa dele.
5. **`credentials: 'include'` liga o CSRF sozinho**: o cliente lê o cookie `XSRF-TOKEN` e manda
   `X-XSRF-TOKEN` em toda requisição (conferido no `client/index.js`).

**Conflitos com a régua** (registrar em `_standards/DECISIONS.md` se o Tuyau for adotado):

- **Frontend importa o backend.** O registro mora em `backend/.adonisjs/client/` e o frontend o
  importa como dependência de workspace (`"@<projeto>/backend": "workspace:*"` com `exports` para
  `./registry` e `./data`) e inclui `../backend/**/*.ts` no próprio `tsconfig`. A régua só prevê
  `@<projeto>/shared` como dependência entre pacotes (`architecture.md` §9).
- **`experimentalDecorators` no `tsconfig` do frontend**, que a doc exige no monorepo. O perfil
  Frontend de `tooling.md` §3 não tem a flag (ela é só do perfil Fastify).
- **Resposta sem validação em runtime.** `typescript.md` §2.1 e `frontend.md` §3.3 exigem que o
  corpo vire tipo num único ponto, pelo schema de `shared/`. O Tuyau tipa por inferência do
  controller e devolve o corpo já como tipo, que é o `request<T>()` que a régua chama de `as` com
  outro nome.
- Os exemplos da doc usam `import.meta.env.VITE_API_URL || 'http://localhost:3333'` e token em
  `localStorage`; os dois são proibidos em `frontend.md` §3.3 (endereço sem default de rede, dado
  de sessão fora do `localStorage`).

**Links:** 2

**Skills:** `maiyu-frontend` (o `http.ts` e as `queryOptions`), `maiyu-backend` (controller que
valida e presenter que devolve objeto simples), `superpowers:brainstorming` ou `the-jury` antes de
adotar, por ser decisão de arquitetura. Dispare junto com a leitura da entrada; a entrada é o
contrato, a skill executa (`SKILLS-MAP.md`).

---

## Repositório

#### Julien-R44/tuyau
[doc](https://github.com/Julien-R44/tuyau) | [markdown](https://raw.githubusercontent.com/Julien-R44/tuyau/main/README.md)
**O que é:** o monorepo do Tuyau. O README lista três pacotes: `@tuyau/core` (integração com o
backend e o cliente tipado), `@tuyau/react-query` (integração com TanStack Query) e
`@tuyau/superjson` (SuperJSON entre Adonis e cliente), e manda para a doc do AdonisJS como
documentação oficial. Página HTML não conferida: 403 no proxy; o conteúdo veio do README cru.
**Para que serve:** saber quais pacotes existem e onde está a doc (não está no repositório).
**Quando usar:** ao conferir versão, changelog e issue. O npm publica também `@tuyau/openapi`
(1.0.2, sem descrição, peer `@tuyau/core >= 0.3.2`) e os antigos `@tuyau/client` e
`@tuyau/utils` da linha 0.x, que o README atual não cita: não use os da linha 0.x. A casa já gera
`openapi.json` pelo próprio core (`openapi.md`), então `@tuyau/openapi` não entra.

## AdonisJS

#### guides/frontend/api-client
[doc](https://docs.adonisjs.com/guides/frontend/api-client) | [markdown](https://docs.adonisjs.com/guides/frontend/api-client.md)
**O que é:** a documentação oficial do Tuyau: instalação para Inertia e para monorepo, as três
formas de chamada (`client.api.posts.store(...)`, `client.request('posts.store', ...)` e
`client.get('/url', ...)` para endpoint fora do registro), `params`/`query`/`body` tipados, erro
por `.safe()` com `isStatus`/`isValidationError`/`kind`, `Route.*`/`Path.*`, upload (objeto `File`
no body vira `FormData` sozinho), `urlFor` e `urlFor.get` com `qs`, `has()`/`current()`,
serialização em nível de tipo (data vira `string`, model vira `ModelObject`), SuperJSON,
`responseType`, opções do `createTuyau` e filtro de rotas no `generateRegistry({ routes: { only,
except } })`.
**Para que serve:** é o contrato de uso do Tuyau; o README só aponta para cá.
**Quando usar:** antes de propor o Tuyau num projeto da casa e ao montar o `http.ts` sobre ele.
Na casa: `generateRegistry({ routes: { only: [...] } })` para não expor rota interna no registro
que vai para o bundle; `credentials: 'include'` (sessão por cookie); erro sempre por `.safe()`,
convertido no `HTTPError` do `http.ts` (`frontend.md` §3.3); upload grande continua pelo multipart
pré-assinado direto no bucket, não pelo `File` no body. `current()` lê `window.location` e devolve
`undefined` no servidor, então não serve para rota ativa no SSR do TanStack Start: use o
`useMatchRoute` do router.

```ts
// dentro de integrations/tanstack-query/http.ts: o Tuyau transporta, o schema de shared/ tipa
const [body, error] = await tuyau.api.administrator.teams.show({ params: { id } }).safe()
if (error) {
  throw HTTPError.fromTuyau(error) // fábrica ilustrativa: o HTTPError espelha o ErrorEnvelope de shared/
}
return vine.validate({ schema: AdministratorTeamShowResponse, data: body })
```
