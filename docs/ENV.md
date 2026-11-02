# Configuração de ambiente

**Interclasse** · variáveis que os apps precisam para rodar, local e em produção

> Exemplo e documentação usam placeholder; segredo real fica fora do Git.
> Variável nova entra aqui **e** em `.env.example` no mesmo commit. Quem valida é o schema do
> leitor de ENV (`backend/start/env.ts`, `frontend/src/env.ts`); este arquivo explica.

## 1. Variáveis

Mesmas chaves, ordem e blocos do `backend/.env.example` e do `frontend/.env.example`, que seguem o modelo da casa (`_standards/backend.md` §6.2, `DECISIONS.md` #276). Nome de bloco e comentário dos arquivos `.env*` são em inglês (`typescript.md` §12); o português mora aqui. Chave sem uso no projeto fica comentada no lugar, nunca apagada.

### API (`backend/`)

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `NODE_ENV` | sim | não | `development`, `production` ou `test` | `development` |
| `PORT` | sim | não | porta HTTP | `3333` |
| `HOST` | sim | não | interface de escuta; em container, `0.0.0.0` | `localhost` |
| `TZ` | não | não | fuso do processo; `UTC` em todo ambiente, senão o Node herda o do host | `UTC` |
| `LOG_LEVEL` | sim | não | nível do logger | `info` |
| `APP_KEY` | sim | **sim** | chave de cifra da aplicação | `<segredo>` |
| `APP_SERVER_URL` | sim | não | endereço público da API | `http://${HOST}:${PORT}` |
| `APP_CLIENT_URL` | não (comentada) | não | origem pública do site, só se site e API ficarem em sites diferentes; o projeto não a lê (o cookie é sempre `SameSite=Lax`) | `https://interclass.maiyu.com.br` |
| `TRUSTED_PROXIES` | atrás de proxy | não | proxy reverso confiável para `request.ip()`: um IP, sub-rede ou apelido do `proxy-addr` (`loopback`, `uniquelocal`); ausente vale `loopback`. Nunca `true` | `172.16.0.0/12` |
| `COOKIE_DOMAIN` | em produção | não | `Domain` dos cookies de sessão: o menor domínio que cobre o site e a API | `.maiyu.com.br` |
| `CORS_ORIGINS` | em produção | não | allowlist do CORS e da barreira de origem (CSRF), separada por vírgula; toda escrita de origem fora dela recebe 403; o boot para sem ela em produção. O CORS do MinIO local sai dela | `https://interclass.maiyu.com.br` |
| `DATABASE_URL` | sim | **sim** | conexão com o Postgres | `postgres://<usuario>:<senha>@localhost:5434/<banco>` |
| `DATABASE_SSL` | não | não | TLS na conexão; ausente é desligado; `true` para banco gerenciado | `false` |
| `UPLOAD_MAX_SIZE` | sim | não | teto por arquivo, em bytes; sem default de propósito | `1073741824` |
| `STORAGE_KEY` | sim | **sim** | chave de acesso do bucket | `<segredo>` |
| `STORAGE_SECRET` | sim | **sim** | segredo do bucket | `<segredo>` |
| `STORAGE_BUCKET` | sim | não | nome do bucket (privado) | `interclasse` |
| `STORAGE_ENDPOINT` | sim | não | endpoint S3-compatível | `http://localhost:9004` |
| `STORAGE_FORCE_PATH_STYLE` | não | não | `true` no MinIO; ausente em R2, S3 e Spaces | `true` |
| `SEED_OWNER_EMAIL` | junto com a senha | não | e-mail do primeiro administrador criado por `node ace db:seed`; senha sem e-mail para o seeder | `administrator@mail.com` |
| `SEED_OWNER_PASSWORD` | não | **sim** | **liga** o seed do administrador, em qualquer ambiente; ausente, o seed é pulado com uma linha de log | `<segredo>` |
| `SEED_DEMO_PASSWORD` | não | **sim** | **liga** a demonstração (`pnpm db:seed:demo`): senha comum das contas `advisor@example.com`, `advisor-2@example.com`... e `representative@example.com`... e todo o conteúdo de exemplo; ausente, a demonstração é pulada e o resto do seed segue | `<segredo>` |

Só do `docker-compose.yml` (não passam pelo leitor de ENV): `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (root do MinIO local, usado só no setup e no console), `DB_PORT` (5434), `STORAGE_PORT` (9004) e `STORAGE_CONSOLE_PORT` (9005).

Seed ligado pela chave: o dado de referência (modalidades e turmas, `tournament.seed.ts`) não tem chave e roda em `development` e `production`; fora de `test` porque a suíte cria o que precisa e uma modalidade semeada com o mesmo nome bateria no `unique`.

### Site (`frontend/`)

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `VITE_API_URL` | não | não | endereço da API visto pelo navegador, sem barra no fim; embutida no bundle em tempo de build. Ausente em dev, usa `http://localhost:3333` | `https://api-interclass.maiyu.com.br` |
| `SERVER_API_URL` | não | não | endereço da API visto de dentro do servidor de SSR (nome do serviço na rede do Docker); lida por requisição, nunca chega ao navegador. Ausente, o SSR usa `VITE_API_URL` | `http://api:3333` |
| `VITE_SITE_URL` | não | não | endereço público do site, sem barra no fim: base do `canonical`, dos `hreflang` e do sitemap; embutida no bundle em tempo de build. Ausente em dev, usa `http://localhost:3001` | `https://interclass.maiyu.com.br` |
| `SITE_ENV` | não | não | ambiente do site, lido por requisição pelo servidor de SSR (nunca chega ao navegador). Só `production` deixa o site indexável; ausente ou outro valor (`staging`, `preview`) responde `noindex, nofollow` e `Disallow: /`. Produção precisa defini-la | `production` |
| `STORAGE_PUBLIC_URL` | com upload | não | origem pública do bucket (o `STORAGE_ENDPOINT` visto do navegador), sem barra no fim; lida por requisição em `src/server.ts` para abrir `img-src` e `connect-src` do CSP. Não é de build: a mesma imagem serve qualquer ambiente. Ausente, o CSP só libera a API e o upload falha no navegador | `https://storage.interclass.maiyu.com.br` |
| `VITE_UPLOAD_MAX_SIZE` | não | não | espelho de `UPLOAD_MAX_SIZE`, em bytes. Lida e validada em `src/env.ts`; ainda sem tela que a use: o servidor recusa com 422 e diz o limite | `1073741824` |

### E2E (`frontend/e2e/support/env.ts`)

Sem default: falta uma e a execução para dizendo qual. Modelo em `frontend/.env.e2e.example`.

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `E2E_BASE_URL` | ao rodar o E2E | não | origem do site sob teste; a porta dela é a do `webServer` | `http://localhost:3010` |
| `E2E_API_URL` | ao rodar o E2E | não | raiz da API, para as fixtures | `http://localhost:3333` |
| `E2E_OWNER_EMAIL` | ao rodar o E2E | não | conta do administrador, a do seeder | `administrator@mail.com` |
| `E2E_OWNER_PASSWORD` | ao rodar o E2E | **sim** | senha dela; no CI, fixa de teste | `<segredo>` |
| `E2E_DEMO_PASSWORD` | ao rodar o E2E | **sim** | a `SEED_DEMO_PASSWORD` do backend sob teste; os e-mails (`advisor@example.com`, `advisor-2@example.com`, `representative@example.com`) vêm do seeder de demonstração | `<segredo>` |
| `E2E_SHOTS_DIR` | não | não | pasta fora do repositório para capturas de tela; ausente, não grava | `/tmp/shots` |
| `E2E_CHROMIUM_PATH` | não | não | binário do Chromium quando o baixado não roda | `/opt/pw-browsers/chromium` |

Regras:

- Segredo e credencial **não têm default**: o app não sobe sem eles (a senha de seed é a exceção: a ausência dela desliga o seed).
- `VITE_*` vai para o navegador: nunca segredo. O `frontend/.env.production` é versionado por isso.
- `VITE_API_URL` e `VITE_SITE_URL` são de build: trocar a variável do container não muda nada, só uma nova imagem. `SERVER_API_URL`, `SITE_ENV` e `STORAGE_PUBLIC_URL` são de runtime, definidas no painel do Coolify.
- Em produção, `CORS_ORIGINS` e `COOKIE_DOMAIN` são exigidas (a primeira derruba o boot sem ela), embora o schema as declare opcionais (em desenvolvimento, vazias é o certo).
- O `Dockerfile-production` da API traz valores de build só para satisfazer o schema durante `node ace build`; em runtime quem injeta é a plataforma.

## 2. Exemplo

Os arquivos de exemplo (`backend/.env.example` e `frontend/.env.example`) são a fonte e trazem os comentários; não se repetem aqui. Chaves, ordem e blocos vêm do modelo da casa, e `node ../maiyu-pattern/scripts/sync-to-project.mjs . --check` reprova chave a mais, a menos ou fora de ordem.

## 3. Segredo fora do Git

`.gitignore` (raiz e apps): `.env` e `.env.local` ficam fora; `.env.example`, `.env.test` e
`frontend/.env.production` são versionados.

`backend/.env.test` tem só container local, senha de banco de teste, bucket `interclasse-test`, a
allowlist do CORS e a conta do administrador do seed (`SEED_OWNER_*`). O banco `interclasse_test` é separado do de desenvolvimento porque a suíte
roda `truncate()` entre os testes.

## 4. Por ambiente

| Ambiente | De onde vêm os valores | Observação |
|---|---|---|
| Desenvolvimento | `backend/.env` copiado de `backend/.env.example`; `docker compose up -d` sobe Postgres (5434) e MinIO (9004 e 9005) | portas deslocadas de propósito |
| Teste | `backend/.env.test` (versionado) | banco `interclasse_test` e bucket `interclasse-test`, descartáveis |
| Produção | painel do Coolify, uma aplicação para a API e outra para o site | nunca em arquivo no servidor de build. A migration roda no *Post-deployment command* da API (`node ace migration:run --force`), com o *Pre-deployment* vazio |

Secrets de CI no repositório (`tooling.md` §8.3): `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `COOLIFY_URL` (base do painel, sem caminho), `COOLIFY_TOKEN`, `COOLIFY_API_UUID` e `COOLIFY_APP_UUID`.

## 5. Primeira configuração

- [ ] `pnpm install` na raiz.
- [ ] `cp backend/.env.example backend/.env` e preencher cada `<segredo>`.
- [ ] Gerar `APP_KEY` com `node ace generate:key` (em `backend/`).
- [ ] Subir os serviços locais: `cd backend && docker compose up -d`.
- [ ] Rodar `node ace migration:run && node ace db:seed` (o seed do administrador liga com `SEED_OWNER_PASSWORD`; sem ela é pulado).
- [ ] Rodar `pnpm dev` na raiz: o app valida as variáveis no boot e para se faltar alguma.
- [ ] Reiniciar o app depois de mudar o `.env`.
