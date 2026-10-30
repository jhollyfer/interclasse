import { UploadResume } from '@interclasse/shared'

import {
  listLocalThemes,
  readLocal,
  removeLocal,
  writeLocal,
} from './local-store'

/**
 * O que o upload precisa lembrar para sobreviver a um reload.
 *
 * Sem isto, a retomada só cobre a queda de rede: o `storageId` fica numa
 * variável de componente, e recarregar a página o perde. O upload continuaria
 * existindo no servidor, aberto e invisível, e o usuário recomeçaria do zero um
 * arquivo que já está 90% no bucket.
 *
 * `localStorage` e não a query cache do TanStack: o que se quer é justamente o
 * que atravessa o recarregamento, e a cache não atravessa.
 */

export type ResumeEntry = Omit<UploadResume, 'savedAt'>

const THEME_PREFIX = 'upload:'

/**
 * Quanto tempo uma retomada continua fazendo sentido, em ms.
 *
 * Vinte e quatro horas porque é a janela do `node ace storages:prune`: passado
 * isso o servidor já apagou o upload abandonado, e a entrada aponta para um
 * `storageId` que não existe mais. Sem o prazo ela ficava para sempre - quem
 * fecha a aba no meio de um envio nunca volta para limpá-la, e a única coisa
 * que a removia era o `404` de uma retomada que o usuário precisava tentar.
 */
const TTL = 24 * 60 * 60 * 1000

/**
 * A identidade de um arquivo local, para reencontrar o upload dele.
 *
 * Nome, tamanho e data de modificação - o que a File API dá sem ler o conteúdo.
 * Não é um hash: calcular um hash de um arquivo grande custa tanto quanto
 * enviá-lo, e o que se quer aqui é reconhecer "é o mesmo arquivo que eu estava
 * mandando há um minuto", não provar identidade contra o mundo.
 *
 * O risco é reconhecer como igual um arquivo trocado que coincida nos três
 * campos. A confirmação pega o caso: o tamanho declarado no servidor não vai
 * bater com o que subiu, e a resposta é `422`.
 */
export function resumeTheme(file: File): string {
  return `${THEME_PREFIX}${file.name}:${file.size}:${file.lastModified}`
}

export function readResume(file: File): ResumeEntry | null {
  const theme = resumeTheme(file)
  const entry = readLocal({
    theme,
    schema: UploadResume.nullable(),
    fallback: null,
  })

  if (!entry) return null

  if (expired(entry)) {
    removeLocal(theme)
    return null
  }

  // Sem o `savedAt`: ele é contabilidade deste módulo, não parte do que o
  // upload precisa saber para retomar.
  return {
    storageId: entry.storageId,
    uploadId: entry.uploadId,
    partSize: entry.partSize,
  }
}

export function writeResume(file: File, entry: ResumeEntry): void {
  sweep()
  writeLocal(resumeTheme(file), { ...entry, savedAt: Date.now() })
}

export function clearResume(file: File): void {
  removeLocal(resumeTheme(file))
}

/**
 * Apaga as retomadas vencidas de **todos** os arquivos, e não só a do que está
 * sendo enviado agora.
 *
 * `readResume` só alcança a entrada de um arquivo que o usuário tentou de novo,
 * e a maioria não é tentada de novo - é justamente por isso que elas se
 * acumulam. A varredura vai junto da escrita porque é o único momento em que
 * este módulo é chamado sabendo que vai mexer no disco de qualquer jeito.
 */
function sweep(): void {
  for (const theme of listLocalThemes(THEME_PREFIX)) {
    const entry = readLocal({
      theme,
      schema: UploadResume.nullable(),
      fallback: null,
    })

    // Ilegível conta como vencida: não há como retomar a partir dela.
    if (!entry || expired(entry)) removeLocal(theme)
  }
}

function expired(entry: UploadResume): boolean {
  return Date.now() - entry.savedAt > TTL
}
