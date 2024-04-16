import { useCallback, useEffect, useMemo } from 'react';

import { Row } from '@/constants/db';
import {
  ChangeTimeThresholds,
  updatedDeploymentFrequencyThresholds
} from '@/content/DoraMetrics/MetricsClassificationsThreshold';
import { useAuth } from '@/hooks/useAuth';
import { doraMetricsSlice } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { ChangeTimeModes, IntegrationGroup } from '@/types/resources';
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
  const depsConfigured = true;
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

export const useAvgWeeklyDeploymentFrequency = () => {
  let avgDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_daily_deployment_frequency || 0
  );
  let prevAvgDeploymentFrequency = useSelector(
    (s) =>
      s.doraMetrics.metrics_summary?.deployment_frequency_stats.previous
        .avg_daily_deployment_frequency || 0
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
