import { alpha, useTheme } from '@mui/material';
import { mergeDeepRight } from 'ramda';
import { useCallback, useEffect, useMemo } from 'react';

import { ChartOptions } from '@/components/Chart2';
import { Row } from '@/constants/db';
import {
  changeTimeThresholds,
  updatedDeploymentFrequencyThresholds
} from '@/content/DoraMetrics/MetricsClassificationsThreshold';
import { useAuth } from '@/hooks/useAuth';
import { doraMetricsSlice } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { ChangeTimeModes, IntegrationGroup } from '@/types/resources';
import {
  BenchmarkBandInput,
  benchmarkBandOptions
} from '@/utils/benchmarkBand';
import { getDoraScore } from '@/utils/dora';

import {
  changeFailureRateThresholds,
  meanTimeToRestoreThresholds
} from '../MetricsClassificationsThreshold';
import { commonProps } from '../MetricsCommonProps';

export const useMeanTimeToRestoreProps = () => {
  const meanTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .mean_time_to_recovery
  );

  const currAvgTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .mean_time_to_recovery || 0
  );
  const prevAvgTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.previous
        .mean_time_to_recovery || 0
  );

  const incidents = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .incident_count
  );

  const isNoDataAvailable =
    !incidents && !prevAvgTimeToRestore && !currAvgTimeToRestore;
  const count = meanTimeToRestore;

  const commonCalculatedProps = useMemo(
    () => ({ isNoDataAvailable, count, prevCount: prevAvgTimeToRestore }),
    [isNoDataAvailable, count, prevAvgTimeToRestore]
  );

  return useMemo(() => {
    if (meanTimeToRestore < meanTimeToRestoreThresholds.elite)
      return {
        ...commonProps.elite,
        interval: 'week',
        ...commonCalculatedProps
      };
    else if (meanTimeToRestore < meanTimeToRestoreThresholds.high)
      return {
        ...commonProps.high,
        interval: 'week',
        ...commonCalculatedProps
      };
    else if (meanTimeToRestore < meanTimeToRestoreThresholds.medium)
      return {
        ...commonProps.medium,
        interval: 'week',
        ...commonCalculatedProps
      };
    return {
      ...commonProps.low,
      interval: 'week',
      ...commonCalculatedProps
    };
  }, [commonCalculatedProps, meanTimeToRestore]);
};

export const useLeadTimeProps = () => {
  const leadTime = useSelector(
    (s) => s.doraMetrics.metrics_summary?.lead_time_stats.current.lead_time
  );

  return useMemo(() => {
    if (leadTime <= changeTimeThresholds.elite)
      return {
        ...commonProps.elite,
        count: leadTime
      };
    else if (leadTime < changeTimeThresholds.high)
      return {
        ...commonProps.high,
        count: leadTime
      };
    else if (leadTime < changeTimeThresholds.medium)
      return {
        ...commonProps.medium,
        count: leadTime
      };
    return {
      ...commonProps.low,
      count: leadTime
    };
  }, [leadTime]);
};

export const useDoraStats = () => {
  const { integrationSet } = useAuth();
  const leadTimeProps = useLeadTimeProps();
  const { count: cfr } = useChangeFailureRateProps();
  const { count: mttr, isNoDataAvailable } = useMeanTimeToRestoreProps();

  const lt = leadTimeProps.count;

  const weeklyDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_weekly_deployment_frequency
  );

  return useMemo(
    () =>
      getDoraScore({
        lt: integrationSet.has(IntegrationGroup.CODE) ? lt : null,
        df: weeklyDeploymentFrequency,
        cfr: integrationSet.has(IntegrationGroup.INCIDENT) ? cfr : null,
        mttr:
          integrationSet.has(IntegrationGroup.INCIDENT) && !isNoDataAvailable
            ? mttr
            : null
      }),
    [
      cfr,
      integrationSet,
      isNoDataAvailable,
      lt,
      mttr,
      weeklyDeploymentFrequency
    ]
  );
};

