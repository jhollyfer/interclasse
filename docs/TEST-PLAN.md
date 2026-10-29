# Plano de testes

**<Projeto>** · o que se testa, em que nível, com que critério

> Onde cada teste mora e o que cada camada leva: `_standards/architecture.md` §8; como se escreve:
> `_standards/domain.md` §10 e `_standards/backend.md` §7. Aqui fica só o que é deste projeto: os
> fluxos críticos, a matriz requisito × teste e o que conta como pronto.

## 1. Níveis

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unitário do backend | <Japa, suíte `unit` \| Vitest, config `unit`> | `app/**/<x>.unit.spec.ts` | todo push |
| E2E do backend | <Japa, suíte `functional` \| Vitest, config `e2e`> | `app/**/<x>.e2e.spec.ts`, banco real em container | todo push (CI) |
| `shared/` | Vitest | `shared/src/**/<x>.test.ts` | todo push |
| Unitário do frontend | Vitest + Testing Library | `src/**/<x>.test.ts(x)` | todo push |
| E2E do frontend | Playwright | `e2e/<fluxo>.spec.ts`, contra o backend real | <todo push \| PR para a principal> |

## 2. Fluxos críticos

Cada fluxo de `USER-FLOWS.md` marcado aqui tem spec E2E de ponta a ponta.

| Fluxo | Caminho feliz | Caminhos de erro | Teste |
|---|---|---|---|
| <Cadastro> | <conta criada> | <e-mail repetido, senha curta> | `e2e/sign-up.spec.ts` |

## 3. Matriz requisito × teste

Cada critério de aceite (EARS, com o id do requisito) aponta o teste que o prova; o título do
teste começa pelo mesmo id.

| Requisito | Critério | Nível | Teste |
|---|---|---|---|
| <POST-03> | <IF o post já está arquivado THEN o sistema SHALL responder 409 com code POST_ALREADY_ARCHIVED> | E2E | `<archive.e2e.spec.ts>` |

### 3.1 Join de cobertura

Todo conjunto enumerado (status de uma rota, valores de um enum, transições de estado) vira uma
linha com **cada membro escrito como token** ao lado do teste que o prova. "Trata pausado,
cancelado e expirado" numa frase não conta: membro sem teste aparece como lacuna.

| Conjunto | Membro | Teste |
|---|---|---|
| <`POST /posts/:id/archive`> | 200 | `<archive.e2e.spec.ts: archives a published post>` |
| | 401 | <…> |
| | 403 | <…> |
| | 404 | <…> |
| | 409 | <…> |
| | 422 | <…> |
| <`PostStatus`> | `DRAFT` | <…> |
| | `PUBLISHED` | <…> |
| | `ARCHIVED` | <…> |

Rota nova entra aqui com os status dela; valor novo de enum, com a linha dele.

## 4. Toda rota de API cobre

- [ ] Sucesso com o status certo.
- [ ] Entrada inválida → 422 com o campo.
- [ ] Sem login → 401; papel sem acesso → 403.
- [ ] Recurso de outro dono → 404, igual ao inexistente, e nada muda.
- [ ] Conflito ou estado inválido → `left(HTTPException)` com o status e o `code` certos.
- [ ] Depois de todo 4xx de escrita: a asserção de que **nada foi gravado**.

## 5. Dados de teste

- Banco: <container local via `.env.test`>; limpo entre testes por <transação global | truncate>.
- Factories em `database/factories/`, com o papel mínimo que o teste precisa.
- E2E do frontend cria o próprio dado (prefixo + id único) pela API e limpa no fim; nenhum teste
  depende de ordem.

## 6. Critério de pronto

A definição de pronto da casa (prova no `HEAD`, quatro estados por portão, atalho de teste
proibido) vale aqui sem cópia: `_standards/tooling.md` §10.1. Deste projeto:

- Teste novo falha antes da correção e passa depois.
- Cobertura: o join do §3.1 sem lacuna. Percentual mínimo: <não exigido | N% nas features>.

## 7. Teste manual antes do release

- [ ] <fluxo> no celular.
- [ ] <fluxo> com rede lenta.
