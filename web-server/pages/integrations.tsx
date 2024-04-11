import { Add } from '@mui/icons-material';
import { Button, Divider } from '@mui/material';
import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { GithubIntegrationCard } from '@/content/Dashboards/IntegrationCards';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

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
  const isLinked = useSelector((s) => s.auth.org.integrations.github === true);
  const teamCount = useSelector((s) => s.app.allTeams.length);
  return (
    <FlexBox col gap2>
      <Line white fontSize={'24px'}>
        Integrate your Github to fetch DORA for your team
      </Line>
      <Divider sx={{ mb: '20px' }} />
      <FlexBox>
        <GithubIntegrationCard />
      </FlexBox>
      {isLinked && !teamCount && (
        <FlexBox mt={'56px'} col fit alignStart>
          <Line fontSize={'24px'} semibold white>
            Create team structure to see DORA
          </Line>
          <Line fontSize={'16px'} white mt="14px">
            Just add team's name, add repos and you're good to go.
          </Line>
          <Button variant="contained" sx={{ mt: '24px' }}>
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
