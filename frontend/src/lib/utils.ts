import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** O teto da coluna `slug`, o mesmo de `backend/app/services/slug.service.ts`. */
const SLUG_MAX_LENGTH = 512

/**
 * Nome legível em pedaço de URL. Espelha o `string.slug` do AdonisJS, que é
 * quem tem a palavra final: o backend normaliza de novo o que chegar, mesmo o
 * slug digitado à mão. Aqui é só para a tela mostrar o resultado antes de
 * salvar.
 *
 * O `normalize('NFD')` mais a faixa de acentos é o que transforma "Notícia" em
 * "noticia" em vez de "not-cia".
 *
 * O `&` vira "and" porque é o que a tabela do `string.slug` faz, e "Esporte &
 * Cultura" é título comum demais para a tela prometer `esporte-cultura` e o
 * banco gravar `esporte-and-cultura`. Os outros símbolos que aquela tabela
 * traduz - `%`, `€`, `©` - continuam virando hífen aqui: são raros em título de
 * notícia, e replicar a tabela inteira seria manter uma segunda cópia dela. O
 * corte existe pela mesma razão do backend: a tradução EXPANDE, e o preview
 * precisa mostrar o que vai caber.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')
}

/**
 * O valor de um campo numérico **opcional**, vindo do input.
 *
 * `<input type="number">` devolve `''` quando é esvaziado, e `Number('')` é
 * zero - o campo apagado viraria "0 estrelas" em vez de "não informado". Aqui o
 * vazio vira `undefined`, que é o que o schema trata como ausente.
 *
 * Existe para não repetir a mesma conversão em cada `onChange` de campo
 * numérico opcional.
 */
export function optionalNumber(value: string): number | undefined {
  if (value === '') return undefined

  return Number(value)
}
