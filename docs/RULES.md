# Regras de desenvolvimento

**Interclasse** · valem para quem escreve código aqui, pessoa ou agente

> As regras da casa (TypeScript sem `any`/`as`/`!`, SOLID, `Either`, validação, commits) estão em
> `_standards/` e valem integralmente. Este arquivo só **acrescenta** o que é deste projeto.
> Regra que serviria para qualquer projeto vai para `_standards/`, não aqui.

## 1. Antes de mudar

- Ler `docs/MEMORY.md` e a linha da tarefa em `docs/TASKS.md`.
- Mudança pequena, um assunto por commit; todo ajuste vem com teste.
- Procurar o que já existe antes de criar (`_standards/architecture.md` §1, item 10).
- Ler `docs/DECISIONS.md` antes de uma escolha difícil de desfazer.
- Mexeu em migration, rota, controller ou policy: regenerar `database/schema.ts`, `.adonisjs/**` e `openapi.json` no mesmo commit (`backend/CLAUDE.md`).

## 2. O agente não mexe sem perguntar

- Migration que já rodou em produção (cria uma nova).
- Dependência nova, ou troca de versão major.
- Teste que está falhando: investiga, não apaga nem pula.
- `docs/PRD.md` (escopo).
- Variável de ambiente de produção, segredo, configuração de deploy.
- Os `uuid` das aplicações em `.github/workflows/main-deploy-coolify.yml`: uuid de outro projeto redeploya o projeto errado.
- Chaves já sorteadas, partidas com placar e cartões em dados reais: qualquer script que os altere em lote.
- O índice único `(sport_id, category)` de `brackets` e o de `advisor_id` de `classrooms`: são o que sustenta o sorteio idempotente e a regra de um conselheiro por turma.

## 3. Regras deste projeto

| Tema | Regra | Por quê |
|---|---|---|
| Categoria | derivada do ano da turma no domínio (3º ao 5º é `F1`, 6º ao 9º é `F2`); nunca vem do cliente | um 9º ano gravado como `F1` jogaria contra crianças de 8 anos |
| Sorteio | um por modalidade e categoria; repetir devolve a chave existente. Chave não se edita: refazer é apagar e sortear | rede que cai depois do commit não pode criar chave duplicada nem mandar a tela mostrar erro |
| Apagar chave | só sem placar lançado | apagar com resultado levaria embora o que aconteceu em quadra |
| Aleatoriedade | o sorteio usa `crypto.randomInt`, injetado como `Random` no domínio | sorteio previsível seria sorteio contestável, e o teste precisa ser determinístico |
| Inscrição depois do sorteio | só conselheiro (e administrador) mexe; tirar atleta exige motivo e gera aviso à organização. Representante só acrescenta, antes do sorteio | o time sorteado é a turma, então trocar quem joga por ela não muda a chave |
| Conselheiro | uma turma por conselheiro (índice único) | o professor enxerga a turma dele, no singular |
| Site público | grupo `/storefront` só lê, sem middleware; nunca recebe `POST`, `PUT` ou `DELETE` | escrita anônima no banco |
| Dados do site público | nenhuma resposta do `storefront` leva nome de aluno ou atleta | dado de menor de idade |
| Conteúdo do site | Sobre, organizador, edição, Instagram e regulamento vêm de `site_settings`; texto fixo no código só como rótulo traduzido | a organização edita sem mexer em código |
| Foto | a do conselheiro nasce `PENDING` e só aparece no site depois de `APPROVED`; só imagem entra | foto de aluno não vai ao ar sem a organização |
| Arquivo | o binário nunca passa pela API: upload por URL assinada, bucket privado, leitura por URL assinada curta | tamanho e custo, e nada no bucket é público |
| CSV | começa com BOM, separa por `;` e prefixa com `'` a célula que começa com `=`, `+`, `-`, `@`, tab ou retorno | Excel em pt-BR abre `;` e acentos certos, e fórmula em nome de aluno não executa |
| Fuso | banco e API em UTC (`TZ=UTC`); a interface mostra em `America/Manaus` (`SCHOOL_TIME_ZONE`) | a mesma consulta não pode responder datas diferentes por máquina |
| Idiomas | pt-BR é a base; es e en acompanham. Chave nova de mensagem nasce nos três | `inlang check` reprova tradução faltando |
| Papéis | `ADMINISTRATOR`, `ADVISOR`, `REPRESENTATIVE`. Rótulo na interface: "Organização", "Conselheiro", "Representante" | linguagem do domínio (`ARCHITECTURE.md` §4.1) |

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
- [ ] Mudança de regra de dado (índice, unique, enum) rodou a suíte inteira do backend, não só a spec da feature.
- [ ] `docs/` atualizado no mesmo commit (`_standards/documentation.md` §5).
- [ ] Sem segredo, `console.log`, código comentado ou `TODO` sem dono no diff.

## Histórico

| Data | Mudança |
|---|---|
| 2026-10-29 | Primeira versão, escrita a partir do código |
