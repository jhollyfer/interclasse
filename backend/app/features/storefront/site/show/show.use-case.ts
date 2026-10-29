import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import SiteService from '#services/site/site.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, ModelObject>

/**
 * O "Sobre" e o regulamento para o site anônimo. Do arquivo sai só o que o
 * botão de baixar precisa - a URL assinada, o nome e o tamanho -, sem o
 * caminho no bucket nem o id do upload.
 */
@inject()
export default class StorefrontSiteShowUseCase {
  constructor(private readonly site: SiteService) {}

  async execute(): Promise<Response> {
    try {
      const setting = await this.site.current()
      const regulation = setting.regulation

      return right({
        about: setting.about,
        organizer: setting.organizer,
        firstEditionYear: setting.firstEditionYear,
        edition: setting.edition,
        schoolInstagram: setting.schoolInstagram,
        developerInstagram: setting.developerInstagram,
        regulation: regulation && {
          url: regulation.url,
          originalName: regulation.originalName,
          size: regulation.size,
        },
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront > site][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STOREFRONT_SITE_SHOW_ERROR'),
      )
    }
  }
}
