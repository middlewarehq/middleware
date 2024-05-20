import { Add } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Button, Divider, Card } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { GithubIntegrationCard } from '@/content/Dashboards/IntegrationCards';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { appSlice } from '@/slices/app';
import { syncReposForOrg } from '@/slices/auth';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout, IntegrationGroup } from '@/types/resources';

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
  const {
    org,
    orgId,
    integrations: { github: isGithubIntegrated },
    integrationsLinkedAtMap,
    integrationSet
  } = useAuth();
  const hasCodeProviderLinked = integrationSet.has(IntegrationGroup.CODE);
  const teamCount = useSelector((s) => s.team.teams?.length);
  const dispatch = useDispatch();
  const loadedTeams = useBoolState(false);
  const forceSyncing = useBoolState(false);
  const showCreationCTA =
    hasCodeProviderLinked && !teamCount && !loadedTeams.value;
  const showForceSyncBtn = useMemo(() => {
    if (!hasCodeProviderLinked) return false;
    const githubLinkedAt = new Date(
      integrationsLinkedAtMap[Integration.GITHUB]
    );
    const currentDate = new Date();
    if (githubLinkedAt) {
      const diffMilliseconds = currentDate.getTime() - githubLinkedAt.getTime();
      return diffMilliseconds >= 600000;
    }
  }, [hasCodeProviderLinked, integrationsLinkedAtMap]);

  const enableForceSyncBtn = useMemo(() => {
    if (!org?.last_force_synced_at) return true;
    const lastForceSyncedAt = new Date(org?.last_force_synced_at);
    const currentDate = new Date();
    const diffMilliseconds =
      currentDate.getTime() - lastForceSyncedAt.getTime();
    return diffMilliseconds >= 600000;
  }, [org?.last_force_synced_at]);

  useEffect(() => {
    if (!orgId) return;
    if (!isGithubIntegrated) {
      dispatch(appSlice.actions.setSingleTeam([]));
      return;
    }
    if (isGithubIntegrated && !teamCount) {
      dispatch(
        fetchTeams({
          org_id: orgId,
          provider: Integration.GITHUB
        })
      ).finally(loadedTeams.true);
    }
  }, [dispatch, isGithubIntegrated, loadedTeams.true, orgId, teamCount]);

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
              await dispatch(
                syncReposForOrg({
                  orgId: orgId
                })
              ).finally(forceSyncing.false);
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
