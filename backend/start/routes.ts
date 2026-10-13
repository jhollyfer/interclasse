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

/** Sonda de vida do container; o porquê está no controller. */
router.get('/health-check', [controllers.HealthCheck])

/**
 * Documentação da API.
 *
 * As duas rotas ficam fora de qualquer grupo autenticado, e as duas estão em
 * `openapi.ignore` junto com `/` e `/health-check` - o documento não se documenta.
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
    router.get('sports', [controllers.storefront.sports.paginate.Paginate]).as('sports')
    router
      .get('announcements', [controllers.storefront.announcements.paginate.Paginate])
      .as('announcements')
    router.get('matches', [controllers.storefront.matches.paginate.Paginate]).as('matches')

    router
      .group(() => {
        router.get('/', [controllers.storefront.brackets.paginate.Paginate])
        router.get(':id', [controllers.storefront.brackets.show.Show])
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
      .post('sign-in', [controllers.authentication.sessions.signIn.SignIn])
      .use([signInThrottle, signInAccountThrottle])
    // O único do grupo que exige sessão: sair é apagar os tokens *desta*
    // sessão, e sem saber qual é ela não há o que apagar.
    router
      .post('sign-out', [controllers.authentication.sessions.signOut.SignOut])
      .use(middleware.auth())
    // Fora do `auth()` porque é o token de acesso vencido que traz alguém até
    // aqui. Quem autoriza é o cookie de refresh, e nada mais.
    router.post('refresh', [controllers.authentication.sessions.refresh.Refresh])
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
    router.get('/', [controllers.account.profile.show.Show])
    router.put('/', [controllers.account.profile.update.Update])
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
 * painel. Não há `PUT`: arquivo não se edita, se troca.
 */
router
  .group(() => {
    router.get('/', [controllers.storages.files.paginate.Paginate])
    router.post('/', [controllers.storages.files.create.Create])
    router.post(':id/complete', [controllers.storages.files.complete.Complete]).as('complete')
    router.get(':id/parts', [controllers.storages.files.parts.Parts]).as('parts')
    // Depois de `:id/parts`: o caminho de duas partes é o mais específico, e
    // registrado antes ele não pode ser engolido pelo genérico.
    router.get(':id', [controllers.storages.files.show.Show])
    router.delete(':id', [controllers.storages.files.delete.Delete])

    // O download com o nome original entra aqui, e não mais solto.
    //
    // Ficava fora porque o bucket era público: exigir sessão só nesta rota
    // trancaria a porta da frente com a dos fundos aberta. Com o disco privado
    // a porta dos fundos fechou, e esta passa a valer - solta, ela virou a
    // própria porta dos fundos, emitindo URL assinada para qualquer uuid sem
    // sessão. O `<a>` de salvar arquivo continua funcionando: navegação de
    // mesmo site manda o cookie.
    router.get(':id/download', [controllers.storages.files.download.Download]).as('download')
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
        router.get('/', [controllers.administrator.classrooms.paginate.Paginate])
        router.post('/', [controllers.administrator.classrooms.create.Create])
        router.get(':id', [controllers.administrator.classrooms.show.Show])
        router.put(':id', [controllers.administrator.classrooms.update.Update])
        router.delete(':id', [controllers.administrator.classrooms.delete.Delete])
      })
      .prefix('classrooms')
      .as('classrooms')

    router
      .group(() => {
        router.get('/', [controllers.administrator.sports.paginate.Paginate])
        router.post('/', [controllers.administrator.sports.create.Create])
        router.get(':id', [controllers.administrator.sports.show.Show])
        router.put(':id', [controllers.administrator.sports.update.Update])
        router.delete(':id', [controllers.administrator.sports.delete.Delete])
      })
      .prefix('sports')
      .as('sports')

    router
      .group(() => {
        router.get('/', [controllers.administrator.announcements.paginate.Paginate])
        router.post('/', [controllers.administrator.announcements.create.Create])
        router.get(':id', [controllers.administrator.announcements.show.Show])
        router.put(':id', [controllers.administrator.announcements.update.Update])
        router.delete(':id', [controllers.administrator.announcements.delete.Delete])
      })
      .prefix('announcements')
      .as('announcements')

    /**
     * As chaves. `POST /` é o sorteio, que já monta o mata-mata inteiro. Não há
     * `PUT`: chave não se edita, se apaga e sorteia de novo.
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.brackets.paginate.Paginate])
        router.post('/', [controllers.administrator.brackets.create.Create])
        router.get(':id', [controllers.administrator.brackets.show.Show])
        router.delete(':id', [controllers.administrator.brackets.delete.Delete])
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
        router.get('/', [controllers.administrator.matches.paginate.Paginate])
        router.put(':id', [controllers.administrator.matches.update.Update])
        router.put(':id/score', [controllers.administrator.matches.score.Score]).as('score')
        router
          .delete(':id/score', [controllers.administrator.matches.unscore.Unscore])
          .as('unscore')
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
        router.get('/', [controllers.administrator.users.paginate.Paginate])
        router.post('/', [controllers.administrator.users.create.Create])
        router.get(':id', [controllers.administrator.users.show.Show])
        router.put(':id', [controllers.administrator.users.update.Update])
      })
      .prefix('users')
      .as('users')

    router
      .group(() => {
        router
          .group(() => {
            router
              .patch(':id/archive', [controllers.administrator.users.archive.Archive])
              .as('archive')
            router
              .patch(':id/unarchive', [controllers.administrator.users.unarchive.Unarchive])
              .as('unarchive')
            router.delete(':id', [controllers.administrator.users.delete.Delete]).as('purge')
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
    router.get('classrooms', [controllers.advisor.classrooms.paginate.Paginate]).as('classrooms')

    router
      .group(() => {
        router.get('/', [controllers.advisor.students.paginate.Paginate])
        router.post('/', [controllers.advisor.students.create.Create])
        router.put(':id', [controllers.advisor.students.update.Update])
        router.delete(':id', [controllers.advisor.students.delete.Delete])
      })
      .prefix('students')
      .as('students')

    router
      .group(() => {
        router.get('/', [controllers.advisor.enrollments.show.Show])
        router.put('/', [controllers.advisor.enrollments.update.Update])
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
    router.get('/', [controllers.representative.enrollments.show.Show])
    router.put('/', [controllers.representative.enrollments.update.Update])
  })
  .prefix('representative/enrollments')
  .as('representative.enrollments')
  .use(middleware.auth())
  .use(middleware.role(['REPRESENTATIVE']))
