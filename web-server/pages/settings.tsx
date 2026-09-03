import { Box } from '@mui/material';
import { Authenticated } from 'src/components/Authenticated';

import { FlexBox } from '@/components/FlexBox';
import { SyncDaysSetting } from '@/components/Settings/SyncDaysSetting';
import { FetchState } from '@/constants/ui-states';
import { useRedirectWithSession } from '@/constants/useRoute';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import ExtendedSidebarLayout from '@/layouts/ExtendedSidebarLayout';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';

function Settings() {
  useRedirectWithSession();
  // CLUSTOX: hasCodeProviderLinked, not integrationList.length -- Content
  // renders SyncDaysSetting, a code-repo sync-cadence control that has
  // nothing to configure for a Jira-only org. See
  // docs/JIRA_INTEGRATION_PROPOSAL.md.
  const { hasCodeProviderLinked } = useAuth();
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
        {hasCodeProviderLinked && <Content />}
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
