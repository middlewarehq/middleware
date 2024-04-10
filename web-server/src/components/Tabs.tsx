import { Box, BoxProps, styled } from '@mui/material';
import { FC, ReactNode, useMemo, useCallback, memo } from 'react';

import { randInt } from '@/utils/mock';

import { MotionBox } from './MotionComponents';

const contentBoxSx = { position: 'relative', cursor: 'pointer' };

const AnimatedBackground = styled(MotionBox)(({ theme }) => ({
  position: 'absolute',
  height: '100%',
  width: '100%',
  top: 0,
  left: 0,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.colors.alpha.trueWhite[10],
  pointerEvents: 'none'
}));

type TabExclusions = Omit<BoxProps, 'onSelect'>;
export const Tabs: FC<
  {
    items: TabItem[];
    checkSelected?: (item: TabItem, key: number | string) => boolean;
    onSelect?: (item: TabItem, key: number | string) => any;
    ItemWrapper?: FC<{ item: TabItem }>;
  } & TabExclusions
> = memo(
  ({
    items,
    checkSelected = (item: TabItem) => item.key === 0,
    ItemWrapper,
    onSelect = () => {},
    ...props
  }) => {
    const layoutId = useMemo(
      () => `tabs-component-${randInt(1e6 - 1, 1e5)}`,
      []
    );

    return (
      <Box display="flex" gap={1}>
        {items.map((item, i) => {
          const key = item.key || i;
          const content = (
            <TabContent
              {...props}
              key={key}
              onSelect={onSelect}
              checkSelected={checkSelected}
              item={item}
              itemKey={key}
              layoutId={layoutId}
            />
          );

          if (ItemWrapper) {
            return (
              <ItemWrapper key={key} item={item}>
                {content}
              </ItemWrapper>
            );
          }

          return content;
        })}
      </Box>
    );
  }
);

export type TabItem = { key?: string | number; label: ReactNode };

const TabContent: FC<
  {
    onSelect?: (item: TabItem, key: number | string) => any;
    checkSelected?: (item: TabItem, key: number | string) => boolean;
    item: TabItem;
    itemKey: string | number;
    layoutId: string;
  } & TabExclusions
> = ({ onSelect, checkSelected, item, itemKey, layoutId, ...props }) => {
  const handleSelect = useCallback(
    () => onSelect(item, itemKey),
    [item, itemKey, onSelect]
  );

  return (
    <Box {...props} px={2} py={1} sx={contentBoxSx} onClick={handleSelect}>
      {checkSelected(item, itemKey) && (
        <AnimatedBackground layoutId={layoutId} layoutDependency={'123'} />
      )}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1
        }}
      >
        {item.label}
      </Box>
    </Box>
  );
};
