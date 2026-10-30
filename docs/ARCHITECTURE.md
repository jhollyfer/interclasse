# Arquitetura do sistema

**Interclasse** · como as peças conversam

> Só o que é **deste** projeto. Camadas, árvore de pastas e nomes seguem
> `_standards/architecture.md`; aqui não se repete, se aponta.

## 1. Visão geral

```
Navegador ──HTTPS──▶ Web (TanStack Start, Nitro) ──HTTP──▶ API (AdonisJS 7) ──▶ PostgreSQL
    │                      │                                   │
    │                      └──── @interclasse/shared ──────────┤   (Either, enums, validators Zod, responses)
    │                                                          └──▶ Bucket S3 (MinIO em dev)
    └── upload direto, por URL assinada, para o bucket
```

O navegador envia o arquivo direto ao bucket por URL assinada; o binário nunca passa pela API
(`backend/start/routes.ts`, grupo `storages`). O SSR do site chama a API pela rede interna quando
`SERVER_API_URL` existe (`ENV.md` §1).

## 2. Stack

Perfil: backend Adonis (`_standards/backend.md`), frontend TanStack Start (`_standards/frontend.md`),
pacote `shared/` (`_standards/architecture.md` §9).

| Camada | Tecnologia | Versão | Doc |
|---|---|---|---|
| Linguagem | TypeScript 7 (`tsc`); o 6 fica ao lado para o lint e o OpenAPI | 7.0 | `_standards/typescript.md` |
| Monorepo | pnpm workspace: `backend/`, `frontend/`, `shared/`, um `pnpm-lock.yaml` | pnpm 12 | `_standards/architecture.md` §9 |
| Web | TanStack Start + Router + Query + Table, React, Tailwind, shadcn sobre Base UI, ícones Phosphor | Start 1.168, React 19, Tailwind 4 | `_doc-lib/tanstack-start.md` |
| API | AdonisJS (Lucid, Auth, Bouncer, Limiter, Drive, i18n) | 7.6 | `_doc-lib/adonisjs.md` |
| Validação | Zod no `shared/` (contrato e resposta) e no frontend; VineJS só no backend Adonis, onde é nativo | Zod 4, Vine 4 | `_doc-lib/vinejs.md` |
| Idiomas | Paraglide no front (`frontend/messages/`, hoje só o seletor de idioma; telas em pt-BR, TASKS 1.8); `@adonisjs/i18n` no back (`backend/resources/lang/`, mensagens nos três) | pt-BR, es, en | `_standards/i18n.md` |
| Banco | PostgreSQL + Lucid | `pg` 8 | `_doc-lib/adonisjs.md` |
| Fila | Não se aplica: nenhuma tarefa assíncrona | | |
| Arquivos | FlyDrive sobre bucket S3-compatível, upload multipart assinado | Drive 4 | `_standards/backend.md` |
| Testes | Japa no backend, Vitest no `shared/` e no frontend | Japa 5, Vitest 5 | `TEST-PLAN.md` |
| Deploy | Docker Hub + Coolify | | §9 |

## 3. Estrutura de pastas

Segue `_standards/architecture.md` §3 (backend), §4 (frontend) e §9 (raiz e `shared/`), sem
desvio: o que diverge da régua se corrige (`AGENTS.md`).

## 4. Módulos (features)

`app/features/<módulo>/<recurso>/<ação>/`. A rota é agrupada por papel em `backend/start/routes.ts`.

| Módulo | Recursos | Ações principais | Público |
|---|---|---|---|
| `storefront` | `sports`, `announcements`, `matches`, `brackets`, `site`, `photos` | `paginate`, `show` (só leitura, sem middleware) | público |
| `authentication` | `sessions` | `signIn`, `signOut`, `refresh` | qualquer visitante |
| `account` | `profile` | `show`, `update` | os três papéis |
| `storages` | `files` | `create`, `complete`, `parts`, `show`, `paginate`, `download`, `delete` | os três papéis |
| `administrator` | `classrooms`, `sports`, `brackets`, `matches`, `cards`, `announcements`, `enrollmentRemovals`, `photos`, `site`, `reports`, `users` | `paginate`, `create`, `show`, `update`, `delete`; `brackets.preview`; `matches.score`, `unscore`, `athletes`; `photos.review`; `reports.export`; `users.archive`, `unarchive` | `ADMINISTRATOR` |
| `advisor` | `classrooms`, `students`, `enrollments`, `cards`, `photos` | `paginate`, `create`, `update`, `delete`, `show` | `ADVISOR` e `ADMINISTRATOR` |
| `representative` | `enrollments` | `show`, `update` | `REPRESENTATIVE` |
| `documentation` | `openapi`, `reference` | `show` | quem passa pelo `documentation()` middleware |

