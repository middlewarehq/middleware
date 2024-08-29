import { Box } from '@mui/material';
import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { SystemLogs } from '@/components/Service/SystemLogs';
import { useRedirectWithSession } from '@/constants/useRoute';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { serviceSlice } from '@/slices/service';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

// Main System component
function Service() {
  useRedirectWithSession();

  const {
    integrations: { github: isGithubIntegrated }
  } = useAuth();

  const initialState = serviceSlice.getInitialState();
  const currentState = useSelector(
    (state: { service: { services: any } }) => state.service.services
  );

  const isLoading = currentState === initialState.services;

  return (
    <PageWrapper
      title={
        <FlexBox gap={1} alignCenter>
          Service
        </FlexBox>
      }
      hideAllSelectors
      pageTitle="Service"
      showEvenIfNoTeamSelected={true}
      isLoading={isLoading}
    >
      {isGithubIntegrated && <Content />}
    </PageWrapper>
  );
}

Service.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Service;

// Content component centered and styled
const Content = () => {
  return (
    <FlexBox
      col
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: '100vh' }} // Center vertically
    >
      <Box
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: 2,
          borderRadius: 1,
          // maxWidth: '960px',
          width: '100%',
          boxShadow: 3, // Adds some shadow for better visual separation
          backgroundColor: 'background.paper' // Ensures the background matches the theme
        }}
      >
        <SystemLogs />
      </Box>
    </FlexBox>
  );
};
