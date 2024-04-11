import { Button, Divider, lighten, Typography, useTheme } from '@mui/material';
import { Fireworks } from 'fireworks-js';
import Head from 'next/head';
import { FC, useEffect, useRef } from 'react';

import { track } from '@/constants/events';

import errPattern from '../ErrorBoundaryFallback/err-pattern.png';
import { FlexBox } from '../FlexBox';
import { Logo } from '../Logo/Logo';
import { Line } from '../Text';

export const MaintenanceModeDisplay: FC<{ title?: string }> = ({
  children,
  title
}) => {
  const enableAppMaintenance = false;
  const theme = useTheme();
  const fireworksRef = useRef<Fireworks>(null);

  useEffect(() => {
    if (!enableAppMaintenance) return;

    track('MAINTENANCE_MODE_SHOWN');
    const container = document.querySelector(
      '#maintenance-mode-overlay-fireworks'
    );
    fireworksRef.current = new Fireworks(container);
  }, [enableAppMaintenance]);

  if (!enableAppMaintenance) return <>{children}</>;

  return (
    <>
      <Head>
        <title>{title || 'Error | MiddlewareHQ'}</title>
      </Head>
      <FlexBox
        col
        centered
        p={4}
        bgfy
        textAlign="center"
        sx={{
          backgroundImage: `url(${errPattern})`,
          backgroundSize: '250px'
        }}
        id="maintenance-mode-overlay"
      >
        <FlexBox bgfy bgcolor="#0003" sx={{ backdropFilter: 'blur(2px)' }} />
        <FlexBox col centered relative>
          <FlexBox col centered gap1 mb={4}>
            <Logo width="200px" style={{ opacity: 0.75 }} />
            <Typography variant="h1" color="white">
              MiddlewareHQ
            </Typography>
            <Typography
              variant="h3"
              color={lighten(theme.colors.primary.main, 0.5)}
            >
              We're undergoing some technical maintenance
            </Typography>

            <Divider sx={{ bgcolor: 'primary.main', width: '60%', my: 2 }} />
            <Line component={Typography} white big>
              We should be back shortly
            </Line>
            <Line tiny component={Typography} color="primary.main" mb={2}>
              Click the button below if you can't wait for us to be back
            </Line>
            <FlexBox
              bgfy
              position="fixed"
              id="maintenance-mode-overlay-fireworks"
            />
            <Button
              variant="contained"
              onClick={() => {
                track('BRING_BACK_MIDDLEWARE_CLICKED');
                fireworksRef.current?.launch();
              }}
            >
              🎉🎉🎉&nbsp;&nbsp;Bring Middleware Back!&nbsp;&nbsp;🎉🎉🎉
            </Button>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </>
  );
};
