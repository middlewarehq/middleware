import ExpandLessTwoToneIcon from '@mui/icons-material/ExpandLessTwoTone';
import ExpandMoreTwoToneIcon from '@mui/icons-material/ExpandMoreTwoTone';
import {
  Button,
  Tooltip,
  Badge,
  Collapse,
  ListItem,
  styled,
  TooltipProps,
  tooltipClasses,
  IconButton,
  useTheme,
  Box
} from '@mui/material';
import clsx from 'clsx';
import NextLink from 'next/link';
import { FC, ReactNode, useContext, MouseEvent, useEffect } from 'react';
import { SidebarContext } from 'src/contexts/SidebarContext';

import { track } from '@/constants/events';
import { appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';

interface SidebarMenuItemProps {
  children?: ReactNode;
  link?: string;
  icon?: any;
  badge?: string;
  badgeTooltip?: string;
  open?: boolean;
  active?: boolean;
  name: string;
  displayLabel?: ReactNode;
  disabled?: boolean;
}

const TooltipWrapper = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.colors.alpha.trueWhite[100],
    color: theme.palette.getContrastText(theme.colors.alpha.trueWhite[100]),
    fontSize: theme.typography.pxToRem(12),
    fontWeight: 'bold',
    borderRadius: theme.general.borderRadiusSm,
    boxShadow:
      '0 .2rem .8rem rgba(7,9,25,.18), 0 .08rem .15rem rgba(7,9,25,.15)'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.colors.alpha.trueWhite[100]
  }
}));

export const SidebarMenuItem: FC<SidebarMenuItemProps> = ({
  children,
  link,
  icon: Icon,
  badge,
  badgeTooltip,
  open: openParent = false,
  active = false,
  name,
  displayLabel,
  disabled,
  ...rest
}) => {
  const { closeSidebar } = useContext(SidebarContext);
  const theme = useTheme();
  const dispatch = useDispatch();
  const key = link || name;

  const menuToggle = useSelector((s) => s.app.sidebarState?.[key]);
  const defaultOpenState = menuToggle !== undefined ? menuToggle : openParent;

  useEffect(() => {
    if (!key) return;
    dispatch(
      appSlice.actions.setSidebarItemsState({ key, value: defaultOpenState })
    );
  }, [defaultOpenState, dispatch, key]);

  const toggleMenu = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(appSlice.actions.toggleSidebarItemsState(key));
  };

  const LinkWrapper: FC = link
    ? (p) => (
        <NextLink href={link} passHref {...p} style={{ width: 'inherit' }} />
      )
    : (p) => <Box {...p} width="100%" onClick={toggleMenu} />;

  if (children) {
    return (
      <ListItem component="div" className="Mui-children" key={name} {...rest}>
        <LinkWrapper>
          <Button
            startIcon={Icon && <Icon />}
            endIcon={
              <IconButton
                onClick={toggleMenu}
                sx={{
                  my: -1,
                  mr: -1.5,
                  borderRadius: 1 / 2,
                  boxShadow: menuToggle
                    ? `0 0 0 1px ${theme.colors.secondary.light}`
                    : undefined
                }}
              >
                {menuToggle ? (
                  <ExpandLessTwoToneIcon />
                ) : (
                  <ExpandMoreTwoToneIcon />
                )}
              </IconButton>
            }
            size="small"
            fullWidth
          >
            {badgeTooltip ? (
              <TooltipWrapper title={badgeTooltip} arrow placement="right">
                {badge === '' ? (
                  <Badge
                    color="primary"
                    variant="dot"
                    onMouseEnter={onLinger(name)}
                  />
                ) : (
                  <Badge badgeContent={badge} onMouseEnter={onLinger(name)} />
                )}
              </TooltipWrapper>
            ) : badge === '' ? (
              <Badge
                color="primary"
                variant="dot"
                onMouseEnter={onLinger(name)}
              />
            ) : (
              <Badge badgeContent={badge} onMouseEnter={onLinger(name)} />
            )}
            {displayLabel || name}
          </Button>
        </LinkWrapper>
        <Collapse in={menuToggle}>
          <Box sx={{ mt: -0.9 }}>{children}</Box>
        </Collapse>
      </ListItem>
    );
  }

  return (
    <ListItem component="div" key={name} {...rest}>
      <LinkWrapper>
        <Button
          disableRipple
          component="a"
          className={clsx({ 'Mui-active': active })}
          onClick={closeSidebar}
          startIcon={Icon && <Icon />}
          disabled={disabled}
          size="small"
        >
          {displayLabel || name}
          {badgeTooltip ? (
            <TooltipWrapper title={badgeTooltip} arrow placement="right">
              {badge === '' ? (
                <Badge
                  color="primary"
                  variant="dot"
                  onMouseEnter={onLinger(name)}
                />
              ) : (
                <Badge badgeContent={badge} />
              )}
            </TooltipWrapper>
          ) : badge === '' ? (
            <Badge
              color="primary"
              variant="dot"
              onMouseEnter={onLinger(name)}
            />
          ) : (
            badge && (
              <div style={{ position: 'absolute', right: '0rem' }}>
                <Badge
                  onMouseEnter={onLinger(name)}
                  badgeContent={
                    <div
                      style={{
                        width: 'max-content'
                      }}
                    >
                      {badge}
                    </div>
                  }
                />
              </div>
            )
          )}
        </Button>
      </LinkWrapper>
    </ListItem>
  );
};

const onLinger = (tag: string) => (e: MouseEvent) => {
  const target = e.target as HTMLDivElement;
  const timerId = setTimeout(() => {
    track('BADGE_FOCUS', { tag, content: target?.textContent });
  }, 300);

  const stopTimer = () => {
    clearTimeout(timerId);
  };

  target?.addEventListener('mouseleave', stopTimer, { once: true });
};
