# Regras de desenvolvimento

**<Projeto>** · valem para quem escreve código aqui, pessoa ou agente

> As regras da casa (TypeScript sem `any`/`as`/`!`, SOLID, `Either`, VineJS, commits) estão em
> `_standards/` e valem integralmente. Este arquivo só **acrescenta** o que é deste projeto.
> Regra que serviria para qualquer projeto vai para `_standards/`, não aqui.

## 1. Antes de mudar

- Ler `docs/MEMORY.md` e a linha da tarefa em `docs/TASKS.md`.
- Mudança pequena, um assunto por commit; todo ajuste vem com teste.
- Procurar o que já existe antes de criar (`_standards/architecture.md` §1, item 10).
- Ler `docs/DECISIONS.md` antes de uma escolha difícil de desfazer.

## 2. O agente não mexe sem perguntar

- Migration que já rodou em produção (cria uma nova).
- Dependência nova, ou troca de versão major.
- Teste que está falhando: investiga, não apaga nem pula.
- `docs/PRD.md` (escopo).
- Variável de ambiente de produção, segredo, configuração de deploy.
- <regra específica do projeto — ex.: tabela `payments`, integração com o gateway>

## 3. Regras deste projeto

| Tema | Regra | Por quê |
|---|---|---|
| <ex.: Dinheiro> | <valor em centavos (`number` inteiro), nunca float> | <arredondamento> |
| <ex.: Fuso> | <`America/Sao_Paulo` só na exibição; banco em UTC> | <horário de verão e servidor em outro fuso> |

## 4. Estrutura

Tela em `frontend/`, regra em `backend/` (entidade em `app/domain/`, operação em
`app/features/<módulo>/<recurso>/<ação>/`), contrato de endpoint, validator e enum em `shared/`;
nada solto na raiz. A árvore é a de `_standards/architecture.md` §3, §4 e §9; desvio deste projeto
fica registrado em `ARCHITECTURE.md` §3, com motivo.

## 5. Definição de pronto

- [ ] Lint, typecheck, `pattern:check` e testes rodados no `HEAD` atual, com o resultado à mão
      (critério completo em `TEST-PLAN.md` §6).
- [ ] Teste novo cobre o comportamento e entra na matriz de `TEST-PLAN.md` §3.
- [ ] Estados de carregando, vazio, erro e sucesso tratados na tela (`DESIGN.md` §8, `USER-FLOWS.md`).
- [ ] Texto visível por chave i18n nos três idiomas (`_standards/i18n.md`).
- [ ] `docs/` atualizado no mesmo commit (`_standards/documentation.md` §5).
- [ ] Sem segredo, `console.log`, código comentado ou `TODO` sem dono no diff.

## Histórico

| Data | Mudança |
|---|---|
| AAAA-MM-DD | Primeira versão |
