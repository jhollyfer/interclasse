import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFilePaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { FilePaginateValidator, STORAGE_SORT_COLUMNS } from '#validators/storages/files.validator'
import { STORAGE_MIMETYPES } from '#core/validator'

@inject()
export default class StoragesFilePaginateController {
  static docs = defineDocs({
    summary: 'Listar arquivos',
    description:
      'A biblioteca de arquivos do painel. `?search` filtra por nome original, nome gerado e ' +
      'tipo, `?status` separa o que já subiu do upload em aberto, e `?mimetype` recorta um ' +
      'tipo só.\n\n' +
      // As duas listas saem das próprias tuplas: escritas à mão, a documentação
      // passaria a prometer um valor no dia em que alguém o tirasse do validator.
      `\`?mimetype\` aceita ${STORAGE_MIMETYPES.join(', ')}.\n\n` +
      `\`?sort\` aceita ${STORAGE_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'Padrão: página 1, 20 por página, do mais recente para o mais antigo - numa biblioteca ' +
      'de arquivos o que interessa é o que acabou de subir.',
  })

  constructor(private readonly useCase: StoragesFilePaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(FilePaginateValidator, {
      data: context.request.qs(),
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
