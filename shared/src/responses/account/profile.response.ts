import { AdministratorUserShowResponse } from '../administrator/users.response.js'

/**
 * `GET /account` and `PUT /account` answer with the same account the panel sees: a
 * single shape, so the `PUT` response does not erase from the cache what `GET` delivered.
 */
export const AccountProfileShowResponse = AdministratorUserShowResponse

export type AccountProfileShowResponse = AdministratorUserShowResponse
