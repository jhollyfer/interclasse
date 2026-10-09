/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { signInAccountThrottle, signInThrottle, uploadThrottle } from '#start/limiter'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import { scalarPage } from '#core/openapi/scalar'
import openapi from '#config/openapi'

/**
 * As rotas são agrupadas por **papel**, e não por recurso : o que um
 * grupo tem em comum é quem pode entrar nele, e é o grupo que carrega o
 * middleware. Rota nova nasce protegida pelo módulo onde foi colocada, em vez
 * de depender de alguém lembrar de repetir a proteção.
 *
 * Os controllers vêm de `#generated/controllers`, gerado do diretório
 * `app/features`: mover ou renomear um arquivo quebra o build aqui, e não em
 * produção como uma string de caminho quebraria.
 */

/**
 * A raiz não é endpoint: manda para a documentação.
 *
 * Quem digita o domínio da API no navegador está procurando o que ela faz, e um
 * `404` na porta da frente é a resposta menos útil possível para essa pergunta.
 */
router.get('/', function (context) {
  // Não redireciona mais para `/documentation`: a referência é gateada, e
  // mandar todo mundo para uma rota que responde 404 é pior que responder aqui.
  return context.response.ok({ status: 'ok' })
})

/**
 * Sonda de saúde do container.
 *
 * Responde apenas "o processo está de pé e aceitando requisição", que é o que o
 * orquestrador precisa para decidir se manda tráfego. Não é o
 * `@adonisjs/core/health` de propósito: o `/health/ready` dele reporta uso de
 * disco, memória e contagem de conexões, e a própria documentação avisa que essa
 * resposta descreve a infraestrutura e precisa de header secreto. Uma sonda que
 * exige segredo para ser usada é uma sonda a menos.
 */
router.get('/health', function (context) {
  return context.response.ok({ status: 'ok' })
})

/**
 * Documentação da API.
 *
 * As duas rotas ficam fora de qualquer grupo autenticado, e as duas estão em
 * `openapi.ignore` junto com `/` e `/health` - o documento não se documenta.
 *
 * O JSON é lido do disco na primeira requisição e mantido em memória: é um
 * artefato gerado por `node ace openapi:generate` e commitado, então em produção
 * ele não muda enquanto o processo vive. Ler por requisição só gastaria I/O.
 */
let specification: string | undefined

router
  .get('/openapi.json', async function (context) {
    if (!specification) {
      specification = await readFile(app.makePath('openapi.json'), 'utf-8')
    }

    return context.response.header('content-type', 'application/json').send(specification)
  })
  .use(middleware.documentation())

router
  .get('/documentation', function (context) {
    return context.response
      .header('content-type', 'text/html')
      .send(scalarPage('/openapi.json', openapi.info.title))
  })
  .use(middleware.documentation())

/**
 * O site público. **Sem middleware algum**, e não por esquecimento: é a
 * característica do bloco - ler a tabela de jogos não exige conta.
 *
 * **Somente leitura.** Nada aqui cria, altera ou remove: um `POST` neste grupo
 * seria escrita anônima no banco.
 */
router
  .group(() => {
    router.get('sports', [controllers.storefront.sports.Paginate]).as('sports')
    router.get('announcements', [controllers.storefront.announcements.Paginate]).as('announcements')
    router.get('matches', [controllers.storefront.matches.Paginate]).as('matches')

    router
      .group(() => {
        router.get('/', [controllers.storefront.brackets.Paginate])
        router.get(':id', [controllers.storefront.brackets.Show])
      })
      .prefix('brackets')
      .as('brackets')
  })
  .prefix('storefront')
  .as('storefront')

/**
 * Sessão. Sem middleware de propósito - não é esquecimento, é a característica
 * do bloco: é a porta de entrada, e exigir sessão aqui a tornaria inalcançável.
 *
 * As três rotas respondem `204` sem corpo. O que muda de estado viaja no
 * `Set-Cookie`, com o par de tokens `httpOnly`.
 */
