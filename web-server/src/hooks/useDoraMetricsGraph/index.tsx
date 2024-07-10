import { darken, lighten, rgbToHex } from '@mui/material';
import { useMemo } from 'react';

import { useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { merge } from '@/utils/datatype';
import { getSortedDatesAsArrayFromMap } from '@/utils/date';

export const useDoraMetricsGraph = () => {
  const leadTimeTrends = useSelector(
    (s) => s.doraMetrics.metrics_summary?.lead_time_trends
  );

  const meanTimeToRestoreTrends = useSelector((s) => ({
    ...s.doraMetrics.metrics_summary?.mean_time_to_restore_trends.current,
    ...s.doraMetrics.metrics_summary?.mean_time_to_restore_trends.previous
  }));

  const changeFailureRateTrends = useSelector((s) => ({
    ...s.doraMetrics.metrics_summary?.change_failure_rate_trends.current,
    ...s.doraMetrics.metrics_summary?.change_failure_rate_trends.previous
  }));

  const activeTrends = leadTimeTrends;
  const mergedLeadTimeTrends = merge(
    leadTimeTrends?.current,
    leadTimeTrends?.previous
  );

  const yAxisLabels = useMemo(() => {
    return getSortedDatesAsArrayFromMap({
      ...(activeTrends?.previous || {}),
      ...(activeTrends?.current || {})
    });
  }, [activeTrends]);

  const firstCommitToOpenTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map((key) => ({
        x: key,
        y: mergedLeadTimeTrends[key].first_commit_to_open ?? 0
      })),
    [mergedLeadTimeTrends]
  );

  const firstResponseTimeTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map((key) => ({
        x: key,
        y: mergedLeadTimeTrends[key].first_response_time ?? 0
      })),
    [mergedLeadTimeTrends]
  );

  const reworkTimeTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map((key) => ({
        x: key,
        y: mergedLeadTimeTrends[key].rework_time ?? 0
      })),
    [mergedLeadTimeTrends]
  );

  const mergeTimeTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map((key) => ({
        x: key,
        y: mergedLeadTimeTrends[key].merge_time ?? 0
      })),
    [mergedLeadTimeTrends]
  );

  const deployTimeTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(mergedLeadTimeTrends).map((key) => ({
        x: key,
        y: mergedLeadTimeTrends[key].merge_to_deploy ?? 0
      })),
    [mergedLeadTimeTrends]
  );

  const changeFailureRateTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(changeFailureRateTrends).map((key) => ({
        x: key,
        y: Number(
          changeFailureRateTrends[key].change_failure_rate?.toFixed(2) ?? 0
        )
      })),
    [changeFailureRateTrends]
  );

  const meanTimeToRestoreTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(meanTimeToRestoreTrends).map((key) => ({
        x: key,
        y: meanTimeToRestoreTrends[key].mean_time_to_recovery ?? 0
      })),
    [meanTimeToRestoreTrends]
  );

  const trendsSeriesMap = useMemo(
    () => ({
      firstCommitToPrTrends: {
        id: `First Commit to PR Time`,
        color: rgbToHex(darken(brandColors.ticketState.todo, 0.2)),
        data: firstCommitToOpenTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point.y || 0
        }))
      },
      firstResponseTimeTrends: {
        id: `First Response Time`,
        color: rgbToHex(lighten(brandColors.pr.firstResponseTime, 0.1)),
        data: firstResponseTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point.y || 0
        }))
      },
      reworkTimeTrends: {
        id: `Rework Time`,
        color: rgbToHex(lighten(brandColors.pr.reworkTime, 0.5)),
        data: reworkTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point.y || 0
        }))
      },
      mergeTimeTrends: {
        id: `Merge Time`,
        color: rgbToHex(lighten(brandColors.pr.mergeTime, 0.5)),
        data: mergeTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point.y || 0
        }))
      },
      deployTimeTrends: {
        id: `Deploy Time`,
        color: rgbToHex(lighten(brandColors.ticketState.done, 0.5)),
        data: deployTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point.y || 0
        }))
      },
      totalLeadTimeTrends: {
        id: `Total Lead Time`,
        color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
        data: firstCommitToOpenTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y:
            (point?.y || 0) +
            (firstResponseTimeTrendsData[index]?.y || 0) +
            (reworkTimeTrendsData[index]?.y || 0) +
            (mergeTimeTrendsData[index]?.y || 0) +
            (deployTimeTrendsData[index]?.y || 0)
        }))
      },
      meanTimeToRestoreTrends: [
        {
          id: 'Mean Time to Restore',
          color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
          data: meanTimeToRestoreTrendsData
        }
      ],
      changeFailureRateTrends: [
        {
          id: 'Change Failure Rate',
          color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
          data: changeFailureRateTrendsData
        }
      ]
    }),
    [
      firstCommitToOpenTrendsData,
      firstResponseTimeTrendsData,
      reworkTimeTrendsData,
      mergeTimeTrendsData,
      deployTimeTrendsData,
      meanTimeToRestoreTrendsData,
      changeFailureRateTrendsData,
      yAxisLabels
    ]
  );

  if (!activeTrends) return { trendsSeriesMap: null, yAxisLabels: [] };

  return {
    trendsSeriesMap,
    yAxisLabels
  };
};
