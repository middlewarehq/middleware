import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
// CLUSTOX: contributor filter.
import { ContributorFilter } from '@/components/ContributorFilter';
import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { FetchState } from '@/constants/ui-states';
import { useRedirectWithSession } from '@/constants/useRoute';
import { DoraMetricsBody } from '@/content/DoraMetrics/DoraMetricsBody';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
function Page() {
  useRedirectWithSession();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const { integrationList } = useAuth();

  // CLUSTOX: contributor filter -- rendered alongside the team/date selectors
  // through PageWrapper's existing `additionalFilters` seam, so no upstream
  // layout component is edited.
  const additionalFilters = [<ContributorFilter key="contributor-filter" />];
  // END CLUSTOX

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          DORA metrics
        </FlexBox>
      }
      pageTitle="DORA metrics"
      isLoading={isLoading}
      teamDateSelectorMode="single"
      additionalFilters={additionalFilters}
    >
      {integrationList.length > 0 ? <DoraMetricsBody /> : <Loader />}
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page;
