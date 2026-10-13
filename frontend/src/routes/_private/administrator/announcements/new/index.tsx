import { createFileRoute } from '@tanstack/react-router'

/** Cadastro: nada a carregar antes da tela, o formulário nasce vazio. */
export const Route = createFileRoute(
  '/_private/administrator/announcements/new/',
)({})
