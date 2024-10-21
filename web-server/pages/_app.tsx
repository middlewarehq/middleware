import { CacheProvider, EmotionCache } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Router from 'next/router';
import { SnackbarProvider } from 'notistack';
import nProgress from 'nprogress';
import { ReactElement, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider as ReduxProvider } from 'react-redux';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import Loader from 'src/components/Loader';
import { SidebarProvider } from 'src/contexts/SidebarContext';
import { AuthConsumer, AuthProvider } from 'src/contexts/ThirdPartyAuthContext';
import createEmotionCache from 'src/createEmotionCache';
import useScrollTop from 'src/hooks/useScrollTop';
import { store } from 'src/store';
import ThemeProvider from 'src/theme/ThemeProvider';

import { AppErrors } from '@/components/AppErrors/AppErrors';
import { AppHead } from '@/components/AppHead';
import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback';
import { ImageUpdateBanner } from '@/components/ImageUpdateBanner';
import { MaintenanceModeDisplay } from '@/components/MaintenanceModeDisplay';
import { OverlayPageProvider } from '@/components/OverlayPageContext';
import { TopLevelLogicComponent } from '@/components/TopLevelLogicComponent';
import { ModalCtxProvider } from '@/contexts/ModalContext';
import {
  FeatureFlagsContext,
  useFlagOverrides,
  defaultFlags
} from '@/hooks/useFeature';
import { useResizeEventTracking } from '@/hooks/useResizeEventTracking';

import type { NextPage } from 'next';
import type { AppProps } from 'next/app';

import 'nprogress/nprogress.css';
import '@/api-helpers/axios';

export const persistor = persistStore(store);
const clientSideEmotionCache = createEmotionCache();

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
  Component: NextPageWithLayout;
}

function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const getLayout = Component.getLayout ?? ((page) => page);
  useScrollTop();
  const overrides = useFlagOverrides();
  useResizeEventTracking();

  Router.events.on('routeChangeStart', nProgress.start);
  Router.events.on('routeChangeError', nProgress.done);
  Router.events.on('routeChangeComplete', nProgress.done);

  return (
    <FeatureFlagsContext.Provider value={{ flags: defaultFlags, overrides }}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider>
          <AppHead />
          <MaintenanceModeDisplay>
            <ReduxProvider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <SidebarProvider>
                  <SnackbarProvider
                    maxSnack={6}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right'
                    }}
                  >
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                        <AuthProvider>
                          <ModalCtxProvider>
                            <OverlayPageProvider>
                              <CssBaseline />
                              <AppErrors />
                              <TopLevelLogicComponent />
                              <ImageUpdateBanner />
                              <AuthConsumer>
                                {(auth) =>
                                  !auth.isInitialized ? (
                                    <Loader />
                                  ) : (
                                    getLayout(<Component {...pageProps} />)
                                  )
                                }
                              </AuthConsumer>
                            </OverlayPageProvider>
                          </ModalCtxProvider>
                        </AuthProvider>
                      </ErrorBoundary>
                    </LocalizationProvider>
                  </SnackbarProvider>
                </SidebarProvider>
              </PersistGate>
            </ReduxProvider>
          </MaintenanceModeDisplay>
        </ThemeProvider>
      </CacheProvider>
    </FeatureFlagsContext.Provider>
  );
}

export default MyApp;
