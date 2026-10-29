# SOLID, injeção e inversão de dependência

SOLID é o critério de desenho padrão em todo projeto. As skills `solid` e `solid-principles`
explicam os cinco princípios; este arquivo diz **como eles se aplicam nesta stack**, onde o
Adonis e o Fastify fazem a mesma coisa com mecanismos diferentes. A forma de cada peça de domínio
(entidade, repository, use-case) está em `domain.md`; onde cada padrão de projeto mora, em
`domain.md` §11.

Regra de base, sem exceção por diretório: **injeção por construtor, `new` de Service, UseCase,
Policy, Controller ou Repository nunca** (`backend.md` §2.1, cobrado por ESLint). A única isenção é
o teste unitário (§1, `DECISIONS.md` #116).

---

## 1. Injeção (DI): quem cria não é quem usa

A classe declara no construtor do que precisa; o container entrega pronto.

| | Adonis | Fastify (`fastify-decorators`) |
|---|---|---|
| Marcar injetável | `@inject()` | `@Service()` |
| Resolver | pelo tipo do parâmetro (`emitDecoratorMetadata`) | idem, ou `@Inject(Token)` |
| Trocar no teste unitário | `new UseCase(new PostMemoryRepository(), new MailerFake())` em `*.unit.spec.ts` (#116) | idem |
| Trocar no E2E | `app.container.swap(MailerContract, () => fake)` | `configureServiceTest({ mocks: [...] })` / `fromContainer` (`backend-fastify.md` §8) |
| Doc | `_doc-lib/adonisjs.md` → `guides/concepts/dependency-injection` | `_doc-lib/fastify-decorators.md` → services e DI |

No unitário, o construtor tipado é a proteção: dependência nova quebra a compilação do teste, que
era o risco que o `new` proibido evitava. Os dublês são a implementação em memória do repository e
o `.fake.ts` do service, nunca mock de classe nossa (`domain.md` §10).

Armadilha comum aos dois: o tipo do parâmetro precisa **sobreviver à compilação**. `import type`
ou tipo `interface` no construtor viram `Object` no metadata e o serviço chega `undefined`, sem
erro no boot.

**Colaborador entra pelo construtor e não muda depois** *(opinião da casa)*: nada de
`setStrategy()`, `setClient()` ou campo trocado em runtime. O container pode reaproveitar a mesma
instância entre requisições (o controller do Fastify é singleton por padrão,
_doc-lib/fastify-decorators.md#Controllers), e um setter vira estado compartilhado entre usuários.
Escolha que muda por requisição é um service resolvedor injetado (`domain.md` §11).

## 2. Inversão (DIP): o alto nível depende do contrato

Use-case não conhece SMTP, S3, Redis nem o gateway de pagamento. Conhece o **contrato**.

O contrato é **`abstract class`**, não `interface` nem `type`: interface é apagada na compilação
e não serve de token de container. A classe abstrata existe em runtime, serve de token e de tipo
ao mesmo tempo, e mantém a regra "`type`, nunca `interface`".

```ts
// app/services/mailer/mailer.contract.ts
export abstract class MailerContract {
  abstract send(input: MailMessage): Promise<Either<MailerError, void>>
}

// app/services/mailer/mailer.service.ts
export default class SmtpMailerService extends MailerContract {
  async send(input: MailMessage): Promise<Either<MailerError, void>> { /* ... */ }
}

// app/services/mailer/mailer.fake.ts: in-memory double for unit tests, same Either as the real one
export class MailerFake extends MailerContract { /* keeps sent messages in an array */ }

// use-case: depends on the contract only
constructor(private readonly mailer: MailerContract) {}
```

Ligação do contrato ao concreto, **um lugar só** (composition root):

| Adonis | Fastify |
|---|---|
| provider: `this.app.container.bind(MailerContract, () => this.app.container.make(SmtpMailerService))` | `injectablesHolder.injectService(MailerContract, SmtpMailerService)` antes do `register(bootstrap)`, ou o registry que pareia `<nome>.contract.ts` com `<nome>.service.ts` (`backend-fastify.md` §3) |

### Quando criar contrato *(opinião da casa)*

Vale **nos dois perfis**, igual (`DECISIONS.md` #113, C20):

| Dependência | Contrato? |
|---|---|
| I/O externo: e-mail, storage, fila, pagamento, API de terceiro, relógio, gerador de id | **Sim.** É onde o teste troca e onde o fornecedor muda |
| Service interno sem I/O próprio (`SlugService`, montador de schema, type guard) | **Não.** Classe concreta injetada pela própria classe (`@inject()` / `@Service()`); o registry do Fastify não cria contrato para ela |
| Persistência (model/driver de banco) | **Sim**, pelo repository: contrato `abstract class` + implementação do ORM + implementação em memória (`domain.md` §5, `DECISIONS.md` #111) |

Contrato com uma implementação e sem I/O é cerimônia: uma classe a mais para manter, nenhum
ganho de troca. **Teste de deleção** antes de criar módulo, service ou contrato: se apagar o
arquivo só move três linhas para o chamador, ele era passagem e não deve existir.

### O contrato de I/O fala a língua da aplicação *(opinião da casa)*

O service é o adapter (anticorruption layer) entre a aplicação e o fornecedor:

- O contrato expõe **capacidade** (`createCharge`, `upload`, `lookupCnpj`), nunca a forma da API
  do fornecedor. Tipo do SDK não aparece na assinatura do contrato, em `features/` nem em
  `domain/`: só dentro de `<nome>.service.ts`.
- Entrada, saída e erro do fornecedor são traduzidos **dentro** do adapter: a resposta externa é
  validada por schema (`typescript.md` §2) e a falha volta como `left` com fato da aplicação.
- Toda chamada de rede tem teto de tempo (`AbortSignal.timeout(ms)`, stdlib) e o estouro é `left`.
  Retry, quando existir, mora numa camada só, com backoff exponencial e jitter, e só em leitura ou
  em escrita com chave de idempotência. Disjuntor só depois que um fornecedor instável já derrubou
  um fluxo.

```ts
// app/services/payment-gateway/payment-gateway.contract.ts
export abstract class PaymentGatewayContract {
  abstract createCharge(input: { readonly orderId: string; readonly amountInCents: number }):
    Promise<Either<PaymentGatewayError, { readonly chargeId: string; readonly checkoutUrl: string }>>
}
// never: abstract createCharge(input: Stripe.CheckoutSessionCreateParams): Promise<Stripe.Checkout.Session>
```

### Dois critérios para onde uma função/service mora, não um só *(opinião da casa)*

Localização pública vs. `internal/` de um módulo é uma pergunta ("outro módulo precisa chamar
isto?"); fundir numa fachada vs. manter pasta própria é outra ("este código tem motivo de mudar
independente da fachada?"). Tratar as duas como a mesma decisão é o erro comum: um helper pode ser
`internal/` e ainda merecer pasta própria, ou ser público e ainda caber dentro da fachada.

Onde existe fachada (`services/<nome>/<nome>.service.ts` sobre `internal/<sub>/`,
`architecture.md` §3.1), ela é **delegação pura**: sem consulta, sem mapeamento, sem regra.

### Quando partir um service *(opinião da casa)*

Dois motivos legítimos, e o motivo fica escrito no JSDoc do sub-service:

- **Segregação de interface (I) medida.** Fachada com muitos métodos onde a maioria dos
  consumidores usa um subconjunto estável vira dois contratos. O JSDoc registra a conta que
  justificou ("18 métodos, 40 consumidores; 24 chamavam só oito"). Sem a conta, não se divide.
- **Ciclo de injeção.** Quando A precisa de B e B precisa de A, a parte que os dois leem sobe para
  um sub-service **sem dependência** (um lookup), que os dois injetam. Ciclo de DI no Fastify
  chega como injeção `undefined` silenciosa (_doc-lib/fastify-decorators.md, "Services and
  dependency injection", referência circular); a saída é quebrar o ciclo, não `@Inject` tardio.

## 3. Os outros quatro, na prática da stack

| Princípio | Como aparece |
|---|---|
| **S**: responsabilidade única | uma operação = um par controller + use-case. Controller valida e escolhe status; use-case orquestra; entidade decide; repository persiste; policy autoriza; service faz I/O externo. Use-case que cresce vira dois, ou a regra desce para a entidade (`domain.md` §7) |
| **O**: aberto/fechado | variante sem I/O = entrada nova num lookup `satisfies Record<União, …>` (`typescript.md` §3); variante com I/O = nova classe que estende o contrato, escolhida no composition root, nunca `if (driver === 's3')` no use-case (`domain.md` §11) |
| **L**: substituição | toda implementação do contrato honra o mesmo `Either`/erro; memória e ORM passam no mesmo teste de contrato, e o `.fake.ts` honra o mesmo `Either` do service real. Se o fake precisa de `if (test)` no código de produção, o contrato está errado |
| **I**: segregação | contrato pequeno por necessidade (`StorageReader`, `StorageWriter`) quando consumidores usam metades diferentes. Não divida antes de existir o segundo consumidor (§2, "Quando partir") |

O **D** é o §2.

## 4. Frontend *(opinião da casa)*

Não há container; a inversão é por **composição**. Componente recebe dado e callbacks por props,
hook encapsula a fonte (`useUserQuery`), e a rota escolhe o concreto. Contexto React só para o
que é de fato transversal (tema, sessão via router context). Skill `react-composition-patterns`.

- **Lógica reutilizável sobe para hook.** HOC e componente-container ("wrapper que só busca") não
  entram em código novo: a tela recebe dado por hook ou `getRouteApi()`.
- **Contexto de compound com mais de uma fonte possível tem a forma `{ state, actions, meta }`**, e
  só o provider sabe de onde o estado vem. A parte lê o contrato; trocar `useState` por mutation
  não toca a parte. É o DIP do frontend.

```ts
type ComposerContextValue = {
  readonly state: { readonly input: string; readonly isSubmitting: boolean }
  readonly actions: { readonly update: (input: string) => void; readonly submit: () => void }
  readonly meta: { readonly inputRef: React.RefObject<HTMLTextAreaElement | null> }
}
```
