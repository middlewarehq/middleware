import { Chip } from '@mui/material';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
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
  const {
    integrations: { github: isGithubIntegrated }
  } = useAuth();

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
