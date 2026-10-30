# Configuração de ambiente

**Interclasse** · variáveis que os apps precisam para rodar, local e em produção

> Exemplo e documentação usam placeholder; segredo real fica fora do Git.
> Variável nova entra aqui **e** em `.env.example` no mesmo commit. Quem valida é o schema do
> leitor de ENV (`backend/start/env.ts`, `frontend/src/env.ts`); este arquivo explica.

## 1. Variáveis

Mesma ordem de blocos do `backend/.env.example`.

### API (`backend/`)

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `TZ` | não | não | fuso do processo; `UTC` em todo ambiente, senão o Node herda o do host | `UTC` |
| `PORT` | sim | não | porta HTTP | `3333` |
| `HOST` | sim | não | interface de escuta; em container, `0.0.0.0` | `localhost` |
| `NODE_ENV` | sim | não | `development`, `production` ou `test` | `development` |
| `LOG_LEVEL` | sim | não | nível do logger | `info` |
| `APP_KEY` | sim | **sim** | chave de cifra da aplicação | `<segredo>` |
| `APP_SERVER_URL` | sim | não | endereço público da API | `http://${HOST}:${PORT}` |
| `TRUSTED_PROXIES` | atrás de proxy | não | proxy reverso confiável para `request.ip()`: um IP, sub-rede ou apelido do `proxy-addr` (`loopback`, `uniquelocal`); ausente vale `loopback`. Nunca `true` | `172.16.0.0/12` |
| `CORS_ORIGIN` | em produção | não | origens do navegador autorizadas, separadas por vírgula; ausente fora de desenvolvimento recusa todo pedido cross-origin | `https://interclass.maiyu.com.br` |
| `COOKIE_DOMAIN` | em produção | não | `Domain` dos cookies de sessão: o menor domínio que cobre o site e a API | `.maiyu.com.br` |
| `DATABASE_URL` | sim | **sim** | conexão com o Postgres | `postgres://<usuario>:<senha>@localhost:5434/<banco>` |
| `DATABASE_SSL` | não | não | TLS na conexão; `true` para banco gerenciado que exige | `false` |
| `UPLOAD_MAX_SIZE` | sim | não | teto por arquivo, em bytes; sem default de propósito | `1073741824` |
| `STORAGE_KEY` | sim | **sim** | chave de acesso do bucket | `<segredo>` |
| `STORAGE_SECRET` | sim | **sim** | segredo do bucket | `<segredo>` |
| `STORAGE_BUCKET` | sim | não | nome do bucket (privado) | `interclasse` |
| `STORAGE_ENDPOINT` | sim | não | endpoint S3-compatível | `http://localhost:9004` |
| `STORAGE_FORCE_PATH_STYLE` | não | não | `true` no MinIO; ausente em R2, S3 e Spaces | `true` |
| `SEED_OWNER_EMAIL` | só no seeder | não | e-mail do administrador criado por `node ace db:seed` | `administrator@mail.com` |
| `SEED_OWNER_PASSWORD` | só no seeder | **sim** | senha desse administrador; sem ela o seeder para | `<segredo>` |
| `SEED_DEMO_PASSWORD` | não | **sim** | senha das contas de demonstração (`pnpm db:seed:demo`); ausente, a demonstração é pulada | `<segredo>` |

### Site (`frontend/`)

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `VITE_API_URL` | não | não | endereço da API visto pelo navegador, sem barra no fim; embutida no bundle em tempo de build. Ausente em dev, usa `http://localhost:3333` | `https://api-interclass.maiyu.com.br` |
| `SERVER_API_URL` | não | não | endereço da API visto de dentro do servidor de SSR (nome do serviço na rede do Docker); lida em runtime, nunca chega ao navegador. Ausente, o SSR usa `VITE_API_URL` | `http://api:3333` |

Regras:

- Segredo e credencial **não têm default**: o app não sobe sem eles.
- `VITE_*` vai para o navegador: nunca segredo. O `frontend/.env.production` é versionado por isso.
- `VITE_API_URL` é de build: trocar a variável do container não muda nada, só uma nova imagem.
- Em produção, `CORS_ORIGIN` e `COOKIE_DOMAIN` são exigidas, embora o schema as declare opcionais (em desenvolvimento, vazias é o certo).
- O `Dockerfile-production` da API traz valores de build só para satisfazer o schema durante `node ace build`; em runtime quem injeta é a plataforma.

## 2. Exemplo

`backend/.env.example` (versionado, só placeholder), na ordem dos blocos:

```dotenv
# Node
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=development

# App
LOG_LEVEL=info
APP_KEY=<segredo>
APP_SERVER_URL=http://${HOST}:${PORT}
# TRUSTED_PROXIES=172.16.0.0/12

# CORS (produção)
# CORS_ORIGIN=https://interclass.maiyu.com.br
# COOKIE_DOMAIN=.maiyu.com.br

# Banco de dados
DATABASE_URL=postgres://<usuario>:<senha>@localhost:5434/<banco>

# Armazenamento de arquivos
UPLOAD_MAX_SIZE=1073741824
STORAGE_KEY=<segredo>
STORAGE_SECRET=<segredo>
STORAGE_BUCKET=interclasse
STORAGE_ENDPOINT=http://localhost:9004
STORAGE_FORCE_PATH_STYLE=true

# Semeadura
SEED_OWNER_EMAIL=administrator@mail.com
SEED_OWNER_PASSWORD=<segredo>
```

`frontend/.env.example`:

```dotenv
VITE_API_URL=http://localhost:3333
```

## 3. Segredo fora do Git

`.gitignore` (raiz e apps): `.env` e `.env.local` ficam fora; `.env.example`, `.env.test` e
`frontend/.env.production` são versionados.

`backend/.env.test` tem só container local, senha de banco de teste, bucket `interclasse-test` e a
allowlist do CORS. O banco `interclasse_test` é separado do de desenvolvimento porque a suíte
roda `truncate()` entre os testes.

## 4. Por ambiente

| Ambiente | De onde vêm os valores | Observação |
|---|---|---|
| Desenvolvimento | `backend/.env` copiado de `backend/.env.example`; `docker compose up -d` sobe Postgres (5434) e MinIO (9004 e 9005) | portas deslocadas de propósito |
| Teste | `backend/.env.test` (versionado) | banco `interclasse_test` e bucket `interclasse-test`, descartáveis |
| Produção | painel do Coolify, uma aplicação para a API e outra para o site | nunca em arquivo no servidor de build |

Secrets de CI no repositório: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `COOLIFY_TOKEN`.

## 5. Primeira configuração

- [ ] `pnpm install` na raiz.
- [ ] `cp backend/.env.example backend/.env` e preencher cada `<segredo>`.
- [ ] Gerar `APP_KEY` com `node ace generate:key` (em `backend/`).
- [ ] Subir os serviços locais: `cd backend && docker compose up -d`.
- [ ] Rodar `node ace migration:run && node ace db:seed` (o seeder exige `SEED_OWNER_PASSWORD`).
- [ ] Rodar `pnpm dev` na raiz: o app valida as variáveis no boot e para se faltar alguma.
- [ ] Reiniciar o app depois de mudar o `.env`.
