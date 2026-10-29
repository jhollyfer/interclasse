# Arquitetura do sistema

**<Projeto>** · como as peças conversam

> Só o que é **deste** projeto. Camadas, árvore de pastas e nomes seguem
> `_standards/architecture.md`; aqui não se repete, se aponta.

## 1. Visão geral

```
Cliente (navegador) ──HTTPS──▶ Web (<TanStack Start>) ──HTTP──▶ API (<AdonisJS | Fastify>) ──▶ Banco (<PostgreSQL | MongoDB>)
                                    │                                │
                                    └──── @<projeto>/shared ─────────┤   (validators, enums, value objects, responses)
                                                                     └──▶ <Fila | Storage | E-mail | API externa>
```

## 2. Stack

| Camada | Tecnologia | Versão | Doc |
|---|---|---|---|
| Linguagem | TypeScript (última 6.x) | <x.y> | `_standards/typescript.md` |
| Monorepo | pnpm workspace: `backend/`, `frontend/`, `shared/` | <x.y> | `_standards/architecture.md` §9 |
| Web | <TanStack Start + React + Tailwind + shadcn> | <x.y> | `_doc-lib/<lib>.md` |
| API | <AdonisJS \| Fastify> | <x.y> | `_doc-lib/<lib>.md` |
| Validação | VineJS (os dois lados, em `shared/`) | <x.y> | `_doc-lib/vinejs.md` |
| Idiomas | <Paraglide no front; `@adonisjs/i18n` ou service no back> | <x.y> | `_standards/i18n.md` |
| Banco | <PostgreSQL + Lucid \| MongoDB> | <x.y> | |
| Fila | <BullMQ + Redis \| não se aplica> | | |
| Arquivos | <FlyDrive + S3 \| não se aplica> | | |
| Deploy | <Docker + onde roda> | | |

## 3. Estrutura de pastas

Segue `_standards/architecture.md` §3 (backend), §4 (frontend) e §9 (raiz e `shared/`). Só entra
aqui o que o projeto usa e a árvore deixa opcional (`architecture.md` §3.1) ou um desvio aceito,
com motivo e a exceção correspondente em `scripts/pattern-check.config.ts`:

| Pasta | Por quê |
|---|---|
| <ex.: `app/services/pix/internal/qr-code/`> | <a geração do BR Code muda por motivo próprio, separada da cobrança> |

## 4. Módulos (features)

`app/features/<módulo>/<recurso>/<ação>/`: o módulo é o público ou contexto, o recurso é
substantivo no plural, a ação é verbo.

| Módulo | Recursos | Ações principais | Público |
|---|---|---|---|
| <administrator> | <orders, products> | <create, paginate, show, archive> | <equipe da loja> |
| <storefront> | <orders> | <create, show> | <cliente final> |

Entidades de domínio (`app/domain/<entidade>/`) e quem escreve em cada tabela: só o repository da
entidade dona (`_standards/domain.md` §5).

| Entidade | Tabela/coleção | Repository | Invariantes principais |
|---|---|---|---|
| <Order> | <`orders`> | `OrderRepository` | <item só entra com o pedido em OPEN> |

### 4.1 Linguagem do domínio

O glossário do projeto (a linguagem ubíqua do DDD): cada termo com o significado no negócio e o
nome no código. O código usa o nome da coluna "Nome no código", sempre o mesmo
(`_standards/typescript.md` §12). Termo com dois sentidos indica dois contextos: cada um ganha
nome próprio, e o rejeitado vai para "Evitar" (`_standards/domain.md` §12).

| Termo no negócio | Significado | Nome no código | Evitar |
|---|---|---|---|
| <Encomenda> | <pedido feito pelo cliente para retirar no balcão> | `Order` | <"pedido de compra", "venda"> |
| <Retirada> | <horário combinado para buscar a encomenda> | `pickupAt` | <`deliveryAt`> |

## 5. Modelo de dados

| Entidade | Campos principais | Relações | Observação |
|---|---|---|---|
| <Order> | <id, customerName, pickupAt, status, deletedAt> | <hasMany OrderItem> | <soft delete> |

<Diagrama ER opcional em Mermaid.>

## 6. Fluxo de dados

<Um caminho real ponta a ponta. Ex.: cliente envia pedido → `POST /storefront/orders` → validator
de `shared/` → use-case carrega pelo repository → entidade `Order` confere o estoque → repository
grava → job de e-mail enfileirado → presenter monta a resposta → 201.>

## 7. Integrações externas

| Serviço | Para quê | Contrato no código | Variáveis (`ENV.md`) |
|---|---|---|---|
| <SMTP> | <e-mail de confirmação> | `MailerContract` em `app/services/mailer/mailer.contract.ts` | `SMTP_*` |

## 8. Autenticação e autorização

<Como o usuário entra (sessão por cookie, token…), perfis e quem pode o quê. Detalhe de
ameaças em `SECURITY.md`.>

## 9. Ambientes

| Ambiente | URL | Onde roda | Banco | Deploy |
|---|---|---|---|---|
| Desenvolvimento | http://localhost:<porta> | máquina local | container local | — |
| Preview / Homologação | <url> | <onde> | <qual> | <como dispara> |
| Produção | <url> | <onde> | <qual> | <como dispara> |

Health check: `GET /health-check` em cada app (`_standards/architecture.md` §7).

### 9.1 O que a plataforma faz e o repositório não

Tudo que o deploy precisa e não está no código. Sem esta lista, o próximo deploy num servidor novo
quebra sem erro no log.

| O quê | Onde se configura | Por quê |
|---|---|---|
| <`node ace migration:run --force` como pré-deploy> | <painel do orquestrador> | <o `Dockerfile-production` não tem `ENTRYPOINT` de propósito> |
| <`COOKIE_DOMAIN` no serviço da API> | <painel> | <sem ela o cookie nasce host-only e o SSR desloga a cada F5> |
| <segundo serviço com o worker da fila> | <painel> | <sem ele os jobs enfileiram e ninguém consome> |
| <healthcheck do painel em `/health-check`> | <painel> | <o painel sobrepõe o `HEALTHCHECK` do Dockerfile> |
| <CORS do bucket com `ETag` exposto> | <provedor do storage> | <sem o `ETag` o upload multipart não fecha> |

## 10. Escala e limites conhecidos

- <ex.: um único worker de fila; acima de X pedidos/min precisa de mais>
