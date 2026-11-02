import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import env from '#start/env'
import User from '#models/user'

/**
 * The first administrator. No endpoint creates an account without a session - the panel is
 * the only user entry door -, so without this seeder a new database
 * would have nowhere to start.
 *
 * Switched on by `SEED_OWNER_PASSWORD` having a value, in any environment
 * (_standards/backend.md §6.2): absent, it logs one line and skips, and the rest of
 * `db:seed` runs. The e-mail goes with the password.
 */
export default class extends BaseSeeder {
  override async run() {
    const email = env.get('SEED_OWNER_EMAIL')
    const password = env.get('SEED_OWNER_PASSWORD')

    if (!password) {
      console.info('[owner] SEED_OWNER_PASSWORD missing; administrator seed skipped.')
      return
    }

    /*
     * A password without an e-mail stops the seeder: there is no safe account to
     * guess, and a literal e-mail in the code would be a known login.
     */
    if (!email) {
      throw new Error(
        'SEED_OWNER_EMAIL missing. SEED_OWNER_PASSWORD needs the e-mail of the account.',
      )
    }

    // `updateOrCreate(searchPayload, savePayload)`: the first argument is only the
    // search key. Passing `password` in it would never match, because the column
    // stores the hash - and the record would be born without `name` or `password`, which are
    // `notNullable`.
    // `status` and `deletedAt` go in the `savePayload` even though they have a default in the
    // database: running the seeder is the recovery path when someone deactivates
    // or archives the last administrator through the panel. Without these two lines the
    // record would be found, updated and still unable to sign in.
    await User.updateOrCreate(
      { email },
      {
        name: 'Administrador',
        email,
        password,
        role: USER_ROLE.ADMINISTRATOR,
        status: ACTIVE_STATUS.ACTIVE,
        deletedAt: null,
      },
    )
  }
}
