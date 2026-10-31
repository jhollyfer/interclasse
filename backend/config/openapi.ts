import env from '#start/env'

/**
 * OpenAPI document configuration.
 *
 * Only what cannot be derived from the code lives here. Route, method, path
 * parameters, authentication requirement and roles come from the router itself at
 * generation time (`app/core/openapi/document.ts`); payload and response come from the
 * VineJS schemas and the models. What remains is the document identity and the human
 * label of a tag.
 */

/**
 * Name of the security scheme referenced by every authenticated operation.
 *
 * It is `apiKey` in a cookie, not `bearer`: the application guard reads the token from
 * `request.cookie('access-token')` and has no fallback to the `Authorization`
 * header (`app/guards/cookie-access-tokens.guard.ts`). Documenting bearer here would
 * make Scalar's "Test Request" always fail.
 */
export const SECURITY_SCHEME = 'cookieAuth'

/**
 * Cookie that carries the access token. Mirrors `COOKIE_TOKEN.ACCESS` of
 * `config/cookie.ts`.
 */
export const SECURITY_COOKIE = 'access-token'

/**
 * Label of an operation group in the Scalar sidebar.
 *
 * Matching is by **path** prefix, not by route name: the panel lifecycle subgroup is
 * `.as('lifecycle')`, so deleting a user is called
 * `administrator.lifecycle.users.purge`. The path (`/administrator/users/:id`)
 * does not have that problem.
 *
 * The prefixes are disjoint on purpose. Every registered route matches exactly one
 * rule, and the generator warns about the one that matches none.
 */
export type TagRule = {
  prefix: string
  name: string
  description: string
  /**
   * The resource noun, used to build each operation's summary:
   * `create` + `sport` -> "Create sport". Writing the pair once per group covers its
   * seven operations, instead of one summary per controller.
   */
  singular?: string
  plural?: string
}

