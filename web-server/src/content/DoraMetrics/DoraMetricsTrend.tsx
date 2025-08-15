import {
  TrendingDownRounded,
  TrendingFlatRounded,
  TrendingUpRounded
} from '@mui/icons-material';
import { darken, useTheme } from '@mui/material';
import { FC, useMemo } from 'react';

import { Chart2, ChartSeries } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useSelector } from '@/store';
import { Deployment } from '@/types/resources';
import { percentageToMultiplier } from '@/utils/datatype';

const MEANINGFUL_CHANGE_THRESHOLD = 0.5;

interface TrendData {
  value: number;
  change: number;
  size?: string;
  state: 'positive' | 'negative' | 'neutral';
}

const getDeploymentDurationInSeconds = (deployment: Deployment): number => {
  if (
    deployment.id?.startsWith('WORKFLOW') &&
    typeof deployment.run_duration === 'number' &&
    deployment.run_duration > 0
  ) {
    return deployment.run_duration;
  }

  try {
    const conductedAt = new Date(deployment.conducted_at);
    const createdAt = new Date(deployment.created_at);
    if (isNaN(conductedAt.getTime()) || isNaN(createdAt.getTime())) {
      return 0;
    }
    const durationMs = conductedAt.getTime() - createdAt.getTime();
    return Math.max(0, Math.floor(durationMs / 1000));
  } catch (e) {
    console.error('Error calculating deployment duration', e);
    return 0;
  }
};

const getDeploymentDurationInMinutes = (deployment: Deployment): number => {
  const seconds = getDeploymentDurationInSeconds(deployment);
  return +(seconds / 60).toFixed(2);
};

export const calculateDeploymentTrends = (
  deployments: Deployment[]
): {
  durationTrend: TrendData;
  prCountTrend: TrendData;
} => {
  if (!deployments || deployments.length < 2) {
    return {
      durationTrend: { value: 0, change: 0, state: 'neutral' },
      prCountTrend: { value: 0, change: 0, state: 'neutral' }
    };
  }

  // Filter valid deployments early
  const validDeployments = deployments.filter((dep) => {
    const hasValidDates =
      dep.conducted_at &&
      new Date(dep.conducted_at).toString() !== 'Invalid Date';

    if (dep.id.startsWith('WORKFLOW')) {
      return hasValidDates && typeof dep.run_duration === 'number';
    }

    return hasValidDates;
  });

  if (validDeployments.length < 2) {
    return {
      durationTrend: { value: 0, change: 0, state: 'neutral' },
      prCountTrend: { value: 0, change: 0, state: 'neutral' }
    };
  }

  const sortedDeployments = [...validDeployments].sort(
    (a, b) =>
      new Date(a.conducted_at).getTime() - new Date(b.conducted_at).getTime()
  );

  const midpoint = Math.floor(sortedDeployments.length / 2);
  const firstHalf = sortedDeployments.slice(0, midpoint);
  const secondHalf = sortedDeployments.slice(midpoint);

  // Calculate average duration for each half
  const getAvgDuration = (deps: Deployment[]) => {
    const totalDuration = deps.reduce(
      (sum, dep) => sum + getDeploymentDurationInSeconds(dep),
      0
    );
    return deps.length > 0 ? totalDuration / deps.length : 0;
  };

  const firstHalfAvgDuration = getAvgDuration(firstHalf);
  const secondHalfAvgDuration = getAvgDuration(secondHalf);

  const durationChange = firstHalfAvgDuration
    ? ((secondHalfAvgDuration - firstHalfAvgDuration) / firstHalfAvgDuration) *
      100
    : 0;

  const avgDuration = getAvgDuration(sortedDeployments);

  const getAvgPrCount = (deps: Deployment[]): number => {
    if (!deps || deps.length === 0) return 0;

    // Filter deployments that have valid PR count data
    const depsWithPrCount = deps.filter((dep) => dep.pr_count >= 0);

    console.log('prCount', deployments[0]);

    if (depsWithPrCount.length === 0) return 0;

    const deploymentsByDate = depsWithPrCount.reduce(
      (acc, dep) => {
        const date = new Date(dep.conducted_at).toLocaleDateString('en-US');
        if (!acc[date]) {
          acc[date] = { totalPRs: 0, count: 0 };
        }
        acc[date].totalPRs += dep.pr_count || 0;
        acc[date].count++;
        return acc;
      },
      {} as Record<string, { totalPRs: number; count: number }>
    );

    const dailyTotals = Object.values(deploymentsByDate);

    const avgPrPerDay = dailyTotals.map((day) => day.totalPRs / day.count);
    const totalAvgPr = avgPrPerDay.reduce((sum, avg) => sum + avg, 0);

    return avgPrPerDay.length > 0 ? totalAvgPr / avgPrPerDay.length : 0;
  };

  const firstHalfAvgPrCount = getAvgPrCount(firstHalf);
  const secondHalfAvgPrCount = getAvgPrCount(secondHalf);

  const prCountChange = firstHalfAvgPrCount
    ? ((secondHalfAvgPrCount - firstHalfAvgPrCount) / firstHalfAvgPrCount) * 100
    : 0;

  const avgPrCount = getAvgPrCount(sortedDeployments);

  return {
    durationTrend: {
      value: avgDuration / 60,
      change: durationChange,
      state: determineTrendState(durationChange, false)
    },
    prCountTrend: {
      value: avgPrCount,
      change: prCountChange,
      state: determineTrendState(prCountChange, true)
    }
  };
};

