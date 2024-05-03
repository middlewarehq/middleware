import { useRouter } from 'next/router';
import { useEffect } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { FlexBox } from '@/components/FlexBox';
import { CreateEditTeams, Loader } from '@/components/Teams/CreateTeams';
import { TeamsList } from '@/components/TeamsList';
import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { depFn } from '@/utils/fn';

function Page() {
  const dispatch = useDispatch();
  const {
    orgId,
    integrations: { github: isGithubIntegrated }
  } = useAuth();
  const teamsList = useSelector((state) => state.team.teams);
  const router = useRouter();

  useEffect(() => {
    if (!orgId) return;
    if (!isGithubIntegrated) {
      depFn(router.replace, ROUTES.INTEGRATIONS.PATH);
      return;
    }
    if (!teamsList.length)
      dispatch(
        fetchTeams({
          org_id: orgId,
          provider: Integration.GITHUB
        })
      );
  }, [dispatch, isGithubIntegrated, orgId, router.replace, teamsList.length]);

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
      {isGithubIntegrated ? (
        <FlexBox col gap={4}>
          {teamsList.length ? <TeamsList /> : <CreateEditTeams />}
        </FlexBox>
      ) : (
        <Loader />
      )}
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
);

export default Page;
