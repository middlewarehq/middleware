import {
  secondsInDay,
  secondsInHour,
  secondsInMonth,
  secondsInWeek
} from 'date-fns/constants';

export const ChangeTimeThresholds = {
  elite: secondsInDay,
  high: secondsInWeek,
  medium: secondsInMonth
};

export const deploymentFrequencyThresholds = {
  elite: 7,
  high: 1,
  medium: 1 / 30
};

export const updatedDeploymentFrequencyThresholds = (metric: {
  count: number;
  prev: number;
  interval: 'day' | 'week' | 'month';
}) => {
  switch (metric.interval) {
    case 'day':
      if (metric.count > 1) return 'elite';
      break;
    case 'week':
      if (metric.count > 1) return 'high';
      break;
    case 'month':
      if (metric.count > 1) return 'medium';
      break;
    default:
      return 'medium';
  }
};

export const changeFailureRateThresholds = {
  elite: 5,
  high: 10,
  medium: 15
};

export const meanTimeToRestoreThresholds = {
  elite: secondsInHour,
  high: secondsInDay,
  medium: secondsInWeek
};
