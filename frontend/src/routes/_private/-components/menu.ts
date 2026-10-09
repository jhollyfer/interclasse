import {
  BasketballIcon,
  CalendarDotsIcon,
  ChalkboardTeacherIcon,
  IdentificationCardIcon,
  ListChecksIcon,
  MegaphoneIcon,
  StudentIcon,
  TreeStructureIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { linkOptions } from '@tanstack/react-router'

import { UserRoles } from '#/lib/entity'
import type { UserRole } from '#/lib/entity'

/**
 * Os destinos do menu, tipados contra a árvore de rotas.
 *
 * `linkOptions` e não um array solto: ele preserva o tipo de `to`, então rota
 * removida ou renomeada vira erro de compilação aqui, em vez de um item de menu
 * que leva a lugar nenhum.
 */
const ORGANIZATION = linkOptions([
  { to: '/administrator/brackets', label: 'Chaves', icon: TreeStructureIcon },
  { to: '/administrator/matches', label: 'Partidas', icon: CalendarDotsIcon },
  {
    to: '/administrator/classrooms',
    label: 'Turmas',
    icon: ChalkboardTeacherIcon,
  },
  { to: '/administrator/sports', label: 'Modalidades', icon: BasketballIcon },
  {
    to: '/administrator/announcements',
    label: 'Avisos',
    icon: MegaphoneIcon,
  },
  { to: '/administrator/users', label: 'Usuários', icon: UsersIcon },
])

const ADVISOR = linkOptions([
  { to: '/advisor', label: 'Minhas turmas', icon: StudentIcon },
])

const REPRESENTATIVE = linkOptions([
  { to: '/representative', label: 'Atletas da turma', icon: ListChecksIcon },
])

const ACCOUNT = linkOptions([
  { to: '/profile', label: 'Perfil', icon: IdentificationCardIcon },
])

export type MenuItem =
  | (typeof ORGANIZATION)[number]
  | (typeof ADVISOR)[number]
  | (typeof REPRESENTATIVE)[number]
  | (typeof ACCOUNT)[number]

export type MenuGroup = {
  label: string
  items: ReadonlyArray<MenuItem>
  /** Quem vê o grupo. Ausente, todo papel. */
  roles?: ReadonlyArray<UserRole>
}

/**
 * Os grupos da barra lateral.
 *
 * Esconder o grupo de quem não tem o papel é conveniência de tela, e só: quem
 * autoriza é o backend, que responde `403` a quem chegar pela URL.
 */
export const MENU: ReadonlyArray<MenuGroup> = [
  {
    label: 'Organização',
    items: ORGANIZATION,
    roles: [UserRoles.ADMINISTRATOR],
  },
  {
    label: 'Conselheiro',
    items: ADVISOR,
    roles: [UserRoles.ADMINISTRATOR, UserRoles.ADVISOR],
  },
  {
    label: 'Representante',
    items: REPRESENTATIVE,
    roles: [UserRoles.REPRESENTATIVE],
  },
  { label: 'Conta', items: ACCOUNT },
]

/** Os grupos que o papel vê. */
export function menuFor(role: UserRole): ReadonlyArray<MenuGroup> {
  return MENU.filter((group) => !group.roles || group.roles.includes(role))
}

/** A primeira tela de cada papel, para onde o login e o logotipo levam. */
export const HOME_BY_ROLE = {
  ADMINISTRATOR: '/administrator/brackets',
  ADVISOR: '/advisor',
  REPRESENTATIVE: '/representative',
} as const satisfies Record<UserRole, string>
