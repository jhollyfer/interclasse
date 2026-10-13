# Mapa de Skills — maiyu-pattern

Stack: TypeScript em tudo. Backend AdonisJS 7 + Lucid + Postgres **ou** Fastify + fastify-decorators +
driver mongodb + BullMQ + socket.io + isolated-vm. Frontend React 19 + TanStack Start/Router/Query/Table +
react-hook-form + VineJS + shadcn (Base UI) + Tailwind v4 + Tiptap. Vite, Nitro, Vitest/Japa/Playwright.
pnpm. GitHub Actions. Deploy Coolify/Docker.

Fontes: `.claude/skills/*` (projeto, 222), `.agents/skills/*` (projeto, 120 — todas idênticas às do
`.claude/skills` equivalente), `~/.claude/skills/*` (usuário, 120), plugins em cache (caveman,
context-mode, ponytail, superpowers, engineering, design, figma, anthropic-skills, searchfit-seo).

## Sempre ligadas

Obrigatórias em toda sessão, sem esperar pedido (regra em `AGENTS.md`, "Economia de tokens").


- **caveman** (modo de comunicação) — corta tokens de saída em toda resposta; é o padrão de economia de
  contexto da casa, não uma skill pontual.
- **ponytail** — escada antes de qualquer código: precisa existir? já tem no projeto? stdlib, plataforma
  ou dependência instalada resolve? Só então o mínimo. Corta código e, com ele, token de leitura futura.
- **rtk** (CLI) — proxy de shell que compacta saída: `rtk git`, `rtk gh`, `rtk pnpm`, `rtk test`,
  `rtk vitest`, `rtk grep`, `rtk find`, `rtk diff`, `rtk log`, `rtk err`. Use sempre que o comando
  puder despejar saída grande. `rtk gain` mostra a economia.
- **context-mode** (`ctx_batch_execute`/`ctx_search`/`ctx_execute`) — processa e indexa dados fora da
  conversa; só o resultado derivado entra no contexto. Usar antes de ler arquivos grandes ou saída de
  comando.
- **code-review-graph** (MCP, ver `CLAUDE.md`) — grafo estrutural do código; mais barato que grep/Explore
  para achar chamadores, dependentes e cobertura de teste antes de editar.
- **code-pattern** — convenções TS/React e commit da casa (sem `any`, sem `as` fora de `as const`, `type`
  nunca `interface`, async/await, commits atômicos). Vale para toda linha de TS/JS/TSX/JSX escrita.
- **maiyu-padrao** — ordem de consulta obrigatória (`_padroes/`, `_doc-lib.md`, tipos instalados, código
  vizinho) antes de qualquer decisão na stack da casa. É o roteiro que as outras duas (`maiyu-backend`,
  `maiyu-frontend`) pressupõem.

## Por momento — skills de processo

Obrigatórias quando o momento chega, e só então (regra em `AGENTS.md`, "Processo").

| Momento | Skill | Não confundir com |
|---|---|---|
| ideia vaga | `superpowers:brainstorming` | `grilling`/`grill-me` estressam uma ideia já formada |
| feature nova | `tlc-spec-driven` | `tlc-spec-lean` (spec enxuta), `tlc-discover` (só descoberta) |
| plano de trabalho não-feature | `superpowers:writing-plans` | `tlc-plan` corta PRD/design já decidido em tarefas |
| executar plano | `superpowers:executing-plans` / `superpowers:subagent-driven-development` | `tlc-implement` executa checklist com verificador |
| paralelizar | `superpowers:dispatching-parallel-agents` | — |
| isolar trabalho | `superpowers:using-git-worktrees` | — |
| código de produção | `superpowers:test-driven-development` | `tdd` (versão curta, duplicada) |
| bug | `superpowers:systematic-debugging` | `diagnosing-bugs` (perf e bug difícil) |
| antes de concluir | `superpowers:verification-before-completion` | `verify-and-stop` |
| revisão | `superpowers:requesting-code-review`, `superpowers:receiving-code-review` | `code-review` (Standards × Spec), `the-judge` (posta no PR) |
| fim da branch | `superpowers:finishing-a-development-branch` | — |
| decisão | `the-jury` | `the-fool` só critica, não decide |
| UI | `impeccable` | `design-taste-frontend` para direção visual |
| prosa para humano | `humanizer` | — |
| navegador | navegador embutido, `browser-harness` | — |

## Por tarefa

