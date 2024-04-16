import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Chip } from '@mui/material';
import { head } from 'ramda';
import { useMemo } from 'react';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import {
  CardRoot,
  NoDataImg
} from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import { getDurationString } from '@/utils/date';

import { NoIncidentsLabel } from './NoIncidentsLabel';
import { useMeanTimeToRestoreProps } from './sharedHooks';

import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';
import { getDoraLink } from '../getDoraLink';
import { MetricExternalRead } from '../MetricExternalRead';
import { MissingDORAProviderLink } from '../MissingDORAProviderLink';

const chartOptions = {
  options: {
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    events: [],
    plugins: {
      zoom: {
        zoom: {
          drag: {
            enabled: false
          }
        }
      }
    }
  }
} as ChartOptions;

export const MeanTimeToRestoreCard = () => {
  const { isNoDataAvailable, ...meanTimeToRestoreProps } =
    useMeanTimeToRestoreProps();

  const { trendsSeriesMap } = useDoraMetricsGraph();
  console.log(
    '🚀 ~ MeanTimeToRestoreCard ~ trendsSeriesMap:',
    head(trendsSeriesMap.meanTimeToRestoreTrends).data
  );
  const isIncidentProviderIntegrationEnabled = true;

  const canShowMTRData =
    !isNoDataAvailable && isIncidentProviderIntegrationEnabled;

  const showClassificationBadge =
    isIncidentProviderIntegrationEnabled && !isNoDataAvailable;

  const series = useMemo(
    () => [
      {
        label: 'Mean time to restore',
        fill: 'start',
        data: head(trendsSeriesMap?.meanTimeToRestoreTrends || [])?.data.map(
          (s) => s.y
        ),
        backgroundColor: meanTimeToRestoreProps.backgroundColor
      }
    ],
    [
      trendsSeriesMap?.meanTimeToRestoreTrends,
      meanTimeToRestoreProps.backgroundColor
    ]
  );

  return (
    <CardRoot>
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter>
            <Line white huge bold py={1}>
              Mean Time to Recovery
            </Line>
            <MetricExternalRead
              link={`https://docs.gitlab.com/ee/user/analytics/dora_metrics.html#time-to-restore-service`}
              label="Mean Time to Recovery"
            />
          </FlexBox>
          <FlexBox
            title={
              <FlexBox col gap={1 / 2}>
                <Line medium white>
                  {meanTimeToRestoreProps.tooltip}
                </Line>
                {getDoraLink('How is this determined?')}
              </FlexBox>
            }
            alignCenter
            darkTip
          >
            {showClassificationBadge && (
              <Chip
                sx={{ background: meanTimeToRestoreProps.bg }}
                icon={
                  <FlexBox bgcolor="#0003" round>
                    <meanTimeToRestoreProps.icon
                      sx={{ transform: 'scale(0.8)' }}
                    />
                  </FlexBox>
                }
                label={
                  <Line bold white>
                    {meanTimeToRestoreProps.classification}
                  </Line>
                }
                color="success"
              />
            )}
          </FlexBox>
        </FlexBox>
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {canShowMTRData ? (
              <Chart2
                id="mttr-frequency"
                type="line"
                series={series}
                options={chartOptions}
              />
            ) : (
              <NoDataImg />
            )}
          </FlexBox>
          <FlexBox position="absolute" fill col paddingX={2} gap1 justifyCenter>
            {canShowMTRData ? (
              <FlexBox justifyCenter sx={{ width: '100%' }} col gap1>
                <Line bigish medium color={meanTimeToRestoreProps.color}>
                  Avg time to restore
                </Line>
                <FlexBox gap={2} alignCenter>
                  <Line
                    bold
                    color={meanTimeToRestoreProps.color}
                    sx={{ fontSize: '3em' }}
                    lineHeight={1}
                  >
                    {meanTimeToRestoreProps.count ? (
                      getDurationString(meanTimeToRestoreProps.count)
                    ) : (
                      <NoIncidentsLabel />
                    )}
                  </Line>
                  <DoraMetricsComparisonPill
                    val={meanTimeToRestoreProps.count}
                    against={meanTimeToRestoreProps.prevCount}
                    prevFormat={(val) => `${getDurationString(val) || 0}`}
                    positive={false}
                    boxed
                    light
                    size="1.2em"
                    lineProps={{ bold: false, fontWeight: 600 }}
                    sx={{ marginBottom: '-8px' }}
                  />
                </FlexBox>

                <Line
                  medium
                  pointer
                  onClick={() => {
                    track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                      viewed: 'MTR'
                    });
                    return console.error('OVERLAY PENDING');
                  }}
                  color={meanTimeToRestoreProps.color}
                >
                  <Line underline dotted>
                    See details
                  </Line>{' '}
                  {'->'}
                </Line>
              </FlexBox>
            ) : isIncidentProviderIntegrationEnabled ? (
              <FlexBox gap1 col>
                <ErrorOutlineRoundedIcon fontSize="large" color="warning" />
                <FlexBox col width={'50%'}>
                  <Line huge>No incidents reported</Line>
                  <Line small>Hence Time to Recovery is unavailable </Line>
                </FlexBox>
              </FlexBox>
            ) : (
              <MissingDORAProviderLink type="INCIDENT" />
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};
