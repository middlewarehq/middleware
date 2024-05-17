import { Box } from '@mui/material';

import { Logo } from '@/components/Logo/Logo';

function SidebarTopSection() {
  return (
    <Box
      height="60px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        mx: 2,
        position: 'relative'
      }}
    >
      <Logo mode="long" height={'40px'} />
    </Box>
  );
}

export default SidebarTopSection;
