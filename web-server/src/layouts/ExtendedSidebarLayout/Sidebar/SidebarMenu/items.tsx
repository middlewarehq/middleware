import {
  ExtensionTwoTone,
  GroupsTwoTone,
  Analytics
} from '@mui/icons-material';

import { ROUTES } from '@/constants/routes';

import type { ReactNode } from 'react';

export enum ItemIds {
  HideIfBitbucket,
  HideIfGrowth,
  HideIfOneOnOne,
  HideIfRoleEng,
  HideIfPeople,
  RoleMomOnly,
  OrgChart,
  BalancePage,
  HideItem,
  HideIfNotDemo,
  JIRAScreens,
  Cockpit,
  Playbook,
  OneOnOneTemplates,
  Payments,
  HideDoraMetricsUi,
  FeedbackCycle,
  Glossary,
  Internal
}

export interface MenuItem {
  id?: string | number[] | number;
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
        id: ItemIds.HideDoraMetricsUi,
        name: 'DORA Metrics',
        icon: Analytics,
        link: ROUTES.DORA_METRICS.PATH
      },
      {
        id: ItemIds.HideIfRoleEng,
        name: 'Manage Teams',
        icon: GroupsTwoTone,
        link: ROUTES.TEAMS.ROUTE.PATH
      },
      {
        id: ItemIds.HideIfRoleEng,
        name: 'Manage Integrations',
        icon: ExtensionTwoTone,
        link: ROUTES.INTEGRATIONS.PATH
      },
      {
        id: ItemIds.HideIfRoleEng,
        name: 'Server Admin',
        icon: ExtensionTwoTone,
        link: ROUTES.SERVER_ADMIN.PATH
      }
    ]
  }
];

export default menuItems;