router
  .group(() => {
    router
      .post('sign-in', [controllers.authentication.SignIn])
      .use([signInThrottle, signInAccountThrottle])
    // O único do grupo que exige sessão: sair é apagar os tokens *desta*
    // sessão, e sem saber qual é ela não há o que apagar.
    router.post('sign-out', [controllers.authentication.SignOut]).use(middleware.auth())
    // Fora do `auth()` porque é o token de acesso vencido que traz alguém até
    // aqui. Quem autoriza é o cookie de refresh, e nada mais.
    router.post('refresh', [controllers.authentication.Refresh])
  })
  .prefix('authentication')
  .as('authentication')

/**
 * A própria conta, seja qual for o papel.
 *
 * Sem identificador no caminho: o escopo vem da sessão, nunca do payload. O
 * `middleware.auth()` está no grupo, e não em cada rota - sem sessão o papel é
 * desconhecido, e a resposta é 401, nunca 403.
 */
router
  .group(() => {
    router.get('/', [controllers.account.Show])
    router.put('/', [controllers.account.Update])
  })
  .prefix('account')
  .as('profile')
  .use(middleware.auth())

/**
 * Anexos, na raiz autenticada como `/account`: todo papel do painel envia
 * arquivo, e o registro nasce sem dono porque quem anexa é que guarda a
 * referência.
 *
 * O upload tem três passos, e não um, porque o binário não passa por aqui: o `POST` abre e devolve URLs assinadas, o navegador sobe as partes
 * direto no bucket, e o `complete` confirma. O `GET :id/parts` é o quarto
 * caminho, e o mesmo para dois casos - retomar depois de uma queda e buscar o
 * próximo lote de URLs de um arquivo com partes demais.
 *
 * O `DELETE` é o par do `POST` e serve aos dois estados: cancela o upload em
 * andamento e apaga o arquivo pronto. Só alcança arquivo órfão - como o
 * registro é neutro e compartilhado, a posse não serve de autorização, e quem
 * decide é a referência viva.
 *
 * As duas leituras - `GET /` e `GET :id` - são a biblioteca de arquivos do
 * painel, que `backend-old` servia em `/storage/paginate` e `/storage/:id`. Não
 * há `PUT`: arquivo não se edita, se troca.
 */
router
  .group(() => {
    router.get('/', [controllers.storages.Paginate])
    router.post('/', [controllers.storages.Create])
    router.post(':id/complete', [controllers.storages.Complete]).as('complete')
    router.get(':id/parts', [controllers.storages.Parts]).as('parts')
    // Depois de `:id/parts`: o caminho de duas partes é o mais específico, e
    // registrado antes ele não pode ser engolido pelo genérico.
    router.get(':id', [controllers.storages.Show])
    router.delete(':id', [controllers.storages.Delete])

    // O download com o nome original entra aqui, e não mais solto.
    //
    // Ficava fora porque o bucket era público: exigir sessão só nesta rota
    // trancaria a porta da frente com a dos fundos aberta. Com o disco privado
    // a porta dos fundos fechou, e esta passa a valer - solta, ela virou a
    // própria porta dos fundos, emitindo URL assinada para qualquer uuid sem
    // sessão. O `<a>` de salvar arquivo continua funcionando: navegação de
    // mesmo site manda o cookie.
    router.get(':id/download', [controllers.storages.Download]).as('download')
  })
  .prefix('storages')
  .as('storages')
  .use(middleware.auth())
  .use(uploadThrottle)

/**
 * Painel administrativo: a organização dos jogos.
 *
 * `auth()` **antes** de `role()`, e os dois no grupo: sem sessão o papel do
 * requisitante ainda é desconhecido, e a resposta é `401` e não `403`. Estando
 * no grupo, uma rota nova nasce protegida pelo módulo onde foi colocada.
 */