export const usePropsForChangeTimeCard = () => {
  const leadTimeProps = useLeadTimeProps();
  const allAssignedRepos = useSelector(
    (s) => s.doraMetrics.allReposAssignedToTeam
  );

  const prevLeadTime = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.lead_time_stats.previous.lead_time || 0
  );

  const [currLeadTimeTrendsData, prevLeadTimeTrendsData] = useSelector((s) => [
    s.doraMetrics.metrics_summary?.lead_time_trends.current.lead_time,
    s.doraMetrics.metrics_summary?.lead_time_trends.previous.lead_time
  ]);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      doraMetricsSlice.actions.toggleActiveModeValue(ChangeTimeModes.LEAD_TIME)
    );
  }, [dispatch, leadTimeProps.count, prevLeadTime]);

  const toggleActiveModeValue = useCallback(() => {
    dispatch(doraMetricsSlice.actions.toggleActiveModeValue());
  }, [dispatch]);

  const prevChangeTime = prevLeadTime;

  const activeModeProps = leadTimeProps;

  const activeModeCount = leadTimeProps.count;

  const activeModePrevTrendsData = prevLeadTimeTrendsData;

  const activeModeCurrentTrendsData = currLeadTimeTrendsData;

  const isAllAssignedReposHaveDeploymentsConfigured = true;

  const reposWithNoDeploymentsConfigured = [] as (Row<'TeamRepos'> &
    Row<'OrgRepo'>)[];

  const isShowingLeadTime = true;
  const isShowingCycleTime = false;

  const reposCountWithWorkflowConfigured =
    Number(allAssignedRepos?.length) -
    Number(reposWithNoDeploymentsConfigured?.length);

  const isActiveModeSwitchDisabled = false;

  const isSufficientDataAvailable = useMemo(
    () => Boolean(activeModeCount && isFinite(prevChangeTime)),
    [activeModeCount, prevChangeTime]
  );

  return {
    isShowingLeadTime,
    isShowingCycleTime,
    reposCountWithWorkflowConfigured,
    isActiveModeSwitchDisabled,
    isSufficientDataAvailable,
    activeModePrevTrendsData,
    activeModeCurrentTrendsData,
    activeModeProps,
    isAllAssignedReposHaveDeploymentsConfigured,
    allAssignedRepos,
    reposWithNoDeploymentsConfigured,
    prevChangeTime,
    toggleActiveModeValue
  };
};

export const useAvgIntervalBasedDeploymentFrequency = () => {
  const avgDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_deployment_frequency || 0
  );
  const prevAvgDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.previous
        .avg_deployment_frequency || 0
  );

  const interval = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current.duration
  );

  const metricInterval = useMemo(() => {
    return {
      count: avgDeploymentFrequency,
      prev: prevAvgDeploymentFrequency,
      interval
    };
  }, [avgDeploymentFrequency, interval, prevAvgDeploymentFrequency]);

  return useMemo(() => {
    const key = updatedDeploymentFrequencyThresholds(metricInterval);
    return {
      ...commonProps[key],
      ...metricInterval
    };
  }, [metricInterval]);
};

export const useChangeFailureRateProps = () => {
  const changeFailureRate = useSelector((s) =>
    Number(
      (
        s.doraMetrics.metrics_summary?.change_failure_rate_stats?.current
          .change_failure_rate || 0
      ).toFixed(2)
    )
  );

  const avgWeeklyDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.change_failure_rate_stats?.current
        .total_deployments || 0
  );

  const cfrProps = useMemo(
    () => ({
      avgWeeklyDeploymentFrequency,
      count: changeFailureRate
    }),
    [avgWeeklyDeploymentFrequency, changeFailureRate]
  );

  return useMemo(() => {
    if (changeFailureRate <= changeFailureRateThresholds.elite)
      return {
        ...commonProps.elite,
        ...cfrProps
      };
    else if (changeFailureRate <= changeFailureRateThresholds.high)
      return {
        ...commonProps.high,
        ...cfrProps
      };
    else if (changeFailureRate <= changeFailureRateThresholds.medium)
      return {
        ...commonProps.medium,
        ...cfrProps
      };
    return {
      ...commonProps.low,
      ...cfrProps
    };
  }, [cfrProps, changeFailureRate]);
};

// CLUSTOX: all four DORA cards declared this same object as a module-level
// `chartOptions` constant. The benchmark band depends on props, so the
// constant has to become a memo -- and rather than copy that memo into four
// files where the four copies can silently drift apart, the shared base and
// the merge live here once.
const BASE_DORA_CARD_CHART_OPTIONS = {
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

/**
 * The chart options for a DORA card, with the benchmark target band merged in
 * when there is a target to draw.
 *
 * Pass `null` when the card should show no band at all -- distinct from
 * passing an input whose `target` is null, though both render the card exactly
 * as it looked before this feature.
 */
export type DoraCardChartDisplay = {
  /** ISO week keys, one per plotted point, oldest first. */
  labels?: string[];
  /** Formats a plotted value for the tooltip, in the metric's own words. */
  format?: (value: number) => string;
};

// CLUSTOX: "Week of Jul 20" rather than the raw ISO key the API buckets by.
// Falls back to the raw label so a malformed key degrades to ugly-but-true.
const weekLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `Week of ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`;
};

