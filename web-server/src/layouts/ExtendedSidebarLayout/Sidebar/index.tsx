import {
  Box,
  Drawer,
  alpha,
  styled,
  Divider,
  useTheme,
  lighten
} from '@mui/material';
import { useContext, useMemo } from 'react';

import Scrollbar from '@/components/Scrollbar';
import { SidebarContext } from '@/contexts/SidebarContext';

import SidebarMenu from './SidebarMenu';
import SidebarTopSection from './SidebarTopSection';
import { useSelector } from '@/store';
import { FlexBox } from '@/components/FlexBox';
import { format } from 'date-fns';

const SidebarWrapper = styled(Box)(
  ({ theme }) => `
        width: ${theme.sidebar.width};
        min-width: ${theme.sidebar.width};
        color: ${theme.colors.alpha.trueWhite[70]};
        position: relative;
        z-index: 7;
        height: 100%;
        padding-bottom: 61px;
`
);

function Sidebar() {
  const { sidebarToggle, toggleSidebar } = useContext(SidebarContext);
  const closeSidebar = () => toggleSidebar();
  const theme = useTheme();

  const commonSidebarProps = useMemo(
    () => ({
      background: alpha(lighten(theme.header.background, 0.1), 0.5),
      boxShadow: theme.sidebar.boxShadow
    }),
    [theme.header.background, theme.sidebar.boxShadow]
  );

  return (
    <>
      <Drawer
        sx={{ boxShadow: `${theme.sidebar.boxShadow}` }}
        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
        open={sidebarToggle}
        onClose={closeSidebar}
        variant="temporary"
        elevation={9}
      >
        <SidebarWrapper sx={commonSidebarProps}>
          <SidebarContent />
        </SidebarWrapper>
      </Drawer>
    </>
  );
}

const SidebarContent = () => {
  const theme = useTheme();
  
  const imageStatus = useSelector((s)=>s.app.latestImageStatus)
  
  const formattedDate = format(new Date(imageStatus.current_docker_image_build_date), "dd MMM yyyy HH:mm:ss");

  return (
    <>
      <Scrollbar>
        <SidebarTopSection />
        <Divider
          sx={{
            mb: 1 / 2,
            mx: 2,
            background: theme.colors.alpha.trueWhite[10]
          }}
        />
        <SidebarMenu />
      </Scrollbar>
      <Divider sx={{ background: theme.colors.alpha.trueWhite[10] }} />
      <FlexBox justifyCenter alignCenter>
        Image TimeStamp : {formattedDate}
      </FlexBox>
    </>
  );
};

export default Sidebar;
