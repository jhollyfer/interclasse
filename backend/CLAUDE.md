# Backend

Interclasse: os Jogos Estudantis do CMEI Cosme Jean - turmas, inscricoes,
sorteio, tabela de jogos, placar e classificacao.

AdonisJS 7 + Lucid, vertical slice por feature. **A regua e
`../PADRAO-BACKEND.md`**, byte-identica nos repositorios irmaos e cobrada por
`sync:check`. Este arquivo assume tudo o que ela diz e nao repete nada: aqui fica so
o que e deste projeto.

## Arvore

```
app/
  core/         # either, entity, validator, response, aggregate, openapi - nada daqui importa de features
  exceptions/   # so http.exception.ts e handler.ts
  features/     # um diretorio por papel; ver features/CLAUDE.md
  guards/       # cookie-access-tokens.guard.ts, a sessao por cookie httpOnly
  middleware/   # snake_case + _middleware.ts, convencao do Adonis
  models/       # kebab-case; estende database/schema.ts, que e gerado
  policies/     # regra por registro, injetada no caso de uso
  services/     # o que tem dependencia ou estado
```

`database/schema.ts`, `.adonisjs/**` e `openapi.json` sao **gerados e commitados**.
Mexeu em migration, rota ou controller, regenere no **mesmo** commit - o CI roda
`--check` e os testes nem compilam sem o registry do Tuyau.

## O que e deste projeto

- **Tres papeis, um por responsabilidade:** `ADMINISTRATOR` (a organizacao),
  `ADVISOR` (o professor conselheiro, dono das proprias turmas) e `REPRESENTATIVE`
  (o aluno que monta a lista de atletas da propria turma). Sem `OWNER`: o purge
  fica com o administrador, como no adacaibs, de onde este backend foi copiado.
- **Mata-mata direto, sem grupos.** O sorteio monta a chave inteira; turma que
  sobra da potencia de dois folga e entra na fase seguinte. O placar leva o
  vencedor adiante, e empate exige quem venceu nos penaltis
  (`_shared.tournament.ts`, `matches/score.use-case.ts`).
- **Inscricao trava no sorteio.** A ausencia da linha em `brackets` para a
  modalidade e a categoria e o que mantem a lista aberta; apagar a chave reabre.
- **Sem fila, sem e-mail, sem Redis.** `config/limiter.ts` cai no store `database`.
- **MinIO pelo fork `pgsty/*`.** As imagens `minio/*` sairam do Docker Hub.
  Postgres em 5434 e MinIO em 9004/9005, para conviver com os irmaos.

## Guard-rails

```
pnpm check      lint + typecheck + openapi:check + pattern:check + sync:check + authz:check
node ace di:check   constroi todo service e policy pelo container (exige banco)
node ace test       funcional, contra Postgres e MinIO reais
```

O que cada um reprova esta na secao 10 da regua. O `pre-commit` roda
`pnpm check && pnpm test`.
