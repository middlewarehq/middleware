import { lighten, rgbToHex } from '@mui/material';
import { useMemo } from 'react';

import { getTrendsDataFromArray } from '@/content/Cockpit/codeMetrics/shared';
import { useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { mergeDateValueTupleArray } from '@/utils/array';
import { getSortedDatesAsArrayFromMap } from '@/utils/date';

export const useDoraMetricsGraph = () => {
  const leadTimeTrends = useSelector(
    (s) => s.doraMetrics.metrics_summary?.lead_time_trends
  );

  const meanTimeToRestoreTrends = useSelector(
    (s) => s.doraMetrics.metrics_summary?.mean_time_to_restore_trends
  );
  const changeFailureRateTrends = useSelector(
    (s) => s.doraMetrics.metrics_summary?.change_failure_rate_trends
  );

  const activeTrends = leadTimeTrends;

  if (!activeTrends) return { trendsSeriesMap: null, yAxisLabels: [] };

  const yAxisLabels = useMemo(() => {
    const sprintLabels =
      mergeDateValueTupleArray(
        activeTrends.previous?.breakdown.first_response_time,
        activeTrends.current?.breakdown.first_response_time
      ).map((s) => s[0]) || [];
    return sprintLabels;
  }, [activeTrends]);

  const firstCommitToOpenTrendsData = useMemo(
    () =>
      getTrendsDataFromArray(
        mergeDateValueTupleArray(
          leadTimeTrends.previous?.breakdown.first_commit_to_open,
          leadTimeTrends.current?.breakdown.first_commit_to_open
        )
      ),
    [leadTimeTrends]
  );

  const firstResponseTimeTrendsData = useMemo(
    () =>
      getTrendsDataFromArray(
        mergeDateValueTupleArray(
          activeTrends.previous?.breakdown.first_response_time,
          activeTrends.current?.breakdown.first_response_time
        )
      ),
    [activeTrends]
  );

  const reworkTimeTrendsData = useMemo(
    () =>
      getTrendsDataFromArray(
        mergeDateValueTupleArray(
          activeTrends.previous?.breakdown.rework_time,
          activeTrends.current?.breakdown.rework_time
        )
      ),
    [activeTrends]
  );

  const mergeTimeTrendsData = useMemo(
    () =>
      getTrendsDataFromArray(
        mergeDateValueTupleArray(
          activeTrends.previous?.breakdown.merge_time,
          activeTrends.current?.breakdown.merge_time
        )
      ),
    [activeTrends]
  );

  const deployTimeTrendsData = useMemo(
    () =>
      getTrendsDataFromArray(
        mergeDateValueTupleArray(
          leadTimeTrends.previous?.breakdown.merge_time,
          leadTimeTrends.current?.breakdown.merge_time
        )
      ),
    [leadTimeTrends]
  );

  const changeFailureRateTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(changeFailureRateTrends).map((key) => ({
        x: key,
        y: Number(changeFailureRateTrends[key].percentage.toFixed(2) ?? 0)
      })),
    [changeFailureRateTrends]
  );

  const meanTimeToRestoreTrendsData = useMemo(
    () =>
      getSortedDatesAsArrayFromMap(meanTimeToRestoreTrends).map((key) => ({
        x: key,
        y: meanTimeToRestoreTrends[key] ?? 0
      })),
    [meanTimeToRestoreTrends]
  );

  const trendsSeriesMap = useMemo(
    () => ({
      firstCommitToPrTrends: {
        id: `First Commit to Pr Time`,
        color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
        data: firstCommitToOpenTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point || 0
        }))
      },
      firstResponseTimeTrends: {
        id: `First Response Time`,
        color: rgbToHex(lighten(brandColors.pr.firstResponseTime, 0.5)),
        data: firstResponseTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point || 0
        }))
      },
      reworkTimeTrends: {
        id: `Rework Time`,
        color: rgbToHex(lighten(brandColors.pr.reworkTime, 0.5)),
        data: reworkTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point || 0
        }))
      },
      mergeTimeTrends: {
        id: `Merge Time`,
        color: rgbToHex(lighten(brandColors.pr.mergeTime, 0.5)),
        data: mergeTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point || 0
        }))
      },
      deployTimeTrends: {
        id: `Deploy Time`,
        color: rgbToHex(lighten(brandColors.ticketState.done, 0.5)),
        data: deployTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y: point || 0
        }))
      },
      totalCycleTimeTrends: {
        id: `Total Cycle Time`,
        color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
        data: firstResponseTimeTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y:
            (point || 0) +
            (reworkTimeTrendsData[index] || 0) +
            (mergeTimeTrendsData[index] || 0)
        }))
      },
      totalLeadTimeTrends: {
        id: `Total Lead Time`,
        color: rgbToHex(lighten(brandColors.ticketState.todo, 0.5)),
        data: firstCommitToOpenTrendsData.map((point, index) => ({
          x: yAxisLabels[index],
          y:
            (point || 0) +
            (firstResponseTimeTrendsData[index] || 0) +
            (reworkTimeTrendsData[index] || 0) +
            (mergeTimeTrendsData[index] || 0) +
            (deployTimeTrendsData[index] || 0)
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

  return {
    trendsSeriesMap,
    yAxisLabels
  };
};
