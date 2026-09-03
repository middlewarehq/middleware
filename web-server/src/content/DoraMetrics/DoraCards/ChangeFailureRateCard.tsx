import { Chip } from '@mui/material';
import pluralize from 'pluralize';
import { head } from 'ramda';
import { useCallback, useMemo } from 'react';

import { Chart2 } from '@/components/Chart2';
import { useSelectedContributors } from '@/components/ContributorFilter';
import { FlexBox } from '@/components/FlexBox';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import {
  BenchmarkVerdictPill,
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
  doraCardTrendSeries,
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
    () =>
      doraCardTrendSeries(
        'Change Failure rate',
        changeFailureRateValues,
        changeFailureRateProps.backgroundColor
      ),
    [changeFailureRateProps.backgroundColor, changeFailureRateValues]
  );

  const weekLabels = useMemo(
    () =>
      head(trendsSeriesMap?.changeFailureRateTrends || [])?.data.map((s) =>
        String(s.x)
      ) || [],
    [trendsSeriesMap?.changeFailureRateTrends]
  );
  const formatCfr = useCallback((value: number) => `${value}%`, []);

  const { weeksCovered, daysCovered } = useStateDateConfig();
  const isCfrDataAvailable = Boolean(
    changeFailureRateProps.avgWeeklyDeploymentFrequency &&
      (changeFailureRateProps.count || prevChangeFailureRate)
  );

  // CLUSTOX: change failure rate is incidents / deployments, so the two ways
  // of having "no data" are not the same thing and must not be treated alike:
  //
  //   deployments, no incidents -> a genuine 0%, the best possible result,
  //                                and it beats every target
  //   no deployments at all     -> no denominator, so the rate is undefined
  //
  // Only the first is a score. Reporting 0% for a team that shipped nothing
  // would congratulate them for it, which is worse than showing nothing --
  // the card already says "Due to no deployments" in that state.
  const hasDeployments = Boolean(
    changeFailureRateProps.avgWeeklyDeploymentFrequency
  );
  // CLUSTOX: `count` is already `Number((cfr || 0).toFixed(2))`, so it is 0
  // rather than undefined when nothing failed. No substitution needed -- an
  // earlier `isCfrDataAvailable ? count : 0` here implied one that could
  // never happen.
  const cfrActual = changeFailureRateProps.count;

  // CLUSTOX: gated on the *target* existing rather than on incidents existing,
  // for the reason above. canShowIncidentsData stays in the gate because
  // without it the card shows a missing-provider link instead of a chart, and
  // 0% there would be a claim about a team we have no data for.
  const canCompareCfr = canShowIncidentsData && hasDeployments;

  const changeFailureRateBenchmarkCaption = useMemo(
    () =>
      canCompareCfr && changeFailureRateBenchmark?.target != null
        ? benchmarkCaption(
            'change_failure_rate',
            cfrActual,
            changeFailureRateBenchmark.target,
            changeFailureRateBenchmark.source
          )
        : null,
    [canCompareCfr, changeFailureRateBenchmark, cfrActual]
  );

  const changeFailureRateChartOptions = useDoraCardChartOptions(
    canCompareCfr
      ? {
          metric: 'change_failure_rate',
          target: changeFailureRateBenchmark?.target,
          actual: cfrActual,
          values: changeFailureRateValues
        }
      : null,
    { labels: weekLabels, format: formatCfr }
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
          <BenchmarkVerdictPill caption={changeFailureRateBenchmarkCaption} />
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
          {/* CLUSTOX: pointer events pass through to the canvas so the
              chart's tooltip can fire; the content column re-enables them so
              its own pills, links and tooltips keep working. Card click is
              unaffected -- it lives on CardRoot, above both. */}
          <FlexBox
            position="absolute"
            fill
            col
            paddingX={2}
            gap1
            justifyCenter
            sx={{ pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } }}
          >
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
