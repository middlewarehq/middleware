import { useCallback, useEffect } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { FlexBox } from '@/components/FlexBox';
import { CreateEditTeams, Loader } from '@/components/Teams/CreateTeams';
import { TeamsList } from '@/components/TeamsList';
import { useRedirectWithSession } from '@/constants/useRoute';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import { fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { depFn } from '@/utils/fn';

function Page() {
  useRedirectWithSession();
  const dispatch = useDispatch();
  const { orgId, integrationList } = useAuth();
  const teamsList = useSelector((state) => state.team.teams);
  const loading = useBoolState(!Boolean(teamsList.length));

  const fetchAllTeams = useCallback(async () => {
    depFn(loading.true);
    await dispatch(
      fetchTeams({
        org_id: orgId
      })
    );
    depFn(loading.false);
  }, [dispatch, loading.false, loading.true, orgId]);

  useEffect(() => {
    if (!orgId) return;
    if (!teamsList.length) fetchAllTeams();
  }, [fetchAllTeams, orgId, teamsList.length]);

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
      {integrationList.length && !loading.value ? (
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
