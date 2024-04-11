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
