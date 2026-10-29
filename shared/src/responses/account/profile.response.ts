import { AdministratorUserShowResponse } from '../administrator/users.response.js'

/**
 * `GET /account` e `PUT /account` respondem a mesma conta que o painel vê: uma
 * forma só, para a resposta do `PUT` não apagar do cache o que o `GET` entregou.
 */
export const AccountProfileShowResponse = AdministratorUserShowResponse

export type AccountProfileShowResponse = AdministratorUserShowResponse
