import { Chip, alpha } from '@mui/material';
import pluralize from 'pluralize';
import { head } from 'ramda';
import { useMemo } from 'react';

import { Chart2 } from '@/components/Chart2';
import { useSelectedContributors } from '@/components/ContributorFilter';
import { FlexBox } from '@/components/FlexBox';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import {
  CardRoot,
  NoDataImg
} from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { useAuth } from '@/hooks/useAuth';
import { useCountUp } from '@/hooks/useCountUp';
import { useDoraMetricsGraph } from '@/hooks/useDoraMetricsGraph';
import {
  useStateDateConfig,
  useCurrentDateRangeLabel
} from '@/hooks/useStateTeamConfig';
import { useSelector } from '@/store';
import { IntegrationGroup } from '@/types/resources';
import { benchmarkCaption } from '@/utils/benchmarks';

import { NoIncidentsLabel } from './NoIncidentsLabel';
import {
  useChangeFailureRateProps,
  useDoraCardChartOptions
} from './sharedHooks';

import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';
import { getDoraLink } from '../getDoraLink';
import { MetricExternalRead } from '../MetricExternalRead';
import { MissingDORAProviderLink } from '../MissingDORAProviderLink';

export const ChangeFailureRateCard = () => {
  const { integrationSet } = useAuth();
  const dateRangeLabel = useCurrentDateRangeLabel();
  const selectedContributors = useSelectedContributors();

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

  const changeFailureRateCount = useCountUp(changeFailureRateProps.count || 0);

  const changeFailureRateBenchmark = useSelector(
    (s) => s.doraMetrics.metrics_summary?.benchmarks?.change_failure_rate
  );

  const changeFailureRateValues = useMemo(
    () =>
      head(trendsSeriesMap?.changeFailureRateTrends || [])?.data.map(
        (s) => s.y
      ) || [],
    [trendsSeriesMap?.changeFailureRateTrends]
  );

  const series = useMemo(
    () => [
      {
        label: 'Change Failure rate',
        fill: 'start',
        data: changeFailureRateValues,
        backgroundColor: alpha(changeFailureRateProps.backgroundColor, 0.2),
        lineTension: 0.2
      }
    ],
    [changeFailureRateProps.backgroundColor, changeFailureRateValues]
  );

  const { weeksCovered, daysCovered } = useStateDateConfig();
  const isCfrDataAvailable = Boolean(
    changeFailureRateProps.avgWeeklyDeploymentFrequency &&
      (changeFailureRateProps.count || prevChangeFailureRate)
  );

  // CLUSTOX: zero incidents is a genuine 0% change failure rate -- the best
  // possible result -- not absent data. Gating this on isCfrDataAvailable
  // meant a perfect score displayed as an empty card.
  const cfrActual = isCfrDataAvailable ? changeFailureRateProps.count : 0;

  // CLUSTOX: gated on the *target* existing rather than on incidents
  // existing, for the reason above. canShowIncidentsData stays in the gate
  // because without it the card shows a missing-provider link instead of a
  // chart, and 0% there would be a claim about a team we have no data for.
  const changeFailureRateBenchmarkCaption = useMemo(
    () =>
      canShowIncidentsData && changeFailureRateBenchmark?.target != null
        ? benchmarkCaption(
            'change_failure_rate',
            cfrActual,
            changeFailureRateBenchmark.target,
            changeFailureRateBenchmark.source
          )
        : null,
    [canShowIncidentsData, changeFailureRateBenchmark, cfrActual]
  );

  const changeFailureRateChartOptions = useDoraCardChartOptions(
    canShowIncidentsData
      ? {
          metric: 'change_failure_rate',
          target: changeFailureRateBenchmark?.target,
          actual: cfrActual,
          values: changeFailureRateValues
        }
      : null
  );

  const { addPage } = useOverlayPage();
  return (
    <CardRoot
      onClick={() => {
        track('DORA_METRICS_SEE_DETAILS_CLICKED', {
          viewed: 'CFR'
        });
        addPage({
          page: {
            title: 'Deployments with incidents',
            ui: 'all_incidents'
          }
        });
      }}
    >
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter>
            <Line white huge bold py={1}>
              Change Failure Rate
            </Line>
            <FlexBox
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MetricExternalRead
                link={`https://www.middlewarehq.com/blog/how-to-reduce-change-failure-rate-build-bulletproof-software-delivery-process`}
                label="Change Failure Rate"
              />
            </FlexBox>
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
        {Boolean(selectedContributors.length) && (
          // CLUSTOX: unlike Lead Time and Deployment Frequency, this card
          // has no per-contributor breakdown yet -- say so explicitly, or a
          // selected filter with an unmoving number reads as broken.
          <Line small secondary paddingX={2} mt={-1}>
            team-wide — per-contributor arrives with Jira
          </Line>
        )}
        {changeFailureRateBenchmarkCaption && (
          <Line
            small
            paddingX={2}
            mt={-1}
            color={
              changeFailureRateBenchmarkCaption.tone === 'good'
                ? 'success'
                : 'warning'
            }
          >
            {changeFailureRateBenchmarkCaption.text}
          </Line>
        )}
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {canShowIncidentsData ? (
              <Chart2
                id="cfr-frequency"
                type="line"
                series={series}
                options={changeFailureRateChartOptions}
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
                      `${Number(changeFailureRateCount.toFixed(2))}%`
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
                      addPage({
                        page: {
                          title: 'Deployments with incidents',
                          ui: 'all_incidents'
                        }
                      });
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
