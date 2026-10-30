import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { USER_SORT_COLUMNS } from '@interclasse/shared'

import AdministratorUserPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorUserPaginateValidator } from '#validators/administrator/users.validator'

@inject()
export default class AdministratorUserPaginateController {
  static docs = defineDocs({
    summary: 'Listar usuários',
    description:
      'Listagem paginada. `?role` e `?status` são os dois recortes da tela, `?search` filtra ' +
      'por nome e e-mail, e `?trashed` alcança os arquivados.\n\n' +
      'A senha não sai aqui nem em resposta nenhuma da API.\n\n' +
      // A lista sai da própria tupla: escrita à mão, a documentação passaria a
      // prometer uma coluna no dia em que alguém a tirasse do validator.
      `\`?sort\` aceita ${USER_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: página 1, 20 por página, ordenada por nome crescente.',
  })

  constructor(private readonly useCase: AdministratorUserPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(AdministratorUserPaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