Entidades de domínio (`app/domain/<entidade>/`) e quem escreve em cada tabela: só o repository da
entidade dona (`_standards/domain.md` §5).

| Entidade | Tabela | Repository | Invariantes principais |
|---|---|---|---|
| `Classroom` | `classrooms`, `teams` (time da turma numa chave) | `ClassroomRepository` | ano de 3 a 9; categoria derivada do ano; um conselheiro e um representante por turma, com o papel certo; travada depois do sorteio |
| `Student` | `students` | `StudentRepository` | nome não vazio; não sai da turma se joga modalidade já sorteada |
| `Sport` | `sports` | `SportRepository` | mínimo menor ou igual ao máximo; máximo não desce abaixo do maior elenco inscrito |
| `Enrollment` | `enrollments` | `EnrollmentRepository` | lista inteira por turma e modalidade, dentro do máximo; representante só antes do sorteio; tirar atleta exige motivo |
| `Bracket` | `brackets`, `teams`, `matches` | `BracketRepository` | uma chave por modalidade e categoria; mata-mata com folga; empate só com vencedor dos pênaltis; só apaga sem resultado |
| `MatchCard` | `match_cards` | `MatchCardRepository` | só leva cartão atleta de uma das duas turmas da partida |
| `EnrollmentRemoval` | `enrollment_removals` | `EnrollmentRemovalRepository` | guarda nome e motivo copiados; a ciência do administrador não muda a primeira data |
| `Photo` | `photos` | `PhotoRepository` | só imagem; a do conselheiro nasce `PENDING`, a da organização `APPROVED`; a decisão se refaz |
| `SiteSetting` | `site_settings` | `SiteSettingRepository` | uma linha; o regulamento é um arquivo já enviado e em PDF |
| `Storage` | `storages` | `StorageRepository` | tamanho conferido no bucket ao completar; arquivo em uso não se apaga |
| `User` | `users`, `auth_access_tokens` | `UserRepository` | e-mail único; papel fixo; arquivar, desarquivar e excluir |

### 4.1 Linguagem do domínio

| Termo no negócio | Significado | Nome no código | Evitar |
|---|---|---|---|
| Turma | a unidade que compete: ano e nome (por exemplo, "7º A") | `Classroom` | "classe", "sala" |
| Categoria | Fundamental 1 (3º ao 5º ano) ou Fundamental 2 (6º ao 9º); derivada do ano da turma | `Category` (`F1`, `F2`) | "faixa", "divisão" |
| Modalidade | esporte disputado, com mínimo e máximo de atletas por turma | `Sport` | "esporte" no código |
| Aluno | pessoa cadastrada numa turma | `Student` | "estudante" |
| Atleta | aluno inscrito numa modalidade | `Enrollment` (a inscrição) | "jogador" |
| Inscrição | a lista de atletas de uma turma numa modalidade | `Enrollment` | "convocação" |
| Conselheiro | professor responsável por uma turma | `ADVISOR` | "orientador" |
| Representante | aluno que representa a turma | `REPRESENTATIVE` | "líder" |
| Organização | quem coordena os jogos | `ADMINISTRATOR` | "admin" na interface |
| Chave | a competição de uma modalidade numa categoria, de mata-mata | `Bracket` | "grupo", "torneio" |
| Sorteio | monta a chave inteira, da primeira fase à final | `draw` (rota `POST /administrator/brackets`) | "geração" |
| Time | a turma dentro de uma chave | `Team` (`teams`) | "equipe" |
| Folga | turma que passa direto à fase seguinte quando o número de times não fecha uma potência de dois | `away` nulo na partida | "bye" |
| Partida | confronto entre dois times numa fase | `Match` | "jogo" no código; "jogo" na interface do site |
| Fase | `ROUND_OF_16`, `QUARTER`, `SEMI`, `FINAL` | `MatchPhase` | "rodada" |
| Placar | gols ou pontos de cada lado; empate só com vencedor dos pênaltis | `homeScore`, `awayScore`, `winnerTeamId` | |
| Cartão | amarelo ou vermelho que um atleta levou numa partida | `MatchCard` (`YELLOW`, `RED`) | "falta" |
| Remoção | aviso de atleta tirado de uma modalidade, com motivo | `EnrollmentRemoval` | "exclusão de atleta" |
| Regulamento | PDF enviado pela organização, para baixar no site | `SiteSetting.regulation` | |
| Foto aprovada | foto que a organização liberou para o carrossel | `Photo` com status `APPROVED` | "foto publicada" |

