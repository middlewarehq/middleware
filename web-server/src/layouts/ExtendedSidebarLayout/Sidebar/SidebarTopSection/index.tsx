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
      <Logo height={40} />
    </Box>
  );
}

export default SidebarTopSection;
