import { Box, CircularProgress } from '@mui/material';

import { getRandomLoadMsg } from '@/utils/loading-messages';

import { Line } from '../Text';

function Loader(props: { mode?: 'full-screen' | 'full-size' }) {
  const position = props.mode === 'full-size' ? 'absolute' : 'fixed';

  return (
    <Box
      sx={{ position, left: 0, top: 0, width: '100%', height: '100%' }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={2}
    >
      <CircularProgress size={64} disableShrink thickness={3} />
      <Line>{getRandomLoadMsg()}</Line>
      <Line tiny secondary>
        Getting app data. Takes a moment...
      </Line>
    </Box>
  );
}

export default Loader;
