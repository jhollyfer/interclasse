import SiteSetting from '#models/site-setting'

/**
 * A configuração do site, a mesma para o painel e para o site público.
 *
 * Service porque consulta o banco, e um só para os três use-cases que a leem.
 * A linha nasce na primeira leitura, com tudo vazio: o site mostra o que a
 * organização preencheu, e nada inventado no lugar do que ela não preencheu.
 */
export default class SiteService {
  async current(): Promise<SiteSetting> {
    const setting = await SiteSetting.firstOrCreate({})
    // O `INSERT` só devolve a chave primária: sem o refresh, `regulationId`
    // fica `undefined` e o `load` recusa.
    await setting.refresh()
    await setting.load('regulation')

    return setting
  }
}
