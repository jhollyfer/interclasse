import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import env from '#start/env'
import User from '#models/user'

/**
 * The first administrator. No endpoint creates an account without a session - the panel is
 * the only user entry door -, so without this seeder a new database
 * would have nowhere to start.
 */
export default class extends BaseSeeder {
  /**
   * Outside production: there the first administrator is created by hand, and this
   * record would be just a known default credential with administrator
   * power.
   */
  static override environment = ['development', 'test']

  override async run() {
    const email = env.get('SEED_ADMINISTRATOR_EMAIL') ?? 'administrator@mail.com'
    const password = env.get('SEED_ADMINISTRATOR_PASSWORD')

    /*
     * Without a password the seeder stops, and does not invent one.
     *
     * It used to be a literal here, and the repository is the wrong place for a
     * credential: whoever read this file signed in as administrator in every environment
     * that had run the seeder - production included. A default,
     * even a "temporary" one, goes back to being exactly that.
     *
     * Failing here is safe because the seeder runs by hand: the application starts without this
     * variable, and only whoever seeds needs it.
     */
    if (!password) {
      throw new Error(
        'SEED_ADMINISTRATOR_PASSWORD missing. Set a password in the environment before running the seeder: ' +
          'SEED_ADMINISTRATOR_PASSWORD=<password> node ace db:seed',
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
