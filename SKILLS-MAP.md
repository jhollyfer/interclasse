# Mapa de Skills — maiyu-pattern

Stack: TypeScript em tudo. Backend AdonisJS 7 + Lucid + Postgres **ou** Fastify + fastify-decorators +
driver mongodb + BullMQ + socket.io + isolated-vm. Frontend React 19 + TanStack Start/Router/Query/Table +
react-hook-form + Zod (VineJS só no backend Adonis) + shadcn (Base UI) + Tailwind v4 + Tiptap + Paraglide. Pacote `shared/` no pnpm
workspace. Vite, Nitro, Vitest/Japa/Playwright. GitHub Actions. Deploy Coolify/Docker.

Fontes: `.claude/skills/*` (projeto, 223), `~/.claude/skills/*` (usuário), plugins em cache (caveman,
context-mode, ponytail, superpowers, engineering, design, figma, anthropic-skills, searchfit-seo).

**Regra de uso:** dispare a skill **mais direcionada e necessária** para a tarefa, uma por momento,
nunca várias "por garantia" (`AGENTS.md`). Skill executa; não decide contra a doc nem contra a régua
(fim desta página, "Quando a skill contradiz a casa").

## Sempre ligadas

Obrigatórias em toda sessão, sem esperar pedido (regra em `AGENTS.md`, "Economia de tokens").

**Na nuvem também.** O container da sessão nasce sem marketplace, e `enabledPlugins` sozinho não
instala plugin de marketplace que a sessão não conhece. Quem liga tudo é o `scripts/cloud-setup.sh`,
colado no "Setup script" do ambiente: marketplaces e plugins (`superpowers`, `claude-code-setup`,
`claude-security`, `context-mode`, `ponytail`, `caveman`, `browser-harness`) em escopo de usuário, o binário
global do `context-mode`, o MCP do `code-review-graph` e o rtk. Na entrada da sessão, conferir com
`claude plugin list`; o que faltar aparece como `AVISO:` no log do setup e quase sempre é host
bloqueado na rede (lista no topo do script). O grafo do `code-review-graph` se constrói por
repositório, uma vez por sessão: `code-review-graph build` na raiz do projeto.

- **caveman** (modo de comunicação): corta tokens de saída em toda resposta. Texto versionado (commit,
  doc, PR) sai em prosa normal.
- **ponytail**: escada antes de qualquer código: precisa existir? já tem no projeto? stdlib, plataforma
  ou dependência instalada resolve? Só então o mínimo.
- **rtk** (CLI): proxy de shell que compacta saída (`rtk git`, `rtk gh`, `rtk pnpm`, `rtk test`,
  `rtk vitest`, `rtk grep`, `rtk find`, `rtk diff`, `rtk log`, `rtk err`). `rtk gain` mostra a economia.
  Repositório `rtk-ai/rtk` (o README avisa que existe **outro** projeto chamado `rtk` no crates.io:
  `cargo install rtk` instala o errado). Instalação: `brew install rtk` ou o `install.sh` do
  repositório; depois `rtk init -g`, que liga o hook do Claude Code. Edição `rtk` (Apache-2.0 + BUSL-1.1,
  com o motor de compressão) ou `rtk-oss` (só Apache-2.0, sem o motor); as duas instalam o mesmo
  binário e não convivem. Máquina sem `rtk` (container de sessão na nuvem, CI): o comando roda cru,
  com a saída cortada no próprio comando (`--stat`, `-n`, `| head`) ou processada pelo `context-mode`;
  nunca despejada inteira na conversa.
  Sessão na nuvem: `scripts/cloud-setup.sh` vai no "Setup script" do ambiente e instala o rtk a cada
  sessão nova; os hosts que a rede precisa liberar estão no topo do arquivo.
- **context-mode** (`ctx_batch_execute`/`ctx_search`/`ctx_execute`): processa dado fora da conversa; só
  o resultado entra no contexto.
- **code-review-graph** (MCP): grafo estrutural; acha chamadores, dependentes e testes antes de editar.
- **code-pattern**: estilo TS/React e commit da casa (sem ternário, `any`, `as`, `!`, `interface`;
  `Merge`; lookup `satisfies Record`; função com casa e sem verificação de tipo; inglês; commit pt-BR
  com autor único). Vale para toda linha de TS/TSX e todo commit.
- **maiyu-standards**: ordem de consulta (`_standards/`, `_doc-lib` + página oficial, tipo instalado,
  código vizinho) antes de qualquer decisão. É o roteiro que `maiyu-backend`, `maiyu-frontend` e
  `maiyu-docs` pressupõem.

## Por momento — skills de processo

