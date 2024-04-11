import {
  ExtensionTwoTone,
  GroupsTwoTone,
  Analytics
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
        name: 'Server Admin',
        icon: ExtensionTwoTone,
        link: ROUTES.SERVER_ADMIN.PATH
      }
    ]
  }
];

export default menuItems;
