import { List } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { SidebarMenuItem } from './item';
import { MenuItem } from './items';
import { MenuWrapper } from './MenuWrapper';
import { SubMenuWrapper } from './SubMenuWrapper';
import { useFilteredSidebarItems } from './useFilteredSidebarItems';

const renderSidebarMenuItems = ({
  items,
  path
}: {
  items: MenuItem[];
  path: string;
}): JSX.Element => (
  <SubMenuWrapper>
    <List component="div">
      {items.reduce((ev, item) => reduceChildRoutes({ ev, item, path }), [])}
    </List>
  </SubMenuWrapper>
);

const reduceChildRoutes = ({
  ev,
  path,
  item
}: {
  ev: JSX.Element[];
  path: string;
  item: MenuItem;
}): Array<JSX.Element> => {
  const key = item.name;
  const partialMatch = path.includes(item.link) || item.open;
  const exactMatch = path === item.link;

  if (item.items) {
    ev.push(
      <SidebarMenuItem
        key={key}
        active={partialMatch}
        open={partialMatch}
        name={item.name}
        displayLabel={item.displayLabel}
        icon={item.icon}
        link={item.link}
        badge={item.badge}
        badgeTooltip={item.badgeTooltip}
        disabled={item.disabled}
      >
        {renderSidebarMenuItems({
          path,
          items: item.items
        })}
      </SidebarMenuItem>
    );
  } else {
    ev.push(
      <SidebarMenuItem
        key={key}
        active={exactMatch}
        name={item.name}
        displayLabel={item.displayLabel}
        link={item.link}
        badge={item.badge}
        badgeTooltip={item.badgeTooltip}
        icon={item.icon}
        disabled={item.disabled}
      />
    );
  }

  return ev;
};

function SidebarMenu() {
  const router = useRouter();

  const handlePathChange = () => {
    if (!router.isReady) {
      return;
    }
  };

  useEffect(handlePathChange, [router.isReady, router.asPath]);

  const sidebarItems = useFilteredSidebarItems();

  return (
    <>
      {sidebarItems.map((section) => (
        <MenuWrapper key={section.heading}>
          {renderSidebarMenuItems({
            items: section.items,
            path: router.asPath
          })}
        </MenuWrapper>
      ))}
    </>
  );
}

export default SidebarMenu;
