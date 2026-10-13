# Backend

Interclasse: os Jogos Estudantis do CMEI Cosme Jean - turmas, inscrições,
sorteio, tabela de jogos, placar e classificação.

AdonisJS 7 + Lucid/Postgres. **A régua é `../_padroes/`** (`arquitetura.md` e
`backend.md` acima de tudo), cópia do upstream `maiyu-pattern` cobrada por
`sync:check`. Este arquivo assume tudo o que ela diz e não repete nada: aqui fica só
o que é deste projeto. O que cada operação faz, recebe e devolve está no
`openapi.json` (UI em `/documentation`); o porquê de cada regra, no comentário do
use-case.

## O que foge da árvore da régua

- **Módulo que é o próprio recurso.** `account/`, `authentication/` e `storages/`
  têm a ação direto sob o módulo (`storages/create/create.controller.ts`), sem o
  nível de recurso: cada um tem um recurso só, e o nível repetiria o nome.
- **`app/guards/cookie-access-tokens.guard.ts`.** Sessão por cookie `httpOnly`, sem
  fallback para `Authorization`. O guard recusa conta arquivada e inativa, e é por
  isso que `/account` usa o `actor` sem reconsultar.

- **`typescript` preso em 6.x.** ponytail: o `typescript-eslint` recusa o TS 7, e o
  introspector do OpenAPI (`app/core/openapi/introspect.ts`) usa a API JS do
  compilador, que o TS 7 não tem — sobe quando os dois suportarem (`tooling.md` §0).

`database/schema.ts`, `.adonisjs/**` e `openapi.json` são **gerados e commitados**.
Mexeu em migration, rota, controller ou policy, regenere no **mesmo** commit - o CI
roda `--check` e os testes nem compilam sem o registry do Tuyau.

## O domínio

- **Três papéis, um por responsabilidade:** `ADMINISTRATOR` (a organização),
  `ADVISOR` (o professor conselheiro, dono das próprias turmas) e `REPRESENTATIVE`
  (o aluno que monta a lista de atletas da própria turma). Sem `OWNER`: o purge
  fica com o administrador.
- **Turma alheia é `404`, nunca `403`** (`ClassroomPolicy`): confirmar que ela
  existe já seria contar demais. O administrador entra em `/advisor` para cobrir a
  falta de um conselheiro.
- **O representante não informa a turma:** ela sai da sessão
  (`classrooms.representative_id`); sem turma vinculada, `404`.
- **Mata-mata direto, sem grupos.** O sorteio monta a chave inteira; turma que
  sobra da potência de dois folga e entra na fase seguinte. O placar leva o
  vencedor adiante, e empate exige quem venceu nos pênaltis
  (`_shared.tournament.ts`, `matches/score`).
- **Inscrição trava no sorteio.** A ausência da linha em `brackets` para a
  modalidade e a categoria é o que mantém a lista aberta; apagar a chave reabre.
- **Site público (`/storefront`) é só leitura e sem sessão.** A classificação é a
  mesma do painel, calculada do placar a cada leitura.
- **Sem fila, sem e-mail, sem Redis.** `config/limiter.ts` cai no store `database`.
- **MinIO pelo fork `pgsty/*`.** As imagens `minio/*` saíram do Docker Hub.
  Postgres em 5434 e MinIO em 9004/9005, para conviver com os irmãos.

## Comandos

- `pnpm check` - lint, typecheck, `openapi:check`, `pattern:check`, `sync:check` e
  `authz:check` (o que cada um reprova: `backend.md` §10). Isenções e chaves de
  ambiente fora do leitor do `pattern:check` ficam em `scripts/pattern-check.config.json`.
- `node ace di:check` - constrói todo service e policy pelo container (exige banco).
- `node ace test` - suíte funcional (`app/**/*.spec.ts`) contra Postgres e MinIO reais.
- `pnpm sync:check` compara a régua com o upstream em `../../maiyu-pattern` (ou
  `MAIYU_PATTERN_DIR`); sem ele, avisa e passa. É conferência local: o CI não
  depende do maiyu-pattern.

O `pre-commit` roda `pnpm check && pnpm test`.
