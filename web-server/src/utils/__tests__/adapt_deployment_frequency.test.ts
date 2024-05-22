import { updatedDeploymentFrequencyThresholds } from '@/content/DoraMetrics/MetricsClassificationsThreshold';

import { getBadgeDetails } from '../adapt_deployment_frequency';

describe('getBadgeDetails', () => {
  it('should return avg_deployment_frequency and duration for given day duration', () => {
    const data = {
      avg_daily_deployment_frequency: 5,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const result = getBadgeDetails(data, 'day');
    expect(result).toEqual({ avg_deployment_frequency: 5, duration: 'day' });
  });

  it('should return avg_deployment_frequency and duration for given week duration', () => {
    const data = {
      avg_daily_deployment_frequency: 5,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const result = getBadgeDetails(data, 'week');
    expect(result).toEqual({ avg_deployment_frequency: 10, duration: 'week' });
  });

  it('should return avg_deployment_frequency and duration for given month duration', () => {
    const data = {
      avg_daily_deployment_frequency: 5,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const result = getBadgeDetails(data, 'month');
    expect(result).toEqual({ avg_deployment_frequency: 20, duration: 'month' });
  });

  it('should return daily average when no duration is provided and daily average is >= 1', () => {
    const data = {
      avg_daily_deployment_frequency: 2,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const result = getBadgeDetails(data);
    expect(result).toEqual({ avg_deployment_frequency: 2, duration: 'day' });
  });

  it('should return weekly average when no duration is provided and daily average is < 1 but weekly average is >= 1', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const result = getBadgeDetails(data);
    expect(result).toEqual({ avg_deployment_frequency: 10, duration: 'week' });
  });

  it('should return weekly average', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 2,
      avg_monthly_deployment_frequency: 9
    };
    const result = getBadgeDetails(data);
    expect(result).toEqual({ avg_deployment_frequency: 2, duration: 'week' });
  });

  it('should return monthly average when no duration is provided and both daily and weekly averages are < 1', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 0,
      avg_monthly_deployment_frequency: 4
    };
    const result = getBadgeDetails(data);
    expect(result).toEqual({ avg_deployment_frequency: 4, duration: 'month' });
  });

  it('should return daily average when no duration is provided and all averages are 0', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 0,
      avg_monthly_deployment_frequency: 0
    };
    const result = getBadgeDetails(data);
    expect(result).toEqual({ avg_deployment_frequency: 0, duration: 'month' });
  });

  it('should return default values when data is not provided', () => {
    const result = getBadgeDetails({});
    expect(result).toEqual({ avg_deployment_frequency: 0, duration: 'month' });
  });
});

describe('updatedDeploymentFrequencyThresholds', () => {
  it('should return "elite" when interval is "day" and count exists', () => {
    const metric = { count: 1, interval: 'day' } as const;
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('elite');
  });

  it('should return "high" when interval is "week" and count is >= 1', () => {
    const metric = { count: 1, interval: 'week' } as const;
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('high');
  });

  it('should return "medium" when interval is "month" and count is 1', () => {
    const metric = { count: 1, interval: 'month' } as const;
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('medium');
  });

  it('should return "high" when interval is "month" and count is > 1', () => {
    const metric = { count: 2, interval: 'month' } as const;
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('high');
  });
});

describe('tandem testing', () => {
  it('should return "elite"', () => {
    const data = {
      avg_daily_deployment_frequency: 5,
      avg_weekly_deployment_frequency: 10,
      avg_monthly_deployment_frequency: 20
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('elite');
  });

  it('should return "high"', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 7,
      avg_monthly_deployment_frequency: 20
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('high');
  });

  it('should return "high"', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 0,
      avg_monthly_deployment_frequency: 4
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('high');
  });

  it('should return "medium"', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 0,
      avg_monthly_deployment_frequency: 1
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('medium');
  });

  it('should return "low"', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 0,
      avg_monthly_deployment_frequency: 0
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('low');
  });

  it('should return "high"', () => {
    const data = {
      avg_daily_deployment_frequency: 0,
      avg_weekly_deployment_frequency: 2,
      avg_monthly_deployment_frequency: 9
    };
    const badgeDetails = getBadgeDetails(data);
    const metric = {
      count: badgeDetails.avg_deployment_frequency,
      interval: badgeDetails.duration
    };
    const result = updatedDeploymentFrequencyThresholds(metric);
    expect(result).toBe('high');
  });
});
