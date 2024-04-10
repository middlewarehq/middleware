import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import { FetchState } from '@/constants/ui-states';
import { DoraMetricsBody } from '@/content/DoraMetrics/DoraMetricsBody';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

function Page() {
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          Teams
        </FlexBox>
      }
      pageTitle="Teams"
      isLoading={isLoading}
    >
      <DoraMetricsBody />
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page;
