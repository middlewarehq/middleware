import { Chip, alpha } from '@mui/material';
import pluralize from 'pluralize';
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
import { useAuth } from '@/hooks/useAuth';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import {
  useStateDateConfig,
  useCurrentDateRangeLabel
} from '@/hooks/useStateTeamConfig';
import { useSelector } from '@/store';
import { IntegrationGroup } from '@/types/resources';

import { NoIncidentsLabel } from './NoIncidentsLabel';
import { useChangeFailureRateProps } from './sharedHooks';

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

export const ChangeFailureRateCard = () => {
  const { integrationSet } = useAuth();
  const dateRangeLabel = useCurrentDateRangeLabel();

  const { trendsSeriesMap } = useDoraMetricsGraph();
  const isCodeProviderIntegrationEnabled = integrationSet.has(
    IntegrationGroup.CODE
  );

  const isIncidentProviderIntegrationEnabled = true;

  const canShowIncidentsData =
    isCodeProviderIntegrationEnabled && isIncidentProviderIntegrationEnabled;

  const changeFailureRateProps = useChangeFailureRateProps();
  const prevChangeFailureRate = useSelector((s) =>
    Math.round(
      s.doraMetrics.metrics_summary?.change_failure_rate_stats.previous
        .change_failure_rate || 0
    )
  );

  const totalFailureIncidents = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .incident_count
  );

  const series = useMemo(
    () => [
      {
        label: 'Change Failure rate',
        fill: 'start',
        data: head(trendsSeriesMap?.changeFailureRateTrends || [])?.data.map(
          (s) => s.y
        ),
        backgroundColor: alpha(changeFailureRateProps.backgroundColor, 0.2),
        lineTension: 0.2
      }
    ],
    [
      changeFailureRateProps.backgroundColor,
      trendsSeriesMap?.changeFailureRateTrends
    ]
  );

  const { weeksCovered, daysCovered } = useStateDateConfig();
  const isCfrDataAvailable = Boolean(
    changeFailureRateProps.avgWeeklyDeploymentFrequency &&
      (changeFailureRateProps.count || prevChangeFailureRate)
  );
  return (
    <CardRoot>
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter>
            <Line white huge bold py={1}>
              Change Failure Rate
            </Line>
            <MetricExternalRead
              link={`https://docs.gitlab.com/ee/user/analytics/dora_metrics.html#change-failure-rate`}
              label="Change Failure Rate"
            />
          </FlexBox>
          <FlexBox
            title={
              <FlexBox col gap={1 / 2}>
                <Line medium white>
                  {changeFailureRateProps.tooltip}
                </Line>
                {getDoraLink('How is this determined?')}
              </FlexBox>
            }
            alignCenter
            darkTip
          >
            {canShowIncidentsData && isCfrDataAvailable && (
              <Chip
                sx={{ background: changeFailureRateProps.bg }}
                icon={
                  <FlexBox bgcolor="#0003" round>
                    <changeFailureRateProps.icon
                      sx={{ transform: 'scale(0.8)' }}
                    />
                  </FlexBox>
                }
                label={
                  <Line bold white>
                    {changeFailureRateProps.classification}
                  </Line>
                }
                color="success"
              />
            )}
          </FlexBox>
        </FlexBox>
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {canShowIncidentsData ? (
              <Chart2
                id="cfr-frequency"
                type="line"
                series={series}
                options={chartOptions}
              />
            ) : (
              <NoDataImg />
            )}
          </FlexBox>
          <FlexBox position="absolute" fill col paddingX={2} gap1 justifyCenter>
            {canShowIncidentsData ? (
              <FlexBox justifyCenter sx={{ width: '100%' }} col gap1>
                <Line bigish medium color={changeFailureRateProps.color}>
                  Avg. failure rate
                </Line>
                <FlexBox gap={2} alignCenter>
                  <Line
                    bold
                    color={changeFailureRateProps.color}
                    sx={{ fontSize: '3em' }}
                    lineHeight={1}
                  >
                    {changeFailureRateProps.count ? (
                      `${Number(changeFailureRateProps.count.toFixed(2))}%`
                    ) : (
                      <NoIncidentsLabel
                        deploymentsCount={
                          changeFailureRateProps.avgWeeklyDeploymentFrequency ||
                          0
                        }
                      />
                    )}
                  </Line>
                  {isCfrDataAvailable && (
                    <DoraMetricsComparisonPill
                      val={changeFailureRateProps.count}
                      against={prevChangeFailureRate}
                      prevFormat={(val) => `${val || '0'}%`}
                      positive={false}
                      boxed
                      light
                      size="1.2em"
                      lineProps={{ bold: false, fontWeight: 600 }}
                      sx={{ marginBottom: '-8px' }}
                    />
                  )}
                </FlexBox>
                <FlexBox justifyBetween>
                  <Line
                    small
                    medium
                    pointer
                    onClick={() => {
                      track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                        viewed: 'CFR'
                      });
                      return console.error('OVERLAY PENDING');
                    }}
                    color={changeFailureRateProps.color}
                  >
                    <Line
                      underline={Boolean(
                        changeFailureRateProps.avgWeeklyDeploymentFrequency
                      )}
                      dotted
                    >
                      {changeFailureRateProps.avgWeeklyDeploymentFrequency
                        ? totalFailureIncidents
                          ? `See details ->`
                          : null
                        : `Due to no deployments between ${dateRangeLabel}`}
                    </Line>
                  </Line>
                  {Boolean(totalFailureIncidents) && (
                    <FlexBox
                      title={`${totalFailureIncidents} ${pluralize(
                        'incident',
                        totalFailureIncidents
                      )} over ${weeksCovered} ${pluralize(
                        'week',
                        weeksCovered
                      )} ${
                        daysCovered
                          ? `${daysCovered} ${pluralize('day', daysCovered)}`
                          : ''
                      }`}
                    >
                      <Line
                        small
                        bold
                        pointer
                        onClick={() => {
                          track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                            viewed: 'CFR'
                          });
                          return console.error('OVERLAY PENDING');
                        }}
                        color={changeFailureRateProps.color}
                      >
                        {totalFailureIncidents} total incidents
                      </Line>
                    </FlexBox>
                  )}
                </FlexBox>
              </FlexBox>
            ) : !isCodeProviderIntegrationEnabled ? (
              <MissingDORAProviderLink type="CODE" />
            ) : (
              <MissingDORAProviderLink type="INCIDENT" />
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};
