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

import { m } from '#/paraglide/messages'

/**
 * Os destinos do menu, tipados contra a árvore de rotas.
 *
 * `linkOptions` e não um array solto: ele preserva o tipo de `to`, então rota
 * removida ou renomeada vira erro de compilação aqui, em vez de um item de menu
 * que leva a lugar nenhum.
 */
const ORGANIZATION = linkOptions([
  {
    to: '/administrator',
    get label() {
      return m.panel_menu_dashboard()
    },
    icon: GaugeIcon,
  },
  {
    to: '/administrator/brackets',
    get label() {
      return m.panel_menu_brackets()
    },
    icon: TreeStructureIcon,
  },
  {
    to: '/administrator/matches',
    get label() {
      return m.panel_menu_matches()
    },
    icon: CalendarDotsIcon,
  },
  {
    to: '/administrator/cards',
    get label() {
      return m.panel_menu_cards()
    },
    icon: CardsIcon,
  },
  {
    to: '/administrator/removals',
    get label() {
      return m.panel_menu_removals()
    },
    icon: UserMinusIcon,
  },
  {
    to: '/administrator/classrooms',
    get label() {
      return m.panel_menu_classrooms()
    },
    icon: ChalkboardTeacherIcon,
  },
  {
    to: '/administrator/sports',
    get label() {
      return m.panel_menu_sports()
    },
    icon: BasketballIcon,
  },
  {
    to: '/administrator/announcements',
    get label() {
      return m.panel_menu_announcements()
    },
    icon: MegaphoneIcon,
  },
  {
    to: '/administrator/photos',
    get label() {
      return m.panel_menu_photos()
    },
    icon: ImagesIcon,
  },
  {
    to: '/administrator/users',
    get label() {
      return m.panel_menu_users()
    },
    icon: UsersIcon,
  },
  {
    to: '/administrator/reports',
    get label() {
      return m.panel_menu_reports()
    },
    icon: ChartBarIcon,
  },
  {
    to: '/administrator/site',
    get label() {
      return m.panel_menu_site()
    },
    icon: GlobeIcon,
  },
])

const ADVISOR = linkOptions([
  {
    to: '/advisor',
    get label() {
      return m.panel_menu_advisor_class()
    },
    icon: StudentIcon,
  },
  {
    to: '/advisor/photos',
    get label() {
      return m.panel_menu_advisor_photos()
    },
    icon: ImagesIcon,
  },
])

const REPRESENTATIVE = linkOptions([
  {
    to: '/representative',
    get label() {
      return m.panel_menu_representative_athletes()
    },
    icon: ListChecksIcon,
  },
])

const ACCOUNT = linkOptions([
  {
    to: '/profile',
    get label() {
      return m.panel_menu_profile()
    },
    icon: IdentificationCardIcon,
  },
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
    get label() {
      return m.panel_menu_group_organization()
    },
    items: ORGANIZATION,
    roles: [USER_ROLE.ADMINISTRATOR],
  },
  {
    get label() {
      return m.panel_menu_group_advisor()
    },
    items: ADVISOR,
    // Só o conselheiro: o administrador vê todas as turmas em "Turmas", e o
    // item repetido aqui era a mesma tela em dobro.
    roles: [USER_ROLE.ADVISOR],
  },
  {
    get label() {
      return m.panel_menu_group_representative()
    },
    items: REPRESENTATIVE,
    roles: [USER_ROLE.REPRESENTATIVE],
  },
  {
    get label() {
      return m.panel_menu_group_account()
    },
    items: ACCOUNT,
  },
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
