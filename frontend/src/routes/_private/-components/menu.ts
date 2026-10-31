import { USER_ROLE } from '@interclasse/shared'
import type { UserRole } from '@interclasse/shared'
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

import { m } from '#/paraglide/messages'

/**
 * The menu destinations, typed against the route tree.
 *
 * `linkOptions` and not a loose array: it preserves the type of `to`, so a removed or
 * renamed route becomes a compile error here, instead of a menu item that
 * leads nowhere.
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
  /** Who sees the group. When absent, every role. */
  roles?: ReadonlyArray<UserRole>
}

/**
 * The sidebar groups.
 *
 * Hiding the group from whoever lacks the role is a screen convenience, and only that: whoever
 * authorizes is the backend, which answers `403` to whoever arrives by the URL.
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
    // Advisor only: the administrator sees all classrooms in "Turmas", and the
    // item repeated here was the same screen twice.
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

/** The groups the role sees. */
export function menuFor(role: UserRole): ReadonlyArray<MenuGroup> {
  return MENU.filter((group) => !group.roles || group.roles.includes(role))
}

/**
 * The counter of removal notices not yet acknowledged: only `meta.total` matters. The same
 * key in the menu and on the dashboard, so both read from the same cache.
 */
export const PENDING_REMOVALS = { pending: true, perPage: 1 } as const

/** Each role's first screen, where the login and the logo lead. */
export const HOME_BY_ROLE = {
  ADMINISTRATOR: '/administrator',
  ADVISOR: '/advisor',
  REPRESENTATIVE: '/representative',
} as const satisfies Record<UserRole, string>
