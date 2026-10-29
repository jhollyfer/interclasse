import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFileDownloadUseCase from './download.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import StoragePolicy from '#policies/storage.policy'

@inject()
export default class StoragesFileDownloadController {
  static docs = defineDocs({
    summary: 'Baixar arquivo com o nome original',
    description:
      'Redireciona para uma URL temporária do bucket que entrega o arquivo com ' +
      '`Content-Disposition: attachment` e o nome original.\n\n' +
      'Existe por uma limitação do navegador, não do storage: o atributo `download` de um ' +
      '`<a>` é ignorado entre origens, e a API responde numa origem diferente da do app. Sem ' +
      'esta rota, "salvar arquivo" abriria a imagem numa aba, e o arquivo chegaria nomeado ' +
      'com o uuid em vez do nome que a pessoa enviou.\n\n' +
      'Redireciona em vez de servir o binário: o header viaja assinado dentro da URL, então a ' +
      'aplicação entrega um endereço e sai do caminho, em vez de ficar ocupada pelo tempo da ' +
      'transferência de cada download.\n\n' +
      '**Exige sessão**: o bucket é `visibility: private`, e enquanto esta rota ficou aberta ' +
      'ela emitia URL assinada para qualquer uuid sem sessão - a porta dos fundos que o ' +
      'fechamento do bucket deixou aberta. Arquivo que a pessoa não alcança responde `404` e ' +
      'não `403`, para não confirmar a quem sonda que aquele uuid existe.',
    responses: { 302: 'no-content' },
  })

  constructor(private readonly useCase: StoragesFileDownloadUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    await context.bouncer.with(StoragePolicy).authorize('download', payload.id)
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    return context.response.redirect(result.value)
  }
}
