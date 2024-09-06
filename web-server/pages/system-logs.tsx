import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { SystemStatus } from '@/components/Service/SystemStatus';
import { useRedirectWithSession } from '@/constants/useRoute';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

function Service() {
  useRedirectWithSession();

  const {
    integrations: { github: isGithubIntegrated }
  } = useAuth();

  const loading = useSelector((state) => state.service.loading);

  return (
    <PageWrapper
      title={
        <FlexBox gap={1} alignCenter>
          System logs
        </FlexBox>
      }
      hideAllSelectors
      pageTitle="System logs"
      showEvenIfNoTeamSelected={true}
      isLoading={loading}
    >
      {isGithubIntegrated ? <SystemStatus /> : <Loader />}
    </PageWrapper>
  );
}

Service.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Service;