const determineTrendState = (
  change: number,
  isPositiveWhenIncreasing: boolean
): 'positive' | 'negative' | 'neutral' => {
  if (Math.abs(change) <= MEANINGFUL_CHANGE_THRESHOLD) {
    return 'neutral';
  }

  const isIncreasing = change > 0;
  if (isIncreasing) {
    return isPositiveWhenIncreasing ? 'positive' : 'negative';
  } else {
    return isPositiveWhenIncreasing ? 'negative' : 'positive';
  }
};

export const DeploymentTrendPill: FC<{
  label: string;
  change: number;
  state: 'positive' | 'negative' | 'neutral';
  value: number;
  valueFormat?: (val: number) => string;
}> = ({ label, change, state }) => {
  const theme = useTheme();

  const text =
    state === 'neutral'
      ? label
      : state === 'positive'
        ? 'Increasing ' + label
        : 'Decreasing ' + label;

  const useMultiplierFormat = Math.abs(change) > 100;
  const formattedChange = useMultiplierFormat
    ? `${percentageToMultiplier(Math.abs(change))}`
    : `${Math.abs(Math.round(change))}%`;

  const color = darken(
    state === 'positive'
      ? theme.colors.success.main
      : theme.colors.warning.main,
    state === 'neutral' ? 0.5 : 0
  );

  const icon =
    state === 'positive' ? (
      <TrendingUpRounded fontSize="small" sx={{ fontSize: 'small' }} />
    ) : state === 'negative' ? (
      <TrendingDownRounded fontSize="small" sx={{ fontSize: 'small' }} />
    ) : (
      <TrendingFlatRounded fontSize="small" sx={{ fontSize: 'small' }} />
    );

  return (
    <FlexBox
      gap1
      sx={{
        border: `1px solid ${theme.palette.primary.light}`,
        borderRadius: 1,
        padding: 1,
        minWidth: 220
      }}
    >
      <Line bold>{text}</Line>
      <FlexBox alignCenter>
        <FlexBox color={color} alignCenter>
          <Line bold>{formattedChange}</Line>
          {icon}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

export const DoraMetricsTrend: FC = () => {
  const theme = useTheme();
  const { deployments_map = {} } = useSelector(
    (state) => state.doraMetrics.team_deployments
  );

  const allDeployments = useMemo(() => {
    return Object.values(deployments_map).flat();
  }, [deployments_map]);

  const { durationTrend, prCountTrend } = useMemo(() => {
    return calculateDeploymentTrends(allDeployments);
  }, [allDeployments]);

  const chartData = useMemo(() => {
    const validDeployments = allDeployments.filter((dep) => {
      const hasValidDates =
        dep.conducted_at &&
        new Date(dep.conducted_at).toString() !== 'Invalid Date';

      if (dep.id?.startsWith('WORKFLOW')) {
        return (
          hasValidDates &&
          typeof dep.run_duration === 'number' &&
          dep.run_duration >= 0
        );
      }

      return (
        hasValidDates &&
        dep.created_at &&
        new Date(dep.created_at).toString() !== 'Invalid Date'
      );
    });

    if (!validDeployments.length) {
      return { labels: [], series: [], yAxisMax: 0 };
    }

    const sortedDeployments = [...validDeployments].sort(
      (a, b) =>
        new Date(a.conducted_at).getTime() - new Date(b.conducted_at).getTime()
    );

    const deploymentsByDate = sortedDeployments.reduce(
      (acc, deployment) => {
        const date = new Date(deployment.conducted_at).toLocaleDateString(
          'en-US',
          {
            day: 'numeric',
            month: 'short'
          }
        );

        if (!acc[date]) {
          acc[date] = {
            deployments: [],
            totalDuration: 0,
            totalPRs: 0,
            prDeploymentCount: 0
          };
        }

        const durationInMinutes = getDeploymentDurationInMinutes(deployment);
        acc[date].deployments.push(deployment);
        acc[date].totalDuration += durationInMinutes;

        if (deployment.pr_count >= 0) {
          acc[date].totalPRs += deployment.pr_count || 0;
          acc[date].prDeploymentCount++;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          deployments: Deployment[];
          totalDuration: number;
          totalPRs: number;
          prDeploymentCount: number;
        }
      >
    );

    const dates = Object.keys(deploymentsByDate);
    const durations = dates.map(
      (date) => deploymentsByDate[date].totalDuration
    );

    const prCounts = dates.map((date) => {
      const { totalPRs, prDeploymentCount } = deploymentsByDate[date];
      return prDeploymentCount > 0 ? totalPRs / prDeploymentCount : 0;
    });

    const maxDuration = Math.max(...durations);
    const yAxisMax = Math.ceil(maxDuration);

    const series: ChartSeries = [
      {
        type: 'bar',
        label: 'Deployment Duration (minutes)',
        data: durations,
        yAxisID: 'y',
        order: 0,
        color: 'white'
      },
      {
        type: 'bar',
        label: 'PR Count',
        data: prCounts,
        yAxisID: 'y1',
        backgroundColor: theme.colors.info.main,
        borderWidth: 2,
        tension: 0.4,
        order: 1,
        color: 'white'
      }
    ];

    return { labels: dates, series, yAxisMax };
  }, [allDeployments, theme.colors]);

  return (
    <FlexBox col gap={1.5}>
      <Line white sx={{ fontSize: '1.0rem' }} semibold>
        Deployment Trend
      </Line>
      <FlexBox gap2>
        <DeploymentTrendPill
          label="Deployment Duration"
          change={durationTrend.change}
          state={durationTrend.state}
          value={durationTrend.value}
        />
        <DeploymentTrendPill
          label="PR Count per Deployment"
          change={prCountTrend.change}
          state={prCountTrend.state}
          value={prCountTrend.value}
        />
      </FlexBox>
      <div style={{ height: 450, width: '100%' }}>
        {chartData.labels.length > 0 && (
          <Chart2
            id="dora-metrics-trend"
            type="bar"
            series={chartData.series}
            labels={chartData.labels}
            options={{
              options: {
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Duration (minutes)',
                      color: theme.colors.success.main
                    },
                    ticks: {
                      color: theme.colors.success.main,
                      callback: (value) => value + 'm'
                    },
                    max: chartData.yAxisMax,
                    grid: {
                      color: darken(theme.colors.success.lighter, 0.2)
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'PR Count',
                      color: theme.colors.info.main
                    },
                    ticks: {
                      color: theme.colors.info.main,
                      stepSize: 1
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (label.includes('Duration')) {
                          return `${label}: ${value.toFixed(2)}m`;
                        }
                        return `${label}: ${value.toFixed(0)}`;
                      }
                    }
                  }
                }
              }
            }}
          />
        )}
      </div>
    </FlexBox>
  );
};

export default DoraMetricsTrend;