router
  .group(() => {
    router
      .group(() => {
        router.get('/', [controllers.administrator.classrooms.Paginate])
        router.post('/', [controllers.administrator.classrooms.Create])
        router.get(':id', [controllers.administrator.classrooms.Show])
        router.put(':id', [controllers.administrator.classrooms.Update])
        router.delete(':id', [controllers.administrator.classrooms.Delete])
      })
      .prefix('classrooms')
      .as('classrooms')

    router
      .group(() => {
        router.get('/', [controllers.administrator.sports.Paginate])
        router.post('/', [controllers.administrator.sports.Create])
        router.get(':id', [controllers.administrator.sports.Show])
        router.put(':id', [controllers.administrator.sports.Update])
        router.delete(':id', [controllers.administrator.sports.Delete])
      })
      .prefix('sports')
      .as('sports')

    router
      .group(() => {
        router.get('/', [controllers.administrator.announcements.Paginate])
        router.post('/', [controllers.administrator.announcements.Create])
        router.get(':id', [controllers.administrator.announcements.Show])
        router.put(':id', [controllers.administrator.announcements.Update])
        router.delete(':id', [controllers.administrator.announcements.Delete])
      })
      .prefix('announcements')
      .as('announcements')

    /**
     * As chaves. `POST /` é o sorteio, que já monta o mata-mata inteiro. Não há
     * `PUT`: chave não se edita, se apaga e sorteia de novo.
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.brackets.Paginate])
        router.post('/', [controllers.administrator.brackets.Create])
        router.get(':id', [controllers.administrator.brackets.Show])
        router.delete(':id', [controllers.administrator.brackets.Delete])
      })
      .prefix('brackets')
      .as('brackets')

    /**
     * As partidas nascem do sorteio, nunca à mão: aqui só se
     * agenda (`PUT :id`), se lança placar (`PUT :id/score`) e se desfaz o
     * placar errado (`DELETE :id/score`).
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.matches.Paginate])
        router.put(':id', [controllers.administrator.matches.Update])
        router.put(':id/score', [controllers.administrator.matches.Score]).as('score')
        router.delete(':id/score', [controllers.administrator.matches.Unscore]).as('unscore')
      })
      .prefix('matches')
      .as('matches')

    /**
     * Contas de acesso. O ciclo de vida mora no subgrupo `lifecycle` por causa
     * do nome derivado da rota: com `archive`, `unarchive` e `delete` num grupo
     * plano, os nomes colidiriam.
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.users.Paginate])
        router.post('/', [controllers.administrator.users.Create])
        router.get(':id', [controllers.administrator.users.Show])
        router.put(':id', [controllers.administrator.users.Update])
      })
      .prefix('users')
      .as('users')

    router
      .group(() => {
        router
          .group(() => {
            router.patch(':id/archive', [controllers.administrator.users.Archive]).as('archive')
            router
              .patch(':id/unarchive', [controllers.administrator.users.Unarchive])
              .as('unarchive')
            router.delete(':id', [controllers.administrator.users.Delete]).as('purge')
          })
          .prefix('users')
          .as('users')
      })
      .as('lifecycle')
  })
  .prefix('administrator')
  .as('administrator')
  .use(middleware.auth())
  .use(middleware.role(['ADMINISTRATOR']))

/**
 * O professor conselheiro: alunos e inscrições das turmas que aconselha.
 *
 * O administrador entra junto para cobrir a falta de um conselheiro. Qual turma
 * cada um alcança não é regra de rota - é a `ClassroomPolicy`, por registro.
 */
router
  .group(() => {
    router.get('classrooms', [controllers.advisor.classrooms.Paginate]).as('classrooms')

    router
      .group(() => {
        router.get('/', [controllers.advisor.students.Paginate])
        router.post('/', [controllers.advisor.students.Create])
        router.put(':id', [controllers.advisor.students.Update])
        router.delete(':id', [controllers.advisor.students.Delete])
      })
      .prefix('students')
      .as('students')

    router
      .group(() => {
        router.get('/', [controllers.advisor.enrollments.Show])
        router.put('/', [controllers.advisor.enrollments.Update])
      })
      .prefix('enrollments')
      .as('enrollments')
  })
  .prefix('advisor')
  .as('advisor')
  .use(middleware.auth())
  .use(middleware.role(['ADMINISTRATOR', 'ADVISOR']))

/**
 * O aluno representante: a lista de atletas da própria turma, e nada além.
 * Sem identificador no caminho - a turma sai da sessão.
 */
router
  .group(() => {
    router.get('/', [controllers.representative.enrollments.Show])
    router.put('/', [controllers.representative.enrollments.Update])
  })
  .prefix('representative/enrollments')
  .as('representative.enrollments')
  .use(middleware.auth())
  .use(middleware.role(['REPRESENTATIVE']))
