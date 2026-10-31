/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { USER_ROLE } from '@interclasse/shared'

import {
  accountUpdateThrottle,
  refreshThrottle,
  reportExportThrottle,
  signInAccountThrottle,
  signInThrottle,
  uploadThrottle,
} from '#start/limiter'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

/**
 * Routes are grouped by **role**, not by resource: what a
 * group has in common is who can enter it, and it is the group that carries the
 * middleware. A new route is born protected by the module where it was placed, instead
 * of depending on someone remembering to repeat the protection.
 *
 * The controllers come from `#generated/controllers`, generated from the
 * `app/features` directory: moving or renaming a file breaks the build here, and not in
 * production as a path string would.
 */

/** Container liveness probe; the why is in the controller. */
router.get('/health-check', [controllers.HealthCheck]).as('health-check')

/**
 * API documentation: the document and the browsable reference. Outside any
 * authenticated group, in `openapi.ignore` together with `/health-check` - the
 * document does not document itself -, and behind `middleware.documentation()`.
 */
router
  .get('/openapi.json', [controllers.documentation.openapi.show.Show])
  .as('documentation.openapi')
  .use(middleware.documentation())
router
  .get('/documentation', [controllers.documentation.reference.show.Show])
  .as('documentation.reference')
  .use(middleware.documentation())

/**
 * The public site. **No middleware at all**, and not by oversight: it is the
 * characteristic of the block - reading the match table does not require an account.
 *
 * **Read-only.** Nothing here creates, changes or removes: a `POST` in this group
 * would be an anonymous write to the database.
 */
