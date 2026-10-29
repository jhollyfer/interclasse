import { STORAGE_MIMETYPES } from '@interclasse/shared'
import type { StorageMimetype } from '@interclasse/shared'

/**
 * O que a tela faz com a lista de tipos de `@interclasse/shared`: reconhecer
 * o tipo escolhido e recortar os de imagem, para o cliente recusar antes de
 * gastar uma requisição (a recusa que vale continua sendo a do servidor).
 */

export function isStorageMimetype(value: string): value is StorageMimetype {
  return STORAGE_MIMETYPES.some((mimetype) => mimetype === value)
}

/**
 * O recorte de imagem, que vira o `accept` do seletor nativo e a recusa antes
 * do `POST /storages`. Sai da lista inteira, e não de uma string escrita à
 * mão: uma cópia manual sairia dela na primeira mudança do backend.
 */
export const IMAGE_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('image/'),
)
