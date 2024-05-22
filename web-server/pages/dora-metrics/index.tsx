import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { Loader as MiniLoading } from '@/components/Teams/CreateTeams';
import { FetchState } from '@/constants/ui-states';
import { useRedirectWithSession } from '@/constants/useRoute';
import {
  DoraMetricsBody,
  useSyncedRepos
} from '@/content/DoraMetrics/DoraMetricsBody';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
function Page() {
  useRedirectWithSession();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const {
    integrations: { github: isGithubIntegrated }
  } = useAuth();

  const { isSyncing } = useSyncedRepos();

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          DORA metrics
        </FlexBox>
      }
      additionalFilters={[
        <FlexBox fullWidth justifyEnd key="loader">
          {isSyncing && (
            <FlexBox>
              <MiniLoading label="Repo sync in progress" />
            </FlexBox>
          )}
        </FlexBox>
      ]}
      pageTitle="DORA metrics"
      isLoading={isLoading}
      teamDateSelectorMode="single"
    >
      {isGithubIntegrated ? <DoraMetricsBody /> : <Loader />}
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page;
