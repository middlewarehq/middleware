import { Chip } from '@mui/material';
import pluralize from 'pluralize';
import { useCallback, useMemo } from 'react';

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
import {
  useCurrentDateRangeLabel,
  useStateDateConfig
} from '@/hooks/useStateTeamConfig';
import { useSelector } from '@/store';
import { IntegrationGroup } from '@/types/resources';
import { benchmarkCaption } from '@/utils/benchmarks';
import { getSortedDatesAsArrayFromMap } from '@/utils/date';

import {
  doraCardTrendSeries,
  useAvgIntervalBasedDeploymentFrequency,
  useDoraCardChartOptions
} from './sharedHooks';

import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';
import { getDoraLink } from '../getDoraLink';
import { MetricExternalRead } from '../MetricExternalRead';
import { MissingDORAProviderLink } from '../MissingDORAProviderLink';

export const WeeklyDeliveryVolumeCard = () => {
  const { integrationSet } = useAuth();
  const dateRangeLabel = useCurrentDateRangeLabel();
  const deploymentFrequencyProps = useAvgIntervalBasedDeploymentFrequency();
  const selectedContributors = useSelectedContributors();

  const { addPage } = useOverlayPage();
  const deploymentsConfigured = true;
  const isCodeProviderIntegrationEnabled = integrationSet.has(
    IntegrationGroup.CODE
  );

  const currentWeekDeliveryVolumeData = useSelector(
    (s) => s.doraMetrics.metrics_summary?.deployment_frequency_trends.current
  );
  const previousWeekDeliveryVolumeData = useSelector(
    (s) => s.doraMetrics.metrics_summary?.deployment_frequency_trends.previous
  );

  const weekDeliveryVolumeData = useMemo(
    () => ({
      ...currentWeekDeliveryVolumeData,
      ...previousWeekDeliveryVolumeData
    }),
    [currentWeekDeliveryVolumeData, previousWeekDeliveryVolumeData]
  );

  const totalDeployments = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .total_deployments || 0
  );

  const deploymentFrequencyBenchmark = useSelector(
    (s) => s.doraMetrics.metrics_summary?.benchmarks?.deployment_frequency
  );

  // CLUSTOX: the benchmark target is always "deployments/week" (see
  // task-5-brief), but the card's headline count adapts to the selected
  // interval (day/week/month) via useAvgIntervalBasedDeploymentFrequency.
  // Comparing against that would silently mix units, so the weekly-specific
  // stat is used here instead, regardless of which interval is displayed.
  const avgWeeklyDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_weekly_deployment_frequency
  );

  // CLUSTOX: these buckets are weekly counts -- the trends endpoint is
  // `get_weekly_deployment_frequency_trends`, which buckets deployments
  // "weekly" regardless of the interval the headline is displayed in. That is
  // what makes it safe to draw a deployments/week target in this chart's own
  // data space.
  const weeklyDeploymentCounts = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(weekDeliveryVolumeData).map(
        (date) => weekDeliveryVolumeData[date].count
      ),
    [weekDeliveryVolumeData]
  );

  const series = useMemo(
    () =>
      doraCardTrendSeries(
        'Deployments',
        weeklyDeploymentCounts,
        deploymentFrequencyProps?.backgroundColor
      ),
    [deploymentFrequencyProps?.backgroundColor, weeklyDeploymentCounts]
  );

  const weekLabels = useMemo(
    () => getSortedDatesAsArrayFromMap(weekDeliveryVolumeData),
    [weekDeliveryVolumeData]
  );
  const formatDeployments = useCallback(
    (value: number) => `${value} ${value === 1 ? 'deployment' : 'deployments'}`,
    []
  );

  // CLUSTOX: gated on isCodeProviderIntegrationEnabled -- the same guard the
  // card uses to decide between the chart and NoDataImg. Zero deployments is
  // still a meaningful comparison against a weekly target (it's the "below
  // target" case), so no additional zero-count guard here.
  const deploymentFrequencyBenchmarkCaption = useMemo(
    () =>
      isCodeProviderIntegrationEnabled &&
      deploymentFrequencyBenchmark?.target != null
        ? benchmarkCaption(
            'deployment_frequency',
            avgWeeklyDeploymentFrequency || 0,
            deploymentFrequencyBenchmark.target,
            deploymentFrequencyBenchmark.source
          )
        : null,
    [
      isCodeProviderIntegrationEnabled,
      deploymentFrequencyBenchmark,
      avgWeeklyDeploymentFrequency
    ]
  );

  // CLUSTOX: `avgWeeklyDeploymentFrequency`, never
  // `deploymentFrequencyProps.count`. The headline switches unit on its own --
  // getBadgeDetails picks day / week / month by which average first clears 1 --
  // so an active team's headline is a *per-day* figure while the target is
  // per week. Feeding the headline in would compare 2.5/day against a 5/week
  // target and paint the band warning for a team deploying 17 times a week.
  //
  // This is also the only card whose band covers *upward*: deployment
  // frequency is absent from LOWER_IS_BETTER, so benchmarkBandOptions shades
  // target -> top of the axis rather than target -> 0.
  const deploymentFrequencyChartOptions = useDoraCardChartOptions(
    isCodeProviderIntegrationEnabled
      ? {
          metric: 'deployment_frequency',
          target: deploymentFrequencyBenchmark?.target,
          actual: avgWeeklyDeploymentFrequency || 0,
          values: weeklyDeploymentCounts
        }
      : null,
    { labels: weekLabels, format: formatDeployments }
  );

  const { weeksCovered, daysCovered } = useStateDateConfig();

  const dateRangeLabelString = `${
    weeksCovered ? `${weeksCovered} ${pluralize('week', weeksCovered)}` : ''
  } ${daysCovered ? `${daysCovered} ${pluralize('day', daysCovered)}` : ''}`;

  return (
    <CardRoot
      onClick={() => {
        if (!deploymentFrequencyProps.count && !totalDeployments) return;
        track('DORA_METRICS_SEE_DETAILS_CLICKED', {
          viewed: 'DF'
        });
        addPage({
          page: {
            title: 'Deployments insights',
            ui: 'deployment_freq'
          }
        });
      }}
    >
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter>
            <Line white huge bold py={1}>
              Deployment Frequency
            </Line>
            <FlexBox
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MetricExternalRead
                link={`https://www.middlewarehq.com/blog/is-deployment-frequency-the-goldilocks-zone-for-software-delivery`}
                label="Delivery Volume"
              />
            </FlexBox>
          </FlexBox>
          {isCodeProviderIntegrationEnabled && (
            <FlexBox
              title={
                <FlexBox col gap={1 / 2}>
                  <Line medium white>
                    {deploymentFrequencyProps.tooltip}
                  </Line>
                  {getDoraLink('How is this determined?')}
                </FlexBox>
              }
              darkTip
              alignCenter
            >
              {Boolean(
                deploymentsConfigured || deploymentFrequencyProps.count
              ) && (
                <Chip
                  sx={{ background: deploymentFrequencyProps.bg }}
                  icon={
                    <FlexBox bgcolor="#0003" round>
                      <deploymentFrequencyProps.icon
                        sx={{ transform: 'scale(0.8)' }}
                      />
                    </FlexBox>
                  }
                  label={
                    <Line bold white>
                      {deploymentFrequencyProps.classification}
                    </Line>
                  }
                  color="success"
                />
              )}
            </FlexBox>
          )}
        </FlexBox>
        {Boolean(selectedContributors.length) && (
          // CLUSTOX: filtered by deploy actor, not PR author -- see the note
          // on ChangeTimeCard for why that distinction has to be visible.
          <Line small secondary paddingX={2} mt={-1}>
            deployed by {selectedContributors.join(', ')}
          </Line>
        )}
        {deploymentFrequencyBenchmarkCaption && (
          <Line
            small
            paddingX={2}
            mt={-1}
            color={
              deploymentFrequencyBenchmarkCaption.tone === 'good'
                ? 'success'
                : 'warning'
            }
          >
            {deploymentFrequencyBenchmarkCaption.text}
          </Line>
        )}
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {isCodeProviderIntegrationEnabled ? (
              <Chart2
                id="weekly-delivery-frequency"
                type="line"
                series={series}
                options={deploymentFrequencyChartOptions}
              />
            ) : (
              <NoDataImg />
            )}
          </FlexBox>
          {isCodeProviderIntegrationEnabled ? (
            <FlexBox
              position="absolute"
              fill
              col
              paddingX={2}
              gap1
              justifyCenter
              sx={{
                pointerEvents: 'none',
                '& > *': { pointerEvents: 'auto' }
              }}
            >
              <FlexBox justifyCenter sx={{ width: '100%' }} col>
                <Line bigish medium color={deploymentFrequencyProps.color}>
                  Deployments / {deploymentFrequencyProps.interval}
                </Line>
                <FlexBox gap={2} alignCenter>
                  <Line
                    bold
                    color={deploymentFrequencyProps.color}
                    sx={{ fontSize: '3em' }}
                  >
                    <Line>
                      {getDeploymentCountString(
                        deploymentFrequencyProps.count,
                        totalDeployments
                      )}
                    </Line>
                  </Line>
                  {Boolean(
                    deploymentFrequencyProps.count ||
                      deploymentFrequencyProps.prev
                  ) && (
                    <DoraMetricsComparisonPill
                      val={deploymentFrequencyProps.count}
                      against={deploymentFrequencyProps.prev}
                      prevFormat={(val) =>
                        `${Math.round(val)} ${pluralize('deployment', val)}/${
                          deploymentFrequencyProps.interval
                        } `
                      }
                      positive={true}
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
                    pointer={Boolean(
                      deploymentFrequencyProps.count ||
                        !deploymentsConfigured ||
                        totalDeployments
                    )}
                    onClick={() => {
                      if (!deploymentFrequencyProps.count && !totalDeployments)
                        return;
                      track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                        viewed: 'DF'
                      });
                      addPage({
                        page: {
                          title: 'Deployments insights',
                          ui: 'deployment_freq'
                        }
                      });
                    }}
                    color={deploymentFrequencyProps.color}
                  >
                    <Line
                      underline={Boolean(
                        deploymentFrequencyProps.count ||
                          !deploymentsConfigured ||
                          totalDeployments
                      )}
                      dotted
                    >
                      {deploymentFrequencyProps.count || totalDeployments
                        ? `See details ->`
                        : deploymentsConfigured
                        ? `Nothing was deployed between ${dateRangeLabel}`
                        : `Deployments not configured for any repos. Configure here ->`}
                    </Line>
                  </Line>

                  {Boolean(totalDeployments) && (
                    <FlexBox
                      title={`${totalDeployments} ${pluralize(
                        'deployment',
                        totalDeployments
                      )} over ${dateRangeLabelString}`}
                    >
                      <Line
                        small
                        bold
                        pointer
                        onClick={() => {
                          track('DORA_METRICS_SEE_DETAILS_CLICKED', {
                            viewed: 'DF'
                          });
                          return console.error('OVERLAY PENDING');
                        }}
                        color={deploymentFrequencyProps.color}
                      >
                        {totalDeployments} total deployments
                      </Line>
                    </FlexBox>
                  )}
                </FlexBox>
              </FlexBox>
            </FlexBox>
          ) : (
            <FlexBox
              fill
              col
              paddingX={2}
              gap1
              justifyCenter
              position="absolute"
            >
              <MissingDORAProviderLink type="CODE" />
            </FlexBox>
          )}
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};

const getDeploymentCountString = (count: number, totalDeployments: number) => {
  if (totalDeployments === 0) return 'No Deployments';
  if (count) return `${count}`;

  // backend doesn't send decimals, so if total deps exist, count cannot be zero, it's less than 1
  return '<1';
};