Obrigatórias quando o momento chega, e só então (regra e etapas em `AGENTS.md`, "Fluxo de uma
tarefa").

| Momento (etapa) | Skill | Apoio, só no caso dito |
|---|---|---|
| ideia vaga (1) | `superpowers:brainstorming` | `grilling` estressa ideia já formada; `the-fool` faz pré-mortem |
| feature nova (1, 3) | `tlc-spec-driven` | `tlc-prd` antes, quando o problema e o escopo ainda não estão decididos (grava em `docs/PRD.md`); `tlc-discover` (veredito em aberto); `tlc-spec-lean` só se o `AGENTS.md` do projeto declarar |
| escolha difícil de desfazer (1→8) | `the-jury` | `create-rfc` quando várias partes opinam; registro é linha em `docs/DECISIONS.md` |
| plano de trabalho não-feature (3) | `superpowers:writing-plans` | `tlc-plan` corta PRD/design já decidido; `legacy-migration-planner` para migrar camada (model direto → repository) |
| executar plano (4) | `superpowers:executing-plans` / `superpowers:subagent-driven-development` | `tlc-implement` executa checklist com verificador |
| paralelizar (4) | `superpowers:dispatching-parallel-agents` | `superpowers:using-git-worktrees` para isolar |
| código de produção (4) | `superpowers:test-driven-development` | `engineering:testing-strategy` para decidir nível e borda do teste |
| bug, teste falhando (5) | `superpowers:systematic-debugging` → `surgical-patch` | `diagnosing-bugs` (bug difícil ou regressão de performance), `gh-fix-ci` (CI), `chrome-devtools` (página viva) |
| antes de concluir (6) | `superpowers:verification-before-completion` | `verify-and-stop` quando o pedido é só verificar |
| revisão (7) | `superpowers:requesting-code-review` · `code-review` | `engineering:code-review` (checklist de injeção, SSRF, path traversal, N+1, consulta sem limite); `the-judge` só para postar review em PR real |
| entrar no projeto (0) | `claude-code-setup` (`claude-automation-recommender`) | só leitura; recomendação que contradiz a régua (pasta fora da árvore, `docs/adr/`, formatter diferente) é descartada |
| auditoria dos cinco fundamentos (0, antes de plano grande) | `maiyu-audit` | só leitura e só roteiro: cada fundamento chama a skill que já existe (`superpowers:test-driven-development`, `security-audit`, `maiyu-backend`, `safe-refactor`), nessa ordem (`DECISIONS.md` #242) |
| varredura de segurança (0, 7) | `claude-security` (`/claude-security`) | "Scan codebase" ao entrar no projeto; "Scan changes" em `high` no diff de borda; "Suggest patches" para corrigir (`tooling.md` §10.4) |
| revisão de segurança (7) | `security-best-practices` | `security-threat-model` (conteúdo de `docs/SECURITY.md` §2); `security-audit` em modo guia para revisar um fluxo de borda por classe de ataque |
| auditoria completa de segurança, sob pedido | `security-audit` (modo completo) | só quando o dono pede auditoria ou pentest do código inteiro; relatório fora do repositório (`~/security-audit-skill/<repo>/run-N`), e o que for confirmado vira item em `_findings/<projeto>.md` e linha em `docs/SECURITY.md`, nunca `REPORT.md` no projeto |
| revisão de UI (7) | `web-design-guidelines` (achado em `arquivo:linha`) | `design:accessibility-review` (WCAG AA), `impeccable` para corrigir |
| antes de deploy (8) | `engineering:deploy-checklist` | migration testada, rollback e gatilho decididos antes |
| fim da branch (8) | `superpowers:finishing-a-development-branch` | `resolving-merge-conflicts` em conflito |
| prosa para humano (8) | `humanizer` | `docs-writer` para estrutura; regra de escrita do `CLAUDE.md` do projeto vence |
| UI: criar, polir | `impeccable` | `design-taste-frontend` (direção visual), `design:ux-copy` (microcopy de erro e botão) |
| identidade visual de projeto novo, a partir de referência (1, 4) | `design-dna` | extrai token, estilo e efeito de site de referência para o `docs/DESIGN.md`; referência é inspiração, nunca cópia de marca alheia |
| movimento e microinteração (4) | `motion-design` (princípios: tempo, easing, coreografia) | `genjutsu:cast` para propor e implementar o movimento numa UI pronta; CSS nativo primeiro (`genjutsu` módulo `css-native`), biblioteca só com entrada na `_doc-lib` |
| navegador | navegador embutido, `browser-harness` | `chrome-devtools` para depurar; `agent-browser` (CLI) quando o agente precisa dirigir a página fora da sessão; `playwright-skill` só para explorar (teste é `e2e/*.spec.ts`) |
| QA exploratório antes de entregar (6) | `agent-browser:dogfood` | relatório de bug vira linha em `docs/TASKS.md`; o teste que prova a correção é `e2e/*.spec.ts` |
| auditar suíte de teste (6) | `gstack:test-audit` | acha teste de baixo valor ou duplicado e o código que só ele mantém vivo; remoção segue `superpowers:test-driven-development` |
| achar skill que não está no mapa | `find-skills` | só descobre; instalar é decisão do dono e entra neste mapa antes do uso |

## Por tarefa

| Tarefa | Skill principal | Apoio |
|---|---|---|
| Endpoint backend (Adonis/Fastify) | `maiyu-backend` | `api-and-interface-design`, `security-best-practices` |
| Runtime Node no backend (erro, timeout, stream, contexto, desligamento, crypto, processo filho) | `maiyu-node` | `maiyu-backend`, `security-best-practices` |
| Tipo (payload, resposta, união, enum, lookup, genérico, tsconfig) | `maiyu-typescript` | `code-pattern` (forma), `typescript-advanced-types` |
| Entidade, value object, repository | `maiyu-backend` | `tactical-ddd` (agregado, invariante), `codebase-design` (seam, profundidade do módulo) |
| Tela, rota, loader, query (TanStack Start) | `maiyu-frontend` | `react-data-fetching`, `server-side-rendering` |
| Formulário (react-hook-form + `zodResolver` com o Zod de `shared/`) | `maiyu-frontend` | `web-accessibility`, `design:ux-copy` |
| Dialog / AlertDialog | `dialog-pattern` | `maiyu-frontend` |
| Sheet (painel lateral) | `sheet-pattern` | `maiyu-frontend` |
| Componente da casa (compound) | `maiyu-frontend` | `compound-pattern`, `react-composition-patterns` |
| Tabela (TanStack Table) | `maiyu-frontend` | `virtual-lists` (lista grande) |
| Docs do projeto (`AGENTS.md`, `docs/`) | `maiyu-docs` | `humanizer`, `security-threat-model` (SECURITY) |
| Bug | `superpowers:systematic-debugging` → `surgical-patch` | `diagnosing-bugs` |
| Refactor | `safe-refactor` | `codebase-design`, `legacy-migration-planner` (troca de camada por Branch by Abstraction) |
| Testes (Vitest/Japa/Playwright) | `superpowers:test-driven-development` | `engineering:testing-strategy`, `playwright-skill` (config e asserção web-first; o fluxo de script em `/tmp` é só exploração) |
| Performance web | `core-web-vitals` | `react-best-practices` (ignore Next/RSC/server actions), `perf-web-optimization`, `react-render-optimization` |
| Acessibilidade | `web-accessibility` | `design:accessibility-review` |
| Segurança | `security-best-practices` | `security-threat-model`, `security-ownership-map`, `security-audit` |
| Design de UI | `impeccable` | `design-taste-frontend`, `web-design-guidelines` |
| Arquitetura e decomposição | `codebase-design` | `tactical-ddd`, `domain-modeling` (linguagem do domínio em `docs/ARCHITECTURE.md` §4.1), `modular-decomposition`, `coupling-analysis` |
| Design doc de feature | `create-technical-design-doc` | só rollback e segurança entram; o resto é `.specs/features/<f>/design.md` |
| Decisão (registro) | `the-jury` | `the-fool`, `create-rfc`; ADR é linha em `docs/DECISIONS.md`, nunca `docs/adr/` |
| Commit / PR | `caveman-commit` | `gh-address-comments`; regras em `code-pattern` §9 |
| CI (GitHub Actions) | `gh-fix-ci` | `setup-pre-commit` |
| Deploy | `engineering:deploy-checklist` | — |
| Criar skill/agente | `skill-architect` | `superpowers:writing-skills`, `subagent-creator` |

## Por biblioteca — disparo a partir da doc

A doc da lib é o contrato; a skill é quem executa. Tocou numa lib, abra a entrada em
`_doc-lib/<lib>.md` e a página oficial dela, **e** dispare a skill da linha. Se as duas divergirem, a
doc vence.

| Lib (`_doc-lib/`) | Skills |
|---|---|
| `adonisjs`, `lucid`, `flydrive` | `maiyu-backend`, `security-best-practices` |
| `vinejs` (só backend Adonis, `DECISIONS.md` #241) | `maiyu-backend`, `security-best-practices` |
| `zod` (frontend, `shared/`, backend Fastify; `DECISIONS.md` #241) | `maiyu-frontend`, `maiyu-backend`, `maiyu-typescript` |
| `fastify`, `fastify-decorators`, `fastify-plugins` | `maiyu-backend`, `solid-principles`, `security-best-practices` |
| `mongodb` | `maiyu-backend`, `tactical-ddd` (só em modelagem de agregado) |
| `bullmq`, `socket-io` | `maiyu-backend`, `observability-and-instrumentation` |
| `isolated-vm` | `maiyu-backend`, `security-best-practices` |
| `tanstack-query` | `maiyu-frontend`, `react-data-fetching` |
| `tanstack-router`, `tanstack-start` | `maiyu-frontend`, `server-side-rendering`, `streaming-ssr` |
| `tanstack-table` | `maiyu-frontend`, `virtual-lists` (lista grande) |
| `tanstack-store` | `maiyu-frontend`, `react-render-optimization` |
| `react-hook-form`, `use-mask-input` | `maiyu-frontend`, `web-accessibility` |
| `shadcn`, `base-ui` | `maiyu-frontend`, `dialog-pattern`, `sheet-pattern`, `compound-pattern`, `web-accessibility` |
| `tailwindcss` | `impeccable`, `frontend-design` |
| `tiptap` | `maiyu-frontend`, `compound-pattern` |
| `vitejs`, `nitro` | `vite-bundle-optimization`, `perf-web-optimization` |
| `eslint` | `code-pattern`, `maiyu-backend`, `maiyu-frontend`, `web-accessibility` |
| `commitlint` | `caveman-commit`, `code-pattern`, `setup-pre-commit`, `git-guardrails-claude-code` |
| `pnpm` | `maiyu-standards`, `gh-fix-ci` |
| `dependency-cruiser` | `maiyu-backend`, `setup-ts-deep-modules`, `coupling-analysis` |
| `dnd-kit` | `maiyu-frontend`, `web-accessibility`, `playwright-skill` |
| `japa` | `maiyu-backend`, `superpowers:test-driven-development` |
| `paraglide` | `maiyu-frontend`, `web-accessibility`, `searchfit-seo:technical-seo` |
| `typescript` | `maiyu-typescript`, `code-pattern`, `maiyu-standards`, `maiyu-backend`, `maiyu-frontend`; `migrate-to-shoehorn` só para `fromPartial` em teste |
| `nodejs` | `maiyu-node`, `maiyu-backend`, `security-best-practices` |
| `phosphor` | `maiyu-frontend`, `web-accessibility`, `impeccable` |
| `playwright` | `playwright-skill`, `maiyu-frontend`, `superpowers:test-driven-development`, `web-accessibility`, `chrome-devtools` |
| `recharts` | `maiyu-frontend`, `dataviz`, `web-accessibility`, `impeccable` |
| `tuyau` | `maiyu-frontend`, `maiyu-backend`; `the-jury` antes de adotar (decisão de arquitetura) |
| `luxon` | `maiyu-backend`, `maiyu-frontend`, `superpowers:test-driven-development` (`Settings.now` como relógio fixo) |
| `motion` | `motion-design`, `genjutsu:cast` (módulo `framer-motion`), `web-accessibility` |
| `vitest` | `superpowers:test-driven-development`; E2E: `playwright-skill` |
| `_standards/openapi.md` | `api-and-interface-design` |
| versão nova de qualquer lib | `migration` (expandir, migrar, verificar, contrair) |

## Sobrepostas e duplicadas — qual usar

**Duplicadas** (mesmo conteúdo instalado duas vezes; só `.skill-meta.json` difere). Use a primeira,
ignore a segunda:

| Use | Não use | Por quê |
|---|---|---|
| `best-practices` | `web-best-practices` | cópia byte a byte |
| `web-accessibility` | `accessibility` | cópia byte a byte; o nome descreve o escopo (web) |
| `create-technical-design-doc` | `technical-design-doc-creator` | cópia byte a byte |
| `superpowers:test-driven-development` | `tdd` | o fluxo do `AGENTS.md` cita a do superpowers; `tdd` é versão curta |
| `solid-principles` | `solid` | detecta e corrige violação, não só define |
| `safe-refactor` | `refactor-safely` | escopo mais claro, verificação antes e depois |

Também duplicadas entre `.claude/skills` e `~/.claude/skills` (mesma skill visível duas vezes):
`implement-spec`, `to-spec`, `to-tickets`, `to-questionnaire`, `triage`, `code-review`,
`codebase-design`, `domain-modeling`, `improve-codebase-architecture`, `design-taste-frontend`,
`design-taste-frontend-v1`, `minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`,
`web-design-guidelines`, `tdd`, `diagnosing-bugs`, `investigate-first`, `surgical-patch`, `safe-refactor`.

**Sobrepostas** (assunto comum, recorte diferente):

- **Debug**: a etapa 5 do `AGENTS.md` manda: `superpowers:systematic-debugging` acha a causa,
  `surgical-patch` corrige na camada dona com teste de regressão vermelho antes. `diagnosing-bugs` só
  em bug difícil ou regressão de performance. `investigate-first`, `debugging-and-error-recovery` e
  `debug-issue` são o mesmo loop de hipótese por evidência: não carregue junto com a principal.
- **Revisão de código**: `code-review` para branch/diff local (régua × spec lado a lado);
  `engineering:code-review` só como checklist de segurança e performance; `the-judge` só para postar
  review formal via `gh` num PR real; `caveman-review` para passada curta (achado em `arquivo:linha`).
  `code-review-and-quality` é redundante.
- **Taste/design visual**: `design-taste-frontend` (v2, audit-first) é a direção; `minimalist-ui`,
  `industrial-brutalist-ui`, `high-end-visual-design`, `stitch-design-taste`, `gpt-taste` são presets
  pontuais; `design-taste-frontend-v1` só se algo depender do comportamento antigo. Identidade visual
  é do projeto (`AGENTS.md`).
- **Acessibilidade**: `web-accessibility` ensina e corrige; `design:accessibility-review` audita
  (WCAG AA). Teclado, foco preso e `role` de Dialog/menu são do Base UI: não reimplementar.
- **Performance**: `core-web-vitals` para LCP/INP/CLS, `perf-web-optimization` para bundle e cache,
  `perf-lighthouse` só para medir; `performance-optimization` quando o problema cruza front, back e
  banco.
- **Criar skill/agente**: `skill-architect` desenha skill nova da casa; `superpowers:writing-skills`
  edita e verifica uma existente; `skill-creator` (anthropics/skills) só para medir a skill com
  eval (casos de disparo e de não disparo), não para escrever.
- **Mapa do código**: `code-review-graph` (sempre ligada) acha chamador, dependente e teste;
  `graphify` só quando a pergunta cruza código **e** doc, PDF ou imagem do projeto. Os dois juntos na
  mesma tarefa é custo dobrado.
- **Fluxo completo**: `gstack` (spec, review, ship, qa, retro) repete o fluxo do `AGENTS.md`. Da suíte
  só entram as peças sem par na casa: `test-audit`, `benchmark` (regressão de performance web,
  `frontend.md` §9.8), `retro`, `freeze` (trava a edição numa pasta). `gstack:ship`,
  `gstack:spec` e `gstack:review` não: o fluxo é `superpowers` + `tlc-spec-driven` + `code-review`.
- **Movimento**: `motion-design` (LottieFiles) dá o princípio; `genjutsu:cast` aplica numa tela
  existente. `genjutsu:paint` e `genjutsu:bunshin` repetem `impeccable` + `design-taste-frontend` (e o
  `bunshin` sobe um time de subagentes para o site inteiro): não entram. Os submódulos de biblioteca
  do `genjutsu` (`gsap`, `threejs-r3f`) seguem a regra de GSAP abaixo; o `framer-motion` vale com
  `_doc-lib/motion.md`; o
  `ui-ux-pro-max` embutido nele é o mesmo da seção UI/UX.
- **UI/UX**: `impeccable` corrige, `design-taste-frontend` dá a direção; `ui-ux-pro-max` só como
  consulta de paleta, par de fontes e regra de UX para escrever o `docs/DESIGN.md` do projeto.

## Quando a skill contradiz a casa

A skill perde. Os casos já vistos:

| Skill diz | A casa faz |
|---|---|
| `playwright-skill`: `data-testid` primeiro, `waitForTimeout`, `networkidle`, script em `/tmp` | papel + nome acessível primeiro; sem espera fixa; teste em `frontend/e2e/*.spec.ts` |
| `tlc-prd`: grava `.prd/<slug>.md` | o PRD é `docs/PRD.md` (`documentation.md` §1): a skill aceita o caminho que o dono indicar, e o agente indica esse |
| `tlc-*`: `.specs/STATE.md` com decisões e `.specs/lessons.json` com lições | decisão vira linha de `docs/DECISIONS.md` e lição vira linha em "Lições" de `docs/MEMORY.md`; `.specs/features/<f>/` (spec, design, tasks, `plan.md`) fica, é o artefato permitido (`documentation.md`) |
| `tlc-implement`/`tlc-spec-*`: `mutate.py` grava `tlc-mutation-journal.json` | já fica dentro da pasta do Git (`git rev-parse --absolute-git-dir`), fora do commit; nada a fazer |
| `create-adr`, `engineering:architecture`, `domain-modeling`: arquivo por ADR, `CONTEXT.md` | linha em `docs/DECISIONS.md`; glossário em `docs/ARCHITECTURE.md` §4.1 (`documentation.md` §1) |
| `security-threat-model`: `<repo>-threat-model.md` solto | conteúdo dentro de `docs/SECURITY.md` §2 |
| `caveman-commit`, `tlc-*`, `triage`, sessão do agente: atribuição de IA, `Co-Authored-By` | autor único, sem coautoria nem marca de agente (`code-pattern` §9) |
| `caveman-review`, `design:accessibility-review`: emoji de severidade | severidade por palavra (`bug`, `risco`, `nit`, `pergunta`), sem emoji |
| `humanizer`: mantém travessão | regra de escrita do `CLAUDE.md` do projeto vence |
| `react-*`, `compound-pattern`: ternário, `X.Part`, `useContext`, `forwardRef`, `ensureQueryData` | `frontend.md` e `code-pattern` |
| `create-technical-design-doc`: Jest com mock, cobertura > 80%, `throw` | Vitest/Japa, dublê só na fronteira, `left(HTTPException)` |
| skill que escreve em inglês dos EUA (`docs-writer`, `the-judge`) | doc e review do projeto em pt-BR (`typescript.md` §12) |
| `ui-ux-pro-max:ui-styling`: shadcn sobre Radix UI | shadcn sobre Base UI (`frontend.md` §6); a regra visual vale, o componente não |
| `gstack:ship`: sobe `VERSION`, escreve `CHANGELOG` e abre PR sozinho | entrega pelo `superpowers:finishing-a-development-branch`; `CHANGELOG` segue `documentation.md` §5 |
| `find-skills`: instala a skill achada | instala só com aprovação do dono e linha neste mapa |
| `genjutsu`, `motion-design`: escolhem a biblioteca de animação (GSAP, Motion, Lottie, Three.js) | CSS nativo e o `data-[state]` do Base UI primeiro (`frontend.md` §6, §10); biblioteca nova só com `_doc-lib/<lib>.md` e decisão do projeto; `prefers-reduced-motion` por componente, nunca o "kill global" |
| `design-dna`: "copiar qualquer estilo de UI" | extrai princípio e token; logo, marca, texto e imagem de terceiro não entram |

## Fora da stack

Ficam instaladas e só entram quando a tarefa é de fato desse assunto (SEO de site público, deploy num
vendor escolhido para aquele projeto). Nunca por garantia.

- **GTM/vendas/outreach**: ai-cold-outreach, ai-sdr, ai-pricing, ai-ugc-ads, gtm-engineering, gtm-metrics,
  sales-motion-design, social-selling, partner-affiliate, positioning-icp, solo-founder-gtm,
  lead-enrichment, expansion-retention, content-to-pipeline, paid-creative-ai, video-outreach
- **SEO/marketing técnico**: ai-seo, seo, tlc-generative-engine-optimization (técnico de vitrine pública:
  `searchfit-seo:technical-seo`, `searchfit-seo:schema-markup`)
- **Frameworks/plataformas não usados**: nestjs-modular-monolith, evolutionary-modular-architecture
  (empurra Nx/NestJS), rails-dev, shopify-developer, perf-astro, react-server-components (RSC não existe
  em TanStack Start)
- **Mobile/nativo**: react-native-expert, mobile-native, animate-expo, write-swift
- **Nx**: nx-generate, nx-run-tasks, nx-workspace, nx-ci-monitor
- **Deploy de vendor não escolhido**: cloudflare-deploy, netlify-deploy, render-deploy, vercel-deploy,
  aws-advisor
- **PM de vendor**: jira-assistant, confluence-assistant
- **Vídeo**: `hyperframes` (vídeo de HTML: `changelog-video`, `pr-to-video`, `product-launch-video`) e
  `remotion-*` (vídeo em React). Só para peça de divulgação, em repositório próprio, nunca dentro do
  frontend do produto.
- **Animação**: `gsap-*` (oficiais da GreenSock). GSAP não está na `_doc-lib`; projeto que o adotar
  cria `_doc-lib/gsap.md` antes (`AGENTS.md`, "Autoridade") e então `gsap-react` entra em
  "Por biblioteca".
- **Pesquisa e conteúdo**: `last30days` (o que se fala de um assunto nos últimos 30 dias),
  `marketingskills` (coreyhaines31, 50 skills: copy, SEO, CRO, e-mail, `social`), `brandkit`.

## Pacotes externos avaliados (2026-10-14)

Lista "22 skills para instalar no Claude" trazida pelo dono. Cada nome conferido no repositório de
origem antes de entrar aqui; onde a lista citou o nome errado, vale o real.

| Na lista | Real (repositório) | Onde ficou |
|---|---|---|
| superpowers | `obra/superpowers` | plugin obrigatório (`AGENTS.md`), etapas 1–8 |
| gttack | `garrytan/gstack` | sobreposta: só `test-audit`, `benchmark`, `retro`, `freeze` |
| caveman | `JuliusBrussee/caveman` | sempre ligada |
| pentiall | provavelmente `ponytail` | sempre ligada (não confirmado pelo nome da lista) |
| coder, t-hunt-and | não identificados | fora até o dono indicar o repositório |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | sobreposta: consulta para `docs/DESIGN.md`; Radix contradiz |
| taste-skill | `Leonxlnx/taste-skill` | já instalada (`design-taste-frontend` e presets) |
| impeccable | `pbakaus/impeccable` | já instalada, UI |
| hyperframe | `heygen-com/hyperframes` | fora da stack, vídeo |
| well | não identificado | fora até o dono indicar o repositório |
| gsp | `greensock/gsap-skills` | fora da stack até existir `_doc-lib/gsap.md` |
| skill-creator | `anthropics/skills` | sobreposta: eval de skill |
| graphity | `safishamsi/graphify` | sobreposta com `code-review-graph` |
| last42days | `mvanhorn/last30days-skill` | fora da stack, pesquisa |
| agent-browser | `vercel-labs/agent-browser` | navegador (apoio) e `dogfood` (etapa 6) |
| find-skills | `vercel-labs/skills` | descobrir skill; instalar passa pelo dono |
| claude-hub | não identificado | fora até o dono indicar o repositório |
| reaction | `remotion-dev/skills` (vídeo em React) | fora da stack, vídeo |
| marketingkit116 | `coreyhaines31/marketingskills` | fora da stack, marketing |
| humanizer | `blader/humanizer` | já instalada, etapa 8 |
| social-media-skills | `marketingskills:social` | fora da stack, marketing |

Segunda lista ("5 skills do Claude Code pra quem faz design"):

| Na lista | Real (repositório) | Onde ficou |
|---|---|---|
| GSAP | `greensock/gsap-skills` | fora da stack até existir `_doc-lib/gsap.md` (já avaliada acima) |
| Design DNA | `zanwei/design-dna` | identidade visual de projeto novo, para o `docs/DESIGN.md` |
| Motion Design | `LottieFiles/motion-design-skill` | princípio de movimento (etapa 4); Lottie só com entrada na `_doc-lib` |
| Genjutsu | `AThevon/genjutsu` | `cast` para movimento em UI pronta; `paint` e `bunshin` sobrepostas |

Terceira lista (ranking "Top 10 Fastest Growing Claude Skills", set/2026):

| Na lista | Real (repositório) | Onde ficou |
|---|---|---|
| Ponytail | já instalada | sempre ligada |
| Matt Pocock Skills | `mattpocock/skills` | já instaladas as que a casa usa (`grilling`, `tdd`, `diagnosing-bugs`, `code-review`, `codebase-design`, `domain-modeling`, `setup-pre-commit`, `git-guardrails-claude-code`, `prototype`, `wizard`, `research`); entram também `setup-ts-deep-modules` (dependency-cruiser por camada, `domain.md` §8) e `handoff` (só quando a sessão passa a outro agente; o estado durável continua no `docs/MEMORY.md`). `to-spec`, `to-tickets`, `triage`, `wayfinder` publicam em issue tracker e repetem `tlc-spec-driven` + `docs/TASKS.md`: não entram |
| I Have ADHD | **não identificado** | o repositório `i-have-adhd/i-have-adhd` é um placeholder de pesquisa de segurança, sem código, que avisa que a referência de quem mandou instalar estava errada. Fora |
| Security Audit Skill | `tech-leads-club/agent-skills` | `cebf9d4` | MIT (o `SKILL.md` declara CC-BY-4.0) | 2026-10-31: `tlc-implement`, `tlc-plan`, `tlc-spec-driven` e `tlc-spec-lean` trocadas; `tlc-prd` nova; `tlc-discover` e `tlc-generative-engine-optimization` já iguais |
| `cloudflare/security-audit-skill` | instalada em 2026-10-26 (`c1c8a8c`, MIT) como `security-audit`: guia por classe de ataque e auditoria completa sob pedido; a varredura de rotina continua sendo `claude-security` |
| Superpowers | `obra/superpowers` | plugin obrigatório |
| Diagram Design | não identificado | fora; diagrama da casa é `mermaid-studio` ou `excalidraw-studio` |
| Humanizer | `blader/humanizer` | etapa 8 |
| Graphify | `safishamsi/graphify` | sobreposta com `code-review-graph` (já avaliada) |
| Addy Osmani Skills | `addyosmani/agent-skills` | instaladas em 2026-10-19 (`aeac41d`): `api-and-interface-design`, `observability-and-instrumentation`, `performance-optimization`, `incremental-implementation` (etapa 4, fatia fina verificável) e `constraint-driven-development` (ao entrar no projeto, para escrever a régua de qualidade dele no `docs/RULES.md`). `source-driven-development` é o que `maiyu-standards` já faz com a `_doc-lib`; `doubt-driven-development` repete `the-fool`; `spec-driven-development` e `planning-and-task-breakdown` repetem `tlc-spec-driven`; `documentation-and-adrs` contradiz o conjunto fechado de docs |
| Impeccable | `pbakaus/impeccable` | UI |

**Nome não é identidade.** Skill entra pelo repositório exato (dono/nome) conferido, nunca pelo nome
que um post, ranking ou outro agente citou. Nome popular sem repositório confirmado é o caso típico
de pacote-armadilha: um repositório com o nome "certo" pode não ser o projeto, e o `i-have-adhd`
acima é exatamente isso.

Nenhuma é copiada para os projetos pelo sync: o projeto instala a que usa, e a skill instalada que
não está neste mapa não é disparada.

## Externas de React, TypeScript e Node (2026-10-16)

Candidatas de `wshobson/agents`, `jezweb/claude-skills` e `sickn33/antigravity-awesome-skills`
(todas MIT), lidas por inteiro antes de entrar. Cada SKILL.md instalado leva no topo a origem, o sha
e onde a régua vence.

| Skill | Origem | Quando usar na casa | O que a régua contradiz |
|---|---|---|---|
| `typescript-advanced-types` | `wshobson/agents@044b4b2` | etapa 4, tipo de nível alto: genérico com restrição, tipo condicional e `infer`, mapped type com remapeamento de chave, template literal, teste de tipo | `interface` e `&` (`typescript.md` §8); `any`, `as any`, `!` nos exemplos (§1); função solta e ternário em runtime (§6, §13); `throw` em assertion de regra (§5) |
| `javascript-testing-patterns` | `wshobson/agents@044b4b2` | etapa 4 com `superpowers:test-driven-development`: API do Vitest e do Testing Library (`renderHook`, `act`, timers falsos, fábrica de fixture) no unitário de Fastify, `shared/` e frontend | Jest e nomes de arquivo (`architecture.md` §8); `vi.mock` de módulo e `fetch` global no lugar de fake injetado; `as any` em vez de `fromPartial()` (`typescript.md` §1); `toThrow` de falha de negócio em vez do ramo do `Either` (`backend.md` §4.2); `data-testid` primeiro e meta de 80% (`frontend.md` §11, `DECISIONS.md` #40) |

Recusadas:

- `nodejs-backend-patterns` (wshobson): Express, `throw` de erro de negócio,
  contêiner de DI feito à mão com `new`; `maiyu-backend` e `backend-fastify.md` cobrem.
- `modern-javascript-patterns` (wshobson): JavaScript sem tipo, cadeia `.then`, função solta e
  ternário; `code-pattern` e `typescript.md` cobrem o que serve.
- `react-state-management` (wshobson): Redux, Zustand e Jotai como store global; contradiz
  `frontend.md` §2 (estado do servidor no Query, filtro na URL, sem store).
- `react-modernization` (wshobson): roda codemod baixado na hora (`npx jscodeshift -t https://raw...`);
  além disso, trata de classe e React 16 a 18, e a casa já está no 19.
- `api-design-principles` (wshobson): exemplos em Python (FastAPI) e GraphQL; `openapi.md`,
  `backend.md` §4.5 e `api-and-interface-design` cobrem REST.
- `architecture-patterns` (wshobson): exemplos todos em Python; `tactical-ddd`, `domain-modeling` e
  `domain.md` cobrem.
- `react-patterns` (jezweb): repete `react-best-practices` e `react-composition-patterns`, e manda
  ternário, `lucide-react`, Radix e Cloudflare (`tooling.md` §0.1, `frontend.md` §6).
- `typescript-expert` (sickn33): repete `typescript-advanced-types`; empurra `interface`, Biome, Nx e
  alias `paths`; sugere `npx ts-migrate`/`npx typesync`, que baixam pacote; `scripts/` em Python
  executa `tsc` por subprocesso.
- `typescript-pro`, `javascript-pro` (sickn33): só persona, sem conteúdo próprio.
- `nodejs-best-practices` (sickn33): escolha de framework que a casa já fixou, Yup, `throw` de
  qualquer camada.
- `error-handling-patterns` (sickn33): cópia de `wshobson/agents` (`developer-essentials`), com
  Python, Rust e Go; `typescript.md` §5 e `backend.md` §4.2 (`Either`) cobrem.
- `react-patterns` (sickn33): container, HOC, store global, Server Components; contradiz
  `frontend.md` §2 e §6.3.
- `react-ui-patterns` (sickn33): Apollo, Formik e `FlatList` (React Native), mostra `error.message`;
  `frontend.md` §5 cobre carregamento e erro, e a UI compara `code` (`typescript.md` §5).
- `react-component-performance` (sickn33): cópia de `Dimillian/Skills`; `react-render-optimization`
  cobre.
- `vitest-skill` (sickn33): rasa, aponta para um `reference/playbook.md` que não veio, comandos em
  `npx`; `javascript-testing-patterns` cobre.

## Restantes alocadas (2026-10-16)

As 90 skills de `.claude/skills/` que ainda não tinham lugar neste mapa. Toda skill instalada tem
destino: um momento, uma tarefa, sobreposta a outra, contrária à casa ou fora da stack. Skill sem
linha aqui não se dispara.

| Grupo | Skills | Destino |
|---|---|---|
| Economia de tokens | `caveman-help`, `caveman-stats`, `caveman-compress`, `cavecrew`, `caveman-explore` | apoio do `caveman` (sempre ligada): `caveman-compress` só para memória/notas próprias, nunca para `AGENTS.md` ou `_standards/` (texto versionado sai em prosa normal); `cavecrew` e `caveman-explore` para delegar busca e edição pequena com relatório curto (`AGENTS.md`, "Subagente") |
| Caveman Cloud | `caveman-setup`, `caveman-discover`, `caveman-evidence-review`, `caveman-learn`, `caveman-manage`, `caveman-optimize` | fora da stack: medem gasto de LLM via gateway do Caveman Cloud; só se o projeto adotar o serviço |
| Entrar no código | `codenavi`, `coding-guidelines`, `not-your-babysitter` | sobrepostas: `codenavi` cria `.notebook/` fora do conjunto de docs (o estado vai para `docs/MEMORY.md`); `coding-guidelines` repete `ponytail` + `code-pattern`; `not-your-babysitter` repete o "Modo de trabalho" do `AGENTS.md`. Não entram |
| Construir com pouco | `lean-build` | apoio de `ponytail` na etapa 4 quando a feature tem risco de sobreconstrução |
| Entrega completa | `full-output-enforcement` | apoio quando a saída precisa sair inteira (arquivo longo gerado); não substitui o plano em fases |
| Padrões de projeto (patterns.dev) | `design-patterns`, `factory-pattern`, `singleton-pattern`, `observer-pattern`, `mediator-pattern`, `command-pattern`, `proxy-pattern`, `module-pattern`, `mixin-pattern`, `prototype-pattern`, `flyweight-pattern` | consulta de vocabulário em `domain.md` §11; a casa decide pela régua: singleton e fábrica são do container de DI (`@inject`), nunca `new` nem instância global; `mixin` e `prototype` não entram (composição e `type`); `observer`/`mediator` só como evento de domínio (`domain.md` §11) |
| Padrões React | `hooks-pattern`, `provider-pattern`, `react-composition-2026`, `render-props-pattern` | apoio de `maiyu-frontend` (`frontend.md` §6.1–§6.3); render prop só onde o Base UI já usa (`render`) |
| Padrões React contrários à casa | `hoc-pattern`, `presentational-container-pattern` | contradizem a casa: HOC e componente-container não entram em código novo (`frontend.md` §6.3) |
| Render e carregamento | `client-side-rendering`, `server-side-rendering`(já mapeada), `streaming-ssr`, `react-selective-hydration`, `progressive-hydration`, `static-rendering`, `view-transitions` | apoio de `frontend.md` §9 (SSR por grupo de rota, streaming); `view-transitions` com `_doc-lib/motion.md#react-animate-view` |
| Render fora da stack | `incremental-static-rendering`, `islands-architecture`, `prpl` | fora da stack: ISR e ilhas são de Next/Astro; TanStack Start resolve por SSR e prerender |
| Bundle e rede | `bundle-splitting`, `route-based`, `dynamic-import`, `static-import`, `tree-shaking`, `import-on-interaction`, `import-on-visibility`, `prefetch`, `preload`, `loading-sequence`, `compression`, `third-party`, `js-performance-patterns` | apoio de `frontend.md` §9.4–§9.10 e de `vite-bundle-optimization`; o code splitting de rota já vem do TanStack Router (`autoCodeSplitting`), não se refaz à mão |
| Auditoria web | `web-quality-audit` | apoio de revisão de vitrine pública (etapa 7), junto de `core-web-vitals` e `web-accessibility` |
| IA na interface | `ai-ui-patterns`, `react-2026` | `ai-ui-patterns` para chat e streaming de IA (lowcodejs), com Markdown pelo Tiptap (`frontend.md` §8); `react-2026` só como leitura, a stack é a da régua |
| Design por imagem | `imagegen-frontend-web`, `imagegen-frontend-mobile`, `image-to-code`, `frontend-blueprint`, `redesign-existing-projects`, `figma-implement-design` | direção visual (etapa 1 de UI) junto de `design-taste-frontend`; o código gerado passa por `frontend.md` §6.4 e `code-pattern`; mobile nativo fora da stack |
| Arquitetura e domínio | `domain-analysis`, `domain-identification-grouping`, `component-common-domain-detection`, `component-flattening-analysis`, `component-identification-sizing`, `decomposition-planning-roadmap`, `modular-design-principles` | apoio de `domain.md` §12 (contextos) e de migração estrutural; decomposição em microsserviço não é objetivo da casa (monólito modular) |
| Matt Pocock (fluxo próprio) | `ask-matt`, `grill-me`, `grill-with-docs`, `loop-me`, `implement`, `wait-what`, `teach`, `setup-matt-pocock-skills`, `claude-handoff` | sobrepostas: `grilling` cobre `grill-me`; `grill-with-docs` cria ADR e glossário fora do conjunto de docs; `implement` repete `tlc-implement`; `setup-matt-pocock-skills` monta issue tracker que a casa não usa; `claude-handoff` só como `handoff`. Disparo manual, nunca automático |
| Escrita | `writing-for-agents`, `writing-fragments`, `writing-beats`, `writing-shape` | `writing-for-agents` ao editar `AGENTS.md`, skills e `_standards/` (com `humanizer`); as outras três só para artigo, fora do código |
| Avaliação | `harness-eval`, `spec-driven-eval` | `harness-eval` ao revisar `AGENTS.md`/skills da casa (caminho quebrado, regra duplicada); `spec-driven-eval` ao fechar uma spec do `tlc-spec-driven` |
| Ensino | `learning-opportunities`, `scaffold-exercises` | só para material de aula (academy), fora do código de produto |
| Observabilidade | `sentry` | só em projeto que adotar Sentry (`docs/DECISIONS.md` do projeto) |
| Outros | `cursor-subagent-creator`, `multi-platform-launch` | fora da stack (Cursor; lançamento de produto) |

## Origem e versão das externas (2026-10-19)

Cópia em `.claude/skills/` trocada inteira pelo commit abaixo, sem edição local (o histórico não tinha
nenhuma desde a instalação). Para atualizar de novo: clonar o repositório, conferir se a cópia local
segue sem edição (`git log -- .claude/skills/<nome>`) e trocar a pasta. Edição local, quando houver,
vai para a seção "Quando a skill contradiz a casa", e não para dentro da cópia.

| Repositório | Commit | Licença | O que veio |
|---|---|---|---|
| `mattpocock/skills` | `49dd158` | MIT | 18 trocadas; `domain-modeling` passou de `CONTEXT-FORMAT.md` para `GLOSSARY-FORMAT.md` (v1.3), e o glossário continua no conjunto fechado de `docs/` |
| `pbakaus/impeccable` | `0665bd8` | Apache-2.0 | `impeccable` (cópia de `.claude/skills/`) |
| `JuliusBrussee/caveman` | `bad48a0` | Apache-2.0 / MIT | 6 trocadas (`caveman`, `cavecrew`, `caveman-compress`, `caveman-help`, `caveman-learn`, `caveman-stats`) |
| `Leonxlnx/taste-skill` | `a9c73c3` | MIT | 12 trocadas; o conteúdo longo saiu do `SKILL.md` para `references/` e `library/` |
| `addyosmani/agent-skills` | `aeac41d` | MIT | 5 novas (acima) |
| `cloudflare/security-audit-skill` | `c1c8a8c` | MIT | `security-audit` (com os validadores `.cjs` e os testes dele, que só usam `fs` e `path`) |
| `mksglu/context-mode` | `6006a35` | **Elastic 2.0** | plugin; uso interno livre, oferecer como serviço hospedado não |
| `obra/superpowers`, `DietrichGebert/ponytail`, `browser-use/browser-harness`, `tirth8205/code-review-graph`, `rtk-ai/rtk` | último do dia | MIT / Apache-2.0 | plugin, MCP ou CLI pelo `scripts/cloud-setup.sh`; não ficam copiados aqui |

Fora: `chief-of-staff`, `pr` (mattpocock), `megacave`/`ultracave` (caveman) e
`design-taste-frontend-v2-experimental` (taste), que são variante ou fluxo pessoal sem lugar na régua.

## Duplicação `.agents/skills`

Removido em 2026-10-11: eram 120 cópias byte a byte de `.claude/skills`, sem conteúdo próprio.
