import {
  minutesInHour,
  secondsInDay,
  secondsInMinute
} from 'date-fns/constants';
import { sum } from 'ramda';

import { PR, PrCycleTimeBucket, BasePR } from '@/types/resources';
import { getDurationString } from '@/utils/date';

export const getExtremePrsFromDistribution = (
  cycleTimeDistribution: PrCycleTimeBucket[],
  flashyPRTime: number = 3600
) => {
  if (!cycleTimeDistribution?.length)
    return { quickPrCount: 0, longPrCount: 0 };

  let flashyPRTimeDisplay = flashyPRTime / secondsInMinute;
  if (flashyPRTimeDisplay / minutesInHour >= 1) {
    flashyPRTimeDisplay /= minutesInHour;
  }

  const longPrTime = 4 * secondsInDay;

  const quickPRsIndex = cycleTimeDistribution.findIndex(
    (d) => d.maxTime === flashyPRTime
  );
  const longPRsIndex = cycleTimeDistribution.findIndex(
    (d) => d.minTime === longPrTime
  );

  const prCounts = cycleTimeDistribution.map((d) => d.prCount);

  const quickPrCount = cycleTimeDistribution[quickPRsIndex].prCount;
  const longPrCount = sum(prCounts.slice(longPRsIndex));
  const totalPrCount = sum(prCounts);

  return {
    quickPrCount,
    longPrCount,
    quickLimitLabel: getDurationString(flashyPRTime),
    longLimitLabel: getDurationString(longPrTime),
    quickPrTime: flashyPRTime,
    longPrTime,
    totalPrCount
  };
};

export const adaptPr = (pr: BasePR): PR => ({
  ...pr,
  cycle_time: sum(
    [pr.first_response_time, pr.rework_time, pr.merge_time].filter(Boolean)
  ),
  lead_time_as_sum_of_parts:
    Number.isFinite(pr.first_commit_to_open) &&
    Number.isFinite(pr.merge_to_deploy)
      ? sum(
          [
            Math.max(pr.first_commit_to_open, 0),
            pr.first_response_time,
            pr.rework_time,
            pr.merge_time,
            pr.merge_to_deploy
          ].filter(Boolean)
        )
      : null
});
