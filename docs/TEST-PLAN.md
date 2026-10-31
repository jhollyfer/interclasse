# Plano de testes

**Interclasse** · o que se testa, em que nível, com que critério

> Onde cada teste mora e o que cada camada leva: `_standards/architecture.md` §8; como se escreve:
> `_standards/domain.md` §10 e `_standards/backend.md` §7. Aqui fica só o que é deste projeto: os
> fluxos críticos, a matriz requisito × teste e o que conta como pronto.

## 1. Níveis

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unitário do backend | Japa, suíte `unit` (sem banco nem HTTP) | `backend/app/**/*.unit.spec.ts` e `backend/scripts/**/*.unit.spec.ts`: entidades do domínio, use-cases, `Knockout`, `ReportCsv`, `CookieService` | todo pull request e todo push em `main` |
| E2E do backend | Japa, suíte `functional`, Postgres e MinIO reais | `backend/app/**/*.e2e.spec.ts`: rota, policy, middleware, repository | a suíte inteira em todo pull request e todo push em `main`, em 3 shards (`--shard=i/3`), cada um com o próprio Postgres e MinIO; na sessão do agente só os specs afetados (`--files`) (`tooling.md` §10.6) |
| Injeção de dependência | `node ace di:check` | constrói todo service e policy pelo container | todo pull request e todo push em `main` |
| `shared/` | Vitest | `shared/src/**/*.test.ts` | todo pull request e todo push em `main` |
| Unitário do frontend | Vitest | `frontend/src/**/*.test.ts` e `frontend/scripts/**/*.test.ts` (só `.ts`: componente React não é testável hoje) | todo pull request e todo push em `main` |
| Mensagens | `pnpm i18n:check` (inlang) | `frontend/messages/` | pull request |
| Guardas do padrão | `pnpm pattern:check`, `pnpm authz:check`, `pnpm openapi:generate --check --strict`, `pnpm depcruise` | `backend/scripts/` | `pnpm check` e CI |
| E2E do frontend | Playwright, `pnpm test:e2e` em `frontend/`: o app local contra a API e o banco semeados | `frontend/e2e/<fluxo>.spec.ts`: classificação pública, troca de idioma, menu da conta, turmas, sorteio de chave, fotos, texto do Sobre e relatório em CSV; as credenciais vêm de `frontend/.env.e2e` (modelo em `.env.e2e.example`) | fase final de cada plano e antes do PR; job `e2e` do `main-check-frontend.yml` em todo PR, num job só (14 jornadas em ~2 min: shard só quando passar do tempo aceitável, `_doc-lib/playwright.md#docs/test-sharding`) |

## 2. Fluxos críticos

Cobertura por spec de API, que é o mais alto nível automatizado hoje.

| Fluxo (`USER-FLOWS.md`) | Caminho feliz | Caminhos de erro | Teste |
|---|---|---|---|
| Entrar no painel | sign-in devolve 204 com cookies; refresh renova | senha errada 401 igual para conta arquivada; sign-out sem sessão | `authentication/sessions/*/*.e2e.spec.ts` |
| Sortear uma chave | monta a chave inteira; 3 turmas deixam uma de folga na final; repetir devolve a chave existente | turma abaixo do mínimo não entra; menos de duas turmas 409 | `administrator/brackets/create/create.e2e.spec.ts` |
| Lançar o placar | o vencedor avança sozinho até o campeão; desfazer reabre a chave | empate sem vencedor válido 422; placar negativo 422; partida sem times 409 | `administrator/matches/score/score.e2e.spec.ts`, `unscore.e2e.spec.ts` |
| Inscrever atletas (representante) | monta a lista da própria turma dentro do limite | aluno de outra turma 422; depois do sorteio 409; tirar atleta 403 | `representative/enrollments/update/update.e2e.spec.ts` |
| Inscrever atletas (conselheiro) | troca a lista inteira, inclusive depois do sorteio | acima do máximo 422; turma alheia 404 | `advisor/enrollments/update/update.e2e.spec.ts` |
| Tirar um atleta de uma modalidade | motivo vira aviso pendente para a organização | sem motivo 422 e nada muda | `advisor/enrollments/update/update.e2e.spec.ts`, `administrator/enrollment-removals/acknowledge/acknowledge.e2e.spec.ts` |
| Enviar e aprovar fotos | foto do conselheiro só vai ao site depois de aprovada; a da organização nasce aprovada | arquivo que não é imagem 422; foto alheia 404 | `administrator/photos/review/review.e2e.spec.ts` |
| Baixar o relatório | CSV com BOM, `;` e células neutralizadas | | `administrator/reports/export/export.unit.spec.ts`, `administrator/reports/show/show.e2e.spec.ts` |

