import {
  ArrowForwardRounded,
  CloseRounded,
  LoupeRounded,
  WarningAmberRounded
} from '@mui/icons-material';
import { Box, useTheme, darken, IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';
import { head, sum } from 'ramda';
import { FC, ReactNode, useCallback, useMemo, useRef } from 'react';

import { getExtremePrsFromDistribution } from '@/api-helpers/pr';
import {
  Chart2,
  ChartOnClick,
  ChartOnZoom,
  resetChartById
} from '@/components/Chart2';
import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { InsightChip } from '@/components/InsightChip';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { Line } from '@/components/Text';
import { MAX_INT } from '@/constants/generic';
import { LegendAndStats } from '@/content/PullRequests/LegendAndStats';
import { useEasyState, useBoolState } from '@/hooks/useEasyState';
import { useFeature } from '@/hooks/useFeature';
import { useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { percent } from '@/utils/datatype';
import { depFn } from '@/utils/fn';

export type ProcessChartProps = FlexBoxProps & {
  legendOutside?: boolean;
  chartId?: string;
};

export const ProcessChart: FC<ProcessChartProps> = ({
  legendOutside,
  chartId = 'process-chart',
  ...props
}) => {
  const theme = useTheme();
  const enablePrCycleTimeComparison = useFeature(
    'enable_pr_cycle_time_comparison'
  );
  const cycleTimeBuckets = useSelector(
    (state) => state.collab.cycle_time_distribution
  );

  const statRange = useEasyState<[number, number] | null>(null);
  const series = useMemo(
    () => [
      {
        label: 'PR Count',
        data: cycleTimeBuckets.map((b) => b.prCount),
        backgroundColor: brandColors.pr.firstResponseTime,
        borderColor: brandColors.pr.firstResponseTime
      }
    ],
    [cycleTimeBuckets]
  );

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const lastToastKey = useRef('');

  const sliceStat = useCallback(
    (stats: number[]) => {
      if (!statRange.value) return stats;
      const [min, max] = statRange.value;
      return stats.slice(Math.max(min - 1, 0), Math.min(max, stats.length));
    },
    [statRange.value]
  );
  const showStats = useBoolState(false);

  const { upsertPage } = useOverlayPage();
  const onZoom = useCallback<ChartOnZoom>(
    (start, end) => {
      depFn(statRange.set, [start, end]);

      const key = `process-chart-toast-range-${start}-${end}`;
      closeSnackbar(lastToastKey.current);
      lastToastKey.current = key;

      enqueueSnackbar(<ToastTitle label="within the selected range" />, {
        key,
        persist: true,
        transitionDuration: { enter: 150, exit: 80 },
        preventDuplicate: true,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'center'
        },
        action: toastAction(
          () =>
            upsertPage({
              page: {
                title: 'Process overview -> Pull request insights',
                ui: 'team_prs',
                props: {
                  min: cycleTimeBuckets[start].minTime,
                  max: cycleTimeBuckets[end]?.maxTime
                }
              }
            }),
          () => closeSnackbar(key)
        )
      });
    },
    [
      statRange.set,
      closeSnackbar,
      enqueueSnackbar,
      upsertPage,
      cycleTimeBuckets
    ]
  );

  const onClick = useCallback<ChartOnClick>(
    (_1, elements, _2) => {
      const element = head(elements);
      if (!element) return;

      const { index } = element;
      const key = `process-chart-toast-${index}`;

      closeSnackbar(lastToastKey.current);
      lastToastKey.current = key;

      enqueueSnackbar(
        <ToastTitle label={cycleTimeBuckets[index].presentableLabel} />,
        {
          key,
          persist: true,
          transitionDuration: { enter: 150, exit: 80 },
          preventDuplicate: true,
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'center'
          },
          action: toastAction(
            () =>
              upsertPage({
                page: {
                  title: 'Process overview -> Pull request insights',
                  ui: 'team_prs',
                  props: {
                    min: cycleTimeBuckets[index].minTime,
                    max: cycleTimeBuckets[index].maxTime
                  }
                }
              }),
            () => closeSnackbar(key)
          )
        }
      );
    },
    [closeSnackbar, enqueueSnackbar, cycleTimeBuckets, upsertPage]
  );

  const {
    longPrCount,
    quickPrCount,
    longLimitLabel,
    quickLimitLabel,
    longPrTime,
    quickPrTime,
    totalPrCount
  } = getExtremePrsFromDistribution(cycleTimeBuckets);

  return (
    <FlexBox col gap1>
      <FlexBox col gap1 maxWidth="500px">
        {Boolean(quickPrCount) && (
          <InsightChip
            onClick={() =>
              upsertPage({
                page: {
                  title: 'Process overview -> Pull request insights',
                  ui: 'team_prs',
                  props: { min: 0, max: quickPrTime }
                }
              })
            }
          >
            <Line white>
              <Line bold info>
                {quickPrCount} {quickPrCount > 1 ? 'PRs' : 'PR'}
              </Line>{' '}
              ({percent(quickPrCount, totalPrCount)}%) were merged under{' '}
              <Line bold info>
                {quickLimitLabel}
              </Line>
            </Line>
          </InsightChip>
        )}
        {Boolean(longPrCount) && (
          <InsightChip
            startIcon={<WarningAmberRounded fontSize="small" color="warning" />}
            endIcon={<ArrowForwardRounded color="warning" fontSize="small" />}
            onClick={() =>
              upsertPage({
                page: {
                  title: 'Process overview -> Pull request insights',
                  ui: 'team_prs',
                  props: { min: longPrTime, max: MAX_INT }
                }
              })
            }
          >
            <Line white>
              <Line bold warning>
                {longPrCount} {longPrCount > 1 ? 'PRs' : 'PR'}
              </Line>{' '}
              ({percent(longPrCount, totalPrCount)}%) took a long time to be
              merged{' '}
              <Line bold warning>
                (over {longLimitLabel})
              </Line>
            </Line>
          </InsightChip>
        )}
      </FlexBox>
      <FlexBox relative gap={2}>
        <FlexBox
          p={1}
          pl={2}
          pt={2}
          borderRadius={2}
          gap={2}
          border={`1px dashed ${darken(theme.colors.secondary.main, 0.6)}`}
          minHeight="40vh"
          maxHeight="500px"
          maxWidth="900px"
          flex1
          {...props}
        >
          <Chart2
            id={chartId}
            series={series}
            labels={cycleTimeBuckets.map((b) => b.label)}
            onZoom={onZoom}
            onClick={onClick}
          />
        </FlexBox>
        <LegendAndStats
          legendOutside={legendOutside}
          legends={
            enablePrCycleTimeComparison
              ? [
                  {
                    color: brandColors.pr.firstResponseTime,
                    title: 'Curr PR Count'
                  },
                  {
                    color: darken(brandColors.pr.firstResponseTime, 0.7),
                    title: 'Prev PR Count'
                  }
                ]
              : [
                  {
                    color: brandColors.pr.firstResponseTime,
                    title: 'PR Count'
                  }
                ]
          }
          sections={[
            {
              title: 'Stats',
              collapse: !showStats.value,
              toggle: showStats.toggle,
              stats: [
                {
                  value: sum(sliceStat(series[0].data)),
                  label: 'Total'
                }
              ]
            }
          ]}
          onChartReset={() => {
            resetChartById(chartId);
            statRange.reset();
          }}
        >
          <FlexBox
            color="white"
            fontSize="small"
            display="flex"
            alignItems="baseline"
            fit
            gap={1 / 4}
            pointer
            sx={{ ':hover': { color: 'info.main' } }}
            onClick={() =>
              upsertPage({
                page: {
                  title: 'Process overview -> Pull request insights',
                  ui: 'team_prs',
                  props: statRange.value
                    ? {
                        min: cycleTimeBuckets[statRange.value[0]].minTime,
                        max: cycleTimeBuckets[statRange.value[1]]?.maxTime
                      }
                    : undefined
                }
              })
            }
          >
            <LoupeRounded
              fontSize="inherit"
              sx={{ position: 'relative', top: '2px' }}
            />
            <FlexBox col>
              <Line white>View insights</Line>
              <Line tiny>{statRange.value && 'within range'}</Line>
            </FlexBox>
          </FlexBox>
        </LegendAndStats>
      </FlexBox>
    </FlexBox>
  );
};

const toastAction = (onClick: AnyFunction, onClose: AnyFunction) => () => {
  return (
    <>
      <IconButton
        size="small"
        color="primary"
        onClick={() => {
          onClick();
          onClose();
        }}
      >
        <ArrowForwardRounded />
      </IconButton>
      <IconButton size="small" color="primary" onClick={onClose}>
        <CloseRounded />
      </IconButton>
    </>
  );
};

const ToastTitle: FC<{ label: ReactNode }> = ({ label }) => (
  <Box>
    <Box fontSize="smaller" fontWeight={700} color="primary.dark">
      View PR insights
    </Box>
    <Box>
      For PRs open{' '}
      <Box component="span" fontWeight={500}>
        {label}
      </Box>
    </Box>
  </Box>
);
