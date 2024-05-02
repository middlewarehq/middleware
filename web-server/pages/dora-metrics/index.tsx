import { Chip } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { DoraMetricsBody } from '@/content/DoraMetrics/DoraMetricsBody';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { depFn } from '@/utils/fn';

function Page() {
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const {
    orgId,
    integrations: { github: isGithubIntegrated }
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!orgId) return;
    if (!isGithubIntegrated) {
      depFn(router.replace, ROUTES.INTEGRATIONS.PATH);
      return;
    }
  }, [isGithubIntegrated, orgId, router.replace]);

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          DORA metrics <Chip label="BETA" color="primary" size="small" />
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