## 3. Matriz requisito × teste

Os requisitos são os itens do MVP do `PRD.md` §4. O título dos testes atuais não carrega o número
do requisito; a ligação é pelo arquivo e pelo título.

| Requisito | Critério | Nível | Teste |
|---|---|---|---|
| PRD 1 | login com cookie `httpOnly`; sair apaga os tokens; renovar pelo refresh | E2E | `authentication/sessions/sign-in`, `sign-out`, `refresh` (`*.e2e.spec.ts`) |
| PRD 1 | `sameSite` do cookie por domínio | unitário | `services/cookie/cookie.service.unit.spec.ts` |
| PRD 2 | a categoria sai do ano; nome repetido é 409; o conselheiro precisa ter o papel | E2E | `administrator/classrooms/create/create.e2e.spec.ts` |
| PRD 2 | invariantes da turma (vínculos, travamento depois do sorteio) | unitário | `domain/classroom/classroom.entity.unit.spec.ts` |
| PRD 3 | limites mínimo e máximo; máximo não desce abaixo do maior elenco | unitário | `domain/sport/sport.entity.unit.spec.ts` |
| PRD 4 | arquivar, desarquivar, excluir conta e papel nas rotas | E2E | `administrator/users/*/*.e2e.spec.ts`, `policies/user.policy.e2e.spec.ts` |
| PRD 5 | lista inteira por turma e modalidade, dentro do máximo | unitário e E2E | `domain/enrollment/enrollment.entity.unit.spec.ts`, `advisor/enrollments/update`, `representative/enrollments/update` |
| PRD 6 | aviso de remoção com motivo; a do administrador já nasce lida | E2E | `advisor/enrollments/update`, `administrator/enrollment-removals/*/*.e2e.spec.ts` |
| PRD 7 | sorteio idempotente por modalidade e categoria; apagar só sem placar | E2E | `administrator/brackets/create`, `administrator/brackets/delete` |
| PRD 7 | regras do mata-mata (potência de dois, folga, avanço) | unitário | `domain/shared/knockout.value-object.unit.spec.ts`, `bracket.entity.unit.spec.ts` |
| PRD 8 | placar, empate com pênaltis, desfazer, cartão só de atleta da partida | E2E e unitário | `administrator/matches/*`, `administrator/cards/*`, `domain/match-card/match-card.entity.unit.spec.ts` |
| PRD 9 | avisos: criar, editar, apagar, fixar | E2E | `administrator/announcements/*/*.e2e.spec.ts` |
| PRD 10 | leitura pública de jogos, chaves, avisos e modalidades | E2E | `storefront/{announcements,brackets,matches,sports}/*/*.e2e.spec.ts` |
| PRD 11 | regulamento só em PDF; site em uma linha | unitário | `domain/site-setting/site-setting.entity.unit.spec.ts`, `administrator/site/update/update.e2e.spec.ts` |
| PRD 12 | estado de nascimento por remetente; aprovar e recusar se refaz | E2E e unitário | `administrator/photos/review/review.e2e.spec.ts`, `domain/photo/photo.entity.unit.spec.ts` |
| PRD 13 | CSV: BOM, separador, neutralização de fórmula | unitário | `administrator/reports/export/export.unit.spec.ts` |
| PRD 14 | idioma por `Accept-Language`; mensagens de validação traduzidas | E2E | `core/validator-messages.e2e.spec.ts` |
| PRD 14 | mensagens nos três idiomas | CI | `pnpm i18n:check` |

### 3.1 Join de cobertura

Membros enumerados e o teste que prova cada um. Membro sem teste aparece como **lacuna**.

