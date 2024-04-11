import { CircularProgress, useTheme } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { MotionBox } from '@/components/MotionComponents';
import { getRandomLoadMsg } from '@/utils/loading-messages';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export function FixedContentRefreshLoader({ show }: { show?: boolean }) {
  const theme = useTheme();
  const el = document.querySelector('#web-dash-in-content-loader');

  if (!el) return null;

  return (
    <div style={{ position: 'fixed', pointerEvents: 'none' }}>
      {createPortal(
        <AnimatePresence>
          {show && (
            <FlexBox
              centered
              position="absolute"
              p={4}
              fullWidth
              bottom={0}
              bgcolor={theme.palette.background.paper}
              col
              gap2
              zIndex={10}
              component={MotionBox}
              initial={{ y: '200px', opacity: 0 }}
              animate={{ y: '0px', opacity: 1 }}
              exit={{ y: '200px', opacity: 0 }}
              transition={{ ease: 'easeOut' }}
            >
              <FlexBox
                id="web-dash-in-content-loader"
                position="absolute"
                fullWidth
                bottom="100%"
                sx={{
                  background: `linear-gradient(0turn, ${theme.palette.background.paper}, transparent)`,
                  height: '40px'
                }}
              />
              <CircularProgress size="2em" />
              <Line small>{getRandomLoadMsg()}</Line>
              <Line tiny mt={-2} color="secondary.dark">
                Taking a moment to refresh the data
              </Line>
            </FlexBox>
          )}
        </AnimatePresence>,
        el
      )}
    </div>
  );
}