| Tarefa | Skill principal | Apoio |
|---|---|---|
| Nova feature (spec→plan→implement) | `tlc-spec-driven` | `tlc-discover`, `tlc-plan`, `tlc-implement`, `incremental-implementation` |
| Endpoint backend (Adonis/Fastify) | `maiyu-backend` | `api-and-interface-design`, `security-and-hardening` |
| Tela/rota frontend (TanStack Start) | `maiyu-frontend` | `frontend-ui-engineering`, `react-data-fetching` |
| Formulário (react-hook-form + VineJS) | `maiyu-frontend` | `web-accessibility`, `ask-sonner` |
| Tabela (TanStack Table) | `maiyu-frontend` | `virtual-lists`, `react-render-optimization` |
| Bug | `superpowers:systematic-debugging` (achar a causa) → `surgical-patch` (corrigir) | `investigate-first`, `diagnosing-bugs` |
| Refactor | `safe-refactor` | `code-simplification`, `codebase-design` |
| Revisão de PR | `code-review` | `superpowers:requesting-code-review`, `the-judge`, `caveman-review` |
| Testes (Vitest/Japa/Playwright) | `superpowers:test-driven-development` | `tdd`, `playwright-skill` |
| Performance web | `core-web-vitals` | `react-best-practices` (waterfall, bundle, re-render; ignore as regras de Next/RSC/server actions), `perf-web-optimization`, `react-render-optimization` |
| Acessibilidade | `web-accessibility` | `frontend-ui-engineering` |
| Segurança | `security-and-hardening` | `security-best-practices`, `security-threat-model` |
| Design de UI | `impeccable` | `design-taste-frontend`, `frontend-ui-engineering`, `web-design-guidelines` |
| Arquitetura/decomposição | `codebase-design` | `domain-modeling`, `tactical-ddd`, `modular-decomposition` |
| Decisão difícil (ADR/RFC) | `the-jury` | `the-fool`, `create-adr`, `create-rfc` |
| Commit/PR | `caveman-commit` | `pr`, `gh-address-comments` |
| CI (GitHub Actions) | `gh-fix-ci` | `ci-cd-and-automation`, `setup-pre-commit` |
| Docs | `docs-writer` | `humanizer`, `writing-for-agents`, `create-adr` |
| Criar skill/agente | `skill-architect` | `superpowers:writing-skills`, `subagent-creator` |

## Por biblioteca — disparo a partir da doc

A doc da lib é o contrato; a skill é quem executa. Tocou numa lib, abra a entrada em
`_doc-lib/<lib>.md` **e** dispare as skills da linha. A skill nunca substitui a entrada: se as
duas divergirem, a doc vence.

| Lib (`_doc-lib/`) | Skills |
|---|---|
| `adonisjs`, `lucid`, `vinejs`, `flydrive` | `maiyu-backend`, `api-and-interface-design`, `security-best-practices` |
| `fastify`, `fastify-decorators`, `fastify-plugins` | `maiyu-backend`, `solid`, `api-and-interface-design`, `security-best-practices` |
| `mongodb` | `maiyu-backend`, `tactical-ddd` (só em modelagem de agregado) |
| `bullmq`, `socket-io` | `maiyu-backend`, `observability-and-instrumentation`, `debugging-and-error-recovery` |
| `isolated-vm` | `maiyu-backend`, `security-best-practices`, `security-and-hardening` |
| `tanstack-query` | `maiyu-frontend`, `react-data-fetching` |
| `tanstack-router`, `tanstack-start` | `maiyu-frontend`, `server-side-rendering`, `streaming-ssr` |
| `tanstack-table` | `maiyu-frontend`, `virtual-lists` (lista grande) |
| `tanstack-store` | `maiyu-frontend`, `react-render-optimization` |
| `react-hook-form`, `use-mask-input` | `maiyu-frontend`, `web-accessibility` |
| `shadcn`, `base-ui` | `shadcn`, `maiyu-frontend`, `compound-pattern`, `react-composition-patterns`, `dialog-pattern`, `sheet-pattern`, `accessibility` |
| `tailwindcss` | `frontend-design`, `impeccable` |
| `tiptap` | `maiyu-frontend`, `compound-pattern`, `react-composition-patterns` |
| `vitejs`, `nitro` | `vite-bundle-optimization`, `perf-web-optimization` |
| `vitest` | `tdd`, `test-driven-development`; e2e: `playwright-skill` |
| `_padroes/openapi.md` | `api-and-interface-design`, `documentation-and-adrs` |
| versão nova de qualquer lib | `deprecation-and-migration`, `migration` |

## Sobrepostas

- **Revisão de código**: `code-review`, `code-review-and-quality`, `the-judge`, `caveman-review` fazem o
  mesmo trabalho. Preferir `code-review` para revisar branch/diff local (Standards + Spec lado a lado);
  `the-judge` só quando o alvo é postar review formal via `gh` num PR real; `caveman-review` quando o
  objetivo é economia de token numa passada rápida. `code-review-and-quality` é redundante com `code-review`.