| Conjunto | Membro | Teste |
|---|---|---|
| `BracketStatus` | `KNOCKOUT` | `administrator/brackets/create/create.e2e.spec.ts` |
| | `FINISHED` | `administrator/matches/score/score.e2e.spec.ts` ("do sorteio ao campeão") |
| `MatchStatus` | `SCHEDULED` | `administrator/matches/unscore/unscore.e2e.spec.ts` |
| | `FINISHED` | `administrator/matches/score/score.e2e.spec.ts` |
| `MatchPhase` | `ROUND_OF_16`, `QUARTER`, `SEMI`, `FINAL` | `domain/shared/knockout.value-object.unit.spec.ts` |
| `PhotoStatus` | `PENDING`, `APPROVED` | `administrator/photos/review/review.e2e.spec.ts` |
| | `REJECTED` | `domain/photo/photo.entity.unit.spec.ts`, `administrator/photos/review/review.unit.spec.ts` |
| `UserRole` | `ADMINISTRATOR` | `administrator/*` e `role.middleware.e2e.spec.ts` |
| | `ADVISOR` | `advisor/*`, `role.middleware.e2e.spec.ts` |
| | `REPRESENTATIVE` | `representative/enrollments/*` |
| `Category` | `F1`, `F2` | `administrator/classrooms/create/create.e2e.spec.ts`, `domain/classroom/classroom.entity.unit.spec.ts` |
| `CardColor` | `YELLOW`, `RED` | `domain/match-card/match-card.entity.unit.spec.ts` |
| `POST /administrator/brackets` | 200 (repetido) e 409 | `administrator/brackets/create/create.e2e.spec.ts` |
| | 401 e 403 | lacuna: `create.e2e.spec.ts` não os cobre |
| | 422 | lacuna |
| `DELETE /administrator/brackets/:id` | 204, 401, 403, 404, 409 | `administrator/brackets/delete/delete.e2e.spec.ts` |
| `PUT /administrator/matches/:id/score` | 200, 401, 403, 404, 409, 422 | `administrator/matches/score/score.e2e.spec.ts` |
| `DELETE /administrator/matches/:id/score` | 200, 401, 403, 404, 409 | `administrator/matches/unscore/unscore.e2e.spec.ts` |
| `PUT /representative/enrollments` | 200, 401, 403, 404, 409, 422 | `representative/enrollments/update/update.e2e.spec.ts` |
| `PUT /advisor/enrollments` | 200, 401, 403, 404, 422 | `advisor/enrollments/update/update.e2e.spec.ts` |

Rota nova entra aqui com os status dela; valor novo de enum, com a linha dele. Lacunas de status
em outras rotas estão no achado T2 (`TASKS.md` 3.1).

## 4. Toda rota de API cobre

- [ ] Sucesso com o status certo.
- [ ] Entrada inválida → 422 com o campo.
- [ ] Sem login → 401; papel sem acesso → 403.
- [ ] Recurso de outro dono → 404, igual ao inexistente, e nada muda.
- [ ] Conflito ou estado inválido → `left(HTTPException)` com o status e o `code` certos.
- [ ] Depois de todo 4xx de escrita: a asserção de que **nada foi gravado**.

Rotas do `/storefront` são só leitura: cobrem sucesso, filtro e paginação, e que a resposta não carrega nome de aluno.

## 5. Dados de teste

- Banco: `interclasse_test`, separado do de desenvolvimento, via `backend/.env.test`; a suíte roda `truncate()` entre os testes. Bucket `interclasse-test` no MinIO do `docker-compose.yml` (criado pelo serviço `minio-setup`).
- Factories em `backend/database/factories/`, com o papel mínimo que o teste precisa.
- Repositórios em memória (`*.memory.repository.ts`) e fakes (`session.fake.ts`, `storage.fake.ts`) servem aos testes unitários.
- No CI, o job do backend sobe o MinIO e roda a suíte inteira.

## 6. Critério de pronto

A definição de pronto da casa (prova no `HEAD`, quatro estados por portão, atalho de teste
proibido) vale aqui sem cópia: `_standards/tooling.md` §10.1. Deste projeto:

- Teste novo falha antes da correção e passa depois.
- Mudança de regra de dado (índice, unique, enum) roda a suíte inteira do backend antes do commit.
- Cobertura: o join do §3.1 sem lacuna nas rotas e enums que a mudança toca. Percentual mínimo: não exigido.
- `pnpm check` e `pnpm test:e2e` no backend (o `pre-commit` roda `check`, que inclui o `test:unit`); `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` e `pnpm build` no frontend; `pnpm check-cycles` depois do build do frontend.

## 7. Teste manual antes do release

- [ ] Sorteio de uma modalidade e categoria, com número ímpar de turmas, no celular.
- [ ] Lançar e desfazer um placar até a final, conferindo a classificação do site.
- [ ] Enviar uma foto como conselheiro e aprová-la como organização; conferir o carrossel.
- [ ] Baixar o relatório CSV e abri-lo no Excel.
- [ ] Trocar o idioma do site entre pt-BR, es e en.
- [ ] Atualizar (F5) uma página do painel em produção e conferir que a sessão continua (`COOKIE_DOMAIN`).
- [ ] Site público com rede lenta.