## 5. Modelo de dados

Migrations em `backend/database/migrations/`. Chaves primárias em `uuid`.

| Entidade | Campos principais | Relações | Observação |
|---|---|---|---|
| `users` | `name`, `email` (único), `password`, `role`, `status`, `avatar_id`, `deleted_at` | `avatar_id` → `storages` | papel `ADMINISTRATOR`, `ADVISOR` ou `REPRESENTATIVE`; soft delete |
| `auth_access_tokens` | tokens de acesso e de refresh | `users` | revogação por apagar a linha |
| `classrooms` | `name` (único, até 20), `grade` (3 a 9), `category`, `advisor_id` (único), `representative_id` | `users` | índice único em `advisor_id` (um conselheiro, uma turma) |
| `students` | `name`, `classroom_id` | `classrooms` | |
| `sports` | `name` (único), `slug` (único), `min_athletes`, `max_athletes` | | |
| `enrollments` | `student_id`, `sport_id` | `students`, `sports` | único em `(student_id, sport_id)` |
| `brackets` | `sport_id`, `category`, `status` (`KNOCKOUT`, `FINISHED`) | `sports` | único em `(sport_id, category)`: base do sorteio idempotente |
| `teams` | `bracket_id`, `classroom_id` | `brackets`, `classrooms` | único em `(bracket_id, classroom_id)` |
| `matches` | `bracket_id`, `phase`, `round`, `position`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `winner_team_id`, `status`, `scheduled_at`, `location` | `brackets`, `teams` | único em `(bracket_id, phase, position)` |
| `match_cards` | `match_id`, `student_id`, `team_id`, `color`, `note` | `matches`, `students`, `teams` | o time sai da turma do atleta |
| `enrollment_removals` | `sport_id`, `student_id`, `student_name`, `reason`, `actor_id`, `acknowledged_at` | `sports`, `students`, `users` | copia o nome: o aviso sobrevive ao aluno |
| `announcements` | `title`, `body`, `pinned` | | |
| `site_settings` | `about`, `organizer`, `first_edition_year`, `edition`, `school_instagram`, `developer_instagram`, `regulation_id` | `storages` | uma linha só |
| `photos` | `caption`, `status`, `storage_id`, `author_id`, `reviewed_by_id`, `reviewed_at` | `storages`, `users` | `PENDING`, `APPROVED`, `REJECTED` |
| `storages` | `filename`, `original_name`, `mimetype`, `size`, `path`, `status` (`PENDING`, `UPLOADED`), `upload_id`, `deleted_at` | | o binário está no bucket |
| `rate_limits` | contador do `@adonisjs/limiter` | | store `database`, compartilhado entre réplicas |

`database/schema.ts` é gerado e commitado (`backend/AGENTS.md`).

## 6. Fluxo de dados