- **Taste/design visual**: `design-taste-frontend`, `design-taste-frontend-v1`, `frontend-design`
  (projeto e usuário), `frontend-blueprint`, `frontend-ui-engineering`, `ui-ux-pro-max`,
  `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste`, `gpt-taste`
  competem pelo mesmo espaço. Preferir `design-taste-frontend` (v2, anti-slop, audit-first) como skill de
  direção; as demais (`minimalist-ui`, `industrial-brutalist-ui`, ...) são presets de estilo pontuais, não
  substituem a principal. `design-taste-frontend-v1` só se algo já depender do comportamento antigo.
- **TDD**: `tdd` (projeto) e `test-driven-development` (usuário) cobrem o mesmo red-green-refactor.
  Preferir `test-driven-development`, mais detalhado; `tdd` é a versão fina duplicada.
- **SOLID**: `solid` e `solid-principles` se sobrepõem. Preferir `solid-principles` (detecção e correção
  de violação, não só definição).
- **Debug**: `diagnosing-bugs`, `debugging-and-error-recovery`, `debug-issue`, `investigate-first`
  cobrem o mesmo diagnóstico de causa raiz. Preferir `investigate-first` (hipóteses ranqueadas por
  evidência antes de editar); as outras três são variações do mesmo loop.
- **Refactor seguro**: `refactor-safely` e `safe-refactor` se sobrepõem. Preferir `safe-refactor`
  (escopo mais claro: extração/consolidação/mudança de ownership com verificação bracketing).
- **Criar skill/agente**: `skill-architect`, `anthropic-skills:skill-creator` e
  `superpowers:writing-skills` competem. Preferir `skill-architect` para desenhar uma skill nova da casa
  por conversa estruturada; `writing-skills` para editar/verificar mecânica de uma `SKILL.md` existente
  antes de publicar. `skill-creator` é a variante genérica da Anthropic, redundante aqui.
- **Documento de decisão**: `create-technical-design-doc` e `technical-design-doc-creator` são a mesma
  skill instalada duas vezes (descrição idêntica) — manter só uma instalação, não é sobreposição real.
- **Performance**: `core-web-vitals`, `perf-web-optimization`, `perf-lighthouse`, `performance-optimization`
  se sobrepõem parcialmente. Preferir `core-web-vitals` para LCP/INP/CLS, `perf-web-optimization` para
  bundle/caching geral, `perf-lighthouse` só para medir; `performance-optimization` quando o problema
  cruza frontend+backend+banco (N+1, query lenta), caso em que ela é a mais completa.
- **Duplicação direta projeto×usuário**: `implement-spec`, `to-spec`, `to-tickets`, `to-questionnaire`,
  `triage`, `code-review`, `codebase-design`, `domain-modeling`, `improve-codebase-architecture`,
  `design-taste-frontend`, `design-taste-frontend-v1`, `minimalist-ui`, `industrial-brutalist-ui`,
  `high-end-visual-design`, `web-design-guidelines`, `tdd`, `diagnosing-bugs`, `investigate-first`,
  `surgical-patch`, `safe-refactor` existem idênticas em `.claude/skills` e `~/.claude/skills` — mesma
  skill visível duas vezes, não é overlap conceitual, é instalação dobrada.

## Fora da stack

Todas ficam instaladas. Regra de uso: **dispare sempre a skill mais direcionada e necessária para a
tarefa** — a da tabela "Por tarefa" ou "Por biblioteca" primeiro; uma skill desta lista só entra quando
a tarefa for de fato desse assunto (ex.: SEO de site público, deploy num vendor escolhido para aquele
projeto). Nunca carregue skill "por garantia": cada uma custa token.

- **GTM/vendas/outreach**: ai-cold-outreach, ai-sdr, ai-pricing, ai-ugc-ads, gtm-engineering, gtm-metrics,
  sales-motion-design, social-selling, partner-affiliate, positioning-icp, solo-founder-gtm,
  lead-enrichment, expansion-retention, content-to-pipeline, paid-creative-ai, video-outreach
- **SEO/marketing técnico**: ai-seo, seo, tlc-generative-engine-optimization
- **Frameworks/plataformas não usados**: nestjs-modular-monolith, evolutionary-modular-architecture
  (empurra Nx/NestJS), rails-dev, shopify-developer, perf-astro, react-server-components (RSC não existe em TanStack Start)
- **Mobile/nativo**: react-native-expert, mobile-native, animate-expo, write-swift
- **Nx**: nx-generate, nx-run-tasks, nx-workspace, nx-ci-monitor
- **Deploy de vendor não escolhido**: cloudflare-deploy, netlify-deploy, render-deploy, vercel-deploy,
  aws-advisor
- **PM de vendor**: jira-assistant, confluence-assistant

tiver tempo para faxina.

## Duplicação `.agents/skills`

Removido em 2026-10-11: eram 120 cópias byte a byte de `.claude/skills`, sem conteúdo próprio.
