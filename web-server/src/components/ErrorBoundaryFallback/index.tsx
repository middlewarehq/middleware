import {
  CopyAll,
  HomeRounded,
  RefreshRounded,
  SettingsBackupRestoreRounded
} from '@mui/icons-material';
import { Button, Divider, lighten, Typography, useTheme } from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { persistor } from 'pages/_app';
import { useEffect, useMemo } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { track } from '@/constants/events';
import { useDefaultRoute } from '@/constants/useRoute';

import errPattern from './err-pattern.png';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export const ErrorBoundaryFallback = (props: any) => {
  const theme = useTheme();
  const router = useRouter();
  const defaultRoute = useDefaultRoute();
  const { enqueueSnackbar } = useSnackbar();

  const errorBody = useMemo(
    () => ({
      message: props.error?.message?.replace('\\n', '\n'),
      stack: props.error?.stack?.replace('\\n', '\n')
    }),
    [props.error?.message, props.error?.stack]
  );

  useEffect(() => {
    track('ERR_FALLBACK_SHOWN', { err: errorBody });
    console.error(props.error);
  }, [errorBody, props.error]);

  return (
    <>
      <Head>
        <title>Error | MiddlewareHQ</title>
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
      >
        <FlexBox bgfy bgcolor="#0003" sx={{ backdropFilter: 'blur(2px)' }} />
        <FlexBox col centered relative>
          <FlexBox col centered gap1 mb={4}>
            <Typography variant="h1" color="white">
              MiddlewareHQ
            </Typography>
            <Typography
              variant="h3"
              color={lighten(theme.colors.primary.main, 0.5)}
            >
              Something broke, let's try to get you out of this
            </Typography>
            <FlexBox gap1 mt={2}>
              <FlexBox
                darkTip
                title={
                  <FlexBox gap1 col>
                    <Line white medium>
                      This will attempt to clear any stored cached app settings
                      and restore the UI.
                    </Line>
                    <Line>
                      Your selections like the current team or date range may be
                      reset. Any unsaved data within forms could be lost.
                    </Line>
                    <Line>
                      This may mitigate issues with your current team/date
                      selection, so you can use the app while we fix this.
                    </Line>
                  </FlexBox>
                }
                startIcon={<SettingsBackupRestoreRounded />}
                component={Button}
                variant="contained"
                size="small"
                onClick={() => {
                  track('ERR_BOUNDARY_RESET_UI');
                  persistor.purge();
                  props.resetErrorBoundary();
                }}
              >
                Reset UI
              </FlexBox>
              <FlexBox
                darkTip
                title={
                  <FlexBox gap1 col>
                    <Line white medium>
                      This will reload the page, triggering re-fetches of server
                      data.
                    </Line>
                    <Line>
                      Your team/date range selections will remain. Any unsaved
                      data within forms could be lost.
                    </Line>
                    <Line>
                      This may mitigate ephemeral issues with data on our
                      servers, or downstream services.
                    </Line>
                  </FlexBox>
                }
                startIcon={<RefreshRounded />}
                component={Button}
                variant="contained"
                size="small"
                onClick={() => {
                  track('ERR_BOUNDARY_PAGE_RELOAD');
                  router.reload();
                }}
              >
                Reload Page
              </FlexBox>
              <Link href={defaultRoute.PATH} passHref>
                <FlexBox
                  darkTip
                  title={
                    <FlexBox gap1 col>
                      <Line white medium>
                        This will reload the page and take you to the main
                        screen of the app.
                      </Line>
                      <Line>
                        Your team/date range selections will remain. Any unsaved
                        data within forms could be lost.
                      </Line>
                      <Line>
                        In case the issue is in the current UI, you'll be able
                        to use the rest of the app while we fix it.
                      </Line>
                    </FlexBox>
                  }
                  startIcon={<HomeRounded />}
                  component={Button}
                  variant="contained"
                  size="small"
                  onClick={() => {
                    track('ERR_BOUNDARY_GO_HOME');
                  }}
                >
                  Go to Home
                </FlexBox>
              </Link>
            </FlexBox>

            <Line
              bold
              component={Typography}
              color={lighten(theme.colors.primary.main, 0.5)}
              fontSize="1.1em"
              medium
              mt={2}
            >
              We've been notified of this, and a quick fix should ensure this
              doesn't happen again
            </Line>
            <Divider sx={{ bgcolor: 'primary.main', width: '60%', my: 2 }} />
            <Line component={Typography} white>
              Feeling technical?
            </Line>
            <Line tiny component={Typography} color="primary.main" mb={2}>
              You can click the button below to copy and share additional logs
              with us
            </Line>
            <CopyToClipboard
              text={JSON.stringify(errorBody, null, '  ')}
              onCopy={() => {
                enqueueSnackbar(`Error logs copied to clipboard`, {
                  variant: 'success'
                });
              }}
            >
              <Button
                size="small"
                variant="contained"
                startIcon={<CopyAll />}
                sx={{ fontWeight: 'bold' }}
              >
                Copy Logs
              </Button>
            </CopyToClipboard>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </>
  );
};
