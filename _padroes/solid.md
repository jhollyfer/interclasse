# SOLID, injeção e inversão de dependência

SOLID é o critério de desenho padrão em todo projeto. As skills `solid` e `solid-principles`
explicam os cinco princípios; este arquivo diz **como eles se aplicam nesta stack**, onde o
Adonis e o Fastify fazem a mesma coisa com mecanismos diferentes.

Regra de base, sem exceção por diretório: **injeção por construtor, `new` de Service, UseCase,
Policy, Controller ou Repository nunca** (`backend.md` §2.1, cobrado por ESLint).

---

## 1. Injeção (DI) — quem cria não é quem usa

A classe declara no construtor do que precisa; o container entrega pronto.

| | Adonis | Fastify (`fastify-decorators`) |
|---|---|---|
| Marcar injetável | `@inject()` | `@Service()` |
| Resolver | pelo tipo do parâmetro (`emitDecoratorMetadata`) | idem, ou `@Inject(Token)` |
| Trocar no teste | `app.container.swap(X, () => fake)` | `configureServiceTest({ mocks: [...] })` |
| Doc | `_doc-lib/adonisjs.md` → `guides/concepts/dependency-injection` | `_doc-lib/fastify-decorators.md` → services e DI |

Armadilha comum aos dois: o tipo do parâmetro precisa **sobreviver à compilação**. `import type`
ou tipo `interface` no construtor viram `Object` no metadata e o serviço chega `undefined`, sem
erro no boot.

## 2. Inversão (DIP) — o alto nível depende do contrato

Use-case não conhece SMTP, S3, Redis nem o gateway de pagamento. Conhece o **contrato**.

O contrato é **`abstract class`**, não `interface` nem `type`: interface é apagada na compilação
e não serve de token de container. A classe abstrata existe em runtime, serve de token e de tipo
ao mesmo tempo — e mantém a regra "`type`, nunca `interface`".

```ts
// app/services/mailer/mailer-contract.service.ts
export abstract class MailerContract {
  abstract send(input: { readonly to: string; readonly subject: string; readonly html: string }): Promise<void>
}

// app/services/mailer/mailer.service.ts
export default class SmtpMailerService extends MailerContract {
  async send(input: Parameters<MailerContract['send']>[0]): Promise<void> { /* ... */ }
}

// use-case: tipa o contrato
constructor(private readonly mailer: MailerContract) {}
```

Ligação do contrato ao concreto, **um lugar só** (composition root):

| Adonis | Fastify |
|---|---|
| provider: `this.app.container.bind(MailerContract, () => this.app.container.make(SmtpMailerService))` | `injectablesHolder.injectService(MailerContract, SmtpMailerService)` antes do `register(bootstrap)`, ou registry que pareia `*-contract.service.ts` com `*.service.ts` |

### Quando criar contrato *(opinião da casa)*

| Dependência | Contrato? |
|---|---|
| I/O externo: e-mail, storage, fila, pagamento, API de terceiro, relógio, gerador de id | **Sim.** É onde o teste troca e onde o fornecedor muda |
| Service interno sem I/O próprio (`SlugService`, policy) | Não. Classe concreta injetada; `swap` já resolve o teste |
| Model/driver de banco | Não. Sem camada de repositório (`backend.md` §1.2) |

Contrato com uma implementação e sem I/O é cerimônia: uma interface a mais para manter, nenhum
ganho de troca.

**Dois critérios para onde uma função/service mora, não um só** *(opinião da casa)*: localização
pública vs. `internal/` de um módulo é uma pergunta ("outro módulo precisa chamar isto?"); fundir
numa fachada vs. manter pasta própria é outra ("este código tem motivo de mudar independente da
fachada?"). Tratar as duas como a mesma decisão é o erro comum — um helper pode ser `internal/`
e ainda merecer pasta própria, ou ser público e ainda caber dentro da fachada.

## 3. Os outros quatro, na prática da stack

| Princípio | Como aparece |
|---|---|
| **S** — responsabilidade única | uma operação = um par controller + use-case. Controller valida e escolhe status; use-case decide; policy autoriza; service faz I/O. Use-case que cresce vira dois, ou extrai para `_shared`/service (`backend.md` §4.9) |
| **O** — aberto/fechado | variante nova = entrada nova num lookup object tipado, não `if` novo (`typescript.md` §3). Provider novo = nova classe que estende o contrato |
| **L** — substituição | toda implementação do contrato honra o mesmo `Either`/erro; fake de teste também. Se o fake precisa de `if (test)` no código de produção, o contrato está errado |
| **I** — segregação | contrato pequeno por necessidade (`StorageReader`, `StorageWriter`) quando consumidores usam metades diferentes. Não divida antes de existir o segundo consumidor |

## 4. Frontend *(opinião da casa)*

Não há container; a inversão é por **composição**. Componente recebe dado e callbacks por props,
hook encapsula a fonte (`useUserQuery`), e a rota escolhe o concreto. Contexto React só para o
que é de fato transversal (tema, sessão via router context). Skill `react-composition-patterns`.
