import { Add } from '@mui/icons-material';
import { Button, Divider } from '@mui/material';
import { useEffect } from 'react';
import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { GithubIntegrationCard } from '@/content/Dashboards/IntegrationCards';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { depFn } from '@/utils/fn';

function Integrations() {
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
  const { orgId } = useAuth();
  const isLinked = useSelector((s) => s.auth.org.integrations.github === true);
  const teams = useSelector((s) => s.team.teams);
  const dispatch = useDispatch();
  const loading = useBoolState(false);

  useEffect(() => {
    if (!orgId) return;
    depFn(loading.true);
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    ).finally(loading.false);
  }, [dispatch, loading.false, loading.true, orgId]);

  const teamCount = teams.length;
  return (
    <FlexBox col gap2>
      <Line white fontSize={'24px'}>
        Integrate your Github to fetch DORA for your team
      </Line>
      <Divider sx={{ mb: '20px' }} />
      <FlexBox>
        <GithubIntegrationCard />
      </FlexBox>
      {isLinked && !teamCount && !loading && (
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
