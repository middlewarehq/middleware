import { Grid, Divider, Button } from '@mui/material';
import Link from 'next/link';
import { FC, useEffect, useMemo } from 'react';

import { DoraMetricsConfigurationSettings } from '@/components/DoraMetricsConfigurationSettings';
import { DoraScore } from '@/components/DoraScore';
import { EmptyState } from '@/components/EmptyState';
import { FixedContentRefreshLoader } from '@/components/FixedContentRefreshLoader/FixedContentRefreshLoader';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import { SomethingWentWrong } from '@/components/SomethingWentWrong/SomethingWentWrong';
import { Line } from '@/components/Text';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { useDoraStats } from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { usePageRefreshCallback } from '@/hooks/usePageRefreshCallback';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { ActiveBranchMode } from '@/types/resources';
import { depFn } from '@/utils/fn';
import { getRandomLoadMsg } from '@/utils/loading-messages';

import { ClassificationPills } from './ClassificationPills';
import { ChangeFailureRateCard } from './DoraCards/ChangeFailureRateCard';
import { ChangeTimeCard } from './DoraCards/ChangeTimeCard';
import { MeanTimeToRestoreCard } from './DoraCards/MeanTimeToRestoreCard';
import { DataStillSyncing } from './DoraCards/SkeletalCard';
import { WeeklyDeliveryVolumeCard } from './DoraCards/WeeklyDeliveryVolumeCard';

