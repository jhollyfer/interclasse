import {
  BasketballIcon,
  CalendarDotsIcon,
  CardsIcon,
  ChalkboardTeacherIcon,
  ChartBarIcon,
  GaugeIcon,
  GlobeIcon,
  IdentificationCardIcon,
  ImagesIcon,
  ListChecksIcon,
  MegaphoneIcon,
  StudentIcon,
  TreeStructureIcon,
  UserMinusIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { linkOptions } from '@tanstack/react-router'
import { USER_ROLE } from '@interclasse/shared'
import type { UserRole } from '@interclasse/shared'

/**
 * Os destinos do menu, tipados contra a árvore de rotas.
 *
 * `linkOptions` e não um array solto: ele preserva o tipo de `to`, então rota
 * removida ou renomeada vira erro de compilação aqui, em vez de um item de menu
 * que leva a lugar nenhum.
 */
const ORGANIZATION = linkOptions([
  { to: '/administrator', label: 'Painel', icon: GaugeIcon },
  { to: '/administrator/brackets', label: 'Chaves', icon: TreeStructureIcon },
  { to: '/administrator/matches', label: 'Partidas', icon: CalendarDotsIcon },
  { to: '/administrator/cards', label: 'Cartões', icon: CardsIcon },
  {
    to: '/administrator/removals',
    label: 'Remoções de atleta',
    icon: UserMinusIcon,
  },
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
  { to: '/administrator/photos', label: 'Fotos', icon: ImagesIcon },
  { to: '/administrator/users', label: 'Usuários', icon: UsersIcon },
  { to: '/administrator/reports', label: 'Relatórios', icon: ChartBarIcon },
  { to: '/administrator/site', label: 'Site', icon: GlobeIcon },
])

const ADVISOR = linkOptions([
  { to: '/advisor', label: 'Minha turma', icon: StudentIcon },
  { to: '/advisor/photos', label: 'Fotos dos jogos', icon: ImagesIcon },
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
    roles: [USER_ROLE.ADMINISTRATOR],
  },
  {
    label: 'Conselheiro',
    items: ADVISOR,
    // Só o conselheiro: o administrador vê todas as turmas em "Turmas", e o
    // item repetido aqui era a mesma tela em dobro.
    roles: [USER_ROLE.ADVISOR],
  },
  {
    label: 'Representante',
    items: REPRESENTATIVE,
    roles: [USER_ROLE.REPRESENTATIVE],
  },
  { label: 'Conta', items: ACCOUNT },
]

/** Os grupos que o papel vê. */
export function menuFor(role: UserRole): ReadonlyArray<MenuGroup> {
  return MENU.filter((group) => !group.roles || group.roles.includes(role))
}

/**
 * O contador de avisos de remoção sem ciência: só `meta.total` importa. A mesma
 * chave no menu e no painel, para os dois lerem do mesmo cache.
 */
export const PENDING_REMOVALS = { pending: true, perPage: 1 } as const

/** A primeira tela de cada papel, para onde o login e o logotipo levam. */
export const HOME_BY_ROLE = {
  ADMINISTRATOR: '/administrator',
  ADVISOR: '/advisor',
  REPRESENTATIVE: '/representative',
} as const satisfies Record<UserRole, string>