router
  .group(() => {
    router.get('sports', [controllers.storefront.sports.paginate.Paginate]).as('sports')
    router
      .get('announcements', [controllers.storefront.announcements.paginate.Paginate])
      .as('announcements')
    router.get('matches', [controllers.storefront.matches.paginate.Paginate]).as('matches')
    router.get('site', [controllers.storefront.site.show.Show]).as('site')
    router.get('photos', [controllers.storefront.photos.paginate.Paginate]).as('photos')

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
 * Session. No middleware on purpose - not an oversight, it is the characteristic
 * of the block: it is the entry door, and requiring a session here would make it unreachable.
 *
 * The three routes answer `204` with no body. What changes state travels in
 * `Set-Cookie`, with the `httpOnly` token pair.
 */
router
  .group(() => {
    router
      .post('sign-in', [controllers.authentication.sessions.signIn.SignIn])
      .use([signInThrottle, signInAccountThrottle])
    // The only one in the group that requires a session: signing out is erasing the tokens of *this*
    // session, and without knowing which one it is there is nothing to erase.
    router
      .post('sign-out', [controllers.authentication.sessions.signOut.SignOut])
      .use(middleware.auth())
    // Outside `auth()` because it is the expired access token that brings someone here.
    // Who authorizes is the refresh cookie, and nothing else.
    router
      .post('refresh', [controllers.authentication.sessions.refresh.Refresh])
      .use(refreshThrottle)
  })
  .prefix('authentication')
  .as('authentication')

/**
 * The account itself, whatever the role.
 *
 * No identifier in the path: the scope comes from the session, never from the payload. The
 * `middleware.auth()` is on the group, not on each route - without a session the role is
 * unknown, and the answer is 401, never 403.
 */
router
  .group(() => {
    router.get('/', [controllers.account.profile.show.Show])
    router.put('/', [controllers.account.profile.update.Update]).use(accountUpdateThrottle)
  })
  .prefix('account')
  .as('profile')
  .use(middleware.auth())

/**
 * Attachments, at the authenticated root like `/account`: every panel role uploads a
 * file, and the record is born without an owner because whoever attaches
 * keeps the reference.
 *
 * The upload has three steps, not one, because the binary does not pass through here: `POST` opens and returns signed URLs, the browser uploads the parts
 * straight to the bucket, and `complete` confirms. `GET :id/parts` is the fourth
 * path, and the same for two cases - resuming after a drop and fetching the
 * next batch of URLs for a file with too many parts.
 *
 * `DELETE` is the pair of `POST` and serves both states: it cancels the upload in
 * progress and deletes the finished file. It only reaches orphan files - since the
 * record is neutral and shared, ownership does not serve as authorization, and what
 * decides is the live reference.
 *
 * The two reads - `GET /` and `GET :id` - are the panel file library.
 * There is no `PUT`: a file is not edited, it is replaced.
 */
router
  .group(() => {
    router.get('/', [controllers.storages.files.paginate.Paginate])
    router.post('/', [controllers.storages.files.create.Create]).use(uploadThrottle)
    router
      .post(':id/complete', [controllers.storages.files.complete.Complete])
      .as('complete')
      .use(uploadThrottle)
    router
      .get(':id/parts', [controllers.storages.files.parts.Parts])
      .as('parts')
      .use(uploadThrottle)
    // After `:id/parts`: the two-segment path is the most specific, and
    // registered before it, it cannot be swallowed by the generic one.
    router.get(':id', [controllers.storages.files.show.Show])
    router.delete(':id', [controllers.storages.files.delete.Delete])

    // The download with the original name goes here, and no longer loose.
    //
    // It used to be outside because the bucket was public: requiring a session only on this route
    // would lock the front door with the back door open. With the private disk
    // the back door closed, and this one now counts - loose, it became the
    // back door itself, issuing a signed URL for any uuid without a
    // session. The save-file `<a>` keeps working: same-site
    // navigation sends the cookie.
    router.get(':id/download', [controllers.storages.files.download.Download]).as('download')
  })
  .prefix('storages')
  .as('storages')
  .use(middleware.auth())

/**
 * Administrative panel: the organization of the games.
 *
 * `auth()` **before** `role()`, and both on the group: without a session the requester's
 * role is still unknown, and the answer is `401` and not `403`. Being
 * on the group, a new route is born protected by the module where it was placed.
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
        router.get('/', [controllers.administrator.reports.show.Show])
        router
          .get('csv', [controllers.administrator.reports.export.Export])
          .as('export')
          .use(reportExportThrottle)
      })
      .prefix('reports')
      .as('reports')

    router
      .group(() => {
        router.get('/', [controllers.administrator.photos.paginate.Paginate])
        router.post('/', [controllers.administrator.photos.create.Create])
        router.put(':id/review', [controllers.administrator.photos.review.Review]).as('review')
        router.delete(':id', [controllers.administrator.photos.delete.Delete])
      })
      .prefix('photos')
      .as('photos')

    router
      .group(() => {
        router.get('/', [controllers.administrator.site.show.Show])
        router.put('/', [controllers.administrator.site.update.Update])
      })
      .prefix('site')
      .as('site')

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
     * The brackets. `POST /` is the draw, which already builds the whole knockout. There is no
     * `PUT`: a bracket is not edited, it is deleted and drawn again.
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.brackets.paginate.Paginate])
        router.post('/', [controllers.administrator.brackets.create.Create])
        // Before `:id`: otherwise `preview` would be read as a bracket id.
        router.get('preview', [controllers.administrator.brackets.preview.Preview]).as('preview')
        router.get(':id', [controllers.administrator.brackets.show.Show])
        router.delete(':id', [controllers.administrator.brackets.delete.Delete])
      })
      .prefix('brackets')
      .as('brackets')

    /**
     * Matches are born from the draw, never by hand: here one only
     * schedules (`PUT :id`), enters a score (`PUT :id/score`) and undoes a
     * wrong score (`DELETE :id/score`).
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.matches.paginate.Paginate])
        router.put(':id', [controllers.administrator.matches.update.Update])
        router.put(':id/score', [controllers.administrator.matches.score.Score]).as('score')
        router
          .get(':id/athletes', [controllers.administrator.matches.athletes.Athletes])
          .as('athletes')
        router
          .delete(':id/score', [controllers.administrator.matches.unscore.Unscore])
          .as('unscore')
      })
      .prefix('matches')
      .as('matches')

    /** The yellow and red cards athletes received in matches. */
    router
      .group(() => {
        router.get('/', [controllers.administrator.cards.paginate.Paginate])
        router.post('/', [controllers.administrator.cards.create.Create])
        router.delete(':id', [controllers.administrator.cards.delete.Delete])
      })
      .prefix('cards')
      .as('cards')

    /**
     * The notices of an athlete removed from a sport by the advisor, with the reason.
     * They are born from writing the list (`PUT /advisor/enrollments`), never from here.
     */
    router
      .group(() => {
        router.get('/', [controllers.administrator.enrollmentRemovals.paginate.Paginate])
        router
          .patch(':id/acknowledge', [
            controllers.administrator.enrollmentRemovals.acknowledge.Acknowledge,
          ])
          .as('acknowledge')
      })
      .prefix('enrollment-removals')
      .as('enrollmentRemovals')

    /**
     * Access accounts. The lifecycle lives in the `lifecycle` subgroup because of
     * the route-derived name: with `archive`, `unarchive` and `delete` in a flat
     * group, the names would collide.
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
  .use(middleware.role([USER_ROLE.ADMINISTRATOR]))

/**
 * The teacher advisor: students and enrollments of the classrooms they advise.
 *
 * The administrator comes in too, to cover for a missing advisor. Which classroom
 * each one reaches is not a route rule - it is the query scope in `ClassroomRepository` (`findOwned`).
 */
router
  .group(() => {
    router.get('classrooms', [controllers.advisor.classrooms.paginate.Paginate]).as('classrooms')
    router.get('cards', [controllers.advisor.cards.paginate.Paginate]).as('cards')

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
        router.get('/', [controllers.advisor.photos.paginate.Paginate])
        router.post('/', [controllers.advisor.photos.create.Create])
        router.delete(':id', [controllers.advisor.photos.delete.Delete])
      })
      .prefix('photos')
      .as('photos')

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
  .use(middleware.role([USER_ROLE.ADMINISTRATOR, USER_ROLE.ADVISOR]))

/**
 * The student representative: the athlete list of their own classroom, and nothing else.
 * No identifier in the path - the classroom comes from the session.
 */
router
  .group(() => {
    router.get('/', [controllers.representative.enrollments.show.Show])
    router.put('/', [controllers.representative.enrollments.update.Update])
  })
  .prefix('representative/enrollments')
  .as('representative.enrollments')
  .use(middleware.auth())
  .use(middleware.role([USER_ROLE.REPRESENTATIVE]))
