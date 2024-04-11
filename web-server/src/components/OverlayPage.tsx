import { ArrowBackRounded } from '@mui/icons-material';
import { alpha, darken, Divider, IconButton, useTheme } from '@mui/material';
import { FC, ReactNode, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { overlaysImportMap } from '@/constants/overlays';

import { FlexBox } from './FlexBox';
import { MotionBox } from './MotionComponents';
import Scrollbar from './Scrollbar';
import { Line } from './Text';

export type OverlayPageEntry = {
  title: ReactNode;
  ui: keyof typeof overlaysImportMap;
  props?: Record<string, any>;
};

export type OverlayPageItem = {
  id?: string | number;
  page: OverlayPageEntry;
  index?: number;
};

const BASE_Z = 10;

export const OverlayPage: FC<OverlayPageItem> = ({
  id,
  page: { title, ui, props },
  index
}) => {
  const theme = useTheme();
  const { goBack } = useOverlayPage();

  const child = useMemo(() => {
    if (ui && overlaysImportMap[ui]) {
      const Comp = overlaysImportMap[ui];
      return <Comp {...props} />;
    }
    return <FlexBox>Unidentified content requested</FlexBox>;
  }, [props, ui]);

  return (
    <FlexBox>
      <FlexBox
        position="fixed"
        bgfy
        bgcolor={alpha(darken(theme.colors.primary.main, 0.8), 0.6)}
        zIndex={BASE_Z + index}
        sx={{ backdropFilter: 'blur(4px)' }}
        component={MotionBox}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ ease: 'easeOut' }}
        onClick={goBack}
      />
      <FlexBox
        component={MotionBox}
        id={`overlay-page-${id}`}
        position="fixed"
        top={0}
        bottom={0}
        right={0}
        left={{
          xs: `${15 * (index + 1)}vw`,
          lg: `calc(200px + ${15 * (index + 1)}vw)`
        }}
        bgcolor={alpha(darken(theme.colors.primary.main, 0.8), 0.8)}
        zIndex={BASE_Z + index}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ ease: 'easeOut' }}
        boxShadow={`0 0 20px ${alpha(
          darken(theme.colors.primary.main, 0.9),
          0.8
        )}`}
      >
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <FlexBox col gap1 p={4} pb={0} relative zIndex={1} fullWidth>
            <FlexBox alignCenter gap1>
              <IconButton onClick={goBack}>
                <ArrowBackRounded />
              </IconButton>
              <Line big white bold>
                {title}
              </Line>
            </FlexBox>
            <Divider sx={{ height: '1px', bgcolor: 'secondary.light' }} />
            <Scrollbar>
              <FlexBox pl="49px" py={1} pb={6} pr={2} minHeight="100%" col>
                <FlexBox col maxWidth="100%" fill flex1>
                  <Suspense fallback={<FlexBox>Loading...</FlexBox>}>
                    {child}
                  </Suspense>
                </FlexBox>
              </FlexBox>
            </Scrollbar>
          </FlexBox>
        </ErrorBoundary>
      </FlexBox>
    </FlexBox>
  );
};
