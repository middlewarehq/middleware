import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { FetchState } from '@/constants/ui-states';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { SyncDaysSetting } from '@/components/Settings/SyncDaysSetting';
import { Box } from '@mui/material';

function Settings() {
  const isLoading = useSelector(
    (s) => s.org.requests?.defaultSyncDays === FetchState.REQUEST
  );

  return (
    <>
      <PageWrapper
        title={
          <FlexBox gap1 alignCenter>
            Settings
          </FlexBox>
        }
        hideAllSelectors
        pageTitle="Settings"
        showEvenIfNoTeamSelected={true}
        isLoading={isLoading}
      >
        <Content />
      </PageWrapper>
    </>
  );
}

Settings.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Settings;

const Content = () => {
  return (
    <FlexBox gap={2} col maxWidth={'960px'}>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          padding: 2,
          borderRadius: 1
        }}
      >
        <SyncDaysSetting />
      </Box>
    </FlexBox>
  );
};
