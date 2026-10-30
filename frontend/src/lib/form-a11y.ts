/**
 * O par que liga o erro ao campo (`frontend.md` §10.3): o `id` da mensagem e os
 * atributos do controle. Erro só na cor não existe; a leitora de tela anuncia o
 * texto pelo `aria-describedby`.
 * _doc-lib/react-hook-form.md#advanced-usage#AccessibilityA11y.
 */

/** O `id` da mensagem de erro do campo de `id`. */
export function errorId(id: string): string {
  return `${id}-error`
}

type InvalidProps = Readonly<{
  'aria-invalid': boolean
  /** Presente só com erro: apontar para uma mensagem que não existe confunde a leitora. */
  'aria-describedby'?: string
}>

/** O que o controle espalha para se declarar inválido e apontar para o erro. */
export function invalidProps(invalid: boolean, id: string): InvalidProps {
  if (!invalid) return { 'aria-invalid': false }

  return { 'aria-invalid': true, 'aria-describedby': errorId(id) }
}