export const DoraMetricsBody = () => {
  const dispatch = useDispatch();
  const {
    orgId,
    integrations: { github: isGithubIntegrated }
  } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branches = useStateBranchConfig();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const isErrored = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.FAILURE
  );

  const firstLoadDone = useSelector((s) => s.doraMetrics.firstLoadDone);

  const activeBranchMode = useSelector((s) => s.app.branchMode);

  const isTeamInsightsEmpty = useSelector(
    (s) =>
      !s.doraMetrics.metrics_summary?.change_failure_rate_stats.current
        .change_failure_rate &&
      !s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .incident_count &&
      !s.doraMetrics.metrics_summary?.lead_time_stats.current.lead_time &&
      !s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_daily_deployment_frequency
  );

  useEffect(() => {
    if (!singleTeamId) return;
    if (!isGithubIntegrated) return;
    dispatch(
      fetchTeamDoraMetrics({
        orgId,
        teamId: singleTeamId,
        fromDate: dates.start,
        toDate: dates.end,
        branches:
          activeBranchMode === ActiveBranchMode.PROD
            ? null
            : activeBranchMode === ActiveBranchMode.ALL
            ? '^'
            : branches
      })
    );
  }, [
    branches,
    dates.end,
    dates.start,
    dispatch,
    orgId,
    singleTeamId,
    activeBranchMode,
    isGithubIntegrated
  ]);

  const stats = useDoraStats();

  const { isSyncing } = useSyncedRepos();

  if (isErrored)
    return (
      <SomethingWentWrong
        error="Dora metrics data could not be loaded"
        desc="Hey there! Sorry about that, the intern that was supposed to deliver your metrics got lost on the way"
      />
    );
  if (!firstLoadDone) return <MiniLoader label={getRandomLoadMsg()} />;
  if (isTeamInsightsEmpty)
    if (isSyncing) return <DataStillSyncing />;
    else
      return (
        <EmptyState
          type="NO_DATA_IN_DORA_METRICS"
          title="Dora's not exploring today"
          desc="We couldn't find any data to present. Perhaps you need to configure team repos."
        >
          <Link passHref href={ROUTES.TEAMS.PATH}>
            <Button variant="contained" size="small">
              Check Team Repos
            </Button>
          </Link>
          <FixedContentRefreshLoader show={isLoading} />
        </EmptyState>
      );

  return (
    <FlexBox col gap2>
      <FixedContentRefreshLoader show={isLoading} />
      <FlexBox gap={2}>
        {!!stats.avg && <DoraScore {...stats} />}
        <FlexBox fit gap1 ml="auto">
          <DoraMetricsConfigurationSettings />
        </FlexBox>
      </FlexBox>
      <Syncing />
      <Divider />
      <Grid container spacing={4}>
        <Grid item xs={12} md={6} order={1}>
          <ChangeTimeCard />
        </Grid>
        <Grid item xs={12} md={6} order={2}>
          <WeeklyDeliveryVolumeCard />
        </Grid>
        <Grid item xs={12} md={6} order={3}>
          <ChangeFailureRateCard />
        </Grid>
        <Grid item xs={12} md={6} order={4}>
          <MeanTimeToRestoreCard />
        </Grid>
      </Grid>
      <Divider />
      <FlexBox col gap1 flexGrow={1}>
        <FlexBox gap={4}>
          <FlexBox col width="150px">
            <Line big bold white>
              Classifications
            </Line>
            <Line tiny>Hover to see what each classification means</Line>
          </FlexBox>
          <ClassificationPills />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const FRESH_ORG_THRESHOLD = 10; // in minutes

export const useFreshOrgCalculator = () => {
  const result = { isFreshOrg: false };
  const { integrations, activeCodeProvider } = useAuth();
  const createdAt = integrations[activeCodeProvider].linked_at;
  if (!createdAt) return result;
  result.isFreshOrg = calculateIsFreshOrg(createdAt);
  return result;
};

export const calculateIsFreshOrg = (createdAt: string | Date): boolean => {
  const now = Date.now();
  const date = new Date(createdAt);
  const timeDiffMs = now - date.getTime();

  return timeDiffMs <= FRESH_ORG_THRESHOLD * 60 * 1000;
};

export const useSyncedRepos = () => {
  const pageRefreshCallback = usePageRefreshCallback();

  const reposMap = useSelector((s) => s.team.teamReposMaps);
  const { singleTeamId } = useSingleTeamConfig();
  const syncedRepos = useSelector((s) => s.doraMetrics.bookmarkedRepos);

  const isSyncing = useMemo(() => {
    const teamRepos = reposMap[singleTeamId] || [];
    return !teamRepos.every((repo) => syncedRepos.includes(repo.id));
  }, [reposMap, singleTeamId, syncedRepos]);

  useEffect(() => {
    if (!isSyncing) return;

    const interval = setInterval(() => {
      pageRefreshCallback();
    }, 10_000);

    return () => clearInterval(interval);
  }, [isSyncing, pageRefreshCallback]);

  return {
    isSyncing,
    syncedRepos,
    teamRepos: reposMap[singleTeamId] || []
  };
};

const ANIMATON_DURATION = 1000;

export const Syncing = () => {
  const flickerAnimation = useBoolState(false);
  const { isSyncing } = useSyncedRepos();

  useEffect(() => {
    if (!isSyncing) return;
    const interval = setInterval(() => {
      depFn(flickerAnimation.toggle);
    }, ANIMATON_DURATION);
    return () => clearInterval(interval);
  }, [isSyncing, flickerAnimation.toggle]);

  return (
    <FlexBox
      sx={{
        height: isSyncing ? '66px' : '0px',
        mb: isSyncing ? 0 : -2,
        transition: `opacity ${ANIMATON_DURATION}ms linear, height 300ms ease, margin 300ms ease`
      }}
    >
      <LoaderCore animation={flickerAnimation.value} />
    </FlexBox>
  );
};

export const LoaderCore: FC<{
  animation?: boolean;
}> = ({ animation }) => {
  return (
    <FlexBox
      gap={4}
      sx={{
        transition: `opacity ${ANIMATON_DURATION}ms linear, height 300ms ease, margin 300ms ease`,
        opacity: !animation ? 1 : 0.6
      }}
      overflow={'hidden'}
    >
      <FlexBox
        relative
        gap={2}
        alignCenter
        p={2}
        borderRadius={'8px'}
        overflow={'hidden'}
        flex={1}
      >
        <FlexBox
          bgcolor={'#14AE5C'}
          sx={{ opacity: 0.1 }}
          position={'absolute'}
          left={0}
          top={0}
          fullWidth
          height={'100%'}
        />
        <FlexBox height={'25px'} centered>
          {<LoadingWrapper />}
        </FlexBox>
        <Line color={'#1AE579'} medium big>
          Calculating Dora
        </Line>
        <Line>We’re processing your data, it usually takes ~ 5 mins</Line>
      </FlexBox>
      <FlexBox p={2} flex1 />
    </FlexBox>
  );
};

const LoadingWrapper = () => {
  const rotation = useEasyState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      rotation.set((r) => r + 1);
    }, 10);
    return () => clearInterval(interval);
  }, [rotation]);
  return (
    <FlexBox
      sx={{
        transform: `rotate(${rotation.value}deg)`,
        transition: 'transform 100ms linear',
        borderRadius: '50%'
      }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.0002 2.50195V5.00195M21.2502 4.17695L20.0002 6.34195M25.8252 8.75195L23.6602 10.002M27.5002 15.002H25.0002M25.8252 21.252L23.6602 20.002M21.2502 25.827L20.0002 23.662M15.0002 27.502V25.002M8.75024 25.827L10.0002 23.662M4.17524 21.252L6.34024 20.002M2.50024 15.002H5.00024M4.17524 8.75195L6.34024 10.002M8.75024 4.17695L10.0002 6.34195"
          stroke="#1AE579"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </FlexBox>
  );
};
