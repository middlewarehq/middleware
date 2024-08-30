import { UpdatedDeploymentFrequencyAnalyticsResponseV2 } from '@/types/resources';

export const getBadgeDetails = (
  data: Partial<
    Pick<
      UpdatedDeploymentFrequencyAnalyticsResponseV2,
      | 'avg_daily_deployment_frequency'
      | 'avg_monthly_deployment_frequency'
      | 'avg_weekly_deployment_frequency'
    >
  >,
  duration?: 'day' | 'week' | 'month'
): {
  avg_deployment_frequency: number;
  duration: 'day' | 'week' | 'month';
} => {
  const {
    avg_daily_deployment_frequency = 0,
    avg_weekly_deployment_frequency = 0,
    avg_monthly_deployment_frequency = 0
  } = data || {};
  if (duration) {
    return {
      avg_deployment_frequency: data?.[badgeDetailsToKey[duration]] || 0,
      duration
    };
  }
  if (avg_daily_deployment_frequency >= 1)
    return {
      avg_deployment_frequency: avg_daily_deployment_frequency,
      duration: 'day'
    };
  else if (avg_weekly_deployment_frequency >= 1)
    return {
      avg_deployment_frequency: avg_weekly_deployment_frequency,
      duration: 'week'
    };
  else
    return {
      avg_deployment_frequency: avg_monthly_deployment_frequency,
      duration: 'month'
    };
};

const badgeDetailsToKey = {
  day: 'avg_daily_deployment_frequency',
  week: 'avg_weekly_deployment_frequency',
  month: 'avg_monthly_deployment_frequency'
} as const;

export const adaptDeploymentFrequencyAndGetBadge = (
  data: UpdatedDeploymentFrequencyAnalyticsResponseV2,
  duration?: 'day' | 'week' | 'month'
): UpdatedDeploymentFrequencyAnalyticsResponseV2 & {
  duration: 'day' | 'week' | 'month';
} => {
  const badgeDetails = getBadgeDetails(data, duration);
  return {
    ...data,
    ...badgeDetails,
    teams_map: data.teams_map,
    total_deployments: data.total_deployments,
    users_map: data.users_map
  };
};
