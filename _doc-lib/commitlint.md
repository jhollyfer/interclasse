# commitlint + Husky

> Conferido em 2026-10-14 contra as 16 páginas abaixo: as de `commitlint.js.org` pela versão `.md`
> (o site publica `/llms.txt`), as do Husky pelo HTML de `typicode.github.io/husky` (sem `.md`), e o
> README do `@commitlint/config-conventional` pelo fonte no GitHub. Tipo publicado conferido por
> `npm pack`: `@commitlint/cli@21.2.3`, `@commitlint/config-conventional@21.2.3` (regras lidas em
> `lib/index.js`) e `husky@9.1.7`.
>
> **commitlint 21** imprime a mensagem depois de uma quebra de linha, não depois de dois-pontos
> (`--legacy-output` volta o formato antigo). O `@commitlint/config-conventional` limita o
> cabeçalho a **100** caracteres, não 72: o teto da régua precisa ser escrito no
> `.commitlintrc.json`.

Dupla que cobra a mensagem de commit: o Husky instala os hooks do Git a partir de `.husky/`, e o
commitlint valida a mensagem contra Conventional Commits, no hook `commit-msg` e de novo no CI.

**O que é:** o `@commitlint/cli` lê a mensagem (de arquivo com `--edit`, de um intervalo com
`--from`/`--to`, ou do stdin) e aplica regras de uma config (`.commitlintrc.json` e afins) que
normalmente estende `@commitlint/config-conventional`. O Husky (2 kB, sem dependência) configura
`core.hooksPath` para `.husky/_` no `prepare` e roda o arquivo `.husky/<nome-do-hook>` como shell
POSIX.

**Para que serve:** manter o histórico em Conventional Commits em pt-BR (`tooling.md` §6,
`backend.md` §9) sem depender de memória: mensagem fora do padrão falha no commit e, se alguém
passar `--no-verify`, falha no PR.

**Como usar:**

```bash
pnpm add -D -w husky @commitlint/cli @commitlint/config-conventional
pnpm exec husky init   # cria .husky/pre-commit e grava "prepare": "husky"
```

```json
// .commitlintrc.json (raiz)
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "header-max-length": [2, "always", 72]
  }
}
```

```sh
# .husky/commit-msg
pnpm exec commitlint --edit "$1"
```

**Quando adotar a biblioteca:** sempre, uma vez por repositório, na raiz do workspace
(`architecture.md` §9). Não é escolha de projeto.

**O que muda a experiência:**

1. **O config conventional não é a régua inteira.** Ele cobra tipo da lista, tipo minúsculo,
   assunto não vazio, sem ponto final e sem `sentence-case`/`start-case`/`pascal-case`/`upper-case`,
   e cabeçalho até **100**. Os 72 caracteres de `tooling.md` §6 só valem com `header-max-length`
   sobrescrito.
2. **`pnpm exec`, não `pnpm dlx`.** A página de setup local mostra `pnpm dlx commitlint`, que baixa
   o pacote do registro a cada commit; `pnpm exec` usa a devDependency do lockfile, a mesma versão
   do CI (`tooling.md` §7).
3. **Merge e revert passam sem regra.** `defaultIgnores: true` ignora `Merge ...`, `Revert ...`,
   versão semver e "Automatic merge". O corpo obrigatório em revert (`tooling.md` §6) continua na
   revisão.
4. **O hook é pulável, o CI não.** `git commit -n` e `HUSKY=0` desligam o hook; por isso o mesmo
   commitlint roda no PR com `--from`/`--to`.
5. **`HUSKY=0` em CI e Docker.** O `prepare` roda em todo install; na imagem que instala sem
   devDependencies ele falha porque o Husky não está lá.

**Links:** 16

**Skills:** `caveman-commit` (escrever a mensagem), `code-pattern` (convenção de commit da casa),
`setup-pre-commit` (montar o hook), `git-guardrails-claude-code` (guarda do agente,
`tooling.md` §6). Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa
(`SKILLS-MAP.md`).

---

## commitlint: guias

