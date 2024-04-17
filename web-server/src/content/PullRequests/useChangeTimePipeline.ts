import { darken, lighten } from '@mui/material';
import { useCallback, useMemo } from 'react';

import { track } from '@/constants/events';
import { useEasyState } from '@/hooks/useEasyState';
import { useSelector } from '@/store';
import { brandColors } from '@/theme/schemes/theme';
import { ChangeTimeModes } from '@/types/resources';

export enum ClipPathEnum {
  'FIRST' = 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)',
  'LAST' = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15px 50%)',
  'DEFAULT' = 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)'
}

export enum StatMode {
  Average = 'Average',
  P90 = 'P90'
}

export const useLeadTimePipeline = () => {
  const averageSummary = useSelector(
    (s) => s.doraMetrics.metrics_summary.lead_time_stats.current
  );

  const firstCommitToPrDetails = useMemo(
    () => ({
      duration: averageSummary.first_commit_to_open || 0,
      bgColor: lighten(brandColors.ticketState.todo, 0.1),
      color: darken(brandColors.ticketState.todo, 0.9),
      clipPath: ClipPathEnum.FIRST,
      title: 'Commit',
      description: 'Time taken to create PR since the first commit'
    }),
    [averageSummary.first_commit_to_open]
  );

  const firstResponseDetails = useMemo(
    () => ({
      duration: averageSummary.first_response_time || 0,
      bgColor: lighten(brandColors.pr.firstResponseTime, 0.5),
      color: darken(brandColors.pr.firstResponseTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Response',
      description: 'Time taken to submit the first review on a PR'
    }),
    [averageSummary.first_response_time]
  );

  const reworkDetails = useMemo(
    () => ({
      duration: averageSummary.rework_time || 0,
      bgColor: lighten(brandColors.pr.reworkTime, 0.5),
      color: darken(brandColors.pr.reworkTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Rework',
      description: 'Time spent in reviewing the PR, and making changes (if any)'
    }),
    [averageSummary.rework_time]
  );

  const mergeDetails = useMemo(
    () => ({
      duration: averageSummary.merge_time || 0,
      bgColor: lighten(brandColors.pr.mergeTime, 0.5),
      color: darken(brandColors.pr.mergeTime, 0.9),
      clipPath: ClipPathEnum.DEFAULT,
      title: 'Merge',
      description:
        'Time waited to finally merge the PR after approval was provided'
    }),
    [averageSummary.merge_time]
  );

  const prToDeploymentDetails = useMemo(
    () => ({
      duration: averageSummary.merge_to_deploy || 0,
      bgColor: lighten(brandColors.ticketState.done, 0.4),
      color: darken(brandColors.ticketState.done, 0.9),
      clipPath: ClipPathEnum.LAST,
      title: 'Deploy',
      description: 'Time taken to deploy the PR once its merged'
    }),
    [averageSummary.merge_to_deploy]
  );

  const leadTimeDetailsArray = [
    firstCommitToPrDetails,
    firstResponseDetails,
    reworkDetails,
    mergeDetails,
    prToDeploymentDetails
  ];

  const totalLeadTime = leadTimeDetailsArray.reduce(
    (prevValue, currentSegment) => currentSegment.duration + prevValue,
    0
  );

  return {
    leadTimeDetailsArray,
    totalLeadTime
  };
};

export const usePrChangeTimePipeline = () => {
  const changeTimeActiveStatMode = useEasyState<StatMode>(StatMode.Average);
  const handleActiveStatModeUpdate = useCallback(
    (_, i) => {
      const newActiveMode = i === 0 ? StatMode.Average : StatMode.P90;
      track('CHANGE_TIME_STATS_MODE_SWITCHED', {
        tab_switched_to: newActiveMode
      });
      changeTimeActiveStatMode.set(newActiveMode);
    },
    [changeTimeActiveStatMode]
  );

  const { leadTimeDetailsArray, totalLeadTime } = useLeadTimePipeline();

  const allAssignedRepos = useSelector(
    (s) => s.doraMetrics.allReposAssignedToTeam
  );
  const reposWithWorkflowConfigured = allAssignedRepos;
  const reposWithNoDeploymentsConfigured = useMemo(() => {
    const workflowConfiguredRepoIdsSet = new Set(
      reposWithWorkflowConfigured.map((r) => r.id)
    );
    return allAssignedRepos.filter(
      (r) => !workflowConfiguredRepoIdsSet.has(r.id)
    );
  }, [allAssignedRepos, reposWithWorkflowConfigured]);

  const reposCountWithWorkflowConfigured =
    allAssignedRepos.length - reposWithNoDeploymentsConfigured.length;

  return {
    handleActiveStatModeUpdate,
    activeChangeTimeMode: ChangeTimeModes.LEAD_TIME,
    changeTimeDetailsArray: leadTimeDetailsArray,
    totalChangeTime: totalLeadTime,
    totalLeadTime,
    reposWithNoDeploymentsConfigured,
    reposCountWithWorkflowConfigured
  };
};
