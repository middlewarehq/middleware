import { Add } from '@mui/icons-material';
import { Button, Divider } from '@mui/material';
import { useEffect } from 'react';
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
    orgId,
    integrations: { github: isGithubIntegrated },
    integrationSet
  } = useAuth();
  const hasCodeProviderLinked = integrationSet.has(IntegrationGroup.CODE);
  const teamCount = useSelector((s) => s.team.teams?.length);
  const dispatch = useDispatch();
  const loadedTeams = useBoolState(false);

  const showCreationCTA =
    hasCodeProviderLinked && !teamCount && loadedTeams.value;

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

  return (
    <FlexBox col gap2>
      <FlexBox justifyBetween>
        <Line white fontSize={'24px'}>
          Integrate your Github to fetch DORA for your team
        </Line>
        {Boolean(teamCount) && Boolean(hasCodeProviderLinked) && (
          <Button href={ROUTES.DORA_METRICS.PATH} variant="contained">
            <FlexBox centered fullWidth p={2 / 3}>
              Continue to Dora {'->'}
            </FlexBox>
          </Button>
        )}
      </FlexBox>

      <Divider sx={{ mb: '20px' }} />
      <FlexBox>
        <GithubIntegrationCard />
      </FlexBox>
      {showCreationCTA && (
        <FlexBox mt={'56px'} col fit alignStart>
          <Line fontSize={'24px'} semibold white>
            Create team structure to see DORA
          </Line>
          <Line fontSize={'16px'} white mt="14px">
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
