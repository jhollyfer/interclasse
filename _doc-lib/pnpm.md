# pnpm

> Conferido em 2026-10-14 contra as 25 páginas abaixo (HTML de `pnpm.io`; o site não publica `.md`
> nem `/llms.txt`) e contra `pnpm@12.11.2` no npm. `https://pnpm.io/pnpm-workspace_yaml`
> redireciona (308) para `https://pnpm.io/settings`, que é a entrada deste arquivo.
>
> **pnpm 12** é um executável nativo: não precisa de Node depois de instalado (pelo npm, exige Node
> 22.13+). Configuração que não é autenticação mora no `pnpm-workspace.yaml`; o `.npmrc` só guarda
> registro e credencial. A partir do 11, `minimumReleaseAge` vale **1440 minutos por padrão**: versão
> publicada há menos de um dia não instala. As páginas de instalação e de CI **abandonaram o
> Corepack**.

Gerenciador de pacote da casa e o workspace que junta `backend`, `frontend` e `shared` num
repositório com um lockfile só (`tooling.md` §1, `architecture.md` §9, `DECISIONS.md` #110).

**O que é:** um gerenciador de pacote com store endereçado por conteúdo e `node_modules` isolado
(cada pacote só enxerga o que declarou). Um `pnpm-workspace.yaml` na raiz declara os projetos
(`packages:`) e as configurações; o protocolo `workspace:` liga um pacote ao outro sem passar pelo
registro; `--filter` escolhe em que projeto o comando roda; `pnpm deploy` copia um projeto com as
dependências dele para uma pasta autônoma.

**Para que serve:** validator, mensagem, enum e tipo de resposta iguais nos dois lados vindos do
`@<projeto>/shared`, com um lockfile, um CI que instala uma vez e uma imagem Docker por app que
leva só o app e o `shared/`.

**Como usar:**

```yaml
# pnpm-workspace.yaml (raiz)
packages:
  - backend
  - frontend
  - shared

allowBuilds:
  esbuild: true # binário nativo do bundler; sem o postinstall o build não roda
```

```json
// backend/package.json
{
  "dependencies": { "@<projeto>/shared": "workspace:*" }
}
```

```bash
pnpm install --frozen-lockfile              # raiz, um lockfile
pnpm --filter ./backend check               # um app
pnpm --filter ./backend --prod deploy /out  # imagem: só o app e o shared
```

**Quando adotar a biblioteca:** sempre. `packageManager` fixo no `package.json` da raiz
(`tooling.md` §1); projeto em outro gerenciador migra.

**O que muda a experiência:**

1. **`pnpm-workspace.yaml` é o arquivo de configuração**, não só a lista de pacotes: `allowBuilds`,
   `overrides`, `catalog`, `minimumReleaseAge`, `audit.level` moram nele. `.npmrc` é só
   autenticação e não se commita com token.
2. **Script de dependência não roda sem licença.** Pacote que precisa de `postinstall` e não está
   em `allowBuilds` faz o install falhar (`strictDepBuilds` é `true` por padrão).
   `onlyBuiltDependencies` e afins foram removidos no 11.
3. **CI já é `--frozen-lockfile`.** Detectado o CI, o pnpm não reescreve o lockfile e, desde o 11,
   falha se o lockfile veio de uma major mais nova do pnpm.
4. **`minimumReleaseAge` atrasa "a última versão" em um dia.** É defesa de cadeia de suprimento; a
   régua quer a última publicada (`tooling.md` §0), e as duas coisas convivem: a versão de hoje
   entra amanhã. `audit --fix` acrescenta a exceção para correção de segurança.
5. **`pnpm deploy` não exige mais `injectWorkspacePackages`** (desde 12.2): o link do workspace
   vira dependência `file:` no lockfile dedicado do deploy.

**Links:** 25

**Skills:** `maiyu-standards` (`tooling.md` §1, §7, §8.2), `superpowers:verification-before-completion`
(install e `check` são portão), `gh-fix-ci` (CI vermelho no install). Dispare junto com a leitura
da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Workspace

#### workspaces
[doc](https://pnpm.io/workspaces)
**O que é:** workspace pelo `pnpm-workspace.yaml` na raiz; protocolo `workspace:` (`workspace:*`,
`workspace:^`, alias `workspace:foo@*`, caminho relativo) que recusa resolver fora do workspace;
troca do `workspace:` por versão real ao publicar; aviso de dependência cíclica entre projetos.
O campo `workspaces` do `package.json` **não** é lido (desde 12.7, o install cria o yaml a partir
dele).
**Para que serve:** o `@<projeto>/shared` consumido pelos dois apps.
**Quando usar:** `"@<projeto>/shared": "workspace:*"` no backend e no frontend. Ciclo entre
projetos do workspace é defeito: o pnpm não garante ordem topológica de script com ciclo.

#### settings
[doc](https://pnpm.io/settings)
**O que é:** a referência do `pnpm-workspace.yaml`: `packages` (globs, `!` exclui, raiz sempre
incluída), `packageConfigs` (config por projeto, que só vale para resolução com lockfile por
projeto), catálogos, e o índice das configurações por grupo. Só auth e registro vêm do `.npmrc`;
variável `${NOME}` expande, exceto em URL de registro (desde 11.5.3).
**Para que serve:** saber onde cada configuração mora.
**Quando usar:** ao escrever o `pnpm-workspace.yaml` da raiz. Na casa, `packages` lista
`backend`, `frontend` e `shared` pelo nome, sem glob.

#### catalogs
[doc](https://pnpm.io/catalogs)
**O que é:** `catalog:` (padrão) e `catalogs:` (nomeados) no `pnpm-workspace.yaml`, referenciados
como `"react": "catalog:"` em `dependencies`, `devDependencies`, `peerDependencies`,
`optionalDependencies` e `overrides`. `pnpm update` atualiza a entrada do catálogo, não o
`package.json`.
**Para que serve:** uma versão por dependência no repositório inteiro, upgrade numa linha só, menos
conflito de merge em `package.json`.
**Quando usar:** dependência usada por mais de um pacote do workspace (`typescript`, `@vinejs/vine`,
`eslint`, `vitest`). Não coberto pela régua hoje: é decisão de projeto, e quem adotar registra em
`docs/DECISIONS.md`.

#### filtering
[doc](https://pnpm.io/filtering)
**O que é:** `--filter` por nome (`foo`), com dependências (`foo...`), só dependências
(`foo^...`), com dependentes (`...foo`), por diretório (`./<glob>` ou `{<glob>}`, combinável com
`...` na forma `{<dir>}...`), por mudança (`[origin/main]`), exclusão com `!`, `--filter-prod`,
`--fail-if-no-match`. `{<dir>}` é glob desde o 11; `legacyDirFiltering` volta ao comportamento de
subárvore.
**Para que serve:** rodar `check`, teste e build só do app que o commit ou o job toca.
**Quando usar:** hook e CI (`tooling.md` §6, §7). Para app **com** as dependências do workspace, a
forma documentada é `--filter "{./backend}..."` ou pelo nome (`--filter @<projeto>/backend...`); a
forma `./backend...` não aparece na página. A flag `--fail-if-no-match` existe porque, sem ela,
filtro que não casa com projeto nenhum não é falha: no CI, ela (ou `failIfNoMatch: true` no yaml)
impede que um typo no caminho passe verde sem rodar nada.

#### package_json
[doc](https://pnpm.io/package_json)
**O que é:** os campos que o pnpm lê: `engines` (`engines.node`, `engines.pnpm`),
`engines.runtime` e `devEngines.runtime` (Node baixado e travado no lockfile), o campo legado
`packageManager` e `devEngines.packageManager` (aceita faixa; versão resolvida vai para o
lockfile), `dependenciesMeta.*.injected`, `peerDependenciesMeta`, `publishConfig`.
**Para que serve:** fixar versão de pnpm e de Node por repositório.
**Quando usar:** `packageManager: "pnpm@X.Y.Z"` e `engines.node: ">=24"` na raiz (`tooling.md` §1,
§2). A página chama `packageManager` de **legado** e documenta `devEngines.packageManager` como a
forma atual; a régua ainda manda o legado.

## CLI

#### cli/install
[doc](https://pnpm.io/cli/install)
**O que é:** instala tudo de todos os projetos do workspace; `--frozen-lockfile` (não escreve o
lockfile), `--lockfile-only`, `--prod`, `--filter`, `--ignore-scripts`, `--offline`. No CI o
lockfile desatualizado é erro, sem flag.
**Para que serve:** o passo único de install do CI e do Dockerfile.
**Quando usar:** `pnpm install --frozen-lockfile` na raiz, sempre. Lockfile desincronizado se
corrige com commit, nunca com `--no-frozen-lockfile` no CI (`tooling.md` §7).

#### cli/add
[doc](https://pnpm.io/cli/add)
**O que é:** adiciona dependência: `-D`, `-E`, `--save-peer`, `--save-catalog`, `--workspace` (só
do workspace, com `workspace:`), `--allow-build`, `--filter`. Na raiz do workspace exige `-w`.
**Para que serve:** a forma certa de pôr dependência em cada pacote.
**Quando usar:** `pnpm --filter ./backend add <pkg>` no app; `pnpm add -D -w husky` na raiz
(`tooling.md` §6). Pacote com script de build: `--allow-build=<pkg>`, que grava em `allowBuilds`.

#### cli/exec
[doc](https://pnpm.io/cli/exec)
**O que é:** executa comando com `node_modules/.bin` no PATH; opção do pnpm vai **antes** de
`exec`; `-r` roda em todo projeto. `exec` é opcional quando o nome não colide com comando do pnpm.
**Para que serve:** chamar o binário da devDependency, na versão do lockfile.
**Quando usar:** hook `commit-msg` (`pnpm exec commitlint --edit "$1"`) e CI
(`pnpm exec playwright install --with-deps chromium`). Nunca `pnpm dlx`/`npx` para ferramenta que
já é dependência.

#### cli/run
[doc](https://pnpm.io/cli/run)
**O que é:** roda script do `package.json`; `-r` em todos os projetos com grafo de dependência,
`--if-present`, `--no-bail`, `--parallel`, `--sequential`, `--workspace-concurrency`, `--filter`;
`enablePrePostScripts`, `scriptShell`.
**Para que serve:** os scripts de nome fixo da casa (`check`, `test:unit`, `test:e2e`, `build`).
**Quando usar:** `pnpm --filter <app> <script>`. `-r` sem filtro em script que só um app tem falha
quando nenhum tem; use `--if-present` ou filtre.

#### cli/update
[doc](https://pnpm.io/cli/update)
**O que é:** atualiza dentro da faixa (`pnpm up`) ou para a última (`--latest`), por padrão de nome,
`-r`, `-i` interativo, `--filter`; grava a faixa nova no `package.json` ou no catálogo;
`--include-github-actions`.
**Para que serve:** o upgrade revisado de `tooling.md` §0.
**Quando usar:** `pnpm up -r --latest -i` para escolher com o changelog na mão. O Dependabot cobre o
corrente; isto é para a migração de major feita à mão.

#### cli/outdated
[doc](https://pnpm.io/cli/outdated)
**O que é:** lista dependência desatualizada; `-r`, `--filter`, `--long`, `--format json`,
`--compatible`.
**Para que serve:** ver o atraso antes de mexer.
**Quando usar:** ao entrar num projeto para aplicar o padrão (`tooling.md` §0: projeto atrás migra).

#### cli/audit
[doc](https://pnpm.io/cli/audit)
**O que é:** consulta vulnerabilidade conhecida; `--audit-level` (`low` padrão, `moderate`,
`high`, `critical`), `--prod`/`--dev`, `--fix` (grava `overrides`; `--fix=update` atualiza o
lockfile), `--ignore`, `audit.ignore` por GHSA; `pnpm audit signatures` confere assinatura do
registro.
**Para que serve:** o portão `pnpm audit --prod --audit-level=high` de `tooling.md` §7.
**Quando usar:** no `ci.yml`, com a régua: vulnerabilidade alta em produção reprova. Desde o 11, a
lista de exceção é por GHSA, não CVE. `--fix` automático continua proibido na casa; correção é
upgrade revisado.

#### cli/why
[doc](https://pnpm.io/cli/why)
**O que é:** árvore reversa de quem depende de um pacote; `-r`, `--json`, `--long`.
**Para que serve:** achar quem trouxe uma dependência transitiva.
**Quando usar:** ao responder "por que `date-fns` está no lockfile" (vem do `react-day-picker` do
`calendar`, `tooling.md` §0.1) ou ao triar alerta do audit.

#### cli/dlx
[doc](https://pnpm.io/cli/dlx)
**O que é:** `pnx` (aliases `pnpm dlx`, `pnpx`): baixa um pacote e roda o binário sem instalar;
aceita `@versão` e `catalog:`.
**Para que serve:** gerador e codemod de uso único.
**Quando usar:** só para o que não é dependência do projeto (codemod de migração,
`pnx codemod pnpm/catalog`). Ferramenta do projeto vai por `pnpm exec`.

#### cli/deploy
[doc](https://pnpm.io/cli/deploy)
**O que é:** copia um projeto do workspace para uma pasta com `node_modules` isolado e as
dependências do workspace dentro; `--prod` pula devDependencies; `--filter` escolhe o projeto;
`--force` aceita pasta não vazia; `--legacy`. Desde 12.2, sem `injectWorkspacePackages`; desde
12.7 não copia `packageManager` para o `package.json` do deploy e não roda o `prepare` do
projeto. Arquivos copiados seguem `files`, `.npmignore` e `.gitignore`.
**Para que serve:** a imagem Docker que leva só o app e o `shared/`.
**Quando usar:** estágio de build do `Dockerfile-production` (`tooling.md` §8.2), depois do build:
`pnpm --filter ./backend --prod deploy /out`. Confirmado: `--prod` existe e é o uso que a página
recomenda depois do build. Peer ambíguo falha com `ERR_PNPM_DEPLOY_AMBIGUOUS_PEER`; a correção é
`overrides`.

#### cli/approve-builds
[doc](https://pnpm.io/cli/approve-builds)
**O que é:** aprova ou nega (`!pkg`) script de build de dependência, gravando em `allowBuilds`;
sem argumento, abre prompt; desde 12.11, com `permissions` no yaml, grava lá.
**Para que serve:** liberar `esbuild`, `sharp` e afins com decisão registrada.
**Quando usar:** quando o install falha por build ignorado. Depois do comando, escreva o motivo ao
lado da entrada no `pnpm-workspace.yaml` (`tooling.md` §1).

## Configurações

#### settings/build
[doc](https://pnpm.io/settings/build)
**O que é:** `allowBuilds` (mapa `pacote: true|false`, aceita versão e URL de git),
`strictDepBuilds` (padrão `true`: build não revisado é erro), `dangerouslyAllowAllBuilds`,
`ignoreScripts`, `verifyDepsBeforeRun`, `sideEffectsCache`, `permissions` (12.11). Removidos no
11: `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies`.
**Para que serve:** o `allowBuilds` de `tooling.md` §1.
**Quando usar:** toda dependência com script de build, uma entrada com o motivo em comentário.
`dangerouslyAllowAllBuilds` nunca. Projeto com `onlyBuiltDependencies` migra
(`pnpx codemod run pnpm-v10-to-v11`).

#### settings/dependency-resolution
[doc](https://pnpm.io/settings/dependency-resolution)
**O que é:** `overrides` (só na raiz, com seletor `pai>filho` e `-` para remover),
`packageExtensions`, `minimumReleaseAge` (padrão 1440 desde o 11) e exceções, `trustPolicy`,
`supportedArchitectures`, `update.*`.
**Para que serve:** forçar versão corrigida de transitiva e controlar a janela de quarentena.
**Quando usar:** `overrides` como remendo de CVE transitiva, com issue e prazo (`tooling.md` §0).
`minimumReleaseAge` fica no padrão; não zere para "pegar a última hoje".

#### settings/peer-dependencies
[doc](https://pnpm.io/settings/peer-dependencies)
**O que é:** `autoInstallPeers` (padrão `true`), `dedupePeerDependents`, `strictPeerDependencies`
(padrão `false`: peer inválido é aviso), conflito de versão de peer não instala nada.
**Para que serve:** entender o aviso de peer não satisfeito.
**Quando usar:** quando plugin declara peer mais velho que o instalado (ex.: `eslint-plugin-jsx-a11y`
com peer `eslint` até `^9`, `_doc-lib/eslint.md`). É aviso, não erro; vira tarefa de
acompanhamento, não `strictPeerDependencies: false` escrito.

#### npmrc
[doc](https://pnpm.io/npmrc)
**O que é:** as configurações de autenticação: `.npmrc` do workspace (que deve estar no
`.gitignore`), `auth.ini` legado, `~/.npmrc`; `_authToken` por registro.
**Para que serve:** registro privado (Motion+, `_doc-lib/motion.md`).
**Quando usar:** só para credencial, referenciando variável de ambiente; qualquer outra configuração
vai no `pnpm-workspace.yaml`.

## Entrega e CI

#### installation
[doc](https://pnpm.io/installation)
**O que é:** instalar o pnpm 12 (executável nativo): `pnpm self-update`, script standalone
(`get.pnpm.io/install.sh`, com `PNPM_VERSION`), `npx get-pnpm`; tabela de compatibilidade (pnpm 12
roda com Node 18 a 26). Dentro de projeto com `packageManager`, `self-update` só atualiza o pin.
A página **não** menciona Corepack.
**Para que serve:** a máquina de dev e a imagem Docker.
**Quando usar:** ao montar o ambiente. A régua manda `corepack enable && corepack prepare` no
Dockerfile (`tooling.md` §8.2); a doc atual não usa mais esse caminho.

#### continuous-integration
[doc](https://pnpm.io/continuous-integration)
**O que é:** pnpm em CI. GitHub Actions: `pnpm/setup` instala pnpm **e** o Node
(`runtime: node@24`), roda o install e faz cache do store, com a versão vinda de `packageManager`
ou `devEngines.packageManager`; fora do GitHub, script standalone. Nota explícita: a página usava
Corepack e deixou de usar (o shim custa um Node por chamada). CI liga `--frozen-lockfile`
sozinho; cachear store só de job confiável.
**Para que serve:** o "comum a todo job" de `tooling.md` §7.
**Quando usar:** nos workflows. A régua usa `pnpm/action-setup` + `actions/setup-node` com
`cache: pnpm`; a doc atual indica `pnpm/setup` sem `setup-node`. Action pinada por SHA nos dois
casos (`tooling.md` §9).

```yaml
- uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
  with:
    runtime: node@24
    cache: true
```

#### docker
[doc](https://pnpm.io/docker)
**O que é:** imagem oficial `ghcr.io/pnpm/pnpm:<versão>` (só o binário, sem Node; Node vem de
`devEngines.runtime` ou `pnpm runtime set node 24 -g`); copiar `pnpm-workspace.yaml` antes do
install; cache mount do BuildKit fora de `/pnpm/store`; receita de monorepo com
`pnpm deploy --filter=<app> --prod /prod/<app>`.
**Para que serve:** o `Dockerfile-production` construído da raiz (`tooling.md` §8.2).
**Quando usar:** confirma a ordem da régua (copiar `package.json`, lockfile e
`pnpm-workspace.yaml` antes do install, deploy `--prod` depois do build). A régua parte de
`node:24-alpine`; a página prefere a imagem do pnpm ou `node:XX-slim`, decisão que fica com a régua.

#### git
[doc](https://pnpm.io/git)
**O que é:** commitar sempre o `pnpm-lock.yaml`; conflito no lockfile se resolve com
`pnpm install` e revisão antes do commit.
**Para que serve:** a regra do lockfile único versionado.
**Quando usar:** conflito de merge no lockfile: `pnpm install`, revisar o diff, commit. Nunca apagar
e regerar o lockfile.

#### supply-chain-security
[doc](https://pnpm.io/supply-chain-security)
**O que é:** as defesas contra pacote comprometido: script de dependência bloqueado por padrão com
`allowBuilds` explícito, `blockExoticSubdeps` (transitiva de git/tarball), `minimumReleaseAge`
(1440 por padrão), `trustPolicy: no-downgrade`.
**Para que serve:** o motivo de cada configuração de segurança do `pnpm-workspace.yaml`.
**Quando usar:** ao montar o yaml da raiz. `blockExoticSubdeps: true` e
`trustPolicy: no-downgrade` não estão na régua: candidatos a regra nova no upstream.
