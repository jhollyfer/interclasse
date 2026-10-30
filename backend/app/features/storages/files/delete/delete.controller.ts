import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class StoragesFileDeleteController {
  static docs = defineDocs({
    summary: 'Apagar arquivo do armazenamento',
    description:
      '**Irreversível**: apaga o binário no bucket e a linha em `storages`.\n\n' +
      'Só apaga arquivo **órfão**. O arquivo é um registro neutro e compartilhado - ele não ' +
      'pertence ao formulário que o enviou -, então quem o referencia é quem manda: avatar de ' +
      'usuário, capa de notícia ou galeria de álbum em uso respondem `409`, com a origem na ' +
      'mensagem. Desvincule primeiro, apague depois.\n\n' +
      'Arquivo ainda `PENDING` é cancelamento de upload: o multipart é abortado, e é isso que ' +
      'faz as partes já enviadas sumirem do bucket.\n\n' +
      'É o par do `POST /storages`, que grava o arquivo antes de o formulário ser salvo: sem ' +
      'esta rota, todo anexo escolhido e removido da tela ficaria no bucket para sempre.',
    // Nasce na entidade e é traduzido em `_shared.file-refusal.ts`.
    errors: { 409: 'STORAGE_IN_USE' },
  })

  constructor(private readonly useCase: StoragesFileDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