const tags: TagRule[] = [
  {
    prefix: '/authentication',
    name: 'Authentication',
    description:
      'Sign in, sign out and session renewal. The token pair travels in an `httpOnly` cookie, ' +
      'so these routes answer `204` with no body - what matters is the `Set-Cookie`.',
    singular: 'session',
    plural: 'sessions',
  },
  {
    prefix: '/account',
    name: 'Account',
    description:
      'The account itself, whatever the role. No identifier in the path: the scope comes from the ' +
      'session, never from the payload - whoever edits is always whoever is authenticated.',
    singular: 'account',
    plural: 'accounts',
  },
  {
    prefix: '/storages',
    name: 'Attachments',
    description:
      'Upload in three steps, because the binary does **not** cross this application: ' +
      '`POST` opens and returns signed URLs, the browser uploads the parts straight to the bucket, and ' +
      '`complete` confirms against the real object. The record is born without an owner - whoever attaches ' +
      'keeps the reference.',
    singular: 'attachment',
    plural: 'attachments',
  },
  {
    prefix: '/administrator/classrooms',
    name: 'Panel · Classrooms',
    description:
      'The classrooms that compete. The category (Fundamental 1 or 2) comes from the grade, and each classroom has ' +
      'a teacher advisor and a student representative.',
    singular: 'classroom',
    plural: 'classrooms',
  },
  {
    prefix: '/administrator/sports',
    name: 'Panel · Sports',
    description:
      'Futsal, volleyball, dodgeball... Each with its minimum and maximum athletes per team.',
    singular: 'sport',
    plural: 'sports',
  },
  {
    prefix: '/administrator/announcements',
    name: 'Panel · Announcements',
    description: 'The announcements the site shows. Pinned ones appear first.',
    singular: 'announcement',
    plural: 'announcements',
  },
  {
    prefix: '/administrator/reports',
    name: 'Panel · Reports',
    description:
      'How many classrooms, students and athletes took part in the games, on screen or as CSV.',
    singular: 'report',
    plural: 'reports',
  },
  {
    prefix: '/administrator/photos',
    name: 'Panel · Photos',
    description:
      'The site carousel photos. Those from the advisor arrive pending and only go live ' +
      'once approved.',
    singular: 'photo',
    plural: 'photos',
  },
  {
    prefix: '/administrator/site',
    name: 'Panel · Site',
    description:
      'The games "About" and the PDF regulation the public site shows. A single configuration.',
    singular: 'configuration',
    plural: 'configurations',
  },
  {
    prefix: '/administrator/brackets',
    name: 'Panel · Brackets',
    description:
      'The draw of a sport in a category, which builds the whole knockout. A bracket is not ' +
      'edited: delete it and draw again.',
    singular: 'bracket',
    plural: 'brackets',
  },
  {
    prefix: '/administrator/matches',
    name: 'Panel · Matches',
    description: 'The schedule and the score. Matches are born from the draw, never by hand.',
    singular: 'match',
    plural: 'matches',
  },
  {
    prefix: '/administrator/cards',
    name: 'Panel · Cards',
    description: 'The yellow and red cards athletes received in matches.',
    singular: 'card',
    plural: 'cards',
  },
  {
    prefix: '/administrator/enrollment-removals',
    name: 'Panel · Athlete removals',
    description: 'The notice for each athlete the advisor removed from a sport, with the reason.',
    singular: 'removal notice',
    plural: 'removal notices',
  },
  {
    prefix: '/administrator/users',
    name: 'Panel · Users',
    description:
      'The access accounts: administrators, teacher advisors and student representatives. ' +
      'There is no public sign-up - every account is born here. The password is never returned in any response.',
    singular: 'user',
    plural: 'users',
  },
  {
    prefix: '/advisor',
    name: 'Advisor',
    description:
      'The students and enrollments of the classrooms the teacher advises. A classroom of ' +
      'another advisor answers `404`.',
    singular: 'classroom',
    plural: 'classrooms',
  },
  {
    prefix: '/representative',
    name: 'Representative',
    description:
      'The athlete list of their own classroom, per sport. The classroom comes from the session.',
    singular: 'enrollment',
    plural: 'enrollments',
  },
  {
    prefix: '/storefront',
    name: 'Site',
    description:
      'The public site, **unauthenticated** and read-only: match table, standings, ' +
      'brackets and announcements.',
    singular: 'item',
    plural: 'items',
  },
]

const openapi = {
  info: {
    title: 'API Interclasse',
    version: '1.0.0',
    description:
      'Student Games API: classrooms, enrollments, draw, match table, score and ' +
      'standings, with panels for the organization, the advisor and the representative.\n\n' +
      'The site (`/storefront`) answers without a session. Everything else requires the `httpOnly` cookie ' +
      '`access-token`, issued by `POST /authentication/sign-in` and renewed by ' +
      '`POST /authentication/refresh`.\n\n' +
      'Every failure returns the same body: `{ message, status, code, errors? }`, where `code` is the ' +
      'machine identifier and `errors` maps field to message when the failure is per ' +
      'field.',
  },

  servers: [{ url: env.get('APP_SERVER_URL'), description: 'Current server' }],

  /** Paths that never enter the document: they are not API operations. */
  ignore: ['/documentation', '/openapi.json', '/health-check'],

  tags,
}

/**
 * Fixed summary for a domain action of this project - or one that needs another
 * phrase.
 *
 * `scripts/openapi/emit.ts` is the same in every house project, so its action table
 * is about mechanism: `create`, `paginate`, `show`, `update`, `archive`,
 * `unarchive`, `delete` plus the session and upload ones. A domain name there would
 * become a wrong summary in another project, and this file - which belongs to the
 * project - is the place to say what only holds here.
 *
 * The key is the controller file name without the suffix, and the value beats
 * everything: if it is here, neither the mechanism table nor the group noun
 * is consulted.
 */
export const ACTION_OVERRIDES: Record<string, string> = {
  score: 'Enter score',
  unscore: 'Undo score',
}

export default openapi
