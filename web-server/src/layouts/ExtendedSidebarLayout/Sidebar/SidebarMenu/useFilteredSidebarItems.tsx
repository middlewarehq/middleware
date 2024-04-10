import { useMemo } from 'react';

import { MIDDLEWARE_ORG_IDS } from '@/constants/feature';
import { useAuth } from '@/hooks/useAuth';
import { useFeature } from '@/hooks/useFeature';
import { ItemIds } from '@/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items';
import { UserRole } from '@/types/resources';

import menuItems, { MenuItem } from './items';

const checkId = (id: string | number[] | number, check: string | number) => {
  if (Array.isArray(id)) {
    return id.includes(check as number);
  }
  return id === check;
};

export const useFilteredSidebarItems = () => {
  const { role, orgId } = useAuth();

  const isRoleEng = role === UserRole.ENGINEER;
  const isRoleMOM = role === UserRole.MOM;

  const enableCockpit = useFeature('enable_cockpit')({ orgId });
  const enablePlaybook = useFeature('enable_playbook');
  const enableFeedbackCycles = useFeature('feedback_cycle')({ orgId });
  const enableOneOnOne = useFeature('enable_one_on_one')({ orgId });
  const peopleNavItems = useFeature('enable_people_nav_items');

  const flagFilteredMenuItems = useMemo(() => {
    return menuItems();
  }, []);

  const sidebarItems = useMemo(() => {
    const filterCheck = (item: MenuItem): boolean => {
      if (
        !MIDDLEWARE_ORG_IDS.includes(orgId) &&
        checkId(item.id, ItemIds.Internal)
      )
        return false;

      if (checkId(item.id, ItemIds.HideItem)) return false;

      if (isRoleEng && checkId(item.id, ItemIds.HideIfRoleEng)) return false;
      if (!isRoleMOM && checkId(item.id, ItemIds.RoleMomOnly)) return false;

      if (!enableCockpit && checkId(item.id, ItemIds.Cockpit)) return false;

      if (!enablePlaybook && checkId(item.id, ItemIds.Playbook)) return false;

      if (!enableFeedbackCycles && checkId(item.id, ItemIds.FeedbackCycle))
        return false;
      if (!enableOneOnOne && checkId(item.id, ItemIds.HideIfOneOnOne))
        return false;
      if (!peopleNavItems && checkId(item.id, ItemIds.HideIfPeople))
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
  }, [
    flagFilteredMenuItems,
    orgId,
    isRoleEng,
    isRoleMOM,
    enableCockpit,
    enablePlaybook,
    enableFeedbackCycles,
    enableOneOnOne,
    peopleNavItems
  ]);

  return sidebarItems;
};
