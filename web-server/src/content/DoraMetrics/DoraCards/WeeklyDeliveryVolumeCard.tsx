import { alpha, Chip } from '@mui/material';
import pluralize from 'pluralize';
import { useMemo } from 'react';

import { Chart2, ChartOptions } from '@/components/Chart2';
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
import {
  useCurrentDateRangeLabel,
  useStateDateConfig
} from '@/hooks/useStateTeamConfig';
import { useSelector } from '@/store';
import { IntegrationGroup } from '@/types/resources';
import { getSortedDatesAsArrayFromMap } from '@/utils/date';

import { useAvgIntervalBasedDeploymentFrequency } from './sharedHooks';

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

export const WeeklyDeliveryVolumeCard = () => {
  const { integrationSet } = useAuth();
  const dateRangeLabel = useCurrentDateRangeLabel();
  const deploymentFrequencyProps = useAvgIntervalBasedDeploymentFrequency();

  const deploymentFrequencyCount = useCountUp(
    deploymentFrequencyProps.count || 0
  );

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

  const series = useMemo(
    () => [
      {
        label: 'Deployments',
        fill: 'start',
        data: getSortedDatesAsArrayFromMap(weekDeliveryVolumeData).map(
          (date) => weekDeliveryVolumeData[date].count
        ),
        backgroundColor: deploymentFrequencyProps?.backgroundColor,
        borderColor: alpha(deploymentFrequencyProps?.backgroundColor, 0.5),
        lineTension: 0.2
      }
    ],
    [deploymentFrequencyProps?.backgroundColor, weekDeliveryVolumeData]
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
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {isCodeProviderIntegrationEnabled ? (
              <Chart2
                id="weekly-delivery-frequency"
                type="line"
                series={series}
                options={chartOptions}
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
                    {deploymentFrequencyProps.count ? (
                      `${deploymentFrequencyCount}`
                    ) : (
                      <Line>No Deployments</Line>
                    )}
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
