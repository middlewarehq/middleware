import { useEffect } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import { CreateTeams } from '@/components/Teams/CreateTeams';
import { TeamsList } from '@/components/TeamsList';
import { Integration } from '@/constants/integrations';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

function Page() {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const teamsList = useSelector((state) => state.team.teams);

  useEffect(() => {
    if (!orgId) return;
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          Teams
        </FlexBox>
      }
      pageTitle="Teams"
      showEvenIfNoTeamSelected
      hideAllSelectors
    >
      <FlexBox col gap={4}>
        {teamsList.length ? <TeamsList /> : <CreateTeams />}
      </FlexBox>
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page;