#### guides/getting-started
[doc](https://commitlint.js.org/guides/getting-started) | [markdown](https://commitlint.js.org/guides/getting-started.md)
**O que é:** instalação (`pnpm add -D @commitlint/cli @commitlint/config-conventional`) e a config
mínima que estende o conventional.
**Para que serve:** primeiro passo de qualquer repositório novo.
**Quando usar:** ao montar a raiz do workspace. A página gera `commitlint.config.js`; a casa usa
`.commitlintrc.json` (`architecture.md` §9), que a referência de configuração também aceita.

#### guides/local-setup
[doc](https://commitlint.js.org/guides/local-setup) | [markdown](https://commitlint.js.org/guides/local-setup.md)
**O que é:** o hook `commit-msg` com Husky v9 (`husky init` e `.husky/commit-msg` com
`commitlint --edit $1`); o `pre-commit` **não** é suportado para mensagem. Teste com
`commitlint --from HEAD~1 --to HEAD --verbose`. Sem problema, o commitlint não imprime nada.
**Para que serve:** feedback no momento do commit.
**Quando usar:** ao criar `.husky/commit-msg`. Confirmado para Husky v9: o arquivo tem de se chamar
`commit-msg`. A variante pnpm da página usa `pnpm dlx`; a casa troca por `pnpm exec` (versão do
lockfile).

#### guides/ci-setup
[doc](https://commitlint.js.org/guides/ci-setup) | [markdown](https://commitlint.js.org/guides/ci-setup.md)
**O que é:** o job de GitHub Actions: `actions/checkout` com `fetch-depth: 0`, e
`commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose`
no `pull_request` (`--last` no `push`); `permissions: contents: read`.
**Para que serve:** a cobrança que o `--no-verify` não pula.
**Quando usar:** no `commitlint.yml` (`tooling.md` §7, §8.1). A página instala com `npm install`;
na casa é `pnpm install --frozen-lockfile` e `pnpm exec commitlint`, action pinada por SHA
(`tooling.md` §9).

#### guides/ai-agents
[doc](https://commitlint.js.org/guides/ai-agents) | [markdown](https://commitlint.js.org/guides/ai-agents.md)
**O que é:** o commitlint para agente: skill `committing-with-commitlint`, ou um trecho no
`AGENTS.md`/`CLAUDE.md` mandando ler `commitlint --print-config json`, validar a mensagem pelo
stdin antes do commit e nunca usar `--no-verify`.
**Para que serve:** o agente escreve a mensagem certa na primeira tentativa.
**Quando usar:** os primitivos (`--print-config json`, `printf '%s' "<msg>" | pnpm exec commitlint`)
valem para o agente da casa. A skill de terceiro não entra: a casa já tem `caveman-commit` e
`code-pattern` (`SKILLS-MAP.md`).

## commitlint: referência

#### reference/cli
[doc](https://commitlint.js.org/reference/cli) | [markdown](https://commitlint.js.org/reference/cli.md)
**O que é:** as opções: `--edit`, `--from`/`--to`, `--last`, `--from-last-tag`, `--config`,
`--print-config`, `--strict` (código 2 para aviso, 3 para erro), `--verbose`, `--default-config`,
`--legacy-output`. Sem config com regras, sai com código 9.
**Para que serve:** saber o que o hook e o CI chamam.
**Quando usar:** `--edit "$1"` no hook, `--from`/`--to` no CI. `--default-config` não serve à casa:
a config do repositório sempre existe.

#### reference/configuration
[doc](https://commitlint.js.org/reference/configuration) | [markdown](https://commitlint.js.org/reference/configuration.md)
**O que é:** os arquivos aceitos (`.commitlintrc`, `.commitlintrc.json`, `.yaml`, `.js`, `.ts`,
`commitlint.config.*`, campo `commitlint` do `package.json`), o objeto (`extends`, `parserPreset`,
`formatter`, `rules`, `ignores`, `defaultIgnores`, `helpUrl`, `prompt`) e os parser presets. Com o
conventional, o preset é `conventional-changelog-conventionalcommits`.
**Para que serve:** onde mora o teto de 72 e o que é ignorado por padrão.
**Quando usar:** ao escrever `.commitlintrc.json`. `rules` sobrescreve o que veio do `extends`.

#### reference/rules-configuration
[doc](https://commitlint.js.org/reference/rules-configuration) | [markdown](https://commitlint.js.org/reference/rules-configuration.md)
**O que é:** a forma de cada regra: `[nível, aplicabilidade, valor]`, com nível `0` (desliga),
`1` (aviso) e `2` (erro), e `always`/`never`.
**Para que serve:** ler e escrever entrada de `rules`.
**Quando usar:** ao sobrescrever regra. Em JSON, só a forma de array (as formas de função são de
config JS).

#### reference/rules
[doc](https://commitlint.js.org/reference/rules) | [markdown](https://commitlint.js.org/reference/rules.md)
**O que é:** o catálogo de regras (`header-max-length`, `subject-case`, `subject-full-stop`,
`type-enum`, `body-leading-blank`, `body-max-line-length`, `scope-enum`…), com condição, regra
default e valor.
**Para que serve:** achar a regra certa para o que a régua escreve em prosa.
**Quando usar:** ao traduzir `tooling.md` §6 para config: teto do assunto em
`header-max-length`; o imperativo e o "porquê" no corpo não têm regra e ficam na revisão.

## commitlint: conceitos

#### concepts/commit-conventions
[doc](https://commitlint.js.org/concepts/commit-conventions) | [markdown](https://commitlint.js.org/concepts/commit-conventions.md)
**O que é:** o formato `type(scope?): subject`, corpo e rodapé opcionais; vários escopos separados
por `/`, `\` ou `,`.
**Para que serve:** a forma da mensagem que a casa adota.
**Quando usar:** referência rápida. Escopo de domínio em pt-BR (`fix(turmas):`) é aceito; o
conventional não restringe escopo.

#### concepts/shareable-config
[doc](https://commitlint.js.org/concepts/shareable-config) | [markdown](https://commitlint.js.org/concepts/shareable-config.md)
**O que é:** como o `extends` resolve nomes (`example` vira `commitlint-config-example`, escopo
`@x` vira `@x/commitlint-config`, caminho relativo começa com `.`) e mescla as regras.
**Para que serve:** entender de onde vem cada regra ativa.
**Quando usar:** só se a casa publicar config própria. Hoje não: cada repositório estende o
conventional e sobrescreve o teto.

## commitlint: config conventional

#### conventional-changelog/commitlint/@commitlint/config-conventional
[doc](https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional)
**O que é:** a config compartilhada. Regras de erro: `type-enum` (`build`, `chore`, `ci`, `docs`,
`feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`), `type-case` minúsculo,
`subject-case` nunca em sentence/start/pascal/upper-case, `subject-full-stop` sem `.`,
`subject-empty` e `type-empty` proibidos, `header-max-length` 100, `body-max-line-length` e
`footer-max-line-length` 100 (linha com URL isenta). Avisos: linha em branco antes do corpo e do
rodapé.
**Para que serve:** a base que a casa estende.
**Quando usar:** sempre como `extends`. Sobrescreva `header-max-length` para 72. Assunto em pt-BR
começando com maiúscula reprova em `subject-case` (sentence-case): a casa escreve o assunto em
minúscula.

## commitlint: suporte

#### support/troubleshooting
[doc](https://commitlint.js.org/support/troubleshooting) | [markdown](https://commitlint.js.org/support/troubleshooting.md)
**O que é:** o erro `Found invalid rule names` depois de atualizar: versões diferentes de pacotes
`@commitlint/*` no `node_modules`.
**Para que serve:** diagnóstico de upgrade.
**Quando usar:** quando o Dependabot sobe só um dos dois pacotes. `@commitlint/cli` e
`@commitlint/config-conventional` sobem juntos (mesmo grupo no `dependabot.yml`).

## Husky

#### husky/
[doc](https://typicode.github.io/husky/)
**O que é:** a página de entrada: hooks nativos via `core.hooksPath`, 2 kB, sem dependência,
suporte a monorepo, GUI de Git e gerenciador de versão de Node.
**Para que serve:** saber o que o Husky faz e não faz (não é lint-staged, não é task runner).
**Quando usar:** primeira leitura.

#### husky/get-started.html
[doc](https://typicode.github.io/husky/get-started.html)
**O que é:** `pnpm add --save-dev husky` e `pnpm exec husky init`, que cria `.husky/pre-commit` e
grava `"prepare": "husky"`. Hook é shell POSIX; `HUSKY=0` desliga.
**Para que serve:** o setup da raiz.
**Quando usar:** uma vez por repositório, na raiz (`-w` no workspace). O `pre-commit` gerado é
trocado pelo da casa, filtrado por pasta (`tooling.md` §6).

#### husky/how-to.html
[doc](https://typicode.github.io/husky/how-to.html)
**O que é:** criar hook é criar arquivo (`.husky/<hook>`); arquivo de inicialização
`~/.config/husky/init.sh`; pular hook (`-n`, `HUSKY=0`); CI e Docker com `HUSKY=0`, ou
`"prepare": "husky || true"`, ou `.husky/install.mjs` que sai cedo em produção; projeto fora da
raiz do Git (`"prepare": "cd .. && husky frontend/.husky"`); hook em Node; Bash; PATH de GUI.
**Para que serve:** todos os casos que fogem do básico.
**Quando usar:** no Dockerfile e nos workflows: `HUSKY=0` no `env`. O caso "projeto fora da raiz
do Git" é exatamente o que a régua proíbe (`backend/.husky` com `prepare: cd ..`): no workspace o
`package.json` da raiz está na raiz do Git e o Husky fica lá.

#### husky/troubleshoot.html
[doc](https://typicode.github.io/husky/troubleshoot.html)
**O que é:** `command not found` (PATH de GUI), hook que não roda (nome errado como
`pre-commit.sh`, `core.hooksPath` diferente de `.husky/_`, Git abaixo de 2.9), e o
`git config --unset core.hooksPath` depois de desinstalar.
**Para que serve:** diagnóstico quando o `commit-msg` "não faz nada".
**Quando usar:** primeiro `git config core.hooksPath`; depois o nome e a permissão do arquivo.
