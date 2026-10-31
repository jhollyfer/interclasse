# Documentação viva do projeto *(opinião da casa)*

Todo projeto tem uma pasta `docs/` com o contexto que o agente (e quem chega no time) lê antes de
mexer no código: o que o produto é, como está montado, onde o trabalho parou. `_standards/` diz
**como** se escreve código em qualquer projeto; `docs/` diz **o que é este** projeto. Um não
repete o outro.

Nenhuma `_doc-lib` cobre isto: é escolha da casa. Onde há convenção pública, ela é seguida e citada.

**Quem manda em quê** (`DECISIONS.md` #227):

- **O conteúdo de `docs/` é do projeto** e fica fechado no contexto e no escopo dele: cada arquivo
  completo, preenchido a partir do código real, atualizado no mesmo commit da mudança (§5) e sem nada
  que não seja deste projeto. Placeholder, seção vazia, texto de outro projeto ou regra genérica
  copiada da régua é doc incompleto.
- **Padrão, organização, estrutura e arquitetura são do `maiyu-pattern`.** Nenhum arquivo de `docs/`
  define ou altera árvore de pastas, camadas, nomes, convenção de código, de teste ou de commit, nem
  o próprio conjunto de arquivos. `ARCHITECTURE.md` descreve **a instância** deste projeto dentro da
  árvore da casa (serviços, integrações, dados, ambientes), nunca uma árvore própria; `RULES.md` e
  `DECISIONS.md` guardam restrição e decisão **do produto**, nunca exceção à régua; `DESIGN.md` é o
  único que escolhe livremente, e só o visual (`AGENTS.md`), não onde o tema e o kit moram.
- **Forma da régua que não cabe no caso** (assinatura de fábrica, nome de arquivo, ordem de
  parâmetro): adapta-se o detalhe (a chave da tradução, o conteúdo) e mantém-se a forma. Trocar a
  forma por exceção local e registrá-la como decisão é desvio, não decisão (`DECISIONS.md` #255).
- **Conflito entre `docs/` e a régua: a régua vence** e o doc se corrige. Regra que não serve ao
  projeto muda no upstream e volta pelo sync, nunca vira linha em `RULES.md` ou `DECISIONS.md`.

Os modelos estão em `_templates/` deste repositório e chegam ao projeto por
`node scripts/sync-to-project.mjs <dir>`, que **só cria o que falta** e nunca sobrescreve um
arquivo já preenchido. Quem preenche cada projeto a partir do código real, pela filosofia da
casa, é a skill `maiyu-docs`: modelo com placeholder não é doc.

---

## 1. O conjunto

| Arquivo | Responde | Atualiza quando |
|---|---|---|
| `AGENTS.md` (raiz) | por onde o agente começa, o que ler em cada tarefa | muda a ordem de leitura ou entra arquivo novo |
| `docs/PRD.md` | que problema resolve, para quem, o que entra e o que fica de fora | escopo muda (nova versão, item sai ou entra) |
| `docs/ARCHITECTURE.md` | stack, peças do sistema, integrações, dados, linguagem do domínio, ambientes e o que a plataforma faz que o repositório não faz | entra serviço, integração, tabela/coleção, termo do domínio, ambiente ou passo manual de deploy |
| `docs/RULES.md` | regras **deste** projeto e o que o agente não toca sem perguntar | surge uma restrição nova |
| `docs/DESIGN.md` | direção visual, tokens, tipografia, componentes e estados, movimento, acessibilidade | token, fonte, componente do kit ou estado de tela muda |
| `docs/USER-FLOWS.md` | jornadas do usuário passo a passo, com caminhos de erro | tela ou fluxo novo |
| `docs/TASKS.md` | roteiro por fase com prioridade e status | toda tarefa começa ou termina |
| `docs/MEMORY.md` | onde o trabalho parou, para a próxima sessão | fim de toda sessão de trabalho |
| `docs/ENV.md` | cada variável de ambiente, por ambiente, incluindo as de borda (`CORS_ORIGINS`, `COOKIE_DOMAIN`, `TRUSTED_PROXIES`, `backend.md` §6) | variável entra, sai ou muda de significado |
| `docs/CHANGELOG.md` | o que mudou em cada release, para quem usa | todo release |
| `docs/DECISIONS.md` | decisões do projeto com o porquê e o custo aceito | toda decisão que cumpre os critérios do §5 |
| `docs/SECURITY.md` | como reportar falha, o modelo de ameaças (fronteiras, ativos, atacante, abusos priorizados) e como cada coisa se protege | auth, dado sensível, upload, papel, integração ou rota pública nova; escopo da credencial do bucket e CORS do bucket (`backend.md` §5.4) |
| `docs/TEST-PLAN.md` | o que se testa, em que nível, a matriz requisito × teste e o critério de pronto | feature nova, rota nova, valor novo de enum ou fluxo crítico novo |

O conjunto é fechado. Arquivo novo em `docs/` entra primeiro aqui e em `_templates/`, senão vira
o lugar onde uma informação passa a existir duas vezes. Fora do conjunto, e por isso migram para
dentro dele: `docs/adr/` (cada ADR vira uma linha de `DECISIONS.md`), `CONTEXT.md` e glossário
solto (seção "Linguagem do domínio" de `ARCHITECTURE.md`, `DECISIONS.md` #118),
`<projeto>-threat-model.md` na raiz (§2 de `SECURITY.md`), `LESSONS.md` e `.notebook/` (lição vira
regra no upstream ou some; estado vai para `MEMORY.md`).

**"O que a plataforma faz e o repositório não"** mora em `ARCHITECTURE.md` §9.1: comando de
migration do deploy (`migration:run --force`; no Coolify, o *Post-deployment command*, `tooling.md` §8.2), variável que só existe no painel (`COOKIE_DOMAIN`), segundo
serviço (worker de fila), regra de proxy (gzip sem `text/event-stream`), healthcheck configurado no
painel, CORS do bucket (com `ETag` exposto, `backend.md` §5.4). É o que se perde quando só o `CLAUDE.md` sabia.

## 2. Nome e idioma

- **Nome de todo arquivo `.md` e de toda pasta em inglês**, aqui no `maiyu-pattern` e nos
  projetos: `docs/USER-FLOWS.md`, `_standards/architecture.md`, `_findings/`. Em `docs/`,
  maiúsculo com hífen (`TEST-PLAN.md`).
- **Conteúdo em português do Brasil.** Identificador de código, nome de variável de ambiente,
  rota e comando ficam como estão no código (`typescript.md` §12).
- Skill de terceiro fica como veio, nome e conteúdo.
- Data sempre `AAAA-MM-DD`.

## 3. Onde mora

- `docs/` na **raiz do repositório**. Monorepo com backend e frontend tem **um** `docs/`, não um
  por app: o produto é um só.
- `AGENTS.md` na raiz aponta para `docs/` e para `_standards/`. `CLAUDE.md` só contém `@AGENTS.md`.
  App com instrução própria repete o par dentro dele (`backend/AGENTS.md` + `backend/CLAUDE.md`,
  idem `frontend/`); não existe terceiro lugar.
- `AGENTS.md` só tem **ponteiro com condição de disparo** ("teste → `docs/TEST-PLAN.md`"). Regra
  vai para `_standards/` (upstream) ou para lint; o que o ambiente já diz (scripts do
  `package.json`, árvore de pastas) não se copia.
- **`.specs/features/<feature>/`** é permitido na raiz: é o artefato do `tlc-spec-driven` (spec,
  design, tasks, `validation.md`) e vive enquanto a feature anda (`DECISIONS.md` #113, C21). Ele
  não guarda decisão nem estado do projeto: decisão vai para `docs/DECISIONS.md`, estado para
  `docs/MEMORY.md`. `.specs/STATE.md` com decisões `AD-xxx` migra para linhas de `DECISIONS.md`.
- `SECURITY.md` em `docs/` é reconhecido pelo GitHub como política de segurança
  (docs.github.com, "Adding a security policy to your repository": raiz, `docs/` ou `.github/`).

## 4. O que o agente lê, e quando

| Momento | Lê |
|---|---|
| início de toda sessão | `AGENTS.md` → `docs/MEMORY.md` → `docs/TASKS.md` |
| feature nova | + `PRD.md`, `USER-FLOWS.md`, `ARCHITECTURE.md` |
| tela ou componente | + `DESIGN.md`, o fluxo em `USER-FLOWS.md` |
| variável de ambiente, deploy | + `ENV.md`, `ARCHITECTURE.md` (Ambientes) |
| auth, permissão, dado pessoal, upload | + `SECURITY.md` |
| teste | + `TEST-PLAN.md` |
| qualquer escolha difícil de desfazer | + `DECISIONS.md` antes, para não reabrir o que já foi decidido |

Ler é pela seção, não o arquivo inteiro: `grep -n '^## ' docs/<ARQ>.md`, depois só o trecho.

## 5. O que o agente atualiza, e quando

No **mesmo commit** da mudança que motivou, nunca num "commit de docs" depois:

- Terminou ou começou tarefa → status em `TASKS.md`.
- Fim de sessão → `MEMORY.md` ("Parou em", "Próximos passos"). Uma sessão que não atualiza a
  memória obriga a próxima a redescobrir tudo.
- Correção do dono → linha em `MEMORY.md` ("Lições"), na hora, não no fim da sessão
  (`AGENTS.md`, "Modo de trabalho").
- Variável de ambiente nova → `ENV.md` **e** `.env.example` juntos (`backend.md` §6).
- Decisão tomada → linha nova em `DECISIONS.md`, com o custo aceito.
- Fluxo ou tela nova → `USER-FLOWS.md`.
- Componente novo no kit (`components/common/`) ou variante nova → `DESIGN.md` §7 (Componentes).
- Rota pública nova, integração, upload ou papel novo → modelo de ameaças (`SECURITY.md` §2).
- Rota nova ou valor novo de enum → linha na matriz de `TEST-PLAN.md`.
- Passo manual de deploy ou configuração que só existe no painel → `ARCHITECTURE.md` §9.1.
- Release → seção nova em `CHANGELOG.md` (§7).

**O que vira decisão.** Só a escolha que cumpre os três critérios: difícil de reverter,
surpreendente para quem chega sem contexto, e com troca real (havia alternativa viável). O resto é
código ou nota de `MEMORY.md`. Decisão nunca se edita: a nova linha substitui a antiga.

O agente **não** reescreve `PRD.md` por conta própria: escopo é decisão de quem é dono do
produto. Viu contradição entre o pedido e o PRD, pergunte.

## 6. Sem duplicar a régua

- `RULES.md` e `ARCHITECTURE.md` só têm o que é **deste projeto**. Regra que vale para todo
  projeto já está em `_standards/`: aponte (`ver _standards/backend.md §4`), não copie.
- `DESIGN.md` registra a decisão (que cor, por quê, onde usar). O valor que o código lê mora no
  tema (`styles.css`, `components.json`) e o componente usa cor semântica (`frontend.md` §6).
  Mudança de token altera os dois no mesmo commit.
- `ENV.md` explica o que a variável é e de onde vem o valor; o schema do leitor de ENV continua
  sendo quem valida (`backend.md` §6, `backend-fastify.md` §7).
- Com `tlc-spec-driven`: `.specs/features/<feature>/` guarda a spec, o design e as tarefas
  atômicas **da feature**; `docs/TASKS.md` é o roteiro **do projeto** por fase, e a linha da
  feature aponta para a pasta dela. Decisão tomada durante a feature vai direto para
  `docs/DECISIONS.md` (§3).
- **Spec e tarefa descrevem comportamento, não arquivo**: sem caminho, número de linha nem código.
  O teto de identificador é rota, tabela, coluna, classe e termo da "Linguagem do domínio"; a
  exceção é a forma literal que **é** a decisão (valores de enum, forma da resposta).
- **Design da feature** (`.specs/features/<f>/design.md`) só leva o que é de mão única: contrato,
  schema, invariante (não o mecanismo), plano de volta quando toca produção ou migration, segurança
  quando toca auth ou dado pessoal.
- **Decisão ainda aberta** não é linha de `DECISIONS.md`: vive na issue/PR ou em
  `.specs/features/<f>/context.md`, com os critérios escritos **antes** das opções, "não fazer nada"
  como opção e as suposições com o gatilho que as invalida. Fechada, vira uma linha com o link.

## 7. Release e changelog

- Formato Keep a Changelog (keepachangelog.com/pt-BR/1.1.0), versão em SemVer (semver.org):
  seção `## [x.y.z] - AAAA-MM-DD`, release mais novo primeiro, `## [Não lançado]` no topo
  acumulando o que já entrou na branch principal.
- Grupos, nesta ordem, só os que têm item: `Adicionado`, `Alterado`, `Descontinuado`,
  `Removido`, `Corrigido`, `Segurança`.
- O tipo do commit (`tooling.md` §6) indica o grupo: `feat` → Adicionado/Alterado, `fix` →
  Corrigido. O texto do changelog é para quem **usa**, não cópia do commit: "Corrigida tarefa
  duplicada ao clicar duas vezes em Salvar", não "fix bugs".
- Mudança que quebra compatibilidade abre o item com **QUEBRA:** e sobe o major.
- Nada de segredo, URL interna ou nome de cliente no changelog.

## 8. Como escrever

- Curto. Tabela e lista antes de parágrafo.
- **Seção vazia: depende do tipo de documento.**
  - Arquivo do conjunto de `docs/` (seções fixas, vindas de `_templates/`): a seção fica, com
    "Não se aplica: <motivo>". O leitor sabe que alguém olhou, e o motivo pode ser contestado.
  - Documento livre (`AGENTS.md`, `CLAUDE.md`, spec e design de `.specs/`): seção que não se aplica
    é omitida, nunca preenchida com "N/A".
- Placeholder `<...>` não chega ao commit.
- Nenhum segredo em nenhum arquivo de `docs/`: em `ENV.md` o exemplo é `<segredo>`.
- Leia o código antes de escrever sobre ele. Voz ativa; passo numerado começa por verbo; a condição
  vem antes da instrução ("Se o deploy falhar, rode…"); link conferido.
- Formule no positivo. Proibição só como guarda-corpo que não cabe no positivo, com o alvo positivo
  ao lado. Frase que não muda o comportamento de quem lê sai inteira.
- Sem marca de texto gerado: vocabulário inflado ("robusto", "crucial", "vale ressaltar"),
  "não só X, mas Y", lista de três por reflexo, frase de fechamento que repete o que já foi dito,
  negrito em excesso. Sem emoji e sem travessão em texto versionado; o travessão se resolve
  reescrevendo a frase, não trocando por hífen (skill `humanizer`).

## 9. Como verificar

- `node scripts/sync-to-project.mjs <dir> --check`, rodado à mão a partir do `maiyu-pattern`,
  acusa arquivo do conjunto que falta. Nunca no CI do projeto (`backend.md` §11).
- Na revisão: o diff mexeu em env sem tocar `ENV.md`? Fechou tarefa sem tocar `TASKS.md`? Volta.
- Conteúdo desatualizado ainda não é checado por script: não coberto.