export const useDoraCardChartOptions = (
  band: Omit<BenchmarkBandInput, 'theme'> | null,
  display?: DoraCardChartDisplay
): ChartOptions => {
  // CLUSTOX: the tone colours come from the live theme rather than from
  // benchmarkBand's hex fallbacks; those exist only so the util stays
  // importable from a unit test that can't load MUI.
  const theme = useTheme();
  const labels = display?.labels;
  const format = display?.format;

  return useMemo(() => {
    const bandOptions = band ? benchmarkBandOptions({ ...band, theme }) : null;
    const target = bandOptions?.benchmarkBand?.target;

    // CLUSTOX: hover only -- 'click' stays out of the list so the canvas never
    // competes with CardRoot's own onClick (the whole card opens the details
    // overlay). The tooltip and crosshair configs already exist in
    // InternalChart2; `events: []` was the single switch keeping all of it
    // dead, which is why these cards read as decoration.
    // Typed against ChartOptions here so ramda's MergeDeep literal type
    // collapses to something assignable at the return casts below.
    const interactive: ChartOptions = {
      options: {
        events: ['mousemove', 'mouseout'],
        plugins: {
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items: { dataIndex: number }[]) => {
                const iso = labels?.[items[0]?.dataIndex];
                return iso ? weekLabel(iso) : '';
              },
              label: (item: { parsed: { y: number } }) => {
                const value = item.parsed.y;
                const text = format ? format(value) : String(value);
                // `!= null`: a target of 0 still gets a verdict. Direction
                // words only, no glyphs -- the caption below the chart already
                // carries the judgement, the tooltip just states the fact.
                if (target != null) {
                  return `${text} \u00b7 ${
                    value <= target ? 'under' : 'over'
                  } target`;
                }
                return text;
              }
            }
          }
        }
      }
    };

    const withInteraction = mergeDeepRight(
      BASE_DORA_CARD_CHART_OPTIONS,
      interactive
    );

    // CLUSTOX: no target configured is the state every card is in until an
    // admin sets one -- nothing benchmark-related is drawn. The tooltip stays:
    // it describes measured data, which exists with or without a target.
    if (!bandOptions) return withInteraction as ChartOptions;

    // CLUSTOX: the band goes on the *right* of the merge. Both sides define
    // `scales.y`, and it is the band's `suggestedMax` that has to survive --
    // the base only sets `display: false`, which mergeDeepRight preserves from
    // the left because the keys don't collide.
    return mergeDeepRight(withInteraction, {
      options: bandOptions
    }) as unknown as ChartOptions;
  }, [band, theme, labels, format]);
};

/**
 * The one visual style every DORA card's trend shares: a real 2px stroke in
 * the card's accent, a fill that fades to transparent toward the axis, and a
 * dot on the newest point.
 *
 * CLUSTOX: before this, the trend was `borderWidth: 0` + a flat grey fill --
 * a shape with no line, which is most of why the graphs read as decoration.
 * The gradient rides on chartjs-plugin-gradient (registered in
 * InternalChart2, previously unused); `backgroundColor` stays set as the
 * flat fallback for the brief window before that plugin's async registration
 * lands, so the card is never fill-less.
 */
export const doraCardTrendSeries = (
  label: string,
  values: number[],
  accent: string
) => {
  const dataMax = Math.max(0, ...values.filter(Number.isFinite));
  return [
    {
      label,
      fill: 'start',
      data: values,
      backgroundColor: alpha(accent, 0.14),
      borderColor: accent,
      borderWidth: 2,
      lineTension: 0.35,
      pointRadius: values.map((_, i) => (i === values.length - 1 ? 3 : 0)),
      pointBackgroundColor: accent,
      ...(dataMax > 0 && {
        gradient: {
          backgroundColor: {
            axis: 'y' as const,
            colors: { 0: alpha(accent, 0.02), [dataMax]: alpha(accent, 0.28) }
          }
        }
      })
    }
  ];
};
