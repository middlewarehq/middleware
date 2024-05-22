import { Add } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Button, Divider, Card } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { Authenticated } from 'src/components/Authenticated';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { GithubIntegrationCard } from '@/content/Dashboards/IntegrationCards';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { appSlice } from '@/slices/app';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout, IntegrationGroup } from '@/types/resources';
import { depFn } from '@/utils/fn';

const TIME_LIMIT_FOR_FORCE_SYNC = 600000;

function Integrations() {
  const isLoading = useSelector(
    (s) => s.team.requests?.teams === FetchState.REQUEST
  );

  return (
    <>
      <PageWrapper
        title={
          <FlexBox gap1 alignCenter>
            Integrations
          </FlexBox>
        }
        hideAllSelectors
        pageTitle="Integrations"
        showEvenIfNoTeamSelected={true}
        isLoading={isLoading}
      >
        <Content />
      </PageWrapper>
    </>
  );
}

Integrations.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Integrations;

const Content = () => {
  const { orgId, integrations, integrationSet, activeCodeProvider } = useAuth();
  const hasCodeProviderLinked = integrationSet.has(IntegrationGroup.CODE);
  const teamCount = useSelector((s) => s.team.teams?.length);
  const dispatch = useDispatch();
  const loadedTeams = useBoolState(false);
  const forceSyncing = useBoolState(false);
  const localLastForceSyncedAt = useEasyState<Date | null>(null);
  const showCreationCTA =
    hasCodeProviderLinked && !teamCount && loadedTeams.value;
  const showForceSyncBtn = useMemo(() => {
    if (!hasCodeProviderLinked) return false;
    const githubLinkedAt = new Date(integrations[Integration.GITHUB].linked_at);
    const currentDate = new Date();
    if (githubLinkedAt) {
      const diffMilliseconds = currentDate.getTime() - githubLinkedAt.getTime();
      return diffMilliseconds >= TIME_LIMIT_FOR_FORCE_SYNC;
    }
  }, [hasCodeProviderLinked, integrations]);

  const enableForceSyncBtn = useMemo(() => {
    if (!integrations[activeCodeProvider]?.last_synced_at) return true;
    const lastForceSyncedAt = Math.max(
      new Date(integrations[activeCodeProvider]?.last_synced_at).getTime(),
      localLastForceSyncedAt.value?.getTime()
    );
    const currentDate = new Date();
    const diffMilliseconds = currentDate.getTime() - lastForceSyncedAt;
    return diffMilliseconds >= TIME_LIMIT_FOR_FORCE_SYNC;
  }, [activeCodeProvider, integrations, localLastForceSyncedAt.value]);

  useEffect(() => {
    if (!orgId || !activeCodeProvider) return;
    if (!hasCodeProviderLinked) {
      dispatch(appSlice.actions.setSingleTeam([]));
      return;
    }
    if (hasCodeProviderLinked && !teamCount) {
      dispatch(
        fetchTeams({
          org_id: orgId,
          provider: activeCodeProvider
        })
      ).finally(loadedTeams.true);
    }
  }, [
    activeCodeProvider,
    dispatch,
    hasCodeProviderLinked,
    loadedTeams.true,
    orgId,
    teamCount
  ]);

  useEffect(() => {
    if (!orgId) return;
    handleApi<{ last_force_synced_at: DateString | null }>(
      `/internal/${orgId}/sync_repos`
    ).then((res) => {
      depFn(localLastForceSyncedAt.set, new Date(res.last_force_synced_at));
    });
  }, [localLastForceSyncedAt.set, orgId]);

  const showDoraCTA = useMemo(
    () => Boolean(teamCount) && Boolean(hasCodeProviderLinked),
    [hasCodeProviderLinked, teamCount]
  );

  return (
    <FlexBox col gap2>
      <FlexBox justifyBetween height={'52px'} alignCenter>
        <Line
          white
          fontSize={'24px'}
          sx={{
            opacity: showDoraCTA || showCreationCTA ? 0.4 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          Integrate your Github to fetch DORA for your team
        </Line>
        {showDoraCTA && (
          <Button href={ROUTES.DORA_METRICS.PATH} variant="contained">
            <FlexBox centered fullWidth p={2 / 3}>
              Continue to Dora {'->'}
            </FlexBox>
          </Button>
        )}
      </FlexBox>

      <Divider sx={{ mb: '10px' }} />
      {showForceSyncBtn && (
        <FlexBox component={Card} justifyBetween p={1} alignCenter>
          <Line>
            Initiate force sync will force a sync of all integrations. This is
            useful if you have made changes to your integrations outside of
            middleware.
          </Line>
          <LoadingButton
            type="submit"
            variant="outlined"
            color="primary"
            disabled={!enableForceSyncBtn}
            loading={forceSyncing.value}
            sx={{
              '&.Mui-disabled': {
                borderColor: 'secondary.light'
              }
            }}
            onClick={async () => {
              forceSyncing.true();
              handleApi<{ last_force_synced_at: DateString | null }>(
                `/internal/${orgId}/sync_repos`,
                {
                  method: 'POST'
                }
              )
                .then((res) => {
                  depFn(
                    localLastForceSyncedAt.set,
                    new Date(res.last_force_synced_at)
                  );
                })
                .finally(forceSyncing.false);
            }}
          >
            Initiate Force Sync
          </LoadingButton>
        </FlexBox>
      )}

      <FlexBox>
        <GithubIntegrationCard />
      </FlexBox>
      {showCreationCTA && (
        <FlexBox mt={'56px'} col fit alignStart>
          <Line fontSize={'24px'} semibold white>
            Create team structure to see DORA
          </Line>
          <Line fontSize={'16px'} mt="9px">
            Just add team's name, add repos and you're good to go.
          </Line>
          <Button
            variant="contained"
            sx={{ mt: '24px' }}
            href={ROUTES.TEAMS.PATH}
          >
            <FlexBox gap1>
              <Add />
              <Line white>Create Team</Line>
            </FlexBox>
          </Button>
        </FlexBox>
      )}
    </FlexBox>
  );
};
