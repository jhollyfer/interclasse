import { BaseCommand, flags } from '@adonisjs/core/ace'
import { DateTime } from 'luxon'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { messageOf } from '#core/entity'

/** Quantas horas um `PENDING` pode ficar de pé antes de ser considerado abandonado. */
const DEFAULT_HOURS = 24

/**
 * Apaga os uploads que começaram e nunca terminaram.
 *
 * O upload tem três passos e o binário não passa por aqui (AD-006):
 * `POST /storages` grava a linha `PENDING` e assina as URLs, o cliente sobe as
 * partes direto no bucket, e `POST /storages/:id/complete` confirma. Quem fecha
 * a aba no meio nunca chega no terceiro passo, e nada mais volta àquela linha -
 * o `DELETE` é o cancelamento explícito, e ninguém o chama por um upload já
 * esquecido.
 *
 * O que fica não é só uma linha morta. As partes já enviadas vivem sob o
 * `uploadId`, não aparecem na listagem de objetos do bucket, e continuam sendo
 * cobradas - é lixo que só o aborto do multipart alcança. Sem esta varredura a
 * máquina de estado nunca fecha: `PENDING` é o único estado do qual não se sai.
 *
 * Reusa `StoragesFileDeleteUseCase` em vez de repetir o aborto aqui: apagar um
 * `PENDING` é exatamente o que o `DELETE` já faz, e duas implementações da
 * mesma coisa é uma que fica para trás. A regra de referência não atrapalha -
 * `assertExist` recusa anexar o que não está `UPLOADED`, então um `PENDING`
 * não tem como estar em uso.
 *
 * Não há agendador dentro da aplicação: isto é um comando, e quem o repete é o
 * ambiente (cron do host, `CronJob` do Kubernetes). Rodar em duas réplicas ao
 * mesmo tempo é inofensivo - a segunda encontra a linha já apagada e conta
 * como ausente.
 */
export default class StoragesPrune extends BaseCommand {
  static commandName = 'storages:prune'
  static description = 'Apaga os uploads PENDING abandonados e aborta o multipart de cada um'

  static options: CommandOptions = { startApp: true }

  @flags.number({
    description: `Idade mínima, em horas, para considerar um PENDING abandonado (padrão: ${DEFAULT_HOURS})`,
  })
  declare hours: number

  @flags.boolean({
    description: 'Lista o que seria apagado sem apagar nada',
  })
  declare dryRun: boolean

  async run() {
    const { default: Storage } = await import('#models/storage')
    const { default: StoragesFileDeleteUseCase } =
      await import('#features/storages/files/delete/delete.use-case')
    const { UploadStatuses } = await import('#core/entity')

    const hours = this.hours ?? DEFAULT_HOURS
    const cutoff = DateTime.now().minus({ hours })

    // A ordem das colunas é a do índice `storages_status_created_at_index`.
    const abandoned = await Storage.query()
      .where('status', UploadStatuses.PENDING)
      .where('createdAt', '<', cutoff.toSQL() ?? '')
      .orderBy('createdAt', 'asc')

    if (abandoned.length === 0) {
      this.logger.info(`Nenhum upload PENDING com mais de ${hours}h.`)
      return
    }

    if (this.dryRun) {
      for (const storage of abandoned) {
        this.logger.info(`${storage.id} ${storage.originalName} (${storage.createdAt?.toISO()})`)
      }

      this.logger.info(`${abandoned.length} upload(s) seriam apagados. Nada foi tocado.`)
      return
    }

    const useCase = await this.app.container.make(StoragesFileDeleteUseCase)

    let removed = 0
    let failed = 0

    for (const storage of abandoned) {
      // Um erro numa linha não derruba o lote: o bucket pode recusar o aborto
      // de um `uploadId` que ele já não conhece, e a varredura seguinte não
      // teria como passar da primeira linha se isso a interrompesse.
      try {
        const result = await useCase.execute({ id: storage.id })

        if (result.isLeft()) {
          failed += 1
          this.logger.warning(`${storage.id}: ${result.value.message}`)
          continue
        }

        removed += 1
      } catch (error) {
        failed += 1
        this.logger.warning(`${storage.id}: ${messageOf(error)}`)
      }
    }

    this.logger.success(`${removed} upload(s) apagados, ${failed} com erro.`)

    if (failed > 0) this.exitCode = 1
  }
}
