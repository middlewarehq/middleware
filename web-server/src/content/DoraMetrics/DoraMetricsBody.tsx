import { Grid, Divider, Button } from '@mui/material';
import Link from 'next/link';
import { useEffect } from 'react';

import { DoraMetricsConfigurationSettings } from '@/components/DoraMetricsConfigurationSettings';
import { DoraScore } from '@/components/DoraScore';
import { EmptyState } from '@/components/EmptyState';
import { FixedContentRefreshLoader } from '@/components/FixedContentRefreshLoader/FixedContentRefreshLoader';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import { Line } from '@/components/Text';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { useDoraStats } from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useAuth } from '@/hooks/useAuth';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { ActiveBranchMode } from '@/types/resources';
import { getRandomLoadMsg } from '@/utils/loading-messages';

import { ClassificationPills } from './ClassificationPills';
import { ChangeFailureRateCard } from './DoraCards/ChangeFailureRateCard';
import { ChangeTimeCard } from './DoraCards/ChangeTimeCard';
import { MeanTimeToRestoreCard } from './DoraCards/MeanTimeToRestoreCard';
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

  const { isFreshOrg } = useFreshOrgCalculator();

  if (!firstLoadDone) return <MiniLoader label={getRandomLoadMsg()} />;

  if (isTeamInsightsEmpty)
    if (isFreshOrg)
      return (
        <EmptyState
          type="SYNC_IN_PROGRESS"
          title="Sync in progress"
          desc="Your data is syncing. Please reload in a few minutes."
        >
          <FixedContentRefreshLoader show={isLoading} />
        </EmptyState>
      );
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
      <Divider sx={{ mt: 2 }} />
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
  const { org } = useAuth();
  const createdAt = org?.created_at;
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
