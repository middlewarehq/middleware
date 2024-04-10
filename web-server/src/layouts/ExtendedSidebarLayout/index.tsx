import { Box, useTheme } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback/index';

import Sidebar from './Sidebar';

const ExtendedSidebarLayout: FC = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        bgcolor: '#070c27',

        '.MuiPageTitle-wrapper': {
          position: 'relative',
          background:
            theme.palette.mode === 'dark'
              ? theme.colors.alpha.trueWhite[5]
              : theme.colors.alpha.white[50],
          marginBottom: `${theme.spacing(4)}`,
          borderBottom: `1px solid #fff2`
        }
      }}
    >
      <Sidebar />
      <Box
        sx={{
          position: 'relative',
          zIndex: 5,
          display: 'block',
          flex: 1,
          height: '100vh',
          [theme.breakpoints.up('lg')]: {
            ml: `${theme.sidebar.width}`
          }
        }}
      >
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <Box display="flex" flexDirection="column" height="100%">
            {children}
          </Box>
          <AnimatePresence>
            <Box
              id="web-dash-in-content-loader"
              position="absolute"
              width="100%"
              bottom={0}
            />
          </AnimatePresence>
        </ErrorBoundary>
      </Box>
    </Box>
  );
};

ExtendedSidebarLayout.propTypes = {
  children: PropTypes.node
};

export default ExtendedSidebarLayout;