Sorteio de uma chave, ponta a ponta: a organização escolhe modalidade e categoria em
`/administrator/brackets` → `POST /administrator/brackets` → o validator confere a entrada → o
use-case abre uma `UnitOfWork`, trava a linha da modalidade e lê as turmas da categoria com
inscritos suficientes → a entidade `Bracket` embaralha com `crypto.randomInt` e monta todas as
partidas → o repository grava chave, times e partidas → o presenter monta a resposta → `201`. Se a
chave já existe, a resposta é `200` com a chave existente. O cliente repete o pedido quando a rede
cai (`DECISIONS.md` #2).

Modo de renderização do frontend (`ssr`): o site público renderiza no servidor; o grupo `_private`
usa `ssr: 'data-only'` (dados no servidor, tela no cliente) em `routes/_private/layout.tsx`;
`authentication/` é rota com path próprio.

## 7. Integrações externas

| Serviço | Para quê | Contrato no código | Variáveis (`ENV.md`) |
|---|---|---|---|
| Bucket S3-compatível (MinIO em dev) | fotos, regulamento em PDF, avatar | `StorageService` em `backend/app/services/storage/` | `STORAGE_*`, `UPLOAD_MAX_SIZE` |
| PostgreSQL | dados do produto e tokens de sessão | Lucid | `DATABASE_URL`, `DATABASE_SSL` |
| Instagram | link no rodapé e na página Sobre | só um texto salvo em `site_settings`; nenhuma chamada à API | Não se aplica |

## 8. Autenticação e autorização

- Sessão por cookie `httpOnly` com par de tokens (acesso e refresh) em `auth_access_tokens`;
  `POST /authentication/sign-in`, `sign-out` e `refresh` (`start/routes.ts`).
- `middleware.auth()` antes de `middleware.role([...])` no grupo de cada papel: sem sessão a resposta é 401, nunca 403.
- Quem alcança qual turma é escopo da consulta no repository (`ClassroomRepository#findOwned`), não regra de rota.
- O frontend não repete a matriz de papéis: o layout `_private` só exige sessão; o backend decide. `HOME_BY_ROLE` em `routes/_private/-components/menu.ts` manda cada papel à primeira tela dele.

| Papel | Área | Pode |
|---|---|---|
| `ADMINISTRATOR` | `/administrator` (também entra em `/advisor`) | tudo da organização; cobre a falta de um conselheiro |
| `ADVISOR` | `/advisor` | alunos, inscrições (antes e depois do sorteio) e fotos da turma que aconselha |
| `REPRESENTATIVE` | `/representative` | acrescentar atletas à lista da própria turma, antes do sorteio |
| público | `/storefront` | só leitura |

Detalhe de ameaças em `SECURITY.md`.

## 9. Ambientes

| Ambiente | URL | Onde roda | Banco | Deploy |
|---|---|---|---|---|
| Desenvolvimento | site `http://localhost:3001`, API `http://localhost:3333` | máquina local | Postgres em container (porta 5434) e MinIO (9004 e 9005), `backend/docker-compose.yml` | `pnpm dev` |
| Produção | site `https://interclass.maiyu.com.br`, API `https://api-interclass.maiyu.com.br` | Coolify (`coolify.maiyu.com.br`) | PostgreSQL gerenciado pela plataforma | push em `main` dispara `main.yml` |

Portas deslocadas em desenvolvimento porque outros projetos ocupam 3000, 5432 e 5433 na mesma máquina.
Não há ambiente de homologação.

O CI (`ci.yml`) roda em pull request para `main`: checagem do backend e lint, typecheck, teste e
build do frontend. O `main.yml` roda no push para `main`: checa o backend, builda o frontend, publica
`interclasse-api` (construída da raiz: `docker build -f backend/Dockerfile-production .`) e
`interclasse-app` no Docker Hub para `linux/amd64` e `linux/arm64`, com as tags `latest` e o SHA do
commit, e dispara o Coolify. Depois do disparo, um smoke test espera `/health-check` da API e o
SHA em `/revision.txt` do site (`main-deploy-coolify.yml`).

Health check: `GET /health-check` na API e no site.

### 9.1 O que a plataforma faz e o repositório não

| O quê | Onde se configura | Por quê |
|---|---|---|
| `node ace migration:run --force` como comando de pré-deploy da API | Coolify, aplicação da API | o `Dockerfile-production` não tem `ENTRYPOINT`; subir uma réplica não deve alterar o schema |
| `COOKIE_DOMAIN=.maiyu.com.br` e `CORS_ORIGIN=https://interclass.maiyu.com.br` na API | Coolify, variáveis da API | sem `COOKIE_DOMAIN` o cookie nasce host-only da API e o SSR perde a sessão a cada F5 |
| `SERVER_API_URL` (nome do serviço da API na rede) no site | Coolify, variáveis do site | o SSR chama a API pela rede interna; ausente, usa a URL pública |
| Healthcheck do painel em `/health-check` | Coolify | o painel sobrepõe o `HEALTHCHECK` do Dockerfile |
| CORS do bucket com PUT liberado para a origem do site e `ETag` exposto | provedor do storage | sem o `ETag` o upload multipart não fecha |
| `uuid` das duas aplicações e o `COOLIFY_TOKEN` | `main-deploy-coolify.yml` e secrets do repositório | uuid de outro projeto redeploya o projeto errado |
| `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` | secrets do repositório | publicar as imagens |
| Semente do administrador (`node ace db:seed`) com `SEED_OWNER_PASSWORD` | à mão, uma vez por ambiente | o seeder para sem a senha |

## 10. Escala e limites conhecidos

- A maior chave é de oitavas de final: até 16 vagas, e a escola tem até 13 turmas por categoria (`TOO_MANY_TEAMS` acima disso).
- Paginação em memória nos presenters que juntam várias tabelas (`backend/app/repositories/memory-pagination.ts`); serve ao volume de uma escola, não a um volume grande.
- Uma instância da API e uma do site; o limite de requisições usa o banco como store, então mais réplicas compartilham a contagem.
- Atrás do proxy do Coolify, `request.ip()` é o IP do proxy até o `trustProxy` ser configurado (`SECURITY.md` §10, SEC-1).
