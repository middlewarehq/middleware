import {
  Box,
  Drawer,
  alpha,
  styled,
  Divider,
  useTheme,
  lighten
} from '@mui/material';
import { format, isValid } from 'date-fns';
import { useContext, useMemo } from 'react';

// CLUSTOX: signed-in user + sign out
import { ClustoxUserFooter } from '@/components/ClustoxUserFooter';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { SidebarContext } from '@/contexts/SidebarContext';
import { useSelector } from '@/store';

import SidebarMenu from './SidebarMenu';
import SidebarTopSection from './SidebarTopSection';

const SidebarWrapper = styled(Box)(
  ({ theme }) => `
        width: ${theme.sidebar.width};
        min-width: ${theme.sidebar.width};
        color: ${theme.colors.alpha.trueWhite[70]};
        position: relative;
        z-index: 7;
        height: 100%;
        display: flex;
        flex-direction: column;
`
);

// CLUSTOX FIX: react-custom-scrollbars-2 (still on 4.4.0, peer dep caps at
// React 17) hides the native scrollbar with a negative-margin trick that
// depends on ref/DOM timing that React 18 breaks. When it fails, the raw
// native scrollbar -- OS-drawn arrows, its own gutter color -- shows through
// instead of the library's thin styled thumb, and the container it applies
// that trick to is hard-coded to overflow:scroll (always-on) rather than
// auto, so it renders even when the menu doesn't overflow. A plain
// overflow-y:auto region with a themed ::-webkit-scrollbar sidesteps both:
// no legacy scrolling layer, and a scrollbar only when content truly
// overflows.
const ScrollableMenu = styled(Box)(
  ({ theme }) => `
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;

        &::-webkit-scrollbar {
          width: 5px;
        }
        &::-webkit-scrollbar-track {
          background: transparent;
        }
        &::-webkit-scrollbar-thumb {
          background: ${theme.colors.alpha.black[10]};
          border-radius: ${theme.general.borderRadiusLg};
        }
        &::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.alpha.black[30]};
        }
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

  const imageStatus = useSelector((s) => s.app.latestImageStatus);

  const imageBuildDate = new Date(imageStatus?.current_docker_image_build_date);
  const formattedDate = isValid(imageBuildDate)
    ? format(imageBuildDate, 'dd MMM yyyy HH:mm:ss')
    : 'Not Available';

  return (
    <>
      <ScrollableMenu>
        <SidebarTopSection />
        <Divider
          sx={{
            mb: 1 / 2,
            mx: 2,
            background: theme.colors.alpha.trueWhite[10]
          }}
        />
        <SidebarMenu />
      </ScrollableMenu>
      <Divider sx={{ background: theme.colors.alpha.trueWhite[10] }} />
      {/* CLUSTOX: signed-in identity and the only sign-out affordance. */}
      <ClustoxUserFooter />
      <Divider sx={{ background: theme.colors.alpha.trueWhite[10] }} />
      <FlexBox justifyCenter alignCenter height="60px">
        <Line small medium secondary>
          Build: {formattedDate}
        </Line>
      </FlexBox>
    </>
  );
};

export default Sidebar;
