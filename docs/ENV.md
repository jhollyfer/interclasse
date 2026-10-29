# Configuração de ambiente

**<Projeto>** · variáveis que o app precisa para rodar, local e em produção

> Exemplo e documentação usam placeholder; segredo real fica fora do Git.
> Variável nova entra aqui **e** em `.env.example` no mesmo commit. Quem valida é o schema do
> leitor de ENV (`_standards/backend.md` §6, `backend-fastify.md` §7); este arquivo explica.

## 1. Variáveis

Mesma ordem de blocos do `.env.example` (`backend.md` §6).

| Variável | App | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|---|
| `NODE_ENV` | api | sim | não | ambiente de execução | `development` |
| `PORT` | api | sim | não | porta HTTP | `3333` |
| `APP_KEY` | api | sim | **sim** | chave de cifra de sessão | `<segredo>` |
| `APP_URL` | api | sim | não | endereço público da API | `http://localhost:3333` |
| `DATABASE_URL` | api | sim | **sim** | conexão com o banco, só no servidor | `postgresql://<usuario>:<senha>@localhost:5432/<db>` |
| `VITE_API_URL` | web | sim | não | endereço da API visto pelo navegador | `http://localhost:3333` |
| `<NOME>` | <app> | <sim/não> | <sim/não> | <…> | <…> |

Regras (detalhe em `backend.md` §6):

- Segredo e credencial **não têm default**: o app não sobe sem eles.
- Default inseguro é escrito no comentário do `.env.example`, com o motivo.
- `VITE_*` vai para o navegador: nunca segredo.

## 2. Exemplo

`.env.example` (versionado, só placeholder):

```dotenv
# Node
NODE_ENV=development
PORT=3333

# App
APP_KEY=<segredo>
APP_URL=http://localhost:3333

# Banco de dados
DATABASE_URL=postgresql://<usuario>:<senha>@localhost:5432/<db>
```

## 3. Segredo fora do Git

`.gitignore`:

```gitignore
.env
.env.*
!.env.example
!.env.test
```

`.env.test` é versionado: só tem container local e senha de banco de teste.

## 4. Por ambiente

| Ambiente | De onde vêm os valores | Observação |
|---|---|---|
| Desenvolvimento | `.env` copiado de `.env.example` | localhost, chaves de dev |
| Teste | `.env.test` (versionado) | banco descartável |
| Preview | <painel da hospedagem> | credenciais separadas da produção |
| Produção | <painel da hospedagem / cofre> | nunca em arquivo no servidor de build |

## 5. Primeira configuração

- [ ] `cp .env.example .env`
- [ ] Trocar todo `<placeholder>` pelo valor real.
- [ ] Gerar `APP_KEY` (<comando>).
- [ ] Subir os serviços locais (<`docker compose up -d`>).
- [ ] Rodar o app: ele valida as variáveis no boot e para se faltar alguma.
- [ ] Reiniciar o app depois de mudar o `.env`.
