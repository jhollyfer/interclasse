import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileCompleteUseCase from './complete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { FileCompleteValidator } from '#features/storages/files/files.validator'

@inject()
export default class StoragesFileCompleteController {
  static docs = defineDocs({
    summary: 'Confirmar upload de arquivo',
    description:
      'Fecha o upload aberto por `POST /storages`: o bucket remonta as partes e a linha passa ' +
      'a `UPLOADED`, que é o único estado que pode ser anexado a alguma coisa.\n\n' +
      'O corpo traz o `ETag` que cada `PUT` de parte devolveu - é assim que o storage confere ' +
      'que nenhuma parte se perdeu ou chegou pela metade. Upload de parte única não tem parte ' +
      'para confirmar, e `parts` vem ausente.\n\n' +
      'É aqui que o tamanho **declarado** no `POST /storages` é comparado com o do objeto que ' +
      'de fato subiu. Divergiu, o objeto é apagado, a linha morre junto e a resposta é `422`. ' +
      'O `mimetype` não é conferido porque não tem como divergir: ele entra na assinatura da ' +
      'URL, e o bucket recusa um `PUT` que não bata com ela.\n\n' +
      'Chamar duas vezes é seguro: a segunda devolve o mesmo registro.',
  })

  constructor(private readonly useCase: StoragesFileCompleteUseCase) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(FileCompleteValidator)
    const result = await this.useCase.execute({ ...payload, id })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
