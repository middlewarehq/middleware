import { AutoGraphRounded } from '@mui/icons-material';
import { Grid, Divider, Button } from '@mui/material';
import Link from 'next/link';
import { FC, useEffect } from 'react';

import { AiButton } from '@/components/AiButton';
import { DoraMetricsConfigurationSettings } from '@/components/DoraMetricsConfigurationSettings';
import { DoraScoreV2 } from '@/components/DoraScoreV2';
import { EmptyState } from '@/components/EmptyState';
import { FixedContentRefreshLoader } from '@/components/FixedContentRefreshLoader/FixedContentRefreshLoader';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import { useOverlayPage } from '@/components/OverlayPageContext';
import { SomethingWentWrong } from '@/components/SomethingWentWrong/SomethingWentWrong';
import { Line } from '@/components/Text';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { useDoraStats } from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import { usePageRefreshCallback } from '@/hooks/usePageRefreshCallback';
import {
  useBranchesForPrFilters,
  useSingleTeamConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics, getUnyncedRepos } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
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
  const branchPayloadForPrFilters = useBranchesForPrFilters();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const isErrored = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.FAILURE
  );

  const firstLoadDone = useSelector((s) => s.doraMetrics.firstLoadDone);

  const isTeamInsightsEmpty = useSelector(
    (s) =>
      !s.doraMetrics.metrics_summary?.change_failure_rate_stats.current
        .change_failure_rate &&
      !s.doraMetrics.metrics_summary?.mean_time_to_restore_stats.current
        .incident_count &&
      !s.doraMetrics.metrics_summary?.lead_time_stats.current.lead_time &&
      !s.doraMetrics.metrics_summary?.deployment_frequency_stats.current
        .avg_deployment_frequency
  );

  const { addPage } = useOverlayPage();

  useEffect(() => {
    if (!singleTeamId) return;
    if (!isGithubIntegrated) return;
    dispatch(
      fetchTeamDoraMetrics({
        orgId,
        teamId: singleTeamId,
        fromDate: dates.start,
        toDate: dates.end,
        ...branchPayloadForPrFilters
      })
    );
  }, [
    dates.end,
    dates.start,
    dispatch,
    orgId,
    singleTeamId,
    isGithubIntegrated,
    branchPayloadForPrFilters
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
        {!!stats.avg && <DoraScoreV2 {...stats} />}
        <FlexBox fit gap1 ml="auto">
          <AiButton
            size="small"
            startIcon={<AutoGraphRounded />}
            variant="outlined"
            onClickCallback={() =>
              addPage({
                page: {
                  ui: 'ai_analysis',
                  title: 'Analyse your Dora Metrics with AI of your choice'
                }
              })
            }
          >
            AI Analysis
          </AiButton>
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

  const dispatch = useDispatch();
  const reposMap = useSelector((s) => s.team.teamReposMaps);
  const { singleTeamId } = useSingleTeamConfig();
  const isSyncing = !!useSelector((s) => s.doraMetrics?.unsyncedRepos?.length);

  useEffect(() => {
    if (!isSyncing || !singleTeamId) return;

    const interval = setInterval(() => {
      dispatch(getUnyncedRepos({ team_id: singleTeamId })).then(
        async (res: any) => {
          const unsyncedRepoCount = res.payload?.length;
          if (unsyncedRepoCount === 0) {
            pageRefreshCallback();
          }
        }
      );
    }, 10_000);

    return () => clearInterval(interval);
  }, [dispatch, isSyncing, pageRefreshCallback, singleTeamId]);

  return {
    isSyncing,
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
      <LoaderCore animation={flickerAnimation.value} loading={isSyncing} />
    </FlexBox>
  );
};

export const LoaderCore: FC<{
  animation?: boolean;
  loading?: boolean;
}> = ({ animation, loading = true }) => {
  return (
    <FlexBox
      fullWidth
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
          {loading && <LoadingWrapper />}
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
  return (
    <FlexBox
      sx={{
        transition: 'transform 100ms linear',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite'
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
