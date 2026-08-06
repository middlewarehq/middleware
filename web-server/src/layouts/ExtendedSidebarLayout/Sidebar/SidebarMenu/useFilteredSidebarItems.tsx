import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: real Clustox role for sidebar visibility
import { useClustoxUser } from '@/hooks/useClustoxUser';
import {
  ItemTags,
  SideBarItems
} from '@/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items';

import menuItems, { MenuItem } from './items';

const checkTag = (tag: string | number[] | number, check: string | number) => {
  if (Array.isArray(tag)) {
    return tag.includes(check as number);
  }
  return tag === check;
};

export const useFilteredSidebarItems = () => {
  const { integrationList } = useAuth();
  // CLUSTOX: the real role, since useAuth().role is hardcoded upstream.
  const { isSuperadmin } = useClustoxUser();

  const flagFilteredMenuItems = useMemo(() => {
    return menuItems();
  }, []);

  const sidebarItems = useMemo(() => {
    const filterCheck = (item: MenuItem): boolean => {
      if (checkTag(item.tag, ItemTags.HideItem)) return false;
      // CLUSTOX: hide user management from non-superadmins. Presentation only
      // -- the API returns 403 regardless of what the sidebar shows.
      if (item.name === SideBarItems.MANAGE_USERS && !isSuperadmin) return false;
      // CLUSTOX: a SuperAdmin owns no workspace, so the workspace they are
      // viewing may legitimately have no integration yet. Collapsing their nav
      // to just "Manage Integrations" would strand them, since user management
      // and the workspace switcher are how they administer the instance.
      if (
        !isSuperadmin &&
        !integrationList.length &&
        item.name !== SideBarItems.MANAGE_INTEGRATIONS
      )
        return false;
      return true;
    };

    const itemsFilter = (items?: MenuItem[]): MenuItem[] => {
      return items?.filter(filterCheck).map((item) => ({
        ...item,
        items: itemsFilter(item.items)
      }));
    };

    return flagFilteredMenuItems
      .map((section) => ({
        ...section,
        items: itemsFilter(section.items)
      }))
      .filter((section) => section.items?.length);
  }, [flagFilteredMenuItems, integrationList, isSuperadmin]);

  return sidebarItems;
};
