import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import env from '#start/env'
import User from '#models/user'

/**
 * O primeiro administrador. Nenhum endpoint cria conta sem sessão - o painel é
 * a única porta de entrada de usuário -, então sem este seeder um banco novo
 * não teria por onde começar.
 */
export default class extends BaseSeeder {
  /**
   * Fora de produção: lá os administradores reais vêm do recorte de produção
   * (`dev/demo.ts`), e este registro seria só uma credencial padrão
   * conhecida com poder de administrador.
   */
  static override environment = ['development', 'test']

  override async run() {
    const email = env.get('SEED_OWNER_EMAIL') ?? 'administrator@mail.com'
    const password = env.get('SEED_OWNER_PASSWORD')

    /*
     * Sem senha o seeder para, e não inventa uma.
     *
     * Ela era literal aqui, e o repositório é o lugar errado para uma
     * credencial: quem lesse este arquivo entrava como dono em todo ambiente
     * que tivesse rodado o seeder - inclusive o de produção. Um default,
     * mesmo "temporário", volta a ser exatamente isso.
     *
     * Falhar aqui é seguro porque seeder roda à mão: a aplicação sobe sem esta
     * variável, e só quem semeia precisa dela.
     */
    if (!password) {
      throw new Error(
        'SEED_OWNER_PASSWORD ausente. Defina uma senha no ambiente antes de rodar o seeder: ' +
          'SEED_OWNER_PASSWORD=<senha> node ace db:seed',
      )
    }

    // `updateOrCreate(searchPayload, savePayload)`: o primeiro argumento é só a
    // chave de busca. Passar `password` nele nunca casaria, porque a coluna
    // guarda o hash - e o registro nasceria sem `name` nem `password`, que são
    // `notNullable`.
    // `status` e `deletedAt` entram no `savePayload` mesmo tendo default no
    // banco: rodar o seeder é o caminho de recuperação quando alguém desativa
    // ou arquiva o último administrador pelo painel. Sem estas duas linhas o
    // registro seria encontrado, atualizado e continuaria sem conseguir entrar.
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
