import { differenceInDays, endOfDay, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';

import { ChangeTimeThresholds } from '@/content/DoraMetrics/MetricsClassificationsThreshold';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { doraMetricsSlice } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import {
  ChangeTimeModes,
  DateValueTuple,
  IntegrationGroup
} from '@/types/resources';
import { getDoraScore } from '@/utils/dora';

import {
  changeFailureRateThresholds,
  deploymentFrequencyThresholds,
  meanTimeToRestoreThresholds
} from '../MetricsClassificationsThreshold';
import { commonProps } from '../MetricsCommonProps';

const DAYS_IN_MONTH = 31;
const DAYS_IN_QUARTER = 90;

export const useMeanTimeToRestoreProps = () => {
  const meanTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .time_to_restore_average
  );

  const currAvgTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .time_to_restore_average || 0
  );
  const prevAvgTimeToRestore = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.previous
        .time_to_restore_average || 0
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
    (s) => s.doraMetrics.metrics_summary?.lead_time_stats.current_average
  );

  return useMemo(() => {
    if (leadTime <= ChangeTimeThresholds.elite)
      return {
        ...commonProps.elite,
        count: leadTime
      };
    else if (leadTime < ChangeTimeThresholds.high)
      return {
        ...commonProps.high,
        count: leadTime
      };
    else if (leadTime < ChangeTimeThresholds.medium)
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
  const depsConfigured = useSelector(
    (s) => s.doraMetrics.deploymentsConfigured
  );
  const { count: df } = useAvgWeeklyDeploymentFrequency();
  const { count: cfr } = useChangeFailureRateProps();
  const { count: mttr, isNoDataAvailable } = useMeanTimeToRestoreProps();

  const lt = leadTimeProps.count;

  return useMemo(
    () =>
      getDoraScore({
        lt: integrationSet.has(IntegrationGroup.CODE) ? lt : null,
        df: depsConfigured ? df : null,
        cfr: integrationSet.has(IntegrationGroup.INCIDENT) ? cfr : null,
        mttr:
          integrationSet.has(IntegrationGroup.INCIDENT) && !isNoDataAvailable
            ? mttr
            : null
      }),
    [cfr, depsConfigured, df, integrationSet, isNoDataAvailable, lt, mttr]
  );
};

export const usePropsForChangeTimeCard = () => {
  const leadTimeProps = useLeadTimeProps();
  const activeMode = useSelector((s) => s.doraMetrics.activeChangeTimeMode);
  const allAssignedRepos = useSelector(
    (s) => s.doraMetrics.allReposAssignedToTeam
  );
  const reposWithWorkflowConfigured = useSelector(
    (s) => s.doraMetrics.workflowConfiguredRepos
  );

  const prevLeadTime = useSelector(
    (s) => s.doraMetrics.metrics_summary?.lead_time_stats.previous_average || 0
  );

  const [currLeadTimeTrendsData, prevLeadTimeTrendsData] = useSelector((s) => [
    s.doraMetrics.metrics_summary?.lead_time_trends.current.lead_time,
    s.doraMetrics.metrics_summary?.lead_time_trends.previous.lead_time
  ]);

  const dispatch = useDispatch();

  const defaultChangeTimeMode = useMemo(
    () =>
      leadTimeProps.count && isFinite(prevLeadTime)
        ? ChangeTimeModes.LEAD_TIME
        : ChangeTimeModes.CYCLE_TIME,
    [leadTimeProps.count, prevLeadTime]
  );

  useEffect(() => {
    dispatch(
      doraMetricsSlice.actions.toggleActiveModeValue(
        leadTimeProps.count && isFinite(prevLeadTime)
          ? ChangeTimeModes.LEAD_TIME
          : ChangeTimeModes.CYCLE_TIME
      )
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

  const isAllAssignedReposHaveDeploymentsConfigured = useSelector(
    (s) =>
      s.doraMetrics.allReposAssignedToTeam.length ===
      s.doraMetrics.workflowConfiguredRepos.length
  );

  const reposWithNoDeploymentsConfigured = useMemo(() => {
    const workflowConfiguredRepoIdsSet = new Set(
      reposWithWorkflowConfigured.map((r) => r.id)
    );
    return allAssignedRepos.filter(
      (r) => !workflowConfiguredRepoIdsSet.has(r.id)
    );
  }, [allAssignedRepos, reposWithWorkflowConfigured]);

  const isShowingLeadTime = ChangeTimeModes.LEAD_TIME === activeMode;
  const isShowingCycleTime = ChangeTimeModes.CYCLE_TIME === activeMode;

  const reposCountWithWorkflowConfigured =
    allAssignedRepos.length - reposWithNoDeploymentsConfigured.length;

  const isActiveModeSwitchDisabled =
    defaultChangeTimeMode === ChangeTimeModes.CYCLE_TIME;

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

export const useAvgWeeklyDeploymentFrequency = () => {
  const { dates } = useSingleTeamConfig();

  let avgWeeklyDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_deployment_frequency || 0
  );
  let prevAvgWeeklyDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.previous
        .avg_deployment_frequency || 0
  );

  const metricInterval = useMemo(() => {
    const dateRange = differenceInDays(
      endOfDay(dates.end),
      startOfDay(dates.start)
    );
    if (dateRange < DAYS_IN_MONTH) {
      return {
        count: avgWeeklyDeploymentFrequency,
        prev: prevAvgWeeklyDeploymentFrequency,
        interval: 'week'
      };
    }
    if (dateRange < DAYS_IN_QUARTER) {
      return {
        count: Math.ceil(avgWeeklyDeploymentFrequency * 4),
        prev: Math.ceil(prevAvgWeeklyDeploymentFrequency * 4),
        interval: 'month'
      };
    }
    return {
      count: Math.ceil(avgWeeklyDeploymentFrequency * 12),
      prev: Math.ceil(prevAvgWeeklyDeploymentFrequency * 12),
      interval: 'quarter'
    };
  }, [
    avgWeeklyDeploymentFrequency,
    dates.end,
    dates.start,
    prevAvgWeeklyDeploymentFrequency
  ]);

  return useMemo(() => {
    if (avgWeeklyDeploymentFrequency > deploymentFrequencyThresholds.elite)
      return {
        ...commonProps.elite,
        ...metricInterval
      };
    else if (avgWeeklyDeploymentFrequency > deploymentFrequencyThresholds.high)
      return {
        ...commonProps.high,
        ...metricInterval
      };
    else if (
      avgWeeklyDeploymentFrequency > deploymentFrequencyThresholds.medium
    )
      return {
        ...commonProps.medium,
        ...metricInterval
      };
    return {
      ...commonProps.low,
      ...metricInterval
    };
  }, [avgWeeklyDeploymentFrequency, metricInterval]);
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

export const getTrendsDataFromArray = (trendsArr: DateValueTuple[]) => {
  return trendsArr?.map((t) => t[1]).flat() || [];
};
