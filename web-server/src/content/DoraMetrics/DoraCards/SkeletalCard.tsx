import { Paper, Grid, Divider, useTheme } from '@mui/material';
import Link from 'next/link';
import { FC, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useBoolState } from '@/hooks/useEasyState';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { LoaderCore } from '../DoraMetricsBody';

const ANIMATON_DURATION = 1000;

export const DataStillSyncing = () => {
  const flickerAnimation = useBoolState();

  useEffect(() => {
    const flickerInterval = setInterval(
      flickerAnimation.toggle,
      ANIMATON_DURATION
    );

    return () => {
      clearInterval(flickerInterval);
    };
  }, [flickerAnimation.toggle]);
  return (
    <FlexBox col gap2>
      <ScoreSkeleton />
      <LoaderCore />
      <Divider />
      <Grid container spacing={4}>
        <Grid item xs={12} md={6} order={1}>
          <SkeletalCard animation={flickerAnimation.value} />
        </Grid>
        <Grid item xs={12} md={6} order={2}>
          <SkeletalCard animation={flickerAnimation.value} />
        </Grid>
        <Grid item xs={12} md={6} order={3}>
          <SkeletalCard animation={flickerAnimation.value} />
        </Grid>
        <Grid item xs={12} md={6} order={4}>
          <SkeletalCard animation={flickerAnimation.value} />
        </Grid>
      </Grid>
    </FlexBox>
  );
};

const SkeletalCard: FC<{ animation?: boolean }> = ({ animation }) => {
  return (
    <FlexBox
      minHeight={'15em'}
      component={Paper}
      col
      boxShadow={'none !important'}
      relative
      width={'100%'}
      flexGrow={1}
      overflow={'hidden'}
      height={'100%'}
      p={2}
    >
      <FlexBox
        col
        justifyBetween
        height={'100%'}
        sx={{
          filter: `brightness(${animation ? 0.7 : 1})`,
          transition: `all ${ANIMATON_DURATION}ms linear`
        }}
      >
        <FlexBox fullWidth justifyBetween>
          <FlexBox gap1>
            <Skeleton width="200px" />
            <Skeleton width="30px" />
          </FlexBox>
          <Skeleton width="75px" />
        </FlexBox>
        <FlexBox col gap2>
          <Skeleton width="100px" height="20px" />
          <Skeleton width="200px" />
          <Skeleton width="100px" height="20px" />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const ScoreSkeleton: FC<{ animation?: boolean }> = ({ animation }) => {
  const theme = useTheme();
  const stats = {
    avg: 2,
    standard: 6.3,
    lt: 4,
    df: 5,
    cfr: 6,
    mttr: 7
  };

  return (
    <FlexBox>
      <FlexBox centered gap={1.5}>
        <FlexBox col>
          <Line bigish bold white>
            Your DORA
          </Line>
          <Line bigish bold white>
            Performance
          </Line>
        </FlexBox>

        <FlexBox
          col
          height={'50px'}
          centered
          gap={'14px'}
          ml={1}
          sx={{
            filter: `brightness(${animation ? 0.7 : 1})`,
            transition: `all ${ANIMATON_DURATION}ms linear`
          }}
        >
          <Skeleton height="12px" width="90px" />
          <Skeleton height="12px" width="90px" />
        </FlexBox>

        <FlexBox col ml={4}>
          <Line bigish bold white>
            Industry
          </Line>
          <Line bigish bold white>
            Standard
          </Line>
        </FlexBox>

        <FlexBox
          corner={theme.spacing(1)}
          px={1.5}
          sx={{
            background: `linear-gradient(30deg,#8C7CF0, #3E2EA4)`
          }}
        >
          <Line fontSize={'2.4em'} bold white>
            {stats.standard}{' '}
            <Line fontSize="0.8rem" ml="-4px">
              / 10
            </Line>
          </Line>
        </FlexBox>

        <FlexBox col>
          <Line bigish medium>
            Based on data available
          </Line>
          <Line bigish>
            at{' '}
            <Line info semibold>
              <Link
                href="https://dora.dev/quickcheck"
                {...OPEN_IN_NEW_TAB_PROPS}
              >
                dora.dev
              </Link>
            </Line>
          </Line>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const Skeleton: FC<{ width?: string; height?: string }> = ({
  width = '150px',
  height = '30px'
}) => (
  <FlexBox
    height={height}
    bgcolor={'#262E5E'}
    width={width}
    borderRadius={'20px'}
  />
);
