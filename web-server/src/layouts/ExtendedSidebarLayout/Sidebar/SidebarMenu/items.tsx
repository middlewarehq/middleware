import {
  ExtensionTwoTone,
  GroupsTwoTone,
  Analytics,
  Settings,
  Dns,
  // CLUSTOX: icons for user management and workspace health
  ManageAccounts,
  Workspaces
} from '@mui/icons-material';

import { ROUTES } from '@/constants/routes';

import type { ReactNode } from 'react';

export enum ItemTags {
  HideItem,
  Internal
}

export interface MenuItem {
  tag?: string | number[] | number;
  link?: string;
  icon?: ReactNode;
  badge?: string;
  badgeTooltip?: string;
  disabled?: boolean;
  /** default open state */
  open?: true;

  items?: MenuItem[];
  name: string;
  displayLabel?: ReactNode;
}

export interface MenuItems {
  items: MenuItem[];
  heading: string;
  id?: string | number[] | number;
}

export enum SideBarItems {
  DORA_METRICS = 'DORA Metrics',
  MANAGE_TEAMS = 'Manage Teams',
  MANAGE_INTEGRATIONS = 'Manage Integrations',
  SERVER_ADMIN = 'Server Admin',
  // CLUSTOX: superadmin-only, filtered in useFilteredSidebarItems
  MANAGE_USERS = 'Manage Users',
  // CLUSTOX: visible to admins too, scoped to their own workspace
  WORKSPACES = 'Workspaces'
}

const menuItems = (): MenuItems[] => [
  {
    heading: '',
    items: [
      {
        name: 'DORA Metrics',
        icon: Analytics,
        link: ROUTES.DORA_METRICS.PATH
      },
      {
        name: 'Manage Teams',
        icon: GroupsTwoTone,
        link: ROUTES.TEAMS.ROUTE.PATH
      },
      {
        name: 'Manage Integrations',
        icon: ExtensionTwoTone,
        link: ROUTES.INTEGRATIONS.PATH
      },
      {
        name: 'Settings',
        icon: Settings,
        link: ROUTES.SETTINGS.PATH
      },
      {
        name: 'System Logs',
        icon: Dns,
        link: ROUTES.SYSTEM_LOGS.PATH
      },
      // CLUSTOX: sync health. Admins see their own workspace, superadmins all.
      {
        name: SideBarItems.WORKSPACES,
        icon: Workspaces,
        link: ROUTES.WORKSPACES.PATH
      },
      // CLUSTOX: only rendered for superadmins.
      {
        name: SideBarItems.MANAGE_USERS,
        icon: ManageAccounts,
        link: ROUTES.USERS.PATH
      }
    ]
  }
];

export default menuItems;
