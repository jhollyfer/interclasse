import { createFileRoute, redirect } from '@tanstack/react-router'

import { HOME_BY_ROLE } from '../-components/menu'

/**
 * A porta de entrada do painel: manda cada papel para a própria primeira tela.
 *
 * Existe porque os três papéis não compartilham tela inicial - o administrador
 * cai nas chaves, o conselheiro nas turmas dele, o representante na lista de
 * atletas. O login e o logotipo apontam para cá, e não para um deles.
 */
export const Route = createFileRoute('/_private/painel/')({
  beforeLoad: ({ context }) => {
    throw redirect({ to: HOME_BY_ROLE[context.account.role] })
  },
})
