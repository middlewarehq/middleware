import { MenuRounded } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { FC, ReactNode, useMemo, useContext, Fragment } from 'react';
import { SidebarContext } from 'src/contexts/SidebarContext';

import { TeamSelectorModes } from '@/types/resources';

import { AvatarPageTitle } from './AvatarPageTitle';
import { BranchSelector } from './BranchSelector';
import { FlexBox, FlexBoxProps } from './FlexBox';
import { Hotkey } from './Hotkey';
import { Logo } from './Logo/Logo';
import { Tabs } from './Tabs';
import { Line } from './Text';

type SubRoute = {
  label: string;
  path: string;
};

export const PageHeader: FC<
  {
    title: ReactNode;
    pageTitle?: string;
    /** @deprecated The subtitle is not rendered anymore */
    subtitle?: ReactNode;
    icon: ReactNode;
    loading?: boolean;
    teamDateSelectorMode?: TeamSelectorModes;
    subRoutes?: SubRoute[];
    selectBranch?: boolean;
    additionalFilters?: ReactNode[];
  } & Omit<FlexBoxProps, 'title'>
> = ({
  title,
  pageTitle,
  icon,
  loading,
  children,
  teamDateSelectorMode,
  subRoutes,
  selectBranch,
  additionalFilters,
  ...props
}) => {
  const showSelectorSection =
    Boolean(teamDateSelectorMode) || selectBranch || additionalFilters?.length;
  const { toggleSidebar } = useContext(SidebarContext);
  const theme = useTheme();

  const displayTitle = useMemo(() => {
    if (typeof title === 'string') return title.replaceAll('->', '→');
    return pageTitle?.replaceAll('->', '→') || 'Dashboard';
  }, [pageTitle, title]);

  return (
    <>
      <Head>
        <title>{displayTitle} | MiddlewareHQ</title>
      </Head>
      <BgLogo />
      <FlexBox col gap1 {...props}>
        <FlexBox justifyBetween alignCenter>
          <FlexBox alignCenter>
            <Box
              display={{ lg: 'none', xs: 'flex' }}
              mr={1}
              position="relative"
            >
              <Hotkey
                hotkey="M"
                onHotkey={toggleSidebar}
                sx={{ left: theme.spacing(-1.5) }}
              />
              <IconButton onClick={toggleSidebar} role="navigation">
                <MenuRounded />
              </IconButton>
            </Box>
            <AvatarPageTitle variant="rounded">
              {loading ? <CircularProgress size="20px" /> : icon}
            </AvatarPageTitle>
            <Box>
              <Line fontWeight={500} big white>
                {title}
              </Line>
            </Box>
          </FlexBox>
          <FlexBox gap={1} alignCenter>
            {children}
          </FlexBox>
          {Boolean(subRoutes?.length) && <PageTabs subRoutes={subRoutes} />}
        </FlexBox>
        {showSelectorSection && (
          <>
            <Divider />
            <FlexBox display="flex" gap={1} alignCenter mb={-1}>
              {selectBranch && <BranchSelector />}
              {additionalFilters?.map((filter, i) => (
                <Fragment key={i}>{filter}</Fragment>
              ))}
            </FlexBox>
          </>
        )}
      </FlexBox>
    </>
  );
};

const BgLogo = () => (
  <Box
    height="100%"
    width="600px"
    position="absolute"
    right={0}
    top={0}
    bottom={0}
    overflow="hidden"
    sx={{ pointerEvents: 'none' }}
  >
    <Box
      position="absolute"
      height="600px"
      bottom={-160}
      right={-200}
      sx={{ opacity: 0.2, zIndex: -1, userSelect: 'none' }}
    >
      <Logo />
    </Box>
  </Box>
);

const PageTabs: FC<{ subRoutes?: SubRoute[] }> = ({ subRoutes }) => {
  const router = useRouter();

  return (
    <Tabs
      items={subRoutes.map((route) => ({
        key: route.path,
        label: route.label
      }))}
      checkSelected={({ key }) => router.asPath.startsWith(key as string)}
      ItemWrapper={({ children, item }) => (
        <NextLink href={item.key as string} passHref>
          <Box color="secondary.main">{children}</Box>
        </NextLink>
      )}
    />
  );
};

export default PageHeader;
